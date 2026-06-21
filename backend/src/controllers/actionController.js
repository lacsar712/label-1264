const bcrypt = require('bcryptjs');
const {
  Recommendation,
  RecommendationRule,
  SystemParam,
  User,
  UserResource,
  UserTag,
  Resource,
  ResourceCategory,
  SystemLog,
  UserBehavior,
  LearningNote,
  UserPhaseResource,
} =
  require('../models');
const { updateResourceProgress } = require('../services/pages/learningPathService');
const { createQuiz, answerQuestion, submitQuiz } = require('../services/pages/quizService');
const {
  getResourceReviewStats,
  getResourceReviews,
  getRecentReviews,
  getUserReview,
  createOrUpdateReview,
} = require('../services/resourceReviewService');
const {
  createGroup,
  joinGroup,
  leaveGroup,
  removeMember,
  transferLeadership,
} = require('../services/pages/studyGroupService');

async function ensureCategoryByCode(categoryId) {
  let category = await ResourceCategory.findOne({ where: { categoryCode: categoryId } });
  if (category) return category;
  if (!String(categoryId || '').startsWith('CAT-')) return null;
  const raw = String(categoryId).slice(4);
  const sep = raw.lastIndexOf('-');
  if (sep <= 0) return null;
  const subject = raw.slice(0, sep);
  const type = raw.slice(sep + 1);
  if (!['课程', '课件', '题库', '视频'].includes(type)) return null;
  const [created] = await ResourceCategory.findOrCreate({
    where: { categoryCode: categoryId },
    defaults: {
      categoryCode: categoryId,
      categoryName: subject,
      parentCategory: type,
      subject,
      type,
      sortOrder: 999,
      active: true,
    },
  });
  category = created;
  return category;
}

async function favorite(req, res) {
  const userId = req.user.id;
  const { recommendationId } = req.params;

  const rec = await Recommendation.findOne({ where: { id: recommendationId, userId } });
  if (!rec) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '推荐不存在' } });

  const [ur] = await UserResource.findOrCreate({
    where: { userId, resourceId: rec.resourceId },
    defaults: { status: '收藏', progressPercent: 0, favoritedAt: new Date() },
  });

  await ur.update({ status: '收藏', favoritedAt: ur.favoritedAt || new Date() });
  await UserBehavior.create({
    userId,
    type: '收藏',
    resourceId: rec.resourceId,
    occurredAt: new Date(),
    dwellSeconds: 5,
  });

  return res.json({ ok: true });
}

async function learn(req, res) {
  const userId = req.user.id;
  const { recommendationId } = req.params;

  const rec = await Recommendation.findOne({ where: { id: recommendationId, userId } });
  if (!rec) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '推荐不存在' } });

  const [ur] = await UserResource.findOrCreate({
    where: { userId, resourceId: rec.resourceId },
    defaults: { status: '学习中', progressPercent: 10, startedAt: new Date() },
  });

  await ur.update({ status: '学习中', startedAt: ur.startedAt || new Date(), progressPercent: Math.max(ur.progressPercent, 10) });
  await rec.update({ clickedAt: rec.clickedAt || new Date() });

  await UserBehavior.create({
    userId,
    type: '学习',
    resourceId: rec.resourceId,
    occurredAt: new Date(),
    dwellSeconds: 180,
  });

  return res.json({ ok: true });
}

async function unfavorite(req, res) {
  const userId = req.user.id;
  const { userResourceId } = req.params;
  const ur = await UserResource.findOne({ where: { id: userResourceId, userId } });
  if (!ur) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '记录不存在' } });
  await ur.destroy();
  return res.json({ ok: true });
}

async function moveToQueue(req, res) {
  const userId = req.user.id;
  const { userResourceId } = req.params;
  const ur = await UserResource.findOne({ where: { id: userResourceId, userId } });
  if (!ur) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '记录不存在' } });
  await ur.update({ status: '待学' });
  return res.json({ ok: true });
}

