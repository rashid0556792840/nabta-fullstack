// Seeds demo data: categories, products (with generated images), a demo customer and sample orders.
// Usage: npm run seed            (adds data only if the store is empty)
//        npm run seed -- --reset (wipes store collections first)
const mongoose = require('mongoose');
const env = require('../src/config/env');
const { connectDB } = require('../src/config/db');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Image = require('../src/models/Image');
const ContactMessage = require('../src/models/ContactMessage');

const CATEGORIES = [
  { name: 'Indoor Plants', description: 'Easy-going greenery for homes and offices.' },
  { name: 'Outdoor Plants', description: 'Hardy plants for balconies and gardens.' },
  { name: 'Pots & Planters', description: 'Ceramic, terracotta and hanging planters.' },
  { name: 'Plant Care', description: 'Soil, feed and tools to keep plants thriving.' },
];

const PRODUCTS = [
  ['Snake Plant', 'Indoor Plants', 79, 25, 'Upright, architectural leaves. Tolerates low light and forgetful watering.', ['#2f6b47', '#d1e17e']],
  ['Peace Lily', 'Indoor Plants', 95, 12, 'Glossy leaves and white blooms. Tells you when it is thirsty by drooping.', ['#286449', '#ffffff']],
  ['Monstera Deliciosa', 'Indoor Plants', 149, 8, 'Iconic split leaves that bring a tropical feel to any room.', ['#1e5a3c', '#a9cf7a']],
  ['Pothos Golden', 'Indoor Plants', 45, 40, 'Trailing heart-shaped leaves. Perfect for shelves and hanging pots.', ['#3c7a4c', '#e3dc6e']],
  ['Bougainvillea', 'Outdoor Plants', 65, 18, 'Bright paper-like flowers that love full sun and heat.', ['#3d6b3a', '#d9467e']],
  ['Olive Tree (Young)', 'Outdoor Plants', 220, 4, 'A slow-growing Mediterranean classic for large pots or gardens.', ['#5c7a4a', '#b5c9a6']],
  ['Jasmine', 'Outdoor Plants', 55, 22, 'Climbing vine with sweetly scented white flowers.', ['#2e6a44', '#fdfbf2']],
  ['Terracotta Pot 20cm', 'Pots & Planters', 29, 60, 'Breathable clay pot with drainage hole and saucer.', ['#b8653e', '#e9a77b']],
  ['Ceramic Planter Sage', 'Pots & Planters', 69, 15, 'Matte glazed planter in soft sage green.', ['#9fb59a', '#e0eddb']],
  ['Hanging Basket', 'Pots & Planters', 39, 3, 'Woven hanging planter with a removable liner.', ['#a07d4f', '#d8c39a']],
  ['Premium Potting Mix 10L', 'Plant Care', 35, 50, 'Peat-free mix with perlite for healthy roots.', ['#5a4334', '#8b6b52']],
  ['Liquid Plant Feed', 'Plant Care', 25, 35, 'Balanced feed for leafy houseplants. Use every two weeks.', ['#286449', '#d1e17e']],
  ['Mist Spray Bottle', 'Plant Care', 19, 5, 'Fine-mist sprayer for humidity-loving plants.', ['#7aa6a1', '#e6f2f0']],
  ['Pruning Shears', 'Plant Care', 49, 14, 'Sharp stainless-steel blades for clean cuts.', ['#40514a', '#c9d3cc']],
];

/** Draws a simple plant illustration as SVG so the demo has images without external links. */
function plantSvg(name, [leaf, accent]) {
  const label = name.replace(/[<&>"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#f1f4ea"/>
  <circle cx="320" cy="80" r="46" fill="${accent}" opacity=".55"/>
  <g fill="${leaf}">
    <path d="M200 250 C150 200 120 140 150 90 C185 120 205 180 200 250Z"/>
    <path d="M200 250 C250 200 285 150 262 98 C222 128 198 185 200 250Z" opacity=".85"/>
    <path d="M200 255 C140 240 95 205 85 160 C135 160 180 200 200 255Z" opacity=".75"/>
    <path d="M200 255 C260 240 305 210 318 170 C268 168 222 205 200 255Z" opacity=".7"/>
  </g>
  <path d="M140 250 H260 L245 340 H155 Z" fill="#c4774c"/>
  <rect x="132" y="240" width="136" height="22" rx="6" fill="#a95f3a"/>
  <text x="200" y="378" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="#20372b">${label}</text>
</svg>`;
}

async function seed() {
  await connectDB();
  const reset = process.argv.includes('--reset');

  if (reset) {
    await Promise.all([Category, Product, Order, Image, ContactMessage].map((m) => m.deleteMany({})));
    await User.deleteMany({ role: 'customer' });
    console.log('Store collections cleared.');
  } else if (await Product.estimatedDocumentCount()) {
    console.log('Products already exist - nothing seeded. Use "npm run seed -- --reset" to start fresh.');
    return;
  }

  const categories = await Category.insertMany(CATEGORIES);
  const byName = Object.fromEntries(categories.map((c) => [c.name, c._id]));

  const products = [];
  for (const [name, category, price, stock, description, colors] of PRODUCTS) {
    const svg = Buffer.from(plantSvg(name, colors));
    const image = await Image.create({ data: svg, contentType: 'image/svg+xml', size: svg.length, originalName: `${name}.svg` });
    products.push(
      await Product.create({ name, category: byName[category], price, stock, description, imageUrl: `/api/images/${image._id}` })
    );
  }
  console.log(`Seeded ${categories.length} categories and ${products.length} products.`);

  // Demo customer
  let customer = await User.findOne({ email: 'demo@nabta.local' });
  if (!customer) {
    customer = new User({
      name: 'Demo Customer',
      email: 'demo@nabta.local',
      phone: '+966 50 123 4567',
      address: { fullName: 'Demo Customer', phone: '+966 50 123 4567', city: 'Riyadh', street: 'King Fahd Road, Building 12' },
      favorites: [products[0]._id, products[2]._id],
    });
    await customer.setPassword('DemoPass123');
    await customer.save();
  }

  // Sample orders spread across the last week (for the dashboard charts)
  const statuses = ['delivered', 'delivered', 'shipped', 'confirmed', 'pending', 'cancelled', 'delivered'];
  for (let i = 0; i < statuses.length; i += 1) {
    const picks = [products[i % products.length], products[(i * 3 + 1) % products.length]];
    const items = picks.map((p, k) => ({ product: p._id, name: p.name, price: p.price, quantity: k + 1, lineTotal: p.price * (k + 1) }));
    const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
    const deliveryFee = subtotal >= 200 ? 0 : 15;
    const createdAt = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    await Order.create({
      orderNumber: `NAB-DEMO-${String(i + 1).padStart(3, '0')}`,
      user: customer._id,
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      shippingAddress: { ...customer.address.toObject(), notes: '' },
      status: statuses[i],
      statusHistory: [{ status: 'pending', at: createdAt, note: 'Order placed' }, ...(statuses[i] !== 'pending' ? [{ status: statuses[i], at: createdAt }] : [])],
      createdAt,
      updatedAt: createdAt,
    });
  }
  console.log('Seeded demo customer (demo@nabta.local / DemoPass123) and 7 sample orders.');

  await ContactMessage.create({
    name: 'Sara Ahmed',
    email: 'sara@example.com',
    subject: 'Plant care question',
    message: 'How often should I water the snake plant during summer?',
  });

  if (env.admin.email) console.log(`Admin login: ${env.admin.email} (password from ADMIN_PASSWORD in .env)`);
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
