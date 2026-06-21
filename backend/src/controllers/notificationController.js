const { Notification, User, SystemLog } = require('../models');

async function getNotifications(req, res) {
  const userId = req.user.id;
  const { type } = req.query;

  const where = { userId };
  if (type && ['system', 'recommendation', 'homework'].includes(type)) {
    where.type = type;
  }

  const notifications = await Notification.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: 100,
  });

  const unreadCount = await Notification.count({
    where: { userId, isRead: false },
  });

  return res.json({
    ok: true,
    data: {
      list: notifications,
      unreadCount,
    },
  });
}

async function getUnreadCount(req, res) {
  const userId = req.user.id;

  const count = await Notification.count({
    where: { userId, isRead: false },
  });

  const byType = await Notification.count({
    where: { userId, isRead: false },
    group: ['type'],
    attributes: ['type'],
  });

  const typeCount = { system: 0, recommendation: 0, homework: 0 };
  byType.forEach((item) => {
    typeCount[item.type] = item.count;
  });

  return res.json({
    ok: true,
    data: {
      total: count,
      byType: typeCount,
    },
  });
}

async function markAsRead(req, res) {
  const userId = req.user.id;
  const { notificationId } = req.params;

  const notification = await Notification.findOne({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    return res.status(404).json({
      ok: false,
      error: { code: 'NOT_FOUND', message: '通知不存在' },
    });
  }

  await notification.update({ isRead: true });

  return res.json({ ok: true });
}

async function markAllAsRead(req, res) {
  const userId = req.user.id;

  await Notification.update(
    { isRead: true },
    { where: { userId, isRead: false } }
  );

  return res.json({ ok: true });
}

async function deleteNotification(req, res) {
  const userId = req.user.id;
  const { notificationId } = req.params;

  const notification = await Notification.findOne({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    return res.status(404).json({
      ok: false,
      error: { code: 'NOT_FOUND', message: '通知不存在' },
    });
  }

  await notification.destroy();

  return res.json({ ok: true });
}

async function clearReadNotifications(req, res) {
  const userId = req.user.id;

  await Notification.destroy({
    where: { userId, isRead: true },
  });

  return res.json({ ok: true });
}

async function adminSendNotification(req, res) {
  const { userIds, type, title, content, linkUrl, linkText } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_PARAM', message: '请选择目标用户' },
    });
  }

  if (!title || !content) {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_PARAM', message: '标题和内容不能为空' },
    });
  }

  if (type && !['system', 'recommendation', 'homework'].includes(type)) {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_PARAM', message: '无效的通知类型' },
    });
  }

  const users = await User.findAll({
    where: { id: userIds, active: true },
    attributes: ['id', 'name'],
  });

  if (users.length === 0) {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_PARAM', message: '未找到有效的目标用户' },
    });
  }

  const now = new Date();
  const notifications = users.map((user) => ({
    userId: user.id,
    type: type || 'system',
    title,
    content,
    linkUrl: linkUrl || null,
    linkText: linkText || null,
    isRead: false,
    senderId: req.user.id,
    createdAt: now,
    updatedAt: now,
  }));

  await Notification.bulkCreate(notifications);

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '通知操作',
    content: `发送通知：${title}，共 ${users.length} 位用户`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({
    ok: true,
    data: { sentCount: users.length },
  });
}

async function adminGetNotificationList(req, res) {
  const { page = 1, pageSize = 20 } = req.query;

  const offset = (page - 1) * pageSize;

  const { count, rows } = await Notification.findAndCountAll({
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'username'] },
      { model: User, as: 'sender', attributes: ['id', 'name', 'username'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: Number(pageSize),
    offset,
  });

  return res.json({
    ok: true,
    data: {
      list: rows,
      total: count,
      page: Number(page),
      pageSize: Number(pageSize),
    },
  });
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  adminSendNotification,
  adminGetNotificationList,
};