async function adminUpdateUserStatus(req, res) {
  const { userId } = req.params;
  const { active } = req.body;
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '用户不存在' } });
  await user.update({ active: Boolean(active) });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '用户操作',
    content: `设置用户#${user.id} active=${Boolean(active)}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminTakeDownResource(req, res) {
  const { resourceId } = req.params;
  const resource = await Resource.findOne({ where: { code: resourceId } });
  if (!resource) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '资源不存在' } });
  await resource.update({ status: '下架' });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `下架资源 ${resource.code}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminUpdateUserProfile(req, res) {
  const { userId } = req.params;
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '用户不存在' } });

  const patch = {};
  if (typeof req.body.name === 'string') patch.name = req.body.name;
  if (typeof req.body.stage === 'string') patch.stage = req.body.stage;
  if (typeof req.body.learningStyle === 'string') patch.learningStyle = req.body.learningStyle;
  if (Array.isArray(req.body.subjectPreference)) patch.subjectPreference = req.body.subjectPreference;

  await user.update(patch);
  await SystemLog.create({
    actorUserId: req.user.id,
    type: '用户操作',
    content: `编辑用户#${user.id} 基础信息`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminCreateUserTag(req, res) {
  const { userId, name, category, weight } = req.body;
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '用户不存在' } });

  const tag = await UserTag.create({ userId, name, category, weight });
  await SystemLog.create({
    actorUserId: req.user.id,
    type: '标签操作',
    content: `新增用户标签#${tag.id} (${tag.name})`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true, data: { id: tag.id } });
}

async function adminUpdateUserTag(req, res) {
  const { tagId } = req.params;
  const tag = await UserTag.findByPk(tagId);
  if (!tag) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '标签不存在' } });

  const patch = {};
  if (typeof req.body.name === 'string') patch.name = req.body.name;
  if (typeof req.body.category === 'string') patch.category = req.body.category;
  if (typeof req.body.weight === 'number') patch.weight = req.body.weight;
  await tag.update(patch);

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '标签操作',
    content: `编辑用户标签#${tag.id} (${tag.name})`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true });
}

async function adminDeleteUserTag(req, res) {
  const { tagId } = req.params;
  const tag = await UserTag.findByPk(tagId);
  if (!tag) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '标签不存在' } });
  await tag.destroy();

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '标签操作',
    content: `删除用户标签#${tag.id} (${tag.name})`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true });
}

async function adminUpdateResource(req, res) {
  const { resourceId } = req.params;
  const resource = await Resource.findOne({ where: { code: resourceId } });
  if (!resource) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '资源不存在' } });

  const patch = {};
  for (const k of ['name', 'subject', 'type', 'difficulty', 'status']) {
    if (typeof req.body[k] === 'string') patch[k] = req.body[k];
  }
  if (typeof req.body.heat === 'number') patch.heat = req.body.heat;

  await resource.update(patch);
  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `编辑资源 ${resource.code}`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true });
}

