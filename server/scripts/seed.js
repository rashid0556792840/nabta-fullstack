// Seeds the Nabta spice store: company details, categories, products (with drawn images),
// staff accounts, a demo customer, sample orders across every status and delivery trips.
// Usage: npm run seed            (adds data only if the store is empty)
//        npm run seed -- --reset (wipes store collections first; the admin account is kept)
const mongoose = require('mongoose');
const env = require('../src/config/env');
const { connectDB } = require('../src/config/db');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const Image = require('../src/models/Image');
const ContactMessage = require('../src/models/ContactMessage');
const DeliveryAssignment = require('../src/models/DeliveryAssignment');
const Notification = require('../src/models/Notification');
const CompanySettings = require('../src/models/CompanySettings');

const COMPANY = {
  nameEn: 'Nabta Spices',
  nameAr: 'بهارات نبتة',
  taglineEn: 'Spices you can trust, since 2018',
  taglineAr: 'بهارات تثق بجودتها منذ 2018',
  phone: '0531130555',
  whatsapp: '966531130555',
  email: '',
  addressEn: 'Al Madinah Al Munawwarah, Saudi Arabia',
  addressAr: 'المدينة المنورة، المملكة العربية السعودية',
  mapsUrl: 'https://maps.app.goo.gl/Mcoj1SWbU2tL8qXj9?g_st=aw',
  hoursEn: 'Daily 9:00 AM – 11:00 PM',
  hoursAr: 'يومياً من 9 صباحاً حتى 11 مساءً',
  foundedYear: 2018,
  deliveryFee: 15,
  freeDeliveryFrom: 200,
};

const CATEGORIES = [
  { key: 'blends', name: 'Spice Blends', nameAr: 'خلطات البهارات', description: 'House blends for kabsa, mandi and everyday cooking.', descriptionAr: 'خلطاتنا الخاصة للكبسة والمندي والطبخ اليومي.', color: '#b5541c' },
  { key: 'ground', name: 'Ground Spices', nameAr: 'بهارات مطحونة', description: 'Freshly ground in small batches for full aroma.', descriptionAr: 'تُطحن بكميات صغيرة لتحتفظ بكامل نكهتها.', color: '#c98a1b' },
  { key: 'whole', name: 'Whole Spices', nameAr: 'بهارات حب', description: 'Whole seeds, pods and sticks, hand-sorted.', descriptionAr: 'حبوب وقرون وأعواد منتقاة يدوياً.', color: '#6b3f22' },
  { key: 'premium', name: 'Saffron & Cardamom', nameAr: 'زعفران وهيل', description: 'Premium saffron and cardamom for coffee and rice.', descriptionAr: 'زعفران وهيل فاخر للقهوة والأرز.', color: '#a3241a' },
  { key: 'herbs', name: 'Herbs & Dried', nameAr: 'أعشاب ومجففات', description: 'Dried herbs, black lime and za\'atar.', descriptionAr: 'أعشاب مجففة ولومي وزعتر.', color: '#4f7a34' },
];

