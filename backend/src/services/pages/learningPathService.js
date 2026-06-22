const { Op } = require('sequelize');

const {
  User,
  UserTag,
  Resource,
  LearningPathTemplate,
  LearningPhaseTemplate,
  PhaseResourceTemplate,
  UserLearningPath,
  UserLearningPhase,
  UserPhaseResource,
} = require('../../models');

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function calculatePhaseProgress(phaseResources) {
  if (!phaseResources || phaseResources.length === 0) return 0;
  const required = phaseResources.filter(r => r.isRequired);
  const total = required.length > 0 ? required : phaseResources;
  const completed = total.filter(r => r.completed).length;
  return total.length > 0 ? completed / total.length : 0;
}

function getPhaseStats(phaseResources) {
  const resources = phaseResources || [];
  const requiredResources = resources.filter(r => r.isRequired);
  const optionalResources = resources.filter(r => !r.isRequired);
  const hasRequired = requiredResources.length > 0;

  const progressBase = hasRequired ? requiredResources : resources;
  const completedRequired = requiredResources.filter(r => r.completed).length;
  const completedOptional = optionalResources.filter(r => r.completed).length;

  return {
    progress: progressBase.length > 0
      ? progressBase.filter(r => r.completed).length / progressBase.length
      : 0,
    totalResources: resources.length,
    completedResources: resources.filter(r => r.completed).length,
    requiredCount: requiredResources.length,
    completedRequired: completedRequired,
    optionalCount: optionalResources.length,
    completedOptional: completedOptional,
    hasRequired,
  };
}

function calculateOverallProgress(phases) {
  if (!phases || phases.length === 0) return 0;
  const totalHours = phases.reduce((sum, p) => sum + safeNumber(p.estimatedHours), 0);
  if (totalHours === 0) {
    return phases.reduce((sum, p) => sum + safeNumber(p.progress), 0) / phases.length;
  }
  const weighted = phases.reduce((sum, p) => sum + safeNumber(p.progress) * safeNumber(p.estimatedHours), 0);
  return weighted / totalHours;
}

function extractSubjectTags(userTags, user) {
  const fromTags = userTags
    .filter(t => t.category === '学科偏好')
    .map(t => t.name.replace(/偏好$/, ''));
  const fromPref = Array.isArray(user.subjectPreference) ? user.subjectPreference : [];
  return [...new Set([...fromTags, ...fromPref])];
}

async function loadEnabledTemplates(whereClause = { enabled: true }) {
  return LearningPathTemplate.findAll({
    where: whereClause,
    include: [
      {
        model: LearningPhaseTemplate,
        as: 'phases',
        separate: true,
        order: [['phaseOrder', 'ASC']],
        include: [
          {
            model: PhaseResourceTemplate,
            as: 'resources',
            separate: true,
            order: [['resourceOrder', 'ASC']],
            include: [{ model: Resource, as: 'resource', required: false }],
          },
        ],
      },
    ],
    order: [['id', 'ASC']],
  });
}

function scoreTemplate(template, subjectTags, styleTags, user) {
  let score = 1;

  if (template.targetStage === user.stage) {
    score *= 1.2;
  }

  if (template.targetSubjects && template.targetSubjects.length > 0) {
    const subjectMatch = template.targetSubjects.filter(s => subjectTags.includes(s)).length;
    score *= 0.5 + 0.5 * (subjectMatch / Math.max(template.targetSubjects.length, 1));
  }

  if (template.targetLearningStyles && template.targetLearningStyles.length > 0) {
    const styleMatch = template.targetLearningStyles.filter(
      s => styleTags.includes(s) || s === user.learningStyle
    ).length;
    score *= 0.5 + 0.5 * (styleMatch / Math.max(template.targetLearningStyles.length, 1));
  }

  return score;
}

function pickBestTemplate(templates, subjectTags, styleTags, user) {
  let bestTemplate = null;
  let bestScore = 0;

  for (const template of templates) {
    if (!template.phases || template.phases.length === 0) continue;

    const score = scoreTemplate(template, subjectTags, styleTags, user);
    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template;
    }
  }

  return bestTemplate;
}

async function findMatchingTemplate(user) {
  const userTags = await UserTag.findAll({ where: { userId: user.id } });
  const subjectTags = extractSubjectTags(userTags, user);
  const styleTags = userTags.filter(t => t.category === '学习风格').map(t => t.name);

  const stageTemplates = await loadEnabledTemplates({
    targetStage: user.stage,
    enabled: true,
  });

  let bestTemplate = pickBestTemplate(stageTemplates, subjectTags, styleTags, user);
  if (bestTemplate) return bestTemplate;

  const allTemplates = await loadEnabledTemplates({ enabled: true });
  return pickBestTemplate(allTemplates, subjectTags, styleTags, user);
}

