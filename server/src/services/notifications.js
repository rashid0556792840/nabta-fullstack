// In-app notifications (the bell in the header). One document per recipient.
const Notification = require('../models/Notification');
const User = require('../models/User');

/** Notify specific users by id. */
async function notifyUsers(userIds, type, data = {}, link = '') {
  const ids = [...new Set(userIds.filter(Boolean).map(String))];
  if (!ids.length) return;
  await Notification.insertMany(ids.map((user) => ({ user, type, data, link })));
}

/** Notify every active user that has one of the given roles (e.g. all admins and supervisors). */
async function notifyRoles(roles, type, data = {}, link = '') {
  const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id');
  await notifyUsers(users.map((u) => u._id), type, data, link);
}

module.exports = { notifyUsers, notifyRoles };
