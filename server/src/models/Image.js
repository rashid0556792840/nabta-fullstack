const mongoose = require('mongoose');

// Uploaded product images are stored inside MongoDB so they survive
// redeploys on hosts with temporary disks (such as Render's free tier).
const imageSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    originalName: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Image', imageSchema);
