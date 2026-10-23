// Business events: routes emit them, listeners react (email, activity log, in-app notifications).
// This keeps the HTTP response fast - the side jobs run after the response is sent.
const { EventEmitter } = require('node:events');
const { sendMail, renderTemplate, escapeHtml } = require('./mailer');
const { logActivity } = require('./activityLog');
const { notifyUsers, notifyRoles } = require('./notifications');
const env = require('../config/env');
const CompanySettings = require('../models/CompanySettings');
const User = require('../models/User');

const storeEvents = new EventEmitter();

const TEXT = {
  ar: {
    dir: 'rtl', align: 'right', alignEnd: 'left', alignStart: 'right',
    money: (n) => `${Number(n).toFixed(2)} ر.س`,
    greeting: (name) => `مرحبًا ${name}،`,
    order: 'الطلب', statusLabel: 'الحالة', total: 'الإجمالي',
    footer: 'الدفع عند الاستلام. شكرًا لثقتك بنا.',
    placed: 'شكرًا لطلبك', update: 'تحديث على طلبك',
    status: {
      pending: 'قيد المراجعة', confirmed: 'مؤكد', processing: 'قيد التجهيز', out_for_delivery: 'خرج للتوصيل',
      partially_delivered: 'تم التوصيل جزئيًا', completed: 'مكتمل', cancelled: 'ملغي',
    },
    message: {
      pending: 'استلمنا طلبك وسنؤكده قريبًا.',
      confirmed: 'تم تأكيد طلبك وسنبدأ بتجهيزه.',
      processing: 'نقوم الآن بتجهيز طلبك وتغليفه.',
      out_for_delivery: 'طلبك في الطريق إليك مع مندوب التوصيل.',
      partially_delivered: 'تم توصيل جزء من طلبك، وسيصلك الباقي قريبًا.',
      completed: 'تم توصيل طلبك بالكامل. نتمنى لك أطيب المذاق!',
      cancelled: 'تم إلغاء طلبك. إذا لم يكن هذا متوقعًا فتواصل معنا.',
    },
    replyHeadline: 'وصلك رد على رسالتك', team: 'فريق نبتة', yourMessage: 'رسالتك',
  },
  en: {
    dir: 'ltr', align: 'left', alignEnd: 'right', alignStart: 'left',
    money: (n) => `SAR ${Number(n).toFixed(2)}`,
    greeting: (name) => `Hello ${name},`,
    order: 'Order', statusLabel: 'Status', total: 'Total',
    footer: 'Payment: cash on delivery. Thank you for trusting us.',
    placed: 'Thank you for your order', update: 'Order update',
    status: {
      pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing', out_for_delivery: 'Out for delivery',
      partially_delivered: 'Partially delivered', completed: 'Completed', cancelled: 'Cancelled',
    },
    message: {
      pending: 'We have received your order and will confirm it shortly.',
      confirmed: 'Your order is confirmed and will be prepared soon.',
      processing: 'We are packing your order now.',
      out_for_delivery: 'Your order is on its way with our driver.',
      partially_delivered: 'Part of your order has been delivered; the rest is coming soon.',
      completed: 'Your order has been fully delivered. Enjoy the flavour!',
      cancelled: 'Your order has been cancelled. If this is unexpected, please contact us.',
    },
    replyHeadline: 'We replied to your message', team: 'Nabta team', yourMessage: 'Your message',
  },
};

async function storeName(lang) {
  const c = await CompanySettings.get();
  return lang === 'ar' ? c.nameAr || c.nameEn : c.nameEn || c.nameAr;
}

async function emailOrder(order, user, kind) {
  const lang = user.language === 'en' ? 'en' : 'ar';
  const T = TEXT[lang];
  const itemsHtml = order.items
    .map(
      (i) => `<tr><td style="padding:6px 0;">${escapeHtml(lang === 'ar' && i.nameAr ? i.nameAr : i.name)} &times; ${i.quantity}</td>` +
        `<td style="padding:6px 0;text-align:${T.alignEnd};">${T.money(i.lineTotal)}</td></tr>`
    )
    .join('');
  const html = await renderTemplate('order-email', {
    lang, dir: T.dir, align: T.align, alignEnd: T.alignEnd,
    storeName: await storeName(lang),
    headline: kind === 'placed' ? T.placed : T.update,
    greeting: T.greeting(user.name),
    message: T.message[order.status],
    orderLabel: T.order, statusLabel: T.statusLabel, totalLabel: T.total,
    orderNumber: order.orderNumber,
    status: T.status[order.status],
    total: T.money(order.total),
    footer: T.footer,
    itemsHtml,
  });
  return sendMail({ to: user.email, subject: `${T.order} ${order.orderNumber}: ${T.status[order.status]}`, html });
}