async function createUserLearningPath(userId, template) {
  const userLearningPath = await UserLearningPath.create({
    userId,
    templateId: template.id,
    name: template.name,
    description: template.description,
    totalEstimatedHours: template.totalEstimatedHours,
    status: '未开始',
  });

  const phases = [];
  for (let i = 0; i < template.phases.length; i += 1) {
    const phaseTemplate = template.phases[i];
    const userPhase = await UserLearningPhase.create({
      userId,
      learningPathId: userLearningPath.id,
      phaseTemplateId: phaseTemplate.id,
      phaseOrder: phaseTemplate.phaseOrder,
      name: phaseTemplate.name,
      goal: phaseTemplate.goal,
      description: phaseTemplate.description,
      estimatedHours: phaseTemplate.estimatedHours,
      difficulty: phaseTemplate.difficulty,
      milestone: phaseTemplate.milestone,
      totalResources: phaseTemplate.resources.length,
      status: i === 0 ? '未开始' : '已锁定',
    });

    const phaseResources = [];
    for (const resourceTemplate of phaseTemplate.resources) {
      if (!resourceTemplate.resource || resourceTemplate.resource.status !== '上架') continue;

      const userPhaseResource = await UserPhaseResource.create({
        userId,
        phaseId: userPhase.id,
        resourceId: resourceTemplate.resourceId,
        resourceTemplateId: resourceTemplate.id,
        resourceOrder: resourceTemplate.resourceOrder,
        estimatedMinutes: resourceTemplate.estimatedMinutes,
        isRequired: resourceTemplate.isRequired,
        note: resourceTemplate.note,
      });
      userPhaseResource.resource = resourceTemplate.resource;
      phaseResources.push(userPhaseResource);
    }

    await userPhase.update({ totalResources: phaseResources.length });
    userPhase.resources = phaseResources;
    phases.push(userPhase);
  }

  if (phases.length > 0) {
    phases[0].status = '未开始';
    await phases[0].save();
    await userLearningPath.update({ currentPhaseId: phases[0].id });
  }

  userLearningPath.phases = phases;
  return userLearningPath;
}

async function getOrCreateLearningPath(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('用户不存在');
  if (user.role === 'admin') return null;

  let learningPath = await UserLearningPath.findOne({
    where: { userId },
    include: [
      {
        model: UserLearningPhase,
        as: 'phases',
        include: [
          {
            model: UserPhaseResource,
            as: 'resources',
            include: [{ model: Resource, as: 'resource' }],
            order: [['resourceOrder', 'ASC']],
          },
        ],
        order: [['phaseOrder', 'ASC']],
      },
    ],
    order: [['id', 'DESC']],
  });

  if (!learningPath) {
    const template = await findMatchingTemplate(user);
    if (!template) throw new Error('未找到匹配的学习路径模板');
    learningPath = await createUserLearningPath(userId, template);
  }

  return learningPath;
}

async function getLearningPathSummary(userId) {
  const learningPath = await getOrCreateLearningPath(userId);
  if (!learningPath) return null;

  const phases = learningPath.phases || [];
  const phaseStats = [];
  for (const phase of phases) {
    const stats = getPhaseStats(phase.resources);
    phaseStats.push({ ...phase, ...stats });
  }

  const overallProgress = calculateOverallProgress(phaseStats);

  const currentPhase = phaseStats.find(p => p.id === learningPath.currentPhaseId) || phaseStats[0];

  return {
    learningPathId: learningPath.id,
    name: learningPath.name,
    description: learningPath.description,
    overallProgress,
    totalEstimatedHours: learningPath.totalEstimatedHours,
    status: learningPath.status,
    currentPhase: currentPhase ? {
      id: currentPhase.id,
      name: currentPhase.name,
      goal: currentPhase.goal,
      progress: currentPhase.progress,
      totalResources: currentPhase.totalResources,
      completedResources: currentPhase.completedResources,
      requiredCount: currentPhase.requiredCount,
      completedRequired: currentPhase.completedRequired,
      optionalCount: currentPhase.optionalCount,
      completedOptional: currentPhase.completedOptional,
      hasRequired: currentPhase.hasRequired,
      estimatedHours: currentPhase.estimatedHours,
      difficulty: currentPhase.difficulty,
      status: currentPhase.status,
    } : null,
    totalPhases: phases.length,
    completedPhases: phases.filter(p => p.status === '已完成').length,
  };
}

