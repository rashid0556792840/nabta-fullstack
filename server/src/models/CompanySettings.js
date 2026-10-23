const mongoose = require('mongoose');

// Single document (key: 'main') holding the company details shown across the site.
// The admin edits it from Admin → Company.
const companySchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    nameEn: { type: String, trim: true, maxlength: 80, default: 'Nabta' },
    nameAr: { type: String, trim: true, maxlength: 80, default: 'نبتة' },
    taglineEn: { type: String, trim: true, maxlength: 160, default: '' },
    taglineAr: { type: String, trim: true, maxlength: 160, default: '' },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    whatsapp: { type: String, trim: true, maxlength: 20, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },
    addressEn: { type: String, trim: true, maxlength: 200, default: '' },
    addressAr: { type: String, trim: true, maxlength: 200, default: '' },
    mapsUrl: { type: String, trim: true, maxlength: 500, default: '' },
    instagramUrl: { type: String, trim: true, maxlength: 300, default: '' },
    xUrl: { type: String, trim: true, maxlength: 300, default: '' },
    snapchatUrl: { type: String, trim: true, maxlength: 300, default: '' },
    tiktokUrl: { type: String, trim: true, maxlength: 300, default: '' },
    logoUrl: { type: String, trim: true, maxlength: 300, default: '' },
    hoursEn: { type: String, trim: true, maxlength: 120, default: '' },
    hoursAr: { type: String, trim: true, maxlength: 120, default: '' },
    foundedYear: { type: Number, min: 1900, max: 2100, default: 2018 },
    deliveryFee: { type: Number, min: 0, max: 1000, default: 15 },
    freeDeliveryFrom: { type: Number, min: 0, max: 100000, default: 200 },
  },
  { timestamps: true }
);

companySchema.statics.get = async function get() {
  const found = await this.findOne({ key: 'main' });
  return found || this.create({ key: 'main' });
};

companySchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    delete ret.key;
    return ret;
  },
});

module.exports = mongoose.model('CompanySettings', companySchema);