// [name, nameAr, category key, price SAR, stock, grams, featured, description, descriptionAr, colour, texture]
const PRODUCTS = [
  ['Kabsa Spice Mix', 'بهارات كبسة', 'blends', 25, 60, 250, true, 'Our best-selling blend: cardamom, cloves, black pepper and dried lime, balanced for Saudi kabsa.', 'خلطتنا الأكثر مبيعاً: هيل وقرنفل وفلفل أسود ولومي، متوازنة للكبسة السعودية.', '#b5541c', 'powder'],
  ['Mandi Spice Mix', 'بهارات مندي', 'blends', 27, 45, 250, true, 'Smoky, warm blend for mandi and slow-cooked meat.', 'خلطة دافئة بنكهة مدخنة للمندي واللحوم المطبوخة على نار هادئة.', '#a5481e', 'powder'],
  ['Seven Spices', 'بهارات سبع', 'blends', 23, 38, 250, true, 'Classic seven-spice mix for stews, kofta and rice.', 'خلطة البهارات السبع الكلاسيكية لليخنات والكفتة والأرز.', '#8a4a26', 'powder'],
  ['Arabic Coffee Spice', 'بهارات قهوة عربية', 'blends', 35, 30, 200, true, 'Cardamom, saffron and clove, ready to add to Arabic coffee.', 'هيل وزعفران وقرنفل جاهزة للإضافة إلى القهوة العربية.', '#c8a15a', 'powder'],
  ['Ground Turmeric', 'كركم مطحون', 'ground', 16, 70, 250, true, 'Bright golden turmeric with an earthy aroma.', 'كركم ذهبي اللون بنكهة ترابية مميزة.', '#e0a21b', 'powder'],
  ['Ground Black Pepper', 'فلفل أسود مطحون', 'ground', 24, 55, 250, false, 'Bold and sharp, ground from whole Indian peppercorns.', 'نكهة قوية وحادة، مطحون من حبوب الفلفل الهندي.', '#3b3330', 'powder'],
  ['Ground Cumin', 'كمون مطحون', 'ground', 20, 48, 250, false, 'Warm cumin for falafel, hummus and grills.', 'كمون دافئ للفلافل والحمص والمشويات.', '#9a6b37', 'powder'],
  ['Sweet Paprika', 'بابريكا حلوة', 'ground', 18, 4, 200, false, 'Mild, deep-red paprika for colour and gentle sweetness.', 'بابريكا حمراء معتدلة تمنح لوناً وحلاوة خفيفة.', '#c0391f', 'powder'],
  ['Ground Ginger', 'زنجبيل مطحون', 'ground', 19, 26, 200, false, 'Zesty ginger for tea, baking and marinades.', 'زنجبيل منعش للشاي والمخبوزات والتتبيلات.', '#d4b06a', 'powder'],
  ['Whole Black Pepper', 'فلفل أسود حب', 'whole', 22, 40, 250, false, 'Hand-sorted peppercorns for grinding fresh.', 'حبوب فلفل منتقاة يدوياً لطحنها طازجة.', '#2f2926', 'seeds'],
  ['Cumin Seeds', 'كمون حب', 'whole', 18, 35, 250, false, 'Whole cumin seeds, toast before use for extra aroma.', 'كمون حب، يُحمّص قبل الاستخدام لرائحة أقوى.', '#8a6236', 'seeds'],
  ['Cloves', 'قرنفل', 'whole', 20, 3, 100, false, 'Aromatic whole cloves for rice, coffee and sweets.', 'قرنفل عطري للأرز والقهوة والحلويات.', '#5a3220', 'seeds'],
  ['Cinnamon Sticks', 'قرفة أعواد', 'whole', 24, 32, 200, false, 'Sweet Ceylon-style cinnamon sticks.', 'أعواد قرفة حلوة النكهة.', '#9c5a2c', 'sticks'],
  ['Green Cardamom', 'هيل حب', 'premium', 65, 28, 250, true, 'Large green pods with an intense aroma, the heart of Arabic coffee.', 'هيل أخضر كبير برائحة قوية، أساس القهوة العربية.', '#7d9a3c', 'seeds'],
  ['Negin Saffron', 'زعفران نقين', 'premium', 49, 15, 4, true, 'Top-grade saffron threads for rice, desserts and coffee.', 'شعيرات زعفران فاخرة للأرز والحلويات والقهوة.', '#b3261e', 'threads'],
  ['Dried Black Lime', 'لومي أسود', 'herbs', 21, 22, 250, true, 'Whole dried limes that add a tangy depth to kabsa and soups.', 'لومي مجفف يضيف نكهة حامضة عميقة للكبسة والشوربات.', '#4a3a2a', 'seeds'],
  ['Dried Mint', 'نعناع مجفف', 'herbs', 12, 50, 100, false, 'Fragrant dried mint for tea, yoghurt and salads.', 'نعناع مجفف عطري للشاي واللبن والسلطات.', '#5d7f3a', 'leaves'],
  ['Za\'atar Mix', 'زعتر', 'herbs', 18, 42, 250, false, 'Thyme, sesame and sumac, perfect with olive oil.', 'زعتر وسمسم وسماق، مثالي مع زيت الزيتون.', '#6f7a3a', 'powder'],
];

