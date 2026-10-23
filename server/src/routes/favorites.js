// Many-to-many relationship: users <-> products (user.favorites holds product references)
const express = require('express');
const Product = require('../models/Product');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { requireObjectId } = require('../utils/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/favorites
router.get('/', async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'favorites',
    match: { isActive: true },
    populate: { path: 'category', select: 'name nameAr' },
  });
  res.json({ products: user.favorites });
});

// POST /api/favorites/:productId
router.post('/:productId', async (req, res) => {
  requireObjectId(req.params.productId, 'product id');
  if (!(await Product.exists({ _id: req.params.productId, isActive: true }))) {
    throw ApiError.notFound('Product not found.');
  }
  // $addToSet prevents duplicates
  await User.updateOne({ _id: req.user._id }, { $addToSet: { favorites: req.params.productId } });
  res.status(201).json({ ids: await favoriteIds(req.user._id) });
});

// DELETE /api/favorites/:productId
router.delete('/:productId', async (req, res) => {
  requireObjectId(req.params.productId, 'product id');
  await User.updateOne({ _id: req.user._id }, { $pull: { favorites: req.params.productId } });
  res.json({ ids: await favoriteIds(req.user._id) });
});

async function favoriteIds(userId) {
  const user = await User.findById(userId).select('favorites');
  return user.favorites.map(String);
}

module.exports = router;