async function adminReviewResource(req, res) {
  const { resourceId } = req.params;
  const { status } = req.body;
  const resource = await Resource.findOne({ where: { code: resourceId } });
  if (!resource) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '资源不存在' } });
  await resource.update({ status });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `审核资源 ${resource.code} => ${status}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminDeleteResource(req, res) {
  const { resourceId } = req.params;
  const resource = await Resource.findOne({ where: { code: resourceId } });
  if (!resource) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '资源不存在' } });
  await resource.update({ deleted: true, status: '下架' });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `删除资源 ${resource.code}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminUpdateSystemParam(req, res) {
  const { paramCode } = req.params;
  const { value } = req.body;
  const param = await SystemParam.findOne({ where: { paramCode } });
  if (!param) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '参数不存在' } });
  await param.update({ value: String(value), updatedBy: req.user.username || String(req.user.id) });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '配置修改',
    content: `更新参数 ${param.paramCode}=${param.value}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminRestoreSystemParam(req, res) {
  const { paramCode } = req.params;
  const param = await SystemParam.findOne({ where: { paramCode } });
  if (!param) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '参数不存在' } });
  await param.update({ value: param.defaultValue, updatedBy: req.user.username || String(req.user.id) });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '配置修改',
    content: `恢复默认参数 ${param.paramCode}=${param.value}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminUpdateRuleWeights(req, res) {
  const { ruleCode } = req.params;
  const { weightRatio } = req.body;
  const rule = await RecommendationRule.findOne({ where: { ruleCode } });
  if (!rule) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '规则不存在' } });
  await rule.update({ weightRatio });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '配置修改',
    content: `更新规则权重 ${rule.ruleCode}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function adminCreateResourceCategory(req, res) {
  const { categoryName, parentCategory, subject, type, sortOrder } = req.body;
  const categoryCode = `CAT-${subject}-${type}`;
  const [category, created] = await ResourceCategory.findOrCreate({
    where: { categoryCode },
    defaults: {
      categoryCode,
      categoryName,
      parentCategory,
      subject,
      type,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 999,
      active: true,
    },
  });
  if (!created) {
    await category.update({
      categoryName,
      parentCategory,
      subject,
      type,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : category.sortOrder,
      active: true,
    });
  }

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `新增分类 ${category.categoryCode}`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true, data: { categoryId: category.categoryCode } });
}

async function adminUpdateResourceCategory(req, res) {
  const { categoryId } = req.params;
  const category = await ensureCategoryByCode(categoryId);
  if (!category) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '分类不存在' } });
  if (!category.active) await category.update({ active: true });

  const oldSubject = category.subject;
  const oldType = category.type;
  const patch = {};
  for (const k of ['categoryName', 'parentCategory', 'subject', 'type']) {
    if (typeof req.body[k] === 'string' && req.body[k]) patch[k] = req.body[k];
  }
  if (Number.isFinite(Number(req.body.sortOrder))) patch.sortOrder = Number(req.body.sortOrder);

  await category.update(patch);
  if ((patch.subject && patch.subject !== oldSubject) || (patch.type && patch.type !== oldType)) {
    await Resource.update(
      { subject: patch.subject || oldSubject, type: patch.type || oldType },
      { where: { subject: oldSubject, type: oldType, deleted: false } }
    );
  }

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `编辑分类 ${category.categoryCode}`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true });
}

async function adminMergeResourceCategory(req, res) {
  const { categoryId } = req.params;
  const { targetCategoryId } = req.body;
  if (categoryId === targetCategoryId) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '目标分类不能与源分类相同' } });
  }

  const source = await ensureCategoryByCode(categoryId);
  const target = await ensureCategoryByCode(targetCategoryId);
  if (!source || !target) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '分类不存在' } });
  }
  if (!target.active) await target.update({ active: true });

  await Resource.update(
    { subject: target.subject, type: target.type },
    { where: { subject: source.subject, type: source.type, deleted: false } }
  );
  await source.update({ active: false });

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '资源操作',
    content: `合并分类 ${source.categoryCode} -> ${target.categoryCode}`,
    ip: req.ip || '',
    status: '成功',
  });
  return res.json({ ok: true });
}

async function createNote(req, res) {
  const userId = req.user.id;
  const { title, content, subject, resourceId } = req.body;

  const now = new Date();
  const note = await LearningNote.create({
    userId,
    title: title || '无标题笔记',
    content: content || '',
    subject,
    resourceId: resourceId || null,
    createdAt: now,
    updatedAt: now,
  });

  await SystemLog.create({
    actorUserId: userId,
    type: '笔记操作',
    content: `创建笔记#${note.id} (${note.title})`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true, data: { id: note.id } });
}

async function updateNote(req, res) {
  const userId = req.user.id;
  const { noteId } = req.params;

  const note = await LearningNote.findOne({ where: { id: noteId, userId } });
  if (!note) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '笔记不存在' } });
  }

  const patch = {};
  if (typeof req.body.title === 'string') patch.title = req.body.title;
  if (typeof req.body.content === 'string') patch.content = req.body.content;
  if (typeof req.body.subject === 'string') patch.subject = req.body.subject;
  if (req.body.hasOwnProperty('resourceId')) {
    patch.resourceId = req.body.resourceId || null;
  }
  patch.updatedAt = new Date();

  await note.update(patch);

  await SystemLog.create({
    actorUserId: userId,
    type: '笔记操作',
    content: `更新笔记#${note.id}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function deleteNote(req, res) {
  const userId = req.user.id;
  const { noteId } = req.params;

  const note = await LearningNote.findOne({ where: { id: noteId, userId } });
  if (!note) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '笔记不存在' } });
  }

  await note.destroy();

  await SystemLog.create({
    actorUserId: userId,
    type: '笔记操作',
    content: `删除笔记#${noteId} (${note.title})`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function togglePhaseResource(req, res) {
  const userId = req.user.id;
  const { phaseResourceId } = req.params;
  const { completed } = req.body;

  const result = await updateResourceProgress(userId, parseInt(phaseResourceId), Boolean(completed));

  const phaseResource = await UserPhaseResource.findOne({
    where: { id: phaseResourceId, userId },
  });
  if (phaseResource) {
    await UserBehavior.create({
      userId,
      type: completed ? '学习' : '取消完成',
      resourceId: phaseResource.resourceId,
      occurredAt: new Date(),
      dwellSeconds: completed ? 60 : 10,
    });

    await SystemLog.create({
      actorUserId: userId,
      type: '学习路径',
      content: `${completed ? '标记完成' : '取消完成'} 学习路径资源 #${phaseResourceId}`,
      ip: req.ip || '',
      status: '成功',
    });
  }

  return res.json({ ok: true, data: result });
}

async function createUserQuiz(req, res) {
  const { subject, difficulty, questionCount, sourceType } = req.body;
  const userId = req.user.id;

  if (!subject) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '请选择学科' } });
  }

  const result = await createQuiz({
    userId,
    subject,
    difficulty: difficulty || '混合',
    questionCount: Number(questionCount) || 10,
    sourceType: sourceType || '随机',
  });

  if (result.error) {
    return res.status(400).json({ ok: false, error: { code: 'NO_QUESTIONS', message: result.error } });
  }

  await SystemLog.create({
    actorUserId: userId,
    type: '自测练习',
    content: `创建试卷 ${result.code} (${subject}/${difficulty || '混合'})`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true, data: result });
}

