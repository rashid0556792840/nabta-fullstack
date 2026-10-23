// Order workflow: manual status changes, dispatching items to drivers, and delivery completion.
// All rules live here so routes stay thin and every path updates stock, history and events the same way.
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const DeliveryAssignment = require('../models/DeliveryAssignment');
const ApiError = require('../utils/ApiError');
const storeEvents = require('./events');

const { MANUAL_NEXT, DISPATCHABLE } = Order;
const { ACTIVE } = DeliveryAssignment;

async function restockRemaining(order) {
  await Promise.all(
    order.items.map((i) => {
      const back = i.quantity - (i.deliveredQty || 0);
      return back > 0 ? Product.updateOne({ _id: i.product }, { $inc: { stock: back } }) : null;
    })
  );
}

function pushStatus(order, status, note, actor) {
  order.status = status;
  order.statusHistory.push({ status, note, by: actor?.name });
}

/** Quantity of each order item still waiting for a driver (ordered − delivered − on an active trip). */
async function remainingByIndex(order) {
  const active = await DeliveryAssignment.find({ order: order._id, status: { $in: ACTIVE } });
  const onTheWay = new Map();
  active.forEach((a) => a.items.forEach((it) => onTheWay.set(it.index, (onTheWay.get(it.index) || 0) + it.quantity)));
  return order.items.map((item, index) => item.quantity - (item.deliveredQty || 0) - (onTheWay.get(index) || 0));
}

/** After a trip finishes or is cancelled, work out where the order stands now. */
async function recomputeDeliveryStatus(order, actor, note) {
  const allDelivered = order.items.every((i) => (i.deliveredQty || 0) >= i.quantity);
  const hasActive = await DeliveryAssignment.exists({ order: order._id, status: { $in: ACTIVE } });
  const anyDelivered = order.items.some((i) => (i.deliveredQty || 0) > 0);
  const next = allDelivered ? 'completed' : hasActive ? 'out_for_delivery' : anyDelivered ? 'partially_delivered' : 'processing';
  if (next !== order.status) {
    pushStatus(order, next, note, actor);
    await order.save();
    storeEvents.emit('order:status', { order, by: actor?.email });
  } else {
    await order.save();
  }
  return order;
}

/** Admin/supervisor moves an order one allowed step (confirm, process, cancel). */
async function changeStatus(order, status, note, actor) {
  if (!MANUAL_NEXT[order.status]?.includes(status)) {
    throw ApiError.badRequest(`An order that is ${order.status} cannot become ${status}.`, undefined, 'bad_transition', { from: order.status, to: status });
  }
  if (status === 'cancelled') await restockRemaining(order);
  pushStatus(order, status, note, actor);
  await order.save();
  storeEvents.emit('order:status', { order, by: actor.email });
  return order;
}

/** Customer cancels their own order while it is still pending. */
async function cancelByCustomer(order, actor) {
  if (order.status !== 'pending') throw ApiError.badRequest('Only pending orders can be cancelled.', undefined, 'cancel_not_allowed');
  return changeStatus(order, 'cancelled', 'Cancelled by customer', actor);
}

/**
 * Hand some or all remaining items to a driver.
 * lines = [{ index, quantity }] — index is the item's position in order.items.
 */
