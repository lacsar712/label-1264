const { Op } = require('sequelize');
const crypto = require('crypto');
const {
  sequelize,
  StudyGroup,
  StudyGroupMember,
  StudyGroupActivity,
  User,
  LearningDaily,
  UserResource,
} = require('../../models');

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

async function getUserGroups(userId) {
  const memberships = await StudyGroupMember.findAll({
    where: { userId },
    include: [
      {
        model: StudyGroup,
        as: 'group',
        include: [
          {
            model: StudyGroupMember,
            as: 'members',
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatarColor'] }],
          },
        ],
      },
    ],
    order: [['joinedAt', 'DESC']],
  });

  return memberships.map((m) => {
    const group = m.group;
    return {
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      maxMembers: group.maxMembers,
      memberCount: group.members.length,
      role: m.role,
      joinedAt: m.joinedAt,
    };
  });
}

async function createGroup(userId, name, maxMembers) {
  let inviteCode = generateInviteCode();
  let exists = await StudyGroup.findOne({ where: { inviteCode } });
  while (exists) {
    inviteCode = generateInviteCode();
    exists = await StudyGroup.findOne({ where: { inviteCode } });
  }

  const group = await StudyGroup.create({
    name,
    inviteCode,
    maxMembers: Math.max(2, Math.min(50, maxMembers || 10)),
    creatorId: userId,
  });

  await StudyGroupMember.create({
    groupId: group.id,
    userId,
    role: 'leader',
    joinedAt: new Date(),
  });

  await StudyGroupActivity.create({
    groupId: group.id,
    userId,
    type: 'create',
    content: '创建了学习小组',
    createdAt: new Date(),
  });

  return {
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    maxMembers: group.maxMembers,
  };
}

async function joinGroup(userId, inviteCode) {
  const group = await StudyGroup.findOne({ where: { inviteCode } });
  if (!group) {
    return { error: '邀请码无效，未找到对应小组' };
  }

  const existing = await StudyGroupMember.findOne({
    where: { groupId: group.id, userId },
  });
  if (existing) {
    return { error: '您已经是该小组成员' };
  }

  const memberCount = await StudyGroupMember.count({ where: { groupId: group.id } });
  if (memberCount >= group.maxMembers) {
    return { error: '小组人数已满' };
  }

  await StudyGroupMember.create({
    groupId: group.id,
    userId,
    role: 'member',
    joinedAt: new Date(),
  });

  const user = await User.findByPk(userId);

  await StudyGroupActivity.create({
    groupId: group.id,
    userId,
    type: 'join',
    content: `${user.name} 加入了小组`,
    createdAt: new Date(),
  });

  return {
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    maxMembers: group.maxMembers,
  };
}

async function getGroupDetail(userId, groupId) {
  const membership = await StudyGroupMember.findOne({
    where: { groupId, userId },
  });
  if (!membership) {
    return null;
  }

  const group = await StudyGroup.findByPk(groupId);
  if (!group) return null;

  const members = await StudyGroupMember.findAll({
    where: { groupId },
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatarColor'] }],
    order: [['joinedAt', 'ASC']],
  });

  const memberList = members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    avatarColor: m.user.avatarColor,
    role: m.role,
    joinedAt: m.joinedAt,
  }));

  const memberIds = members.map((m) => m.userId);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  const dailyRecords = await LearningDaily.findAll({
    where: {
      userId: { [Op.in]: memberIds },
      date: { [Op.gte]: weekStart.toISOString().slice(0, 10) },
    },
  });

  const studyByUser = {};
  for (const r of dailyRecords) {
    if (!studyByUser[r.userId]) studyByUser[r.userId] = { studyMinutes: 0, completedCount: 0 };
    studyByUser[r.userId].studyMinutes += r.studyMinutes || 0;
    studyByUser[r.userId].completedCount += r.completedCount || 0;
  }

  const completedResources = await UserResource.findAll({
    where: {
      userId: { [Op.in]: memberIds },
      status: '已完成',
      completedAt: { [Op.gte]: weekStart },
    },
    attributes: ['userId', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
    group: ['userId'],
    raw: true,
  });

  const completedMap = {};
  for (const r of completedResources) {
    completedMap[r.userId] = r.cnt;
  }

  const stats = memberList.map((m) => {
    const s = studyByUser[m.userId] || { studyMinutes: 0, completedCount: 0 };
    return {
      userId: m.userId,
      name: m.name,
      avatarColor: m.avatarColor,
      studyMinutes: s.studyMinutes,
      completedCount: s.completedCount,
      weeklyCompletedResources: Number(completedMap[m.userId] || 0),
    };
  });

  let weeklyStar = null;
  if (stats.length > 0) {
    const sorted = [...stats].sort((a, b) => b.studyMinutes - a.studyMinutes);
    weeklyStar = {
      userId: sorted[0].userId,
      name: sorted[0].name,
      avatarColor: sorted[0].avatarColor,
      studyMinutes: sorted[0].studyMinutes,
    };
  }

  const activities = await StudyGroupActivity.findAll({
    where: { groupId },
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatarColor'] }],
    order: [['createdAt', 'DESC']],
    limit: 20,
  });

  const activityList = activities.map((a) => ({
    id: a.id,
    userId: a.user.id,
    userName: a.user.name,
    avatarColor: a.user.avatarColor,
    type: a.type,
    content: a.content,
    createdAt: a.createdAt,
  }));

  return {
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    maxMembers: group.maxMembers,
    memberCount: members.length,
    myRole: membership.role,
    members: memberList,
    stats,
    weeklyStar,
    activities: activityList,
  };
}