async function getFullLearningPath(userId) {
  const learningPath = await getOrCreateLearningPath(userId);
  if (!learningPath) return null;

  const phases = learningPath.phases || [];
  const phaseData = [];

  for (const phase of phases) {
    const resources = (phase.resources || []).map(r => ({
      id: r.id,
      resourceId: r.resourceId,
      name: r.resource?.name,
      subject: r.resource?.subject,
      type: r.resource?.type,
      difficulty: r.resource?.difficulty,
      estimatedMinutes: r.estimatedMinutes,
      isRequired: r.isRequired,
      note: r.note,
      completed: r.completed,
      completedAt: r.completedAt,
      progressPercent: r.progressPercent,
    }));

    const stats = getPhaseStats(phase.resources);

    phaseData.push({
      id: phase.id,
      phaseOrder: phase.phaseOrder,
      name: phase.name,
      goal: phase.goal,
      description: phase.description,
      estimatedHours: phase.estimatedHours,
      difficulty: phase.difficulty,
      milestone: phase.milestone,
      progress: stats.progress,
      totalResources: stats.totalResources,
      completedResources: stats.completedResources,
      requiredCount: stats.requiredCount,
      completedRequired: stats.completedRequired,
      optionalCount: stats.optionalCount,
      completedOptional: stats.completedOptional,
      hasRequired: stats.hasRequired,
      status: phase.status,
      startedAt: phase.startedAt,
      completedAt: phase.completedAt,
      resources,
    });
  }

  const overallProgress = calculateOverallProgress(phaseData);

  return {
    learningPathId: learningPath.id,
    name: learningPath.name,
    description: learningPath.description,
    overallProgress,
    totalEstimatedHours: learningPath.totalEstimatedHours,
    status: learningPath.status,
    currentPhaseId: learningPath.currentPhaseId,
    startedAt: learningPath.startedAt,
    completedAt: learningPath.completedAt,
    phases: phaseData,
  };
}

async function updateResourceProgress(userId, phaseResourceId, completed) {
  const phaseResource = await UserPhaseResource.findOne({
    where: { id: phaseResourceId, userId },
    include: [
      { model: UserLearningPhase, as: 'phase' },
    ],
  });

  if (!phaseResource) throw new Error('资源不存在');

  const phase = phaseResource.phase;
  if (phase.status === '已锁定') throw new Error('该阶段尚未解锁');

  await phaseResource.update({
    completed,
    completedAt: completed ? new Date() : null,
    progressPercent: completed ? 100 : 0,
  });

  if (phase.status === '未开始') {
    await phase.update({ status: '进行中', startedAt: new Date() });
    const learningPath = await UserLearningPath.findByPk(phase.learningPathId);
    if (learningPath && learningPath.status === '未开始') {
      await learningPath.update({ status: '进行中', startedAt: new Date() });
    }
  }

  const allPhaseResources = await UserPhaseResource.findAll({
    where: { phaseId: phase.id },
  });

  const progress = calculatePhaseProgress(allPhaseResources);
  const completedResources = allPhaseResources.filter(r => r.completed).length;

  await phase.update({
    progress,
    completedResources,
  });

  const allRequired = allPhaseResources.filter(r => r.isRequired);
  const checkList = allRequired.length > 0 ? allRequired : allPhaseResources;
  const allCompleted = checkList.every(r => r.completed);

  if (allCompleted && phase.status !== '已完成') {
    await phase.update({ status: '已完成', completedAt: new Date() });

    const allPhases = await UserLearningPhase.findAll({
      where: { learningPathId: phase.learningPathId },
      order: [['phaseOrder', 'ASC']],
    });

    const currentIndex = allPhases.findIndex(p => p.id === phase.id);
    if (currentIndex < allPhases.length - 1) {
      const nextPhase = allPhases[currentIndex + 1];
      await nextPhase.update({ status: '未开始' });
      await UserLearningPath.update(
        { currentPhaseId: nextPhase.id },
        { where: { id: phase.learningPathId } }
      );
    } else {
      await UserLearningPath.update(
        { status: '已完成', completedAt: new Date(), currentPhaseId: null },
        { where: { id: phase.learningPathId } }
      );
    }
  }

  return await getFullLearningPath(userId);
}

const STAGE_TEMPLATE_CONFIGS = [
  { stage: '小学', subjects: ['语文', '数学', '英语'] },
  { stage: '初中', subjects: ['数学', '英语', '物理'] },
  { stage: '高中', subjects: ['数学', '英语', '物理', '化学'] },
];

