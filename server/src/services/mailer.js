// Email automation (Unit 3) with Nodemailer.
// With SMTP settings in .env it sends real email; without them it saves each email
// as an .html file in logs/emails so the feature can still be demonstrated offline.
const fsp = require('node:fs/promises');
const path = require('node:path');
const nodemailer = require('nodemailer');
const env = require('../config/env');
const { LOG_DIR } = require('./activityLog');

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');
const OUTBOX_DIR = path.join(LOG_DIR, 'emails');

const smtpConfigured = Boolean(env.mail.host);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Reads an HTML template from disk and fills {{placeholders}}. Values are HTML-escaped unless the key ends in "Html". */
async function renderTemplate(name, values) {
  const file = await fsp.readFile(path.join(TEMPLATE_DIR, `${name}.html`), 'utf8');
  return file.replace(/\{\{(\w+)\}\}/g, (_m, key) =>
    key.endsWith('Html') ? String(values[key] ?? '') : escapeHtml(values[key])
  );
}

async function sendMail({ to, subject, html, text }) {
  if (!to) return { skipped: true };
  const info = await transporter.sendMail({ from: env.mail.from, to, subject, html, text });

  if (!smtpConfigured) {
    await fsp.mkdir(OUTBOX_DIR, { recursive: true });
    const safeSubject = subject.replace(/[^a-z0-9]+/gi, '-').slice(0, 50);
    const file = path.join(OUTBOX_DIR, `${Date.now()}-${safeSubject}.html`);
    await fsp.writeFile(file, `<!-- To: ${escapeHtml(to)} | Subject: ${escapeHtml(subject)} -->\n${html}`, 'utf8');
    return { savedTo: file };
  }
  return { messageId: info.messageId };
}

async function verifyConnection() {
  if (!smtpConfigured) return 'SMTP not configured - emails are saved to logs/emails';
  await transporter.verify();
  return `SMTP ready (${env.mail.host})`;
}

module.exports = { sendMail, renderTemplate, verifyConnection, escapeHtml, smtpConfigured };
