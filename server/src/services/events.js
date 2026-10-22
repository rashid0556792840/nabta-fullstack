// Events module (Unit 3): routes emit business events, listeners react to them.
// This keeps the HTTP response fast - email and logging happen after the response.
const { EventEmitter } = require('node:events');
const { sendMail, renderTemplate, escapeHtml } = require('./mailer');
const { logActivity } = require('./activityLog');
const env = require('../config/env');

const storeEvents = new EventEmitter();

const money = (n) => `SAR ${Number(n).toFixed(2)}`;

const STATUS_MESSAGES = {
  pending: 'We have received your order and will confirm it shortly.',
  confirmed: 'Good news - your order has been confirmed and is being prepared.',
  shipped: 'Your order is on its way.',
  delivered: 'Your order has been delivered. Enjoy your new greenery!',
  cancelled: 'Your order has been cancelled. If this is unexpected, please contact us.',
};

async function emailOrder(order, user, headline) {
  const itemsHtml = order.items
    .map(
      (i) => `<tr><td style="padding:6px 0;">${escapeHtml(i.name)} &times; ${i.quantity}</td>` +
        `<td style="padding:6px 0;text-align:right;">${money(i.lineTotal)}</td></tr>`
    )
    .join('');
  const html = await renderTemplate('order-email', {
    headline,
    customerName: user.name,
    message: STATUS_MESSAGES[order.status],
    orderNumber: order.orderNumber,
    status: order.status,
    total: money(order.total),
    itemsHtml,
  });
  return sendMail({ to: user.email, subject: `Nabta order ${order.orderNumber}: ${order.status}`, html });
}

storeEvents.on('order:placed', async ({ order, user }) => {
  await logActivity('order:placed', { orderNumber: order.orderNumber, total: order.total, user: user.email });
  try {
    await emailOrder(order, user, 'Thank you for your order');
  } catch (err) {
    console.error('Order email failed:', err.message);
  }
});

storeEvents.on('order:status', async ({ order, user, by }) => {
  await logActivity('order:status', { orderNumber: order.orderNumber, status: order.status, by });
  try {
    await emailOrder(order, user, 'Order update');
  } catch (err) {
    console.error('Status email failed:', err.message);
  }
});

storeEvents.on('user:registered', ({ user }) => logActivity('user:registered', { email: user.email }));
storeEvents.on('user:login', ({ user }) => logActivity('user:login', { email: user.email }));
storeEvents.on('product:saved', ({ product, action }) => logActivity(`product:${action}`, { name: product.name }));
storeEvents.on('stock:low', ({ product }) => logActivity('stock:low', { name: product.name, stock: product.stock }));

storeEvents.on('contact:received', async ({ message }) => {
  await logActivity('contact:received', { from: message.email, subject: message.subject });
  try {
    const html = await renderTemplate('contact-email', message.toObject());
    await sendMail({ to: env.mail.storeEmail, subject: `Contact form: ${message.subject}`, html });
  } catch (err) {
    console.error('Contact email failed:', err.message);
  }
});

module.exports = storeEvents;
