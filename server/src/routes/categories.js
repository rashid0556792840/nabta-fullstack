const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const { sanitizeText, requireObjectId, validator } = require('../utils/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/categories - active categories with product counts (aggregation)
router.get('/', async (_req, res) => {
  const categories = await Category.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'products',
        let: { categoryId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$category', '$$categoryId'] }, { $eq: ['$isActive', true] }] } } },
          { $count: 'n' },
        ],
        as: 'counts',
      },
    },
    { $addFields: { productCount: { $ifNull: [{ $first: '$counts.n' }, 0] } } },
    { $project: { counts: 0, __v: 0 } },
    { $sort: { name: 1 } },
  ]);
  res.json({ categories });
});

// Admin: list all including inactive
router.get('/all', requireAuth, requireAdmin, async (_req, res) => {
  res.json({ categories: await Category.find().sort({ name: 1 }) });
});

function readCategory(body) {
  const name = sanitizeText(body.name, 60);
  const description = sanitizeText(body.description, 300);
  const v = validator();
  v.check(name.length >= 2, 'name', 'Category name needs at least 2 characters.');
  v.throwIfErrors();
  return { name, description };
}

// POST /api/categories (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const category = await Category.create(readCategory(req.body));
  res.status(201).json({ category });
});

// PUT /api/categories/:id (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  requireObjectId(req.params.id, 'category id');
  const data = readCategory(req.body);
  if (typeof req.body.isActive === 'boolean') data.isActive = req.body.isActive;
  const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!category) throw ApiError.notFound('Category not found.');
  res.json({ category });
});

// DELETE /api/categories/:id (admin) - only when no products use it
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  requireObjectId(req.params.id, 'category id');
  const inUse = await Product.countDocuments({ category: req.params.id });
  if (inUse) throw ApiError.conflict(`This category still has ${inUse} product(s). Move or delete them first.`);
  const deleted = await Category.findByIdAndDelete(req.params.id);
  if (!deleted) throw ApiError.notFound('Category not found.');
  res.status(204).end();
});

module.exports = router;
