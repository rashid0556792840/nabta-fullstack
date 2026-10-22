// Email automation check: sends one test email using the SMTP settings in .env.
// Usage: npm run email:test -- someone@example.com
const env = require('../src/config/env');
const { sendMail, verifyConnection } = require('../src/services/mailer');

async function main() {
  const to = process.argv[2] || env.mail.storeEmail;
  if (!to) throw new Error('Give a recipient: npm run email:test -- you@example.com');
  console.log(await verifyConnection());
  const result = await sendMail({
    to,
    subject: 'Nabta test email',
    html: `<h2 style="color:#174b37">Nabta email is working</h2><p>Sent at ${new Date().toLocaleString()}.</p>`,
  });
  console.log('Result:', result);
}

main().catch((err) => {
  console.error('Email test failed:', err.message);
  process.exitCode = 1;
});
