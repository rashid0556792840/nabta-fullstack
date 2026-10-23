const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'pending', // placed by the customer
  'confirmed', // accepted by the store
  'processing', // being packed
  'out_for_delivery', // at least one delivery is on the road
  'partially_delivered', // some items delivered, the rest still to dispatch
  'completed', // every item delivered
  'cancelled',
];

// Changes staff can make by hand. Delivery stages are reached through dispatch and drivers.
const MANUAL_NEXT = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['cancelled'],
  out_for_delivery: [],
  partially_delivered: [],
  completed: [],
  cancelled: [],
};

// Statuses from which a delivery can be dispatched
const DISPATCHABLE = ['processing', 'out_for_delivery', 'partially_delivered'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true }, // snapshot so old orders keep the original name
    nameAr: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 }, // snapshot of price at purchase time
    quantity: { type: Number, required: true, min: 1, max: 50 },
    lineTotal: { type: Number, required: true, min: 0 },
    deliveredQty: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [orderItemSchema],
      validate: [(v) => v.length > 0, 'An order needs at least one item'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: 'cash_on_delivery' },
    shippingAddress: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      street: { type: String, required: true, trim: true },
      notes: { type: String, trim: true, default: '' },
    },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
    statusHistory: [
      {
        _id: false,
        status: { type: String, enum: ORDER_STATUSES },
        at: { type: Date, default: Date.now },
        note: String,
        by: String,
      },
    ],
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

orderSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.MANUAL_NEXT = MANUAL_NEXT;
module.exports.DISPATCHABLE = DISPATCHABLE;
