const { Op } = require('sequelize');

const {
  Resource,
  ResourceTag,
  UserResource,
  ChatSession,
  ChatMessage,
} = require('../models');

async function getAvailableResourcesForQA(userId) {
  const userResources = await UserResource.findAll({
    where: {
      userId,
      status: { [Op.in]: ['收藏', '待学', '学习中', '已完成'] },
    },
    include: [
      {
        model: Resource,
        as: 'resource',
        where: { deleted: false, status: '上架' },
        required: true,
        include: [{ model: ResourceTag, as: 'tags' }],
      },
    ],
    order: [['updatedAt', 'DESC']],
  });

  return userResources.map((ur) => ({
    id: ur.resource.id,
    code: ur.resource.code,
    name: ur.resource.name,
    subject: ur.resource.subject,
    type: ur.resource.type,
    difficulty: ur.resource.difficulty,
    status: ur.status,
    tags: (ur.resource.tags || []).map((t) => ({
      name: t.name,
      weight: Number(t.weight),
    })),
  }));
}

async function getUserSessions(userId) {
  const sessions = await ChatSession.findAll({
    where: { userId },
    include: [
      {
        model: Resource,
        as: 'resource',
        where: { deleted: false },
        required: false,
        attributes: ['id', 'code', 'name', 'subject', 'type', 'difficulty'],
      },
    ],
    order: [['lastMessageAt', 'DESC']],
  });

  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
    resourceId: s.resourceId,
    resourceName: s.resource?.name || '资源已删除',
    resourceCode: s.resource?.code || '',
    subject: s.resource?.subject || '',
    difficulty: s.resource?.difficulty || '',
    lastMessageAt: s.lastMessageAt,
    messageCount: s.messageCount,
  }));
}

async function getOrCreateSession(userId, resourceId) {
  const resource = await Resource.findOne({
    where: { id: resourceId, deleted: false, status: '上架' },
  });
  if (!resource) {
    return { error: '资源不存在或不可用' };
  }

  let session = await ChatSession.findOne({
    where: { userId, resourceId },
    order: [['lastMessageAt', 'DESC']],
  });

  if (!session) {
    session = await ChatSession.create({
      userId,
      resourceId,
      title: `${resource.name} - 问答`,
      lastMessageAt: new Date(),
      messageCount: 0,
    });
  }

  const messages = await ChatMessage.findAll({
    where: { sessionId: session.id, userId },
    order: [['createdAt', 'ASC']],
  });

  const resourceTags = await ResourceTag.findAll({ where: { resourceId } });

  return {
    session: {
      id: session.id,
      title: session.title,
      resourceId: resource.id,
      resourceName: resource.name,
      resourceCode: resource.code,
      subject: resource.subject,
      type: resource.type,
      difficulty: resource.difficulty,
      tags: resourceTags.map((t) => ({ name: t.name, weight: Number(t.weight) })),
    },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  };
}

async function getSessionMessages(userId, sessionId) {
  const session = await ChatSession.findOne({ where: { id: sessionId, userId } });
  if (!session) {
    return { error: '会话不存在' };
  }

  const resource = await Resource.findByPk(session.resourceId);
  const resourceTags = resource ? await ResourceTag.findAll({ where: { resourceId: resource.id } }) : [];

  const messages = await ChatMessage.findAll({
    where: { sessionId, userId },
    order: [['createdAt', 'ASC']],
  });

  return {
    session: {
      id: session.id,
      title: session.title,
      resourceId: session.resourceId,
      resourceName: resource?.name || '资源已删除',
      resourceCode: resource?.code || '',
      subject: resource?.subject || '',
      type: resource?.type || '',
      difficulty: resource?.difficulty || '',
      tags: resourceTags.map((t) => ({ name: t.name, weight: Number(t.weight) })),
    },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  };
}

