const mongoose = require('mongoose');

const ASSIGNMENT_STATUSES = ['assigned', 'accepted', 'delivered', 'cancelled'];
const ACTIVE = ['assigned', 'accepted'];

// A delivery trip: some (or all) items of one order, handed to one driver.
// Several assignments per order allow partial deliveries.
const assignmentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumber: { type: String, required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        _id: false,
        index: { type: Number, required: true }, // position of the item in order.items
        name: { type: String, required: true },
        nameAr: { type: String, default: '' },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    // Snapshot of where to go, so the driver never needs access to the whole order
    destination: {
      fullName: String,
      phone: String,
      city: String,
      street: String,
      notes: String,
    },
    cashToCollect: { type: Number, default: 0 },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: ASSIGNMENT_STATUSES, default: 'assigned' },
    acceptedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

assignmentSchema.index({ driver: 1, status: 1, createdAt: -1 });
assignmentSchema.index({ order: 1 });

module.exports = mongoose.model('DeliveryAssignment', assignmentSchema);
module.exports.ASSIGNMENT_STATUSES = ASSIGNMENT_STATUSES;
module.exports.ACTIVE = ACTIVE;