const esc = (s) => String(s).replace(/[<&>"]/g, '');

/** Draws a spice bowl illustration so the demo needs no external images. */
function spiceSvg(nameEn, nameAr, colour, texture, seed) {
  let rand = seed * 9301 + 49297;
  const rnd = () => {
    rand = (rand * 9301 + 49297) % 233280;
    return rand / 233280;
  };
  const dots = [];
  if (texture !== 'powder') {
    for (let i = 0; i < 46; i += 1) {
      const x = 120 + rnd() * 160;
      const y = 150 + rnd() * 70 + Math.abs(x - 200) * 0.25;
      if (texture === 'sticks') dots.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="44" height="9" rx="4" fill="${colour}" stroke="#00000022" transform="rotate(${(rnd() * 70 - 35).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`);
      else if (texture === 'threads') dots.push(`<path d="M${x.toFixed(0)} ${y.toFixed(0)} q6 -10 14 -2" stroke="${colour}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
      else if (texture === 'leaves') dots.push(`<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="9" ry="4" fill="${colour}" transform="rotate(${(rnd() * 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`);
      else dots.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(4 + rnd() * 4).toFixed(1)}" fill="${colour}" stroke="#00000030"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs><radialGradient id="g" cx="50%" cy="35%" r="60%"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f3e8d3"/></radialGradient></defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <circle cx="330" cy="70" r="40" fill="${colour}" opacity=".12"/>
  <circle cx="70" cy="320" r="26" fill="${colour}" opacity=".10"/>
  <ellipse cx="200" cy="300" rx="140" ry="18" fill="#00000014"/>
  <path d="M110 160 Q200 ${texture === 'powder' ? 80 : 120} 290 160 Z" fill="${colour}"/>
  ${dots.join('\n  ')}
  <path d="M70 180 H330 Q320 290 200 292 Q80 290 70 180 Z" fill="#7a4b2a"/>
  <path d="M70 180 H330 Q328 196 322 210 H78 Q72 196 70 180 Z" fill="#8f5a33"/>
  <path d="M96 230 Q200 250 304 230" stroke="#ffffff33" stroke-width="4" fill="none"/>
  <text x="200" y="345" font-family="Tahoma, Arial, sans-serif" font-size="26" font-weight="700" text-anchor="middle" fill="#3a2a1c" direction="rtl">${esc(nameAr)}</text>
  <text x="200" y="374" font-family="Arial, sans-serif" font-size="15" text-anchor="middle" fill="#7a6250" letter-spacing="1">${esc(nameEn).toUpperCase()}</text>
</svg>`;
}

async function saveSvg(svg, name) {
  const data = Buffer.from(svg);
  const image = await Image.create({ data, contentType: 'image/svg+xml', size: data.length, originalName: `${name}.svg` });
  return `/api/images/${image._id}`;
}

async function upsertUser({ email, password, ...fields }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ email, ...fields });
    await user.setPassword(password);
    await user.save();
  }
  return user;
}

const DAY = 24 * 60 * 60 * 1000;

async function seed() {
  await connectDB();
  const reset = process.argv.includes('--reset');

  if (reset) {
    await Promise.all([Category, Product, Order, Image, ContactMessage, DeliveryAssignment, Notification, CompanySettings].map((m) => m.deleteMany({})));
    await User.deleteMany({ role: { $in: ['customer', 'supervisor', 'delivery'] } });
    console.log('Store collections cleared (admin account kept).');
  } else if (await Product.estimatedDocumentCount()) {
    console.log('Products already exist - nothing seeded. Use "npm run seed -- --reset" to start fresh.');
    return;
  }

  // Company details (admin can edit them later from Admin → Company)
  const company = await CompanySettings.get();
  Object.assign(company, COMPANY);
  await company.save();

  // Categories
  const catIds = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const imageUrl = await saveSvg(spiceSvg(c.name, c.nameAr, c.color, 'powder', i + 50), c.name);
    const doc = await Category.create({ name: c.name, nameAr: c.nameAr, description: c.description, descriptionAr: c.descriptionAr, imageUrl, sortOrder: i + 1 });
    catIds[c.key] = doc._id;
  }

  // Products
  const products = [];
  for (const [i, [name, nameAr, cat, price, stock, weightGrams, isFeatured, description, descriptionAr, colour, texture]] of PRODUCTS.entries()) {
    const imageUrl = await saveSvg(spiceSvg(name, nameAr, colour, texture, i + 1), name);
    products.push(await Product.create({ name, nameAr, category: catIds[cat], price, stock, weightGrams, isFeatured, description, descriptionAr, imageUrl }));
  }
  console.log(`Seeded ${CATEGORIES.length} categories and ${products.length} products.`);

  // Staff accounts
  const supervisor = await upsertUser({ name: 'Khalid Supervisor', email: 'supervisor@nabta.local', password: 'SuperPass123', role: 'supervisor', phone: '0500000001' });
  const driver = await upsertUser({ name: 'Faisal Driver', email: 'driver@nabta.local', password: 'DriverPass123', role: 'delivery', phone: '0500000002' });
  await upsertUser({ name: 'Omar Driver', email: 'driver2@nabta.local', password: 'DriverPass123', role: 'delivery', phone: '0500000003' });

  // Demo customer with two saved addresses
  const home = { fullName: 'Demo Customer', phone: '0501234567', city: 'المدينة المنورة', street: 'طريق قباء، حي العزيزية، مبنى 12' };
  const customer = await upsertUser({
    name: 'Demo Customer',
    email: 'demo@nabta.local',
    password: 'DemoPass123',
    role: 'customer',
    phone: '0501234567',
    language: 'ar',
    address: home,
    addresses: [
      { label: 'البيت', ...home },
      { label: 'العمل', fullName: 'Demo Customer', phone: '0501234567', city: 'المدينة المنورة', street: 'طريق الملك عبدالعزيز، مكتب 4' },
    ],
    favorites: [products[0]._id, products[13]._id],
  });

  // Sample orders across the last 9 days, one for each stage of the workflow
  const plan = [
    { status: 'completed', picks: [[0, 2], [13, 1]] },
    { status: 'completed', picks: [[1, 1], [4, 2], [16, 1]] },
    { status: 'completed', picks: [[14, 1], [3, 1]] },
    { status: 'cancelled', picks: [[5, 1]] },
    { status: 'partially_delivered', picks: [[0, 3], [9, 2]] },
    { status: 'out_for_delivery', picks: [[2, 1], [6, 2]] },
    { status: 'processing', picks: [[10, 2], [12, 1], [15, 1]] },
    { status: 'confirmed', picks: [[17, 2]] },
    { status: 'pending', picks: [[13, 1], [0, 1]] },
  ];
  const flow = ['pending', 'confirmed', 'processing'];

  for (const [i, { status, picks }] of plan.entries()) {
    const createdAt = new Date(Date.now() - (plan.length - i) * DAY + 3 * 60 * 60 * 1000);
    const items = picks.map(([p, q]) => ({
      product: products[p]._id,
      name: products[p].name,
      nameAr: products[p].nameAr,
      price: products[p].price,
      quantity: q,
      lineTotal: products[p].price * q,
      deliveredQty: status === 'completed' ? q : 0,
    }));
    const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
    const deliveryFee = subtotal >= COMPANY.freeDeliveryFrom ? 0 : COMPANY.deliveryFee;

    // History: walk through the normal stages up to the final one
    const history = [];
    const stage = (s, note, by) => history.push({ status: s, at: new Date(createdAt.getTime() + history.length * 40 * 60 * 1000), note, by });
    stage('pending', 'Order placed', customer.email);
    if (status === 'cancelled') stage('cancelled', 'Customer asked to cancel', supervisor.email);
    else {
      // How far through pending → confirmed → processing this order got (delivery stages passed all three)
      const reached = flow.includes(status) ? flow.indexOf(status) : flow.length - 1;
      for (const s of flow.slice(1, reached + 1)) stage(s, '', supervisor.email);
      if (['out_for_delivery', 'partially_delivered', 'completed'].includes(status)) stage('out_for_delivery', 'Dispatched', supervisor.email);
      if (status === 'partially_delivered') stage('partially_delivered', '', driver.email);
      if (status === 'completed') stage('completed', '', driver.email);
    }

    const order = await Order.create({
      orderNumber: `NAB-DEMO-${String(i + 1).padStart(3, '0')}`,
      user: customer._id,
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      paymentMethod: 'cash_on_delivery',
      shippingAddress: { ...home, notes: i % 2 ? 'اتصل عند الوصول' : '' },
      status,
      statusHistory: history,
      createdAt,
      updatedAt: history[history.length - 1].at,
    });

    // Delivery trips that match each order's status
    const trip = (lines, tripStatus, withFee) => DeliveryAssignment.create({
      order: order._id,
      orderNumber: order.orderNumber,
      driver: driver._id,
      assignedBy: supervisor._id,
      items: lines.map(([index, quantity]) => ({ index, name: items[index].name, nameAr: items[index].nameAr, quantity })),
      destination: order.toObject().shippingAddress,
      cashToCollect: lines.reduce((s, [index, q]) => s + items[index].price * q, 0) + (withFee ? deliveryFee : 0),
      status: tripStatus,
      acceptedAt: tripStatus !== 'assigned' ? new Date(createdAt.getTime() + 3 * 60 * 60 * 1000) : undefined,
      deliveredAt: tripStatus === 'delivered' ? new Date(createdAt.getTime() + 4 * 60 * 60 * 1000) : undefined,
      createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
    });

    if (status === 'completed') await trip(items.map((it, k) => [k, it.quantity]), 'delivered', true);
    if (status === 'partially_delivered') {
      // First trip delivered only the kabsa mix; the pepper is still waiting in the store
      await trip([[0, 3]], 'delivered', true);
      order.items[0].deliveredQty = 3;
      order.markModified('items');
      await order.save();
    }
    if (status === 'out_for_delivery') await trip(items.map((it, k) => [k, it.quantity]), 'accepted', true);
  }
  console.log(`Seeded ${plan.length} sample orders and their delivery trips.`);

  await ContactMessage.create({
    user: customer._id,
    name: customer.name,
    email: customer.email,
    subject: 'Kabsa mix ingredients',
    message: 'Does the kabsa mix contain any chilli? I want to cook it for my children.',
  });
  await ContactMessage.create({
    name: 'Sara Ahmed',
    email: 'sara@example.com',
    subject: 'Wholesale order',
    message: 'Do you offer wholesale prices for restaurants in Madinah?',
  });

  console.log('Accounts (password in brackets):');
  console.log('  customer   demo@nabta.local (DemoPass123)');
  console.log('  supervisor supervisor@nabta.local (SuperPass123)');
  console.log('  drivers    driver@nabta.local, driver2@nabta.local (DriverPass123)');
  if (env.admin.email) console.log(`  admin      ${env.admin.email} (ADMIN_PASSWORD from .env)`);
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
