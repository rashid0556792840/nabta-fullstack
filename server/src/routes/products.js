const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const { sanitizeText, escapeRegex, isObjectId, requireObjectId, validator, toNumber } = require('../utils/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const storeEvents = require('../services/events');

const router = express.Router();

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  'price-asc': { price: 1, _id: 1 },
  'price-desc': { price: -1, _id: 1 },
  name: { name: 1, _id: 1 },
  'name-ar': { nameAr: 1, name: 1, _id: 1 }, // alphabetical by the Arabic name
};

/** Builds a Mongo filter from query-string parameters. */
function buildFilter(query, { includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { isActive: true };
  const q = sanitizeText(query.q, 60);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { nameAr: rx }, { description: rx }, { descriptionAr: rx }];
  }
  if (query.category && isObjectId(query.category)) filter.category = query.category;
  const min = toNumber(query.minPrice);
  const max = toNumber(query.maxPrice);
  if (!Number.isNaN(min) || !Number.isNaN(max)) {
    filter.price = {};
    if (!Number.isNaN(min)) filter.price.$gte = min;
    if (!Number.isNaN(max)) filter.price.$lte = max;
  }
  if (query.inStock === 'true') filter.stock = { $gt: 0 };
  if (query.featured === 'true') filter.isFeatured = true;
  return filter;
}

async function listProducts(req, res, options) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const sort = SORTS[req.query.sort] || SORTS.newest;
  const filter = buildFilter(req.query, options);

  const [products, total] = await Promise.all([
    Product.find(filter).populate('category', 'name nameAr').sort(sort).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);

  // URL module: build the "next page" link from the current request URL
  const pages = Math.max(1, Math.ceil(total / limit));
  let next = null;
  if (page < pages) {
    const url = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`);
    url.searchParams.set('page', String(page + 1));
    next = url.pathname + url.search;
  }

  res.json({ products, page, pages, total, next });
}

// GET /api/products - public catalogue (search, filter, sort, paginate)
router.get('/', (req, res) => listProducts(req, res, { includeInactive: false }));

// GET /api/products/admin - admin list including inactive products
router.get('/admin', requireAuth, requireAdmin, (req, res) => listProducts(req, res, { includeInactive: true }));

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  requireObjectId(req.params.id, 'product id');
  const product = await Product.findOne({ _id: req.params.id, isActive: true }).populate('category', 'name nameAr');
  if (!product) throw ApiError.notFound('Product not found.');
  res.json({ product });
});

async function readProduct(body) {
  const data = {
    name: sanitizeText(body.name, 100),
    nameAr: sanitizeText(body.nameAr, 100),
    description: sanitizeText(body.description, 1000),
    descriptionAr: sanitizeText(body.descriptionAr, 1000),
    price: toNumber(body.price),
    weightGrams: body.weightGrams === '' || body.weightGrams === null || body.weightGrams === undefined ? null : toNumber(body.weightGrams),
    stock: toNumber(body.stock),
    category: body.category,
    imageUrl: sanitizeText(body.imageUrl, 300),
  };
  const v = validator();
  v.check(data.name.length >= 2, 'name', 'Product name needs at least 2 characters.');
  v.check(data.price >= 0 && data.price <= 100000, 'price', 'Price must be between 0 and 100,000.');
  v.check(Number.isInteger(data.stock) && data.stock >= 0, 'stock', 'Stock must be a whole number, 0 or more.');
  v.check(data.weightGrams === null || (data.weightGrams > 0 && data.weightGrams <= 100000), 'weightGrams', 'Weight must be a positive number of grams.');
  v.check(isObjectId(data.category), 'category', 'Choose a category.');
  v.check(!data.imageUrl || /^(https?:\/\/|\/api\/images\/)[^\s]+$/i.test(data.imageUrl), 'imageUrl', 'Image must be an http(s) link or an uploaded image.');
  v.throwIfErrors();
  if (!(await Category.exists({ _id: data.category }))) {
    throw ApiError.badRequest('Please check the highlighted fields.', { category: 'Category does not exist.' });
  }
  data.price = Math.round(data.price * 100) / 100;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if (typeof body.isFeatured === 'boolean') data.isFeatured = body.isFeatured;
  return data;
}

// POST /api/products (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const product = await Product.create(await readProduct(req.body));
  storeEvents.emit('product:saved', { product, action: 'created' });
  res.status(201).json({ product: await product.populate('category', 'name nameAr') });
});

// PUT /api/products/:id (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  requireObjectId(req.params.id, 'product id');
  const product = await Product.findByIdAndUpdate(req.params.id, await readProduct(req.body), {
    new: true,
    runValidators: true,
  }).populate('category', 'name nameAr');
  if (!product) throw ApiError.notFound('Product not found.');
  storeEvents.emit('product:saved', { product, action: 'updated' });
  res.json({ product });
});

// PATCH /api/products/:id/stock (admin) - quick stock adjustment
router.patch('/:id/stock', requireAuth, requireAdmin, async (req, res) => {
  requireObjectId(req.params.id, 'product id');
  const stock = toNumber(req.body.stock);
  if (!Number.isInteger(stock) || stock < 0) throw ApiError.badRequest('Stock must be a whole number, 0 or more.');
  const product = await Product.findByIdAndUpdate(req.params.id, { stock }, { new: true }).populate('category', 'name nameAr');
  if (!product) throw ApiError.notFound('Product not found.');
  res.json({ product });
});

// DELETE /api/products/:id (admin)
// Products that appear in orders are deactivated instead of deleted, to keep order history intact.
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  requireObjectId(req.params.id, 'product id');
  const ordered = await Order.exists({ 'items.product': req.params.id });
  if (ordered) {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) throw ApiError.notFound('Product not found.');
    return res.json({ product, message: 'Product has orders, so it was deactivated instead of deleted.' });
  }
  const deleted = await Product.findByIdAndDelete(req.params.id);
  if (!deleted) throw ApiError.notFound('Product not found.');
  res.status(204).end();
});

module.exports = router;