const KNOWLEDGE_TEMPLATES = {
  数学: {
    default: '数学是一门研究数量、结构、变化以及空间模型等概念的学科。你可以问我关于代数、几何、函数、概率统计等方面的具体问题。',
    代数: '代数是数学的一个分支，主要研究数、数量、关系、结构与代数方程（组）等。核心内容包括：整式运算、因式分解、方程与不等式、函数等。',
    几何: '几何是研究空间图形的形状、大小、位置关系及其性质的数学分支。包括平面几何（三角形、四边形、圆等）和立体几何。',
    函数: '函数描述了两个变量之间的对应关系。常见函数类型有：一次函数、二次函数、反比例函数、指数函数、对数函数、三角函数等。',
    方程: '方程是表示两个数学式之间相等关系的等式。解方程的核心思想是"等价变形"，常用方法有：代入消元、加减消元、因式分解、配方法、公式法等。',
  },
  语文: {
    default: '语文学习包括阅读理解、写作、文言文、诗词鉴赏等方面。请告诉我你想了解哪方面的内容。',
    阅读理解: '阅读理解的技巧包括：1)先读题目带着问题读文章；2)抓住中心句和关键词；3)注意上下文语境；4)归纳段落大意；5)理解作者的写作意图和情感态度。',
    写作: '写好作文的要点：1)审清题意，确定中心；2)列好提纲，理清思路；3)开头吸引人，结尾有升华；4)善用修辞和描写；5)内容具体，情感真实。',
    文言文: '文言文学习要点：1)积累常用实词和虚词；2)掌握特殊句式（判断句、被动句、倒装句、省略句）；3)了解词类活用现象；4)多读多背，培养语感。',
    诗词: '诗词鉴赏方法：1)了解作者生平及创作背景；2)把握诗词中的意象；3)体会作者的思想感情；4)分析表现手法（借景抒情、托物言志、用典等）。',
  },
  英语: {
    default: '英语学习涵盖词汇、语法、听力、口语、阅读、写作等方面。请具体说明你想了解什么。',
    语法: '英语语法包括：时态（一般现在/过去/将来时、进行时、完成时）、语态（主动/被动）、从句（名词性从句、定语从句、状语从句）、非谓语动词等。',
    词汇: '词汇记忆技巧：1)词根词缀法；2)联想记忆法；3)语境记忆法；4)艾宾浩斯遗忘曲线复习法；5)在阅读和写作中主动运用。',
    阅读理解: '英语阅读技巧：1)略读（Skimming）抓主旨；2)扫读（Scanning）找细节；3)根据上下文猜词；4)注意转折词和信号词；5)分析长难句结构。',
    写作: '英语写作要点：1)结构清晰（开头-主体-结尾）；2)善用连接词；3)句式多样化；4)避免中式英语；5)检查语法和拼写错误。',
  },
  物理: {
    default: '物理是研究物质、能量、空间和时间及其相互作用的自然科学。分为力学、热学、电磁学、光学、原子物理等。请告诉我你具体想了解哪部分。',
    力学: '力学是物理学的基础分支，研究物体的运动及其受力规律。核心内容：牛顿运动定律、功与能、动量守恒、万有引力定律、圆周运动、简谐运动等。',
    电学: '电学研究电荷、电场、电流、电路等现象。重要概念：库仑定律、欧姆定律、焦耳定律、串并联电路、电磁感应等。',
    光学: '光学研究光的本性、传播和与物质的相互作用。包括：光的反射与折射、透镜成像、光的干涉与衍射、光谱分析等。',
    热学: '热学研究热现象及其规律。包括：温度与温度计、物态变化、热力学定律、分子动理论等。',
  },
  化学: {
    default: '化学是研究物质的组成、结构、性质及其变化规律的科学。你可以问我关于元素、化合物、化学反应等方面的问题。',
    元素周期表: '元素周期表是化学的基础工具。同一周期从左到右，金属性减弱、非金属性增强；同一主族从上到下，金属性增强、非金属性减弱。',
    化学反应: '化学反应的基本类型有：化合反应、分解反应、置换反应、复分解反应。氧化还原反应是电子转移的反应。',
    有机化学: '有机化学研究含碳化合物。常见官能团有：羟基(-OH)、羧基(-COOH)、醛基(-CHO)、氨基(-NH2)、碳碳双键、碳碳三键等。',
  },
  生物: {
    default: '生物学是研究生命现象和生命活动规律的科学。包括细胞、遗传、生态、生理等方面。请具体说明你的问题。',
    细胞: '细胞是生物体结构和功能的基本单位。分为原核细胞和真核细胞。主要结构包括细胞膜、细胞质、细胞核（原核生物无成形细胞核）及各种细胞器。',
    遗传: '遗传学研究基因的传递和表达规律。核心概念：DNA是遗传物质、基因的分离定律和自由组合定律、基因突变和基因重组、染色体变异等。',
    生态: '生态学研究生物与环境之间的相互关系。包括：种群、群落、生态系统的结构和功能、物质循环和能量流动、生态平衡等。',
  },
};

