require('dotenv').config();

const bcrypt = require('bcryptjs');

const {
  sequelize,
  User,
  UserTag,
  Resource,
  ResourceCategory,
  ResourceTag,
  RecommendationRule,
  RecommendationBatch,
  Recommendation,
  UserResource,
  LearningDaily,
  LearningGoal,
  WrongQuestion,
  SystemParam,
  SystemLog,
  UserBehavior,
  LearningNote,
  Notification,
} = require('../models');
const { logger } = require('../utils/logger');
const { waitForDb } = require('../utils/waitForDb');

function createRng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function dateOnly(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function sample(rng, arr, n) {
  const pool = arr.slice();
  const out = [];
  for (let i = 0; i < n && pool.length; i += 1) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

async function main() {
  await waitForDb({ retries: 60, delayMs: 2000 });
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    await sequelize.sync({ force: true });
  } finally {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  const rng = createRng(1264);

  const adminPass = await bcrypt.hash('123456', 10);
  const studentPass = await bcrypt.hash('123456', 10);

  const [admin, student] = await Promise.all([
    User.create({
      username: 'admin',
      passwordHash: adminPass,
      role: 'admin',
      name: '系统管理员',
      stage: '管理员',
      learningStyle: '结构型',
      subjectPreference: [],
      active: true,
    }),
    User.create({
      username: 'student',
      passwordHash: studentPass,
      role: 'student',
      name: '李同学',
      stage: '初中',
      learningStyle: '视觉型',
      subjectPreference: ['数学', '英语', '物理'],
      active: true,
    }),
  ]);

  const extraUsers = await User.bulkCreate(
    [
      { username: 'u001', passwordHash: studentPass, role: 'student', name: '王同学', stage: '小学', learningStyle: '听觉型', subjectPreference: ['语文', '数学'], active: true },
      { username: 'u002', passwordHash: studentPass, role: 'student', name: '赵同学', stage: '小学', learningStyle: '动觉型', subjectPreference: ['数学', '英语'], active: true },
      { username: 'u003', passwordHash: studentPass, role: 'student', name: '钱同学', stage: '初中', learningStyle: '视觉型', subjectPreference: ['数学', '物理'], active: true },
      { username: 'u004', passwordHash: studentPass, role: 'student', name: '孙同学', stage: '初中', learningStyle: '结构型', subjectPreference: ['英语', '化学'], active: true },
      { username: 'u005', passwordHash: studentPass, role: 'student', name: '周同学', stage: '高中', learningStyle: '视觉型', subjectPreference: ['物理', '化学', '数学'], active: true },
      { username: 'u006', passwordHash: studentPass, role: 'student', name: '吴同学', stage: '高中', learningStyle: '听觉型', subjectPreference: ['生物', '英语'], active: true },
    ],
    { validate: true }
  );

  await UserTag.bulkCreate(
    [
      { userId: student.id, name: '初中', category: '学习阶段', weight: 0.85 },
      { userId: student.id, name: '数学偏好', category: '学科偏好', weight: 0.9 },
      { userId: student.id, name: '英语偏好', category: '学科偏好', weight: 0.72 },
      { userId: student.id, name: '物理偏好', category: '学科偏好', weight: 0.64 },
      { userId: student.id, name: '视觉型', category: '学习风格', weight: 0.88 },
      { userId: student.id, name: '阶段测评：良好', category: '能力标签', weight: 0.78 },
      { userId: student.id, name: '错题复盘积极', category: '行为标签', weight: 0.66 },
      { userId: student.id, name: '坚持度中等', category: '行为标签', weight: 0.55 },
    ],
    { validate: true }
  );

  const subjects = ['语文', '数学', '英语', '物理', '化学', '生物'];
  const types = ['课程', '课件', '题库', '视频'];
  const difficulties = ['基础', '提高', '挑战'];
  const statuses = ['上架', '上架', '上架', '审核中', '下架'];

  const resourceRows = [];
  for (let i = 1; i <= 48; i += 1) {
    const subject = pick(rng, subjects);
    const type = pick(rng, types);
    const difficulty = pick(rng, difficulties);
    resourceRows.push({
      code: `RES-${String(i).padStart(4, '0')}`,
      name: `${subject}${type} · ${difficulty}提升第${i}讲`,
      subject,
      type,
      difficulty,
      heat: Math.floor(rng() * 980 + 20),
      status: pick(rng, statuses),
      deleted: false,
      uploadedAt: daysAgo(Math.floor(rng() * 40)),
    });
  }
  const resources = await Resource.bulkCreate(resourceRows, { validate: true });

  const categoryRows = [];
  for (let i = 0; i < subjects.length; i += 1) {
    for (let j = 0; j < types.length; j += 1) {
      const subject = subjects[i];
      const type = types[j];
      categoryRows.push({
        categoryCode: `CAT-${subject}-${type}`,
        categoryName: subject,
        parentCategory: type,
        subject,
        type,
        sortOrder: i * 10 + j + 1,
        active: true,
      });
    }
  }
  await ResourceCategory.bulkCreate(categoryRows, { validate: true });

  const tagPool = ['代数', '几何', '阅读理解', '写作', '语法', '力学', '电学', '化学反应', '细胞', '遗传', '函数', '概率', '听力', '词汇'];
  const stagePool = ['小学', '初中', '高中'];
  const resourceTagRows = [];
  for (const r of resources) {
    const tags = sample(rng, tagPool, 3);
    for (const t of tags) {
      resourceTagRows.push({
        resourceId: r.id,
        name: t,
        stage: pick(rng, stagePool),
        weight: clamp(rng() * 0.9 + 0.1, 0.1, 1),
      });
    }
  }
  await ResourceTag.bulkCreate(resourceTagRows, { validate: true });

  await RecommendationRule.bulkCreate(
    [
      {
        ruleCode: 'RULE-001',
        name: '基础策略：标签+行为综合',
        matchDimensions: ['行为匹配', '标签匹配', '热度'],
        weightRatio: [
          { name: '行为匹配', value: 0.4 },
          { name: '标签匹配', value: 0.45 },
          { name: '热度', value: 0.15 },
        ],
        enabled: true,
      },
      {
        ruleCode: 'RULE-002',
        name: '强化策略：薄弱知识点优先',
        matchDimensions: ['错题关联', '标签匹配', '热度'],
        weightRatio: [
          { name: '错题关联', value: 0.5 },
          { name: '标签匹配', value: 0.35 },
          { name: '热度', value: 0.15 },
        ],
        enabled: true,
      },
      {
        ruleCode: 'RULE-003',
        name: '探索策略：多样性提升',
        matchDimensions: ['多样性', '标签匹配', '热度'],
        weightRatio: [
          { name: '多样性', value: 0.35 },
          { name: '标签匹配', value: 0.45 },
          { name: '热度', value: 0.2 },
        ],
        enabled: false,
      },
    ],
    { validate: true }
  );

  await SystemParam.bulkCreate(
    [
      { paramCode: 'MAX_RECOMMEND', name: '最大推荐数', value: '20', defaultValue: '20', updatedBy: 'system' },
      { paramCode: 'UPDATE_FREQ', name: '数据更新频率(分钟)', value: '30', defaultValue: '30', updatedBy: 'system' },
    ],
    { validate: true }
  );

  await SystemLog.bulkCreate(
    [
      { actorUserId: admin.id, type: '登录', content: '管理员登录成功', ip: '127.0.0.1', status: '成功' },
      { actorUserId: admin.id, type: '配置修改', content: '初始化系统参数', ip: '127.0.0.1', status: '成功' },
      { actorUserId: admin.id, type: '资源操作', content: '初始化资源库数据', ip: '127.0.0.1', status: '成功' },
    ],
    { validate: true }
  );

  const dailyRows = [];
  for (let i = 29; i >= 0; i -= 1) {
    const baseMinutes = 40 + Math.floor(rng() * 80);
    const subjectA = pick(rng, subjects);
    const subjectB = pick(rng, subjects);
    const subjectsToday = [subjectA, subjectB];
    for (const s of subjectsToday) {
      const minutes = clamp(Math.floor(baseMinutes * (0.4 + rng() * 0.7)), 15, 150);
      const completed = clamp(Math.floor(rng() * 6), 0, 8);
      const match = clamp(rng() * 0.35 + 0.55, 0, 1);
      const achieve = clamp(minutes / 90, 0, 1);
      dailyRows.push({
        userId: student.id,
        date: dateOnly(daysAgo(i)),
        subject: s,
        studyMinutes: minutes,
        completedCount: completed,
        avgMatchScore: match,
        targetAchieveRate: achieve,
        note: rng() > 0.7 ? '状态不错，继续保持' : '',
      });
    }
  }
  await LearningDaily.bulkCreate(dailyRows, { validate: true });

  const goals = await LearningGoal.bulkCreate(
    [
      {
        userId: student.id,
        type: '日',
        targetMinutes: 90,
        targetResources: 4,
        startDate: dateOnly(daysAgo(0)),
        endDate: dateOnly(daysAgo(0)),
        currentMinutes: 65,
        currentResources: 3,
        adjustmentRecord: [{ at: new Date(), note: '调整为更可持续的目标' }],
      },
      {
        userId: student.id,
        type: '周',
        targetMinutes: 540,
        targetResources: 22,
        startDate: dateOnly(daysAgo(6)),
        endDate: dateOnly(daysAgo(0)),
        currentMinutes: 410,
        currentResources: 17,
        adjustmentRecord: [],
      },
      {
        userId: student.id,
        type: '月',
        targetMinutes: 2160,
        targetResources: 90,
        startDate: dateOnly(daysAgo(29)),
        endDate: dateOnly(daysAgo(0)),
        currentMinutes: 1650,
        currentResources: 74,
        adjustmentRecord: [{ at: new Date(), note: '月中增加了英语训练比重' }],
      },
    ],
    { validate: true }
  );

  const wrongRows = [];
  for (let i = 1; i <= 18; i += 1) {
    const subject = pick(rng, ['数学', '英语', '物理']);
    const corrected = rng() > 0.35;
    const mastery = corrected ? (rng() > 0.6 ? '高' : '中') : '低';
    wrongRows.push({
      userId: student.id,
      code: `WR-${String(i).padStart(4, '0')}`,
      knowledgePoint: `${subject} · ${pick(rng, tagPool)}`,
      wrongCount: clamp(Math.floor(rng() * 4) + 1, 1, 6),
      corrected,
      mastery,
      reviewedAt: corrected ? daysAgo(Math.floor(rng() * 12)) : null,
    });
  }
  await WrongQuestion.bulkCreate(wrongRows, { validate: true });

  const recentResources = resources.filter((r) => r.status === '上架');
  const batches = [];
  for (let i = 13; i >= 0; i -= 1) {
    batches.push(
      await RecommendationBatch.create({
        userId: student.id,
        batchCode: `BATCH-${dateOnly(daysAgo(i))}`,
        resourceCount: 0,
        clickCount: 0,
        completeCount: 0,
        completionRate: 0,
        reviewNote: rng() > 0.7 ? '下次可提高题库占比' : '',
        createdAt: daysAgo(i),
        updatedAt: daysAgo(i),
      })
    );
  }

  const userResourceRows = [];
  const behaviorRows = [];
  for (const b of batches) {
    const n = 6 + Math.floor(rng() * 6);
    const picks = sample(rng, recentResources, n);
    let clicks = 0;
    let completes = 0;
    for (const r of picks) {
      const matchScore = clamp(rng() * 0.35 + 0.6, 0.4, 0.98);
      const clicked = rng() > 0.35;
      const completed = clicked && rng() > 0.55;

      await Recommendation.create({
        userId: student.id,
        batchId: b.id,
        resourceId: r.id,
        adaptedTags: sample(rng, tagPool, 2),
        matchScore,
        clickedAt: clicked ? new Date(b.createdAt.getTime() + Math.floor(rng() * 3) * 3600 * 1000) : null,
        createdAt: b.createdAt,
        updatedAt: b.createdAt,
      });

      if (clicked) clicks += 1;
      if (completed) completes += 1;

      if (clicked) {
        behaviorRows.push({
          userId: student.id,
          type: '点击',
          resourceId: r.id,
          occurredAt: new Date(b.createdAt.getTime() + Math.floor(rng() * 6) * 3600 * 1000),
          dwellSeconds: clamp(Math.floor(rng() * 120) + 15, 10, 300),
        });
      }
      if (completed) {
        behaviorRows.push({
          userId: student.id,
          type: '学习',
          resourceId: r.id,
          occurredAt: new Date(b.createdAt.getTime() + Math.floor(rng() * 10) * 3600 * 1000),
          dwellSeconds: clamp(Math.floor(rng() * 900) + 120, 60, 2400),
        });
      }

      if (completed || rng() > 0.7) {
        userResourceRows.push({
          userId: student.id,
          resourceId: r.id,
          status: completed ? '已完成' : '收藏',
          progressPercent: completed ? 100 : clamp(Math.floor(rng() * 60), 0, 90),
          favoritedAt: rng() > 0.5 ? b.createdAt : null,
          startedAt: clicked ? b.createdAt : null,
          completedAt: completed ? new Date(b.createdAt.getTime() + 2 * 3600 * 1000) : null,
          createdAt: b.createdAt,
          updatedAt: b.createdAt,
        });
      }
    }
    const completionRate = picks.length ? completes / picks.length : 0;
    await b.update({
      resourceCount: picks.length,
      clickCount: clicks,
      completeCount: completes,
      completionRate,
    });
  }

  await UserResource.bulkCreate(userResourceRows, { validate: true, ignoreDuplicates: true });
  await UserBehavior.bulkCreate(behaviorRows, { validate: true });

  const allStudents = [student, ...extraUsers];
  const noteSamples = [
    { title: '二次函数解题技巧总结', subject: '数学', content: '# 二次函数解题技巧\n\n## 一、基本形式\n\n二次函数的一般形式为：\n\n```\ny = ax² + bx + c (a ≠ 0)\n```\n\n## 二、常见题型\n\n1. **求顶点坐标**\n   - 公式法：x = -b/(2a)\n   - 配方法：转化为顶点式\n\n2. **求与坐标轴交点**\n   - 与y轴交点：(0, c)\n   - 与x轴交点：解方程 ax² + bx + c = 0\n\n## 三、注意事项\n\n> 注意判别式 Δ = b² - 4ac 的应用\n\n- Δ > 0：两个不相等实根\n- Δ = 0：一个实根（重根）\n- Δ < 0：无实根' },
    { title: '英语时态考点梳理', subject: '英语', content: '# 英语时态考点梳理\n\n## 八种基本时态\n\n| 时态 | 结构 | 例句 |\n|------|------|------|\n| 一般现在时 | do/does | He plays football. |\n| 一般过去时 | did | He played football. |\n| 一般将来时 | will do | He will play football. |\n| 现在进行时 | am/is/are doing | He is playing football. |\n\n## 高频考点\n\n**现在完成时 vs 一般过去时**\n\n- 现在完成时：强调对现在的影响\n- 一般过去时：只说明过去发生的事\n\n```js\n// 现在完成时\nhas/have + 过去分词\n\n// 一般过去时  \n动词过去式\n```' },
    { title: '牛顿运动定律复习', subject: '物理', content: '# 牛顿运动定律复习\n\n## 牛顿第一定律（惯性定律）\n\n**内容**：一切物体总保持匀速直线运动状态或静止状态，直到有外力迫使它改变这种状态为止。\n\n**理解要点**：\n- 揭示了力和运动的关系\n- 说明了任何物体都有惯性\n- 惯性是物体的固有属性，与运动状态无关\n\n## 牛顿第二定律\n\n**公式**：\n\n```\nF = ma\n```\n\n**特性**：\n- 矢量性：加速度方向与合外力方向相同\n- 瞬时性：力和加速度同时产生、同时变化、同时消失\n- 独立性：每个力各自独立产生加速度\n\n## 牛顿第三定律\n\n**内容**：两个物体之间的作用力和反作用力总是大小相等，方向相反，作用在同一条直线上。\n\n**注意**：作用力与反作用力作用在不同物体上，不能相互抵消。' },
    { title: '化学反应方程式配平方法', subject: '化学', content: '# 化学反应方程式配平方法\n\n## 一、最小公倍数法\n\n**步骤**：\n1. 找出反应式左右两边原子个数最多的元素\n2. 求出最小公倍数\n3. 确定各物质的系数\n\n**示例**：\n\n```\nP + O₂ → P₂O₅\n\nO原子：2和5的最小公倍数是10\nO₂系数：10/2 = 5\nP₂O₅系数：10/5 = 2\n\n最终：4P + 5O₂ = 2P₂O₅\n```\n\n## 二、奇数配偶法\n\n适用于某元素在方程式两边出现次数较多，且原子个数为一奇一偶。\n\n## 三、观察法\n\n从较复杂的物质入手，通过观察分析确定各物质系数。' },
    { title: '《岳阳楼记》赏析笔记', subject: '语文', content: '# 《岳阳楼记》赏析笔记\n\n## 作者简介\n\n**范仲淹**（989-1052），字希文，北宋政治家、文学家。谥号文正，世称范文正公。\n\n## 文章结构\n\n1. **记叙**：作记缘由\n2. **描写**：岳阳楼大观、阴晴景象\n3. **抒情**：迁客骚人的悲喜之情\n4. **议论**：点明主旨，抒发抱负\n\n## 名句赏析\n\n> **\"先天下之忧而忧，后天下之乐而乐\"**\n\n- 揭示了全文的中心思想\n- 表达了作者远大的政治抱负\n- 体现了儒家\"仁政\"思想\n\n## 写作特色\n\n- **叙事、描写、抒情、议论相结合**\n- **骈散结合**：写景用骈句，议论用散句\n- **对比手法**：\"悲\"与\"喜\"的对比，\"古仁人\"与\"迁客骚人\"的对比' },
    { title: '细胞分裂过程总结', subject: '生物', content: '# 细胞分裂过程总结\n\n## 有丝分裂\n\n### 间期（G1、S、G2）\n- DNA复制和有关蛋白质合成\n- 染色体数目不变，DNA数目加倍\n\n### 分裂期\n\n1. **前期**：染色质→染色体，核膜核仁消失，纺锤体出现\n2. **中期**：染色体的着丝点排列在赤道板上（观察染色体的最佳时期）\n3. **后期**：着丝点分裂，姐妹染色单体分开，染色体数目加倍\n4. **末期**：染色体→染色质，核膜核仁重现，纺锤体消失\n\n## 减数分裂\n\n### 减数第一次分裂\n- 同源染色体联会形成四分体\n- 同源染色体分离，非同源染色体自由组合\n- 染色体数目减半\n\n### 减数第二次分裂\n- 类似有丝分裂，但无同源染色体\n- 着丝点分裂，姐妹染色单体分开\n\n## 重要知识点\n\n> 有丝分裂：体细胞增殖，子细胞遗传物质与母细胞相同\n> 减数分裂：形成配子，子细胞染色体数目减半' },
  ];

  const noteRows = [];
  for (let i = 0; i < 24; i += 1) {
    const user = pick(rng, allStudents);
    const sample = pick(rng, noteSamples);
    const randomResource = pick(rng, resources.filter((r) => r.subject === sample.subject && r.status === '上架'));
    const now = new Date();
    const daysOffset = Math.floor(rng() * 30);
    const noteDate = new Date(now.getTime() - daysOffset * 24 * 60 * 60 * 1000);

    noteRows.push({
      userId: user.id,
      title: sample.title,
      content: sample.content,
      subject: sample.subject,
      resourceId: rng() > 0.4 && randomResource ? randomResource.id : null,
      createdAt: noteDate,
      updatedAt: new Date(noteDate.getTime() + Math.floor(rng() * 7 * 24 * 60 * 60 * 1000)),
    });
  }
  await LearningNote.bulkCreate(noteRows, { validate: true });

  const allStudents = [student, ...extraUsers];
  const notificationSamples = [
    {
      type: 'system',
      title: '系统升级维护通知',
      content: '为了提供更好的服务，系统将于本周六凌晨2:00-4:00进行升级维护，届时将暂停服务，请提前做好学习安排。',
      linkUrl: '',
      linkText: '',
    },
    {
      type: 'system',
      title: '欢迎使用智能教学资源推荐系统',
      content: '您好，欢迎使用智能教学资源个性化推荐系统！系统会根据您的学习风格和偏好，为您推荐最合适的学习资源。',
      linkUrl: '/home',
      linkText: '立即体验',
    },
    {
      type: 'recommendation',
      title: '新一批个性化推荐已生成',
      content: '根据您最近的学习行为和偏好，系统已为您生成了新一批个性化学习资源推荐，快去看看吧！',
      linkUrl: '/recommendation-analysis',
      linkText: '查看推荐',
    },
    {
      type: 'recommendation',
      title: '推荐策略已更新',
      content: '系统推荐算法已完成优化升级，新版本在推荐准确性和多样性方面均有显著提升。',
      linkUrl: '/recommendation-analysis',
      linkText: '查看详情',
    },
    {
      type: 'homework',
      title: '数学作业提醒',
      content: '您有新的数学作业待完成，内容为二次函数专项练习，建议在本周日前完成。',
      linkUrl: '/resources',
      linkText: '去完成',
    },
    {
      type: 'homework',
      title: '英语单词打卡提醒',
      content: '今日英语单词打卡还未完成，坚持每天学习，词汇量稳步提升！',
      linkUrl: '/resources',
      linkText: '立即打卡',
    },
  ];

  const notificationRows = [];
  for (const u of allStudents) {
    const count = 3 + Math.floor(rng() * 3);
    const picks = sample(rng, notificationSamples, count);
    picks.forEach((n, idx) => {
      notificationRows.push({
        userId: u.id,
        type: n.type,
        title: n.title,
        content: n.content,
        linkUrl: n.linkUrl || null,
        linkText: n.linkText || null,
        isRead: idx >= 2,
        senderId: admin.id,
        createdAt: daysAgo(idx),
        updatedAt: daysAgo(idx),
      });
    });
  }
  await Notification.bulkCreate(notificationRows, { validate: true });

  await SystemLog.create({
    actorUserId: admin.id,
    type: '配置修改',
    content: `推荐规则已初始化（${goals.length}个学习目标，${batches.length}批推荐）`,
    ip: '127.0.0.1',
    status: '成功',
  });

  logger.info('seed_done', {
    users: 2 + extraUsers.length,
    resources: resources.length,
    tags: resourceTagRows.length,
    batches: batches.length,
    notes: noteRows.length,
    notifications: notificationRows.length,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('seed_failed', { message: err?.message, stack: err?.stack });
    process.exit(1);
  });
