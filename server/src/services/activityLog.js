// File System module (Unit 3): appends one JSON line per business event to logs/activity.log
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'activity.log');

fs.mkdirSync(LOG_DIR, { recursive: true });

async function logActivity(type, data = {}) {
  const line = JSON.stringify({ at: new Date().toISOString(), type, ...data }) + '\n';
  try {
    await fsp.appendFile(LOG_FILE, line, 'utf8');
  } catch (err) {
    console.error('Could not write activity log:', err.message);
  }
}

/** Reads the newest log lines (used by the admin dashboard). */
async function readRecentActivity(limit = 20) {
  try {
    const text = await fsp.readFile(LOG_FILE, 'utf8');
    return text
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(-limit)
      .reverse()
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

module.exports = { logActivity, readRecentActivity, LOG_DIR };