async function answerQuizQuestion(req, res) {
  const { quizId, questionId } = req.params;
  const { userAnswer } = req.body;
  const result = await answerQuestion({
    userId: req.user.id,
    quizId: parseInt(quizId),
    questionId: parseInt(questionId),
    userAnswer,
  });
  if (result.error) {
    return res.status(400).json({ ok: false, error: { code: 'ANSWER_FAIL', message: result.error } });
  }
  return res.json({ ok: true, data: result });
}

async function submitUserQuiz(req, res) {
  const { quizId } = req.params;
  const { timeSpentSeconds } = req.body;
  const result = await submitQuiz({
    userId: req.user.id,
    quizId: parseInt(quizId),
    timeSpentSeconds,
  });
  if (result.error) {
    return res.status(400).json({ ok: false, error: { code: 'SUBMIT_FAIL', message: result.error } });
  }

  await SystemLog.create({
    actorUserId: req.user.id,
    type: '自测练习',
    content: `提交试卷 #${quizId}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true, data: result.result });
}

async function getReviewStats(req, res) {
  const { resourceId } = req.params;
  const resource = await Resource.findByPk(parseInt(resourceId));
  if (!resource) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '资源不存在' } });
  }
  const stats = await getResourceReviewStats(parseInt(resourceId));
  return res.json({ ok: true, data: stats });
}

async function getReviews(req, res) {
  const { resourceId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const resource = await Resource.findByPk(parseInt(resourceId));
  if (!resource) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '资源不存在' } });
  }
  const result = await getResourceReviews(parseInt(resourceId), page, pageSize);
  return res.json({ ok: true, data: result });
}

async function getRecentReviewsList(req, res) {
  const limit = parseInt(req.query.limit) || 20;
  const reviews = await getRecentReviews(limit);
  return res.json({ ok: true, data: reviews });
}

async function getMyReview(req, res) {
  const userId = req.user.id;
  const { resourceId } = req.params;
  const review = await getUserReview(userId, parseInt(resourceId));
  return res.json({ ok: true, data: review });
}

async function submitReview(req, res) {
  const userId = req.user.id;
  const { resourceId } = req.params;
  const { rating, comment, isRecommended } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '评分必须在1-5之间' } });
  }

  try {
    const result = await createOrUpdateReview(
      userId,
      parseInt(resourceId),
      parseInt(rating),
      comment,
      isRecommended
    );
    return res.json({ ok: true, data: result });
  } catch (err) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_OPERATION', message: err.message } });
  }
}

async function updateProfile(req, res) {
  const userId = req.user.id;
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '用户不存在' } });

  const patch = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) patch.name = req.body.name.trim();
  if (typeof req.body.avatarColor === 'string' && req.body.avatarColor.trim()) patch.avatarColor = req.body.avatarColor.trim();
  if (Array.isArray(req.body.subjectPreference)) patch.subjectPreference = req.body.subjectPreference;
  if (typeof req.body.chartTheme === 'string' && ['light', 'dark'].includes(req.body.chartTheme)) patch.chartTheme = req.body.chartTheme;

  await user.update(patch);

  await SystemLog.create({
    actorUserId: userId,
    type: '配置修改',
    content: `更新个人设置`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({
    ok: true,
    data: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      avatarColor: user.avatarColor,
      chartTheme: user.chartTheme,
      subjectPreference: user.subjectPreference,
    },
  });
}

async function changePassword(req, res) {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_PARAM', message: '请输入旧密码和新密码' } });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ ok: false, error: { code: 'WEAK_PASSWORD', message: '新密码长度不能少于8位' } });
  }

  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  if (!hasLetter || !hasDigit) {
    return res.status(400).json({ ok: false, error: { code: 'WEAK_PASSWORD', message: '新密码必须同时包含字母和数字' } });
  }

  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '用户不存在' } });

  const match = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!match) {
    return res.status(400).json({ ok: false, error: { code: 'WRONG_PASSWORD', message: '旧密码不正确' } });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await user.update({ passwordHash });

  await SystemLog.create({
    actorUserId: userId,
    type: '配置修改',
    content: '修改登录密码',
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true });
}

async function updateAdminPreferences(req, res) {
  const userId = req.user.id;
  if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: '无权限' } });
  }

  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '用户不存在' } });

  const current = user.adminPreferences || { pageSize: 20, tableDensity: 'default' };
  const patch = { ...current };

  if (typeof req.body.pageSize === 'number' && [10, 20, 50, 100].includes(req.body.pageSize)) {
    patch.pageSize = req.body.pageSize;
  }
  if (typeof req.body.tableDensity === 'string' && ['default', 'compact', 'loose'].includes(req.body.tableDensity)) {
    patch.tableDensity = req.body.tableDensity;
  }

  await user.update({ adminPreferences: patch });

  await SystemLog.create({
    actorUserId: userId,
    type: '配置修改',
    content: '更新管理偏好',
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true, data: patch });
}

async function createStudyGroup(req, res) {
  const userId = req.user.id;
  const { name, maxMembers } = req.body;

  const result = await createGroup(userId, name, maxMembers);
  await SystemLog.create({
    actorUserId: userId,
    type: '学习小组',
    content: `创建小组 ${result.name}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true, data: result });
}

