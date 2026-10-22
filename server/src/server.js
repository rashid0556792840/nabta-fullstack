// Entry point. Uses Node's core HTTP module to create the server around the Express app.
const http = require('node:http');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');
const User = require('./models/User');
const { verifyConnection } = require('./services/mailer');

async function ensureAdmin() {
  const { name, email, password } = env.admin;
  if (!email || !password) return;
  if (await User.exists({ email: email.toLowerCase() })) return;
  if (password.length < 10) {
    console.warn('ADMIN_PASSWORD must be at least 10 characters - admin not created.');
    return;
  }
  const admin = new User({ name, email, role: 'admin' });
  await admin.setPassword(password);
  await admin.save();
  console.log(`Admin account created: ${email}`);
}

async function start() {
  await connectDB();
  await ensureAdmin();
  console.log(await verifyConnection().catch((e) => `Email check failed: ${e.message}`));

  const server = http.createServer(app);
  server.listen(env.port, () => {
    console.log(`Nabta API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received - closing server`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