function generateRecommendedQuestions(resource) {
  const { name, subject, type, difficulty, tags } = resource;
  const questions = [];

  questions.push(`《${name}》主要讲什么内容？`);
  questions.push(`如何高效学习${subject}的${difficulty}内容？`);

  if (tags && tags.length > 0) {
    const topTags = tags.slice(0, 3).map((t) => t.name);
    topTags.forEach((tag) => {
      questions.push(`${tag}是什么？能详细讲解一下吗？`);
    });
  }

  questions.push(`${subject}的${difficulty}级别有哪些重点知识点？`);
  questions.push(`学习这份资源需要掌握哪些前置知识？`);

  return questions.slice(0, 6);
}

function generateReply(resource, userQuestion, historyMessages) {
  const { name, subject, type, difficulty, tags } = resource;
  const q = userQuestion.trim().toLowerCase();

  const subjectTemplates = KNOWLEDGE_TEMPLATES[subject] || KNOWLEDGE_TEMPLATES['数学'];

  const allTagNames = (tags || []).map((t) => t.name);
  for (const tagName of allTagNames) {
    if (q.includes(tagName.toLowerCase()) && subjectTemplates[tagName]) {
      return buildReply(name, subject, tagName, subjectTemplates[tagName], difficulty, type);
    }
  }

  const templateKeys = Object.keys(subjectTemplates).filter((k) => k !== 'default');
  for (const key of templateKeys) {
    if (q.includes(key.toLowerCase())) {
      return buildReply(name, subject, key, subjectTemplates[key], difficulty, type);
    }
  }

  if (q.includes('介绍') || q.includes('讲什么') || q.includes('内容') || q.includes('简介') || q.includes('概述')) {
    return `📚 关于《${name}》\n\n这是一份${subject}学科的${difficulty}级别${type}资源。` +
      `主要覆盖以下核心内容：\n\n` +
      (allTagNames.length > 0
        ? allTagNames.map((t, i) => `${i + 1}. **${t}** - ${subject}的重要知识点`).join('\n')
        : `• ${subject}基础知识精讲\n• 典型例题分析\n• 解题思路与技巧\n• 实战练习与巩固`) +
      `\n\n建议你按照"理解概念 → 分析例题 → 动手练习 → 总结归纳"的步骤来学习这份资源。有具体问题可以随时问我！`;
  }

  if (q.includes('重点') || q.includes('核心') || q.includes('考点') || q.includes('关键')) {
    return `🎯 《${name}》核心考点\n\n` +
      `作为${subject}学科的${difficulty}资源，重点掌握以下内容：\n\n` +
      (allTagNames.length > 0
        ? allTagNames.map((t, i) => `${i + 1}. **${t}**\n   - 概念理解与辨析\n   - 典型题型解法\n   - 常见易错点`).join('\n\n')
        : `1. **基础概念**：确保每个定义都理解透彻\n2. **解题方法**：掌握标准解题步骤\n3. **综合应用**：学会知识迁移`) +
      `\n\n💡 建议：做一个知识思维导图，把各知识点的关联理清楚，这样记忆会更牢固！`;
  }

  if (q.includes('难') || q.includes('困难') || q.includes('不会') || q.includes('不懂')) {
    return `💪 别担心，${difficulty}级别确实有一定挑战性！\n\n` +
      `针对《${name}》的学习建议：\n\n` +
      `1. **回到基础**：如果某个知识点卡住了，先回顾之前学过的基础概念\n` +
      `2. **拆解问题**：把复杂问题拆分成小步骤，逐个解决\n` +
      `3. **多做练习**：从简单题开始，循序渐进\n` +
      `4. **善用笔记**：把不懂的地方记下来，重点攻克\n\n` +
      `你可以具体告诉我是哪部分让你觉得困难？我来帮你详细分析。`;
  }

  if (q.includes('怎么学') || q.includes('如何学') || q.includes('学习方法') || q.includes('学习技巧')) {
    return `📖 ${subject}学习方法论\n\n` +
      `针对《${name}》这份${difficulty}${type}，推荐以下学习方法：\n\n` +
      `**预习阶段**\n` +
      `• 快速浏览整体框架，了解有哪些知识点\n` +
      `• 标出看不懂的地方，带着问题学习\n\n` +
      `**学习阶段**\n` +
      `• 逐节深入，确保每个概念都真正理解\n` +
      `• 不要急于刷题，先把原理弄明白\n` +
      `• ${allTagNames.length > 0 ? '重点关注：' + allTagNames.slice(0, 3).join('、') : '重点掌握核心知识点'}\n\n` +
      `**复习阶段**\n` +
      `• 用自己的话复述知识点\n` +
      `• 做典型例题并总结解题思路\n` +
      `• 建立错题本，定期回顾\n\n` +
      `加油！坚持就是胜利 💪`;
  }

  if (q.includes('例题') || q.includes('题目') || q.includes('练习') || q.includes('刷题')) {
    return `📝 练习建议\n\n` +
      `关于《${name}》的练习策略：\n\n` +
      `1. **由易到难**：先做基础题巩固概念，再挑战提高题\n` +
      `2. **限时训练**：模拟考试环境，提高解题速度\n` +
      `3. **错题复盘**：做错的题目要分析原因，是概念不清还是粗心\n` +
      `4. **举一反三**：一道题做完后思考还有没有其他解法\n\n` +
      `💡 你想练习${allTagNames.length > 0 ? allTagNames[0] + '相关' : subject + '的'}题目吗？` +
      `我可以给你推荐相关题型和解题思路。`;
  }

  if (q.includes('前置') || q.includes('预备') || q.includes('需要什么') || q.includes('基础')) {
    return `📋 前置知识清单\n\n` +
      `学习《${name}》（${subject}/${difficulty}）建议具备以下基础：\n\n` +
      `1. **${subject}基础概念**：了解本学科的基本术语和定义\n` +
      `2. **逻辑思维能力**：能够进行简单的推理和分析\n` +
      (allTagNames.length > 0
        ? `3. **相关知识储备**：建议先了解 ${allTagNames.slice(0, 2).join('、')} 等基础内容\n`
        : '') +
      `\n如果你发现某个前置知识不熟悉，可以先去补一下，再来学习这份资源效果会更好！`;
  }

  const defaultReply = subjectTemplates.default || '这是一个很好的问题！';

  return `🤖 ${defaultReply}\n\n` +
    `你正在学习《${name}》（${subject}·${difficulty}·${type}），` +
    (allTagNames.length > 0
      ? `主要涉及 ${allTagNames.slice(0, 4).join('、')} 等知识点。\n\n`
      : `\n\n`) +
    `你可以试试这样问我：\n` +
    `• "某个知识点是什么意思？"\n` +
    `• "这道题怎么做？"\n` +
    `• "有什么学习技巧？"\n` +
    `• "重点考点有哪些？"`;
}

