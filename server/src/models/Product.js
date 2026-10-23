const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    nameAr: { type: String, trim: true, maxlength: 100, default: '' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    descriptionAr: { type: String, trim: true, maxlength: 1000, default: '' },
    price: { type: Number, required: true, min: 0 },
    // Pack size in grams (spices are sold by weight); optional
    weightGrams: { type: Number, min: 0, max: 100000, default: null },
    stock: { type: Number, required: true, min: 0, default: 0 },
    // One-to-many relationship (referenced): many products belong to one category
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    imageUrl: { type: String, trim: true, default: '' },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes: category filtering, featured products, price sorting
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ price: 1 });

productSchema.virtual('inStock').get(function inStock() {
  return this.stock > 0;
});

productSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.__v;
    delete ret.id;
    return ret;
  },
});

module.exports = mongoose.model('Product', productSchema);
