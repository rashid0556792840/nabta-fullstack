const mongoose = require('mongoose');

// A reply written by the store (embedded one-to-many: one message has many replies)
const replySchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    authorName: { type: String, required: true, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const contactMessageSchema = new mongoose.Schema(
  {
    // Set when the sender was signed in, so the reply appears in their account
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    isRead: { type: Boolean, default: false },
    replies: { type: [replySchema], default: [] },
  },
  { timestamps: true }
);

contactMessageSchema.index({ isRead: 1, createdAt: -1 });
contactMessageSchema.index({ user: 1, createdAt: -1 });
contactMessageSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