function buildReply(resourceName, subject, topic, content, difficulty, type) {
  return `📖 关于 **${topic}**\n\n` +
    `${content}\n\n` +
    `📎 关联信息：\n` +
    `• 当前资源：《${resourceName}》\n` +
    `• 学科：${subject} | 难度：${difficulty} | 类型：${type}\n\n` +
    `还有什么想深入了解的吗？可以继续提问～`;
}

async function sendMessage(userId, sessionId, content) {
  const session = await ChatSession.findOne({ where: { id: sessionId, userId } });
  if (!session) {
    return { error: '会话不存在' };
  }

  const resource = await Resource.findByPk(session.resourceId);
  if (!resource) {
    return { error: '关联资源不存在' };
  }
  const resourceTags = await ResourceTag.findAll({ where: { resourceId: resource.id } });

  const userMsg = await ChatMessage.create({
    sessionId,
    userId,
    role: 'user',
    content,
    createdAt: new Date(),
  });

  const historyMessages = await ChatMessage.findAll({
    where: { sessionId, userId },
    order: [['createdAt', 'ASC']],
    limit: 20,
  });

  const resourceContext = {
    name: resource.name,
    subject: resource.subject,
    type: resource.type,
    difficulty: resource.difficulty,
    tags: resourceTags.map((t) => ({ name: t.name, weight: Number(t.weight) })),
  };

  const replyContent = generateReply(resourceContext, content, historyMessages);

  const assistantMsg = await ChatMessage.create({
    sessionId,
    userId,
    role: 'assistant',
    content: replyContent,
    createdAt: new Date(),
  });

  await session.update({
    lastMessageAt: new Date(),
    messageCount: session.messageCount + 2,
    title: session.messageCount === 0 ? content.slice(0, 20) + (content.length > 20 ? '...' : '') : session.title,
  });

  return {
    userMessage: {
      id: userMsg.id,
      role: 'user',
      content: userMsg.content,
      createdAt: userMsg.createdAt,
    },
    assistantMessage: {
      id: assistantMsg.id,
      role: 'assistant',
      content: assistantMsg.content,
      createdAt: assistantMsg.createdAt,
    },
    recommendedQuestions: generateRecommendedQuestions(resourceContext),
  };
}

module.exports = {
  getAvailableResourcesForQA,
  getUserSessions,
  getOrCreateSession,
  getSessionMessages,
  sendMessage,
  generateRecommendedQuestions,
};
