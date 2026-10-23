const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['customer', 'admin', 'supervisor', 'delivery'];

// One-to-one relationship (embedded): the default delivery address used at checkout
const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, maxlength: 20 },
    city: { type: String, trim: true, maxlength: 60 },
    street: { type: String, trim: true, maxlength: 160 },
  },
  { _id: false }
);

// One-to-many relationship (embedded): a customer can save several labelled addresses (Home, Work…)
const savedAddressSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 40 },
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    street: { type: String, required: true, trim: true, maxlength: 160 },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    // customer = shopper · admin = owner · supervisor = runs orders & dispatch · delivery = driver
    role: { type: String, enum: ROLES, default: 'customer' },
    phone: { type: String, trim: true, maxlength: 20 },
    language: { type: String, enum: ['ar', 'en'], default: 'ar' },
    address: { type: addressSchema, default: () => ({}) },
    addresses: {
      type: [savedAddressSchema],
      default: [],
      validate: [(v) => v.length <= 10, 'You can save up to 10 addresses.'],
    },
    // Many-to-many relationship: a user favourites many products, a product is favourited by many users
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ role: 1, createdAt: -1 });

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