async function createLearningPathTemplates() {
  const allResources = await Resource.findAll({ where: { status: '上架' } });

  for (const { stage, subjects } of STAGE_TEMPLATE_CONFIGS) {
    const existing = await LearningPathTemplate.findOne({ where: { targetStage: stage } });
    if (existing) continue;

    const template = await LearningPathTemplate.create({
      code: `PATH-${stage}-MAIN`,
      name: `${stage}全科学习路径`,
      description: `根据${stage}学生特点定制的个性化学习路径，覆盖主科核心知识点`,
      targetStage: stage,
      targetSubjects: subjects,
      targetLearningStyles: ['视觉型', '听觉型', '动觉型', '结构型'],
      totalEstimatedHours: 120,
      enabled: true,
    });

    const phasesConfig = [
      {
        name: '基础夯实阶段',
        goal: '巩固各学科基础知识点，建立知识框架',
        description: '本阶段重点在于打牢基础，理解核心概念，为后续学习做好铺垫',
        estimatedHours: 30,
        difficulty: '基础',
        milestone: '完成所有基础知识点学习，掌握80%基础题型',
        resources: subjects.map((s, i) => ({
          subject: s,
          type: '课程',
          difficulty: '基础',
          estimatedMinutes: 45,
          isRequired: true,
          note: `${s}基础入门课程`,
        })).concat(subjects.map((s, i) => ({
          subject: s,
          type: '课件',
          difficulty: '基础',
          estimatedMinutes: 30,
          isRequired: true,
          note: `${s}知识点梳理`,
        }))),
      },
      {
        name: '能力提升阶段',
        goal: '深化理解，提升综合应用能力',
        description: '通过综合练习和拓展学习，提升知识应用能力和解题技巧',
        estimatedHours: 45,
        difficulty: '提高',
        milestone: '能够独立解决中等难度综合题，错题率低于20%',
        resources: subjects.map((s, i) => ({
          subject: s,
          type: '课程',
          difficulty: '提高',
          estimatedMinutes: 60,
          isRequired: true,
          note: `${s}提升专题`,
        })).concat(subjects.map((s, i) => ({
          subject: s,
          type: '题库',
          difficulty: '提高',
          estimatedMinutes: 45,
          isRequired: true,
          note: `${s}强化练习`,
        }))).concat(subjects.map((s, i) => ({
          subject: s,
          type: '视频',
          difficulty: '提高',
          estimatedMinutes: 30,
          isRequired: false,
          note: `${s}拓展学习`,
        }))),
      },
      {
        name: '综合突破阶段',
        goal: '突破重难点，应对综合性挑战',
        description: '针对高频考点和难点进行专项突破，培养综合思维能力',
        estimatedHours: 30,
        difficulty: '挑战',
        milestone: '熟练掌握解题技巧，能够应对各类综合性、创新性题目',
        resources: subjects.map((s, i) => ({
          subject: s,
          type: '课程',
          difficulty: '挑战',
          estimatedMinutes: 60,
          isRequired: true,
          note: `${s}重难点突破`,
        })).concat(subjects.map((s, i) => ({
          subject: s,
          type: '题库',
          difficulty: '挑战',
          estimatedMinutes: 50,
          isRequired: true,
          note: `${s}压轴题训练`,
        }))),
      },
      {
        name: '复习巩固阶段',
        goal: '系统复习，查漏补缺，全面提升',
        description: '通过系统性复习和模拟训练，巩固学习成果，做好应试准备',
        estimatedHours: 15,
        difficulty: '提高',
        milestone: '形成完整知识体系，能够融会贯通，灵活运用',
        resources: subjects.map((s, i) => ({
          subject: s,
          type: '课件',
          difficulty: '提高',
          estimatedMinutes: 40,
          isRequired: true,
          note: `${s}知识体系梳理`,
        })).concat(subjects.map((s, i) => ({
          subject: s,
          type: '题库',
          difficulty: '提高',
          estimatedMinutes: 45,
          isRequired: true,
          note: `${s}综合模拟训练`,
        }))),
      },
    ];

    for (let i = 0; i < phasesConfig.length; i += 1) {
      const pc = phasesConfig[i];
      const phase = await LearningPhaseTemplate.create({
        templateId: template.id,
        phaseOrder: i,
        name: pc.name,
        goal: pc.goal,
        description: pc.description,
        estimatedHours: pc.estimatedHours,
        difficulty: pc.difficulty,
        milestone: pc.milestone,
      });

      for (let j = 0; j < pc.resources.length; j += 1) {
        const rc = pc.resources[j];
        const matchedResource = allResources.find(
          r => r.subject === rc.subject && r.type === rc.type && r.difficulty === rc.difficulty
        ) || allResources.find(r => r.subject === rc.subject);

        if (matchedResource) {
          await PhaseResourceTemplate.create({
            phaseTemplateId: phase.id,
            resourceId: matchedResource.id,
            resourceOrder: j,
            estimatedMinutes: rc.estimatedMinutes,
            isRequired: rc.isRequired,
            note: rc.note,
          });
        }
      }
    }
  }
}

module.exports = {
  getLearningPathSummary,
  getFullLearningPath,
  updateResourceProgress,
  createLearningPathTemplates,
  calculatePhaseProgress,
  calculateOverallProgress,
};