async function dispatch(order, { driverId, lines, note }, actor) {
  if (!DISPATCHABLE.includes(order.status)) {
    throw ApiError.badRequest('Mark the order as processing before dispatching it.', undefined, 'not_dispatchable', { status: order.status });
  }
  const driver = await User.findOne({ _id: driverId, role: 'delivery', isActive: true });
  if (!driver) throw ApiError.badRequest('Choose an active delivery driver.', { driver: 'Choose a driver.' }, 'driver_invalid');

  const remaining = await remainingByIndex(order);
  const wanted = new Map();
  for (const line of Array.isArray(lines) ? lines : []) {
    const index = Number(line.index);
    const qty = Number(line.quantity);
    if (!Number.isInteger(index) || !Number.isInteger(qty) || qty < 0 || index < 0 || index >= order.items.length) {
      throw ApiError.badRequest('One of the quantities is invalid.', undefined, 'bad_quantity');
    }
    if (qty > 0) wanted.set(index, (wanted.get(index) || 0) + qty);
  }
  if (!wanted.size) throw ApiError.badRequest('Choose at least one item to deliver.', undefined, 'nothing_to_dispatch');
  for (const [index, qty] of wanted) {
    if (qty > remaining[index]) {
      throw ApiError.badRequest(`Only ${remaining[index]} of ${order.items[index].name} is left to dispatch.`, undefined, 'too_many_to_dispatch', {
        name: order.items[index].name, nameAr: order.items[index].nameAr, left: remaining[index],
      });
    }
  }

  const items = [...wanted].map(([index, quantity]) => ({
    index, quantity, name: order.items[index].name, nameAr: order.items[index].nameAr,
  }));
  // Cash to collect = value of the goods on this trip (+ delivery fee on the first trip)
  const isFirstTrip = !(await DeliveryAssignment.exists({ order: order._id, status: { $ne: 'cancelled' } }));
  const goods = items.reduce((s, it) => s + order.items[it.index].price * it.quantity, 0);
  const cashToCollect = Math.round((goods + (isFirstTrip ? order.deliveryFee : 0)) * 100) / 100;

  const assignment = await DeliveryAssignment.create({
    order: order._id,
    orderNumber: order.orderNumber,
    driver: driver._id,
    assignedBy: actor._id,
    items,
    destination: order.toObject().shippingAddress,
    cashToCollect,
    note: note || '',
  });

  if (order.status !== 'out_for_delivery') {
    pushStatus(order, 'out_for_delivery', `Dispatched to ${driver.name}`, actor);
    await order.save();
    storeEvents.emit('order:status', { order, by: actor.email });
  }
  storeEvents.emit('assignment:created', { assignment, by: actor.email });
  return assignment;
}

async function accept(assignment, driver) {
  if (assignment.status !== 'assigned') throw ApiError.badRequest('This delivery was already accepted or closed.', undefined, 'assignment_closed');
  assignment.status = 'accepted';
  assignment.acceptedAt = new Date();
  await assignment.save();
  storeEvents.emit('assignment:accepted', { assignment, driver });
  return assignment;
}

async function complete(assignment, driver) {
  if (!ACTIVE.includes(assignment.status)) throw ApiError.badRequest('This delivery is already closed.', undefined, 'assignment_closed');
  const order = await Order.findById(assignment.order);
  if (!order) throw ApiError.notFound('Order not found.');
  assignment.items.forEach((it) => {
    const item = order.items[it.index];
    item.deliveredQty = Math.min(item.quantity, (item.deliveredQty || 0) + it.quantity);
  });
  order.markModified('items');
  assignment.status = 'delivered';
  assignment.deliveredAt = new Date();
  if (!assignment.acceptedAt) assignment.acceptedAt = assignment.deliveredAt;
  await assignment.save();
  await recomputeDeliveryStatus(order, driver, `Delivered by ${driver.name}`);
  storeEvents.emit('assignment:delivered', { assignment, driver });
  return assignment;
}

async function cancelAssignment(assignment, actor) {
  if (!ACTIVE.includes(assignment.status)) throw ApiError.badRequest('This delivery is already closed.', undefined, 'assignment_closed');
  assignment.status = 'cancelled';
  assignment.cancelledAt = new Date();
  await assignment.save();
  const order = await Order.findById(assignment.order);
  if (order) await recomputeDeliveryStatus(order, actor, 'Delivery trip cancelled');
  storeEvents.emit('assignment:cancelled', { assignment, by: actor.email });
  return assignment;
}

module.exports = { changeStatus, cancelByCustomer, dispatch, accept, complete, cancelAssignment, remainingByIndex, MANUAL_NEXT };
