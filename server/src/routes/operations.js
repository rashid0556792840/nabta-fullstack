// Operations (admin + supervisor): hand orders to drivers and follow delivery trips.
const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryAssignment = require('../models/DeliveryAssignment');
const ApiError = require('../utils/ApiError');
const { sanitizeText, requireObjectId, isObjectId } = require('../utils/validate');
const { requireAuth, requireStaff } = require('../middleware/auth');
const workflow = require('../services/orderWorkflow');

const router = express.Router();
router.use(requireAuth, requireStaff);

// GET /api/operations/drivers - active drivers with how many trips they are on now
router.get('/drivers', async (_req, res) => {
  const drivers = await User.aggregate([
    { $match: { role: 'delivery', isActive: true } },
    {
      $lookup: {
        from: 'deliveryassignments',
        let: { id: '$_id' },
        pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$driver', '$$id'] }, { $in: ['$status', ['assigned', 'accepted']] }] } } }, { $count: 'n' }],
        as: 'active',
      },
    },
    { $project: { name: 1, phone: 1, email: 1, activeTrips: { $ifNull: [{ $first: '$active.n' }, 0] } } },
    { $sort: { activeTrips: 1, name: 1 } },
  ]);
  res.json({ drivers });
});

// POST /api/operations/orders/:id/dispatch  { driverId, lines: [{index, quantity}], note }
router.post('/orders/:id/dispatch', async (req, res) => {
  requireObjectId(req.params.id, 'order id');
  if (!isObjectId(req.body.driverId)) throw ApiError.badRequest('Choose a driver.', { driver: 'Choose a driver.' }, 'driver_invalid');
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found.');
  const assignment = await workflow.dispatch(
    order,
    { driverId: req.body.driverId, lines: req.body.lines, note: sanitizeText(req.body.note, 500) },
    req.user
  );
  res.status(201).json({ assignment: await assignment.populate('driver', 'name phone') });
});

// GET /api/operations/assignments?status=active|assigned|accepted|delivered|cancelled
router.get('/assignments', async (req, res) => {
  const filter = {};
  if (req.query.status === 'active') filter.status = { $in: DeliveryAssignment.ACTIVE };
  else if (DeliveryAssignment.ASSIGNMENT_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (isObjectId(req.query.driver)) filter.driver = req.query.driver;
  const assignments = await DeliveryAssignment.find(filter)
    .populate('driver', 'name phone')
    .populate('assignedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ assignments });
});

// POST /api/operations/assignments/:id/cancel - take a trip back from the driver
router.post('/assignments/:id/cancel', async (req, res) => {
  requireObjectId(req.params.id, 'assignment id');
  const assignment = await DeliveryAssignment.findById(req.params.id);
  if (!assignment) throw ApiError.notFound('Delivery not found.');
  await workflow.cancelAssignment(assignment, req.user);
  res.json({ assignment: await assignment.populate('driver', 'name phone') });
});

module.exports = router;
