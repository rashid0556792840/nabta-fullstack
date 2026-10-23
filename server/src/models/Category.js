const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    nameAr: { type: String, trim: true, maxlength: 60, default: '' },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    descriptionAr: { type: String, trim: true, maxlength: 300, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