const safely = (label, fn) => async (payload) => {
  try {
    await fn(payload);
  } catch (err) {
    console.error(`${label} failed:`, err.message);
  }
};

storeEvents.on('order:placed', safely('order:placed', async ({ order, user }) => {
  await logActivity('order:placed', { orderNumber: order.orderNumber, total: order.total, user: user.email });
  await notifyRoles(['admin', 'supervisor'], 'order_placed', { orderNumber: order.orderNumber, total: order.total, customer: user.name }, '/admin/orders');
  await emailOrder(order, user, 'placed');
}));

storeEvents.on('order:status', safely('order:status', async ({ order, by }) => {
  await logActivity('order:status', { orderNumber: order.orderNumber, status: order.status, by });
  const user = await User.findById(order.user);
  if (!user) return;
  await notifyUsers([user._id], 'order_status', { orderNumber: order.orderNumber, status: order.status }, `/orders/${order._id}`);
  await emailOrder(order, user, 'update');
}));

storeEvents.on('assignment:created', safely('assignment:created', async ({ assignment, by }) => {
  await logActivity('delivery:assigned', { orderNumber: assignment.orderNumber, by });
  await notifyUsers([assignment.driver], 'delivery_assigned', { orderNumber: assignment.orderNumber, city: assignment.destination?.city }, '/delivery');
}));

storeEvents.on('assignment:accepted', safely('assignment:accepted', async ({ assignment, driver }) => {
  await logActivity('delivery:accepted', { orderNumber: assignment.orderNumber, by: driver.email });
  await notifyRoles(['admin', 'supervisor'], 'delivery_accepted', { orderNumber: assignment.orderNumber, driver: driver.name }, '/admin/deliveries');
}));

storeEvents.on('assignment:delivered', safely('assignment:delivered', async ({ assignment, driver }) => {
  await logActivity('delivery:delivered', { orderNumber: assignment.orderNumber, by: driver.email });
  await notifyRoles(['admin', 'supervisor'], 'delivery_done', { orderNumber: assignment.orderNumber, driver: driver.name }, '/admin/deliveries');
}));

storeEvents.on('assignment:cancelled', safely('assignment:cancelled', async ({ assignment, by }) => {
  await logActivity('delivery:cancelled', { orderNumber: assignment.orderNumber, by });
  await notifyUsers([assignment.driver], 'delivery_cancelled', { orderNumber: assignment.orderNumber }, '/delivery');
}));

storeEvents.on('user:registered', safely('user:registered', ({ user }) => logActivity('user:registered', { email: user.email })));
storeEvents.on('user:login', safely('user:login', ({ user }) => logActivity('user:login', { email: user.email })));
storeEvents.on('product:saved', safely('product:saved', ({ product, action }) => logActivity(`product:${action}`, { name: product.name })));

storeEvents.on('stock:low', safely('stock:low', async ({ product }) => {
  await logActivity('stock:low', { name: product.name, stock: product.stock });
  await notifyRoles(['admin'], 'stock_low', { name: product.name, nameAr: product.nameAr, stock: product.stock }, '/admin/products');
}));

storeEvents.on('contact:received', safely('contact:received', async ({ message }) => {
  await logActivity('contact:received', { from: message.email, subject: message.subject });
  await notifyRoles(['admin', 'supervisor'], 'message_new', { subject: message.subject, name: message.name }, '/admin/messages');
  const html = await renderTemplate('contact-email', message.toObject());
  await sendMail({ to: env.mail.storeEmail, subject: `Contact form: ${message.subject}`, html });
}));

storeEvents.on('contact:replied', safely('contact:replied', async ({ message, reply, by }) => {
  await logActivity('contact:replied', { to: message.email, subject: message.subject, by });
  const user = message.user ? await User.findById(message.user) : null;
  if (user) await notifyUsers([user._id], 'message_reply', { subject: message.subject }, '/messages');
  const lang = user?.language === 'en' ? 'en' : 'ar';
  const T = TEXT[lang];
  const html = await renderTemplate('reply-email', {
    lang, dir: T.dir, align: T.align, alignStart: T.alignStart,
    storeName: await storeName(lang),
    headline: T.replyHeadline,
    greeting: T.greeting(message.name),
    reply: reply.body,
    authorName: reply.authorName,
    teamLabel: T.team,
    yourMessageLabel: T.yourMessage,
    subject: message.subject,
    original: message.message,
  });
  await sendMail({ to: message.email, subject: `Re: ${message.subject}`, html });
}));

module.exports = storeEvents;
