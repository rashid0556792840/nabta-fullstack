// File uploads (Unit 3) with Multer. Files are validated, then stored in MongoDB.
const express = require('express');
const multer = require('multer');
const Image = require('../models/Image');
const ApiError = require('../utils/ApiError');
const { requireObjectId } = require('../utils/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../services/activityLog');

const router = express.Router();

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED.has(file.mimetype)) return cb(ApiError.badRequest('Only JPG, PNG, WEBP or GIF images are allowed.'));
    cb(null, true);
  },
});

// Checks the file's first bytes so a renamed non-image is rejected
function looksLikeImage(buf) {
  const hex = buf.subarray(0, 12).toString('hex');
  return (
    hex.startsWith('ffd8ff') || // JPEG
    hex.startsWith('89504e47') || // PNG
    hex.startsWith('47494638') || // GIF
    (hex.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP')
  );
}

// POST /api/images  (multipart/form-data, field name "image")
router.post('/', requireAuth, requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image to upload.');
  if (!looksLikeImage(req.file.buffer)) throw ApiError.badRequest('That file is not a valid image.');

  const image = await Image.create({
    data: req.file.buffer,
    contentType: req.file.mimetype,
    size: req.file.size,
    originalName: req.file.originalname.slice(0, 120),
    uploadedBy: req.user._id,
  });
  await logActivity('image:uploaded', { id: String(image._id), size: image.size });
  res.status(201).json({ id: image._id, url: `/api/images/${image._id}` });
});

// GET /api/images/:id - serves the stored image
router.get('/:id', async (req, res) => {
  requireObjectId(req.params.id, 'image id');
  const image = await Image.findById(req.params.id);
  if (!image) throw ApiError.notFound('Image not found.');
  res.set('Content-Type', image.contentType);
  res.set('Cache-Control', 'public, max-age=604800, immutable');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.send(image.data);
});

module.exports = router;