async function joinStudyGroup(req, res) {
  const userId = req.user.id;
  const { inviteCode } = req.body;

  const result = await joinGroup(userId, inviteCode);
  if (result.error) {
    return res.status(400).json({ ok: false, error: { code: 'JOIN_FAIL', message: result.error } });
  }

  await SystemLog.create({
    actorUserId: userId,
    type: '学习小组',
    content: `加入小组 ${result.name}`,
    ip: req.ip || '',
    status: '成功',
  });

  return res.json({ ok: true, data: result });
}

async function leaveStudyGroup(req, res) {
  const userId = req.user.id;
  const { groupId } = req.params;

  const result = await leaveGroup(userId, parseInt(groupId));
  if (result.error) {
    return res.status(400).json({ ok: false, error: { code: 'LEAVE_FAIL', message: result.error } });
  }

  return res.json({ ok: true });
}

async function removeStudyGroupMember(req, res) {
  const userId = req.user.id;
  const { groupId } = req.params;
  const { targetUserId } = req.body;

  const result = await removeMember(userId, parseInt(groupId), parseInt(targetUserId));
  if (result.error) {
    return res.status(400).json({ ok: false, error: { code: 'REMOVE_FAIL', message: result.error } });
  }

  return res.json({ ok: true });
}

async function transferStudyGroupLeader(req, res) {
  const userId = req.user.id;
  const { groupId } = req.params;
  const { targetUserId } = req.body;

  const result = await transferLeadership(userId, parseInt(groupId), parseInt(targetUserId));
  if (result.error) {
    return res.status(400).json({ ok: false, error: { code: 'TRANSFER_FAIL', message: result.error } });
  }

  return res.json({ ok: true });
}

module.exports = {
  favorite,
  learn,
  unfavorite,
  moveToQueue,
  adminUpdateUserStatus,
  adminTakeDownResource,
  adminUpdateUserProfile,
  adminCreateUserTag,
  adminUpdateUserTag,
  adminDeleteUserTag,
  adminUpdateResource,
  adminReviewResource,
  adminDeleteResource,
  adminUpdateSystemParam,
  adminRestoreSystemParam,
  adminUpdateRuleWeights,
  adminCreateResourceCategory,
  adminUpdateResourceCategory,
  adminMergeResourceCategory,
  createNote,
  updateNote,
  deleteNote,
  togglePhaseResource,
  createUserQuiz,
  answerQuizQuestion,
  submitUserQuiz,
  getReviewStats,
  getReviews,
  getRecentReviewsList,
  getMyReview,
  submitReview,
  updateProfile,
  changePassword,
  updateAdminPreferences,
  createStudyGroup,
  joinStudyGroup,
  leaveStudyGroup,
  removeStudyGroupMember,
  transferStudyGroupLeader,
};
