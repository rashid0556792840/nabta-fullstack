// Driver app: the trips assigned to the signed-in delivery user.
const express = require('express');
const DeliveryAssignment = require('../models/DeliveryAssignment');
const ApiError = require('../utils/ApiError');
const { requireObjectId } = require('../utils/validate');
const { requireAuth, requireDriver } = require('../middleware/auth');
const workflow = require('../services/orderWorkflow');

const router = express.Router();
router.use(requireAuth, requireDriver);

async function mine(req) {
  requireObjectId(req.params.id, 'assignment id');
  const assignment = await DeliveryAssignment.findOne({ _id: req.params.id, driver: req.user._id });
  if (!assignment) throw ApiError.notFound('Delivery not found.');
  return assignment;
}

// GET /api/delivery/assignments?status=active|done
router.get('/assignments', async (req, res) => {
  const done = req.query.status === 'done';
  const filter = { driver: req.user._id, status: done ? { $in: ['delivered', 'cancelled'] } : { $in: DeliveryAssignment.ACTIVE } };
  const assignments = await DeliveryAssignment.find(filter).sort({ createdAt: done ? -1 : 1 }).limit(done ? 50 : 100);
  res.json({ assignments });
});

// GET /api/delivery/summary - today's numbers for the driver
router.get('/summary', async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [active, today] = await Promise.all([
    DeliveryAssignment.countDocuments({ driver: req.user._id, status: { $in: DeliveryAssignment.ACTIVE } }),
    DeliveryAssignment.aggregate([
      { $match: { driver: req.user._id, status: 'delivered', deliveredAt: { $gte: start } } },
      { $group: { _id: null, trips: { $sum: 1 }, cash: { $sum: '$cashToCollect' } } },
    ]),
  ]);
  res.json({ active, deliveredToday: today[0]?.trips || 0, cashToday: today[0]?.cash || 0 });
});

// POST /api/delivery/assignments/:id/accept
router.post('/assignments/:id/accept', async (req, res) => {
  res.json({ assignment: await workflow.accept(await mine(req), req.user) });
});

// POST /api/delivery/assignments/:id/complete - items handed over and cash collected
router.post('/assignments/:id/complete', async (req, res) => {
  res.json({ assignment: await workflow.complete(await mine(req), req.user) });
});

module.exports = router;