async function leaveGroup(userId, groupId) {
  const membership = await StudyGroupMember.findOne({
    where: { groupId, userId },
  });
  if (!membership) {
    return { error: '您不是该小组成员' };
  }
  if (membership.role === 'leader') {
    const memberCount = await StudyGroupMember.count({ where: { groupId } });
    if (memberCount > 1) {
      return { error: '组长需先转让组长权限或移除其他成员后才能退出' };
    }
  }

  const user = await User.findByPk(userId);
  await membership.destroy();

  await StudyGroupActivity.create({
    groupId,
    userId,
    type: 'leave',
    content: `${user.name} 退出了小组`,
    createdAt: new Date(),
  });

  if (membership.role === 'leader') {
    await StudyGroup.destroy({ where: { id: groupId } });
  }

  return { ok: true };
}

async function removeMember(leaderId, groupId, targetUserId) {
  const leaderMembership = await StudyGroupMember.findOne({
    where: { groupId, userId: leaderId, role: 'leader' },
  });
  if (!leaderMembership) {
    return { error: '仅组长可移除成员' };
  }

  if (leaderId === targetUserId) {
    return { error: '不能移除自己，请使用转让或退出功能' };
  }

  const target = await StudyGroupMember.findOne({
    where: { groupId, userId: targetUserId },
  });
  if (!target) {
    return { error: '该用户不是小组成员' };
  }

  const targetUser = await User.findByPk(targetUserId);
  const leaderUser = await User.findByPk(leaderId);
  await target.destroy();

  await StudyGroupActivity.create({
    groupId,
    userId: leaderId,
    type: 'remove',
    content: `${leaderUser.name} 将 ${targetUser.name} 移出小组`,
    createdAt: new Date(),
  });

  return { ok: true };
}

async function transferLeadership(leaderId, groupId, targetUserId) {
  const leaderMembership = await StudyGroupMember.findOne({
    where: { groupId, userId: leaderId, role: 'leader' },
  });
  if (!leaderMembership) {
    return { error: '仅组长可转让权限' };
  }

  if (leaderId === targetUserId) {
    return { error: '不能转让给自己' };
  }

  const target = await StudyGroupMember.findOne({
    where: { groupId, userId: targetUserId },
  });
  if (!target) {
    return { error: '该用户不是小组成员' };
  }

  const leaderUser = await User.findByPk(leaderId);
  const targetUser = await User.findByPk(targetUserId);

  await leaderMembership.update({ role: 'member' });
  await target.update({ role: 'leader' });

  const group = await StudyGroup.findByPk(groupId);
  if (group) {
    await group.update({ creatorId: targetUserId });
  }

  await StudyGroupActivity.create({
    groupId,
    userId: leaderId,
    type: 'transfer',
    content: `${leaderUser.name} 将组长权限转让给 ${targetUser.name}`,
    createdAt: new Date(),
  });

  return { ok: true };
}

module.exports = {
  getUserGroups,
  createGroup,
  joinGroup,
  getGroupDetail,
  leaveGroup,
  removeMember,
  transferLeadership,
};
