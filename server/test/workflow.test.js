// Unit tests for the order state machine (no database needed).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-long-enough-for-the-checks';
const test = require('node:test');
const assert = require('node:assert/strict');
const Order = require('../src/models/Order');
const workflow = require('../src/services/orderWorkflow');

test('staff can only move orders one allowed step', () => {
  assert.deepEqual(Order.MANUAL_NEXT.pending, ['confirmed', 'cancelled']);
  assert.deepEqual(Order.MANUAL_NEXT.confirmed, ['processing', 'cancelled']);
  assert.deepEqual(Order.MANUAL_NEXT.processing, ['cancelled']);
  // Delivery stages are reached only through dispatch and drivers
  for (const s of ['out_for_delivery', 'partially_delivered', 'completed', 'cancelled']) {
    assert.deepEqual(Order.MANUAL_NEXT[s], []);
  }
});

test('every status has a rule and only processing-or-later can be dispatched', () => {
  for (const s of Order.ORDER_STATUSES) assert.ok(Array.isArray(Order.MANUAL_NEXT[s]), s);
  assert.deepEqual(Order.DISPATCHABLE, ['processing', 'out_for_delivery', 'partially_delivered']);
});

test('changeStatus rejects a jump that skips steps', async () => {
  const order = { status: 'pending' };
  await assert.rejects(() => workflow.changeStatus(order, 'completed', '', { email: 'x' }), (err) => err.code === 'bad_transition');
});

test('customers can cancel only pending orders', async () => {
  await assert.rejects(() => workflow.cancelByCustomer({ status: 'processing' }, { email: 'x' }), (err) => err.code === 'cancel_not_allowed');
});

test('dispatch refuses orders that are not being processed', async () => {
  await assert.rejects(() => workflow.dispatch({ status: 'confirmed' }, { driverId: 'x', lines: [] }, {}), (err) => err.code === 'not_dispatchable');
});
