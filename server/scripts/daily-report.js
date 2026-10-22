// Automation: emails the store a summary of the last 24 hours.
// Schedule it with Windows Task Scheduler, cron, or a Render Cron Job:  npm run report:daily
const mongoose = require('mongoose');
const env = require('../src/config/env');
const { connectDB } = require('../src/config/db');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const { sendMail, escapeHtml } = require('../src/services/mailer');
const { logActivity } = require('../src/services/activityLog');

async function main() {
  await connectDB();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [summary] = await Order.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      },
    },
  ]);
  const lowStock = await Product.find({ isActive: true, stock: { $lte: 5 } }).sort({ stock: 1 }).limit(20);

  const s = summary || { orders: 0, revenue: 0, cancelled: 0 };
  const rows = lowStock.map((p) => `<li>${escapeHtml(p.name)} - ${p.stock} left</li>`).join('') || '<li>None</li>';
  const html = `<h2 style="color:#174b37">Nabta daily report</h2>
    <p>Last 24 hours: <strong>${s.orders}</strong> orders, <strong>SAR ${s.revenue.toFixed(2)}</strong> revenue, ${s.cancelled} cancelled.</p>
    <h3>Low stock</h3><ul>${rows}</ul>`;

  const result = await sendMail({ to: env.mail.storeEmail, subject: `Nabta daily report - ${new Date().toDateString()}`, html });
  await logActivity('report:daily', { orders: s.orders, revenue: s.revenue });
  console.log('Daily report sent:', result);
}

main()
  .catch((err) => {
    console.error('Daily report failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
