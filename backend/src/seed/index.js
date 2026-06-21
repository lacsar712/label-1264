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
  Question,
  Quiz,
  QuizQuestion,
  ResourceReview,
} = require('../models');
const { createLearningPathTemplates } = require('../services/pages/learningPathService');
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

  const questionBank = {
    数学: {
      基础: [
        { kp: '一元一次方程', c: '方程 2x + 5 = 11 的解是？', o: { A: 'x = 2', B: 'x = 3', C: 'x = 4', D: 'x = 5' }, a: 'B', an: '移项得 2x = 11 - 5 = 6，两边除以 2 得 x = 3。' },
        { kp: '整式运算', c: '计算 (x + 2)(x - 3) 的结果是？', o: { A: 'x² - x - 6', B: 'x² + x - 6', C: 'x² - x + 6', D: 'x² + x + 6' }, a: 'A', an: '使用分配律：x·x + x·(-3) + 2·x + 2·(-3) = x² - 3x + 2x - 6 = x² - x - 6。' },
        { kp: '比例', c: '若 a:b = 2:3，b:c = 4:5，则 a:c = ?', o: { A: '8:15', B: '6:15', C: '8:12', D: '10:15' }, a: 'A', an: 'a:b = 2:3 = 8:12，b:c = 4:5 = 12:15，所以 a:c = 8:15。' },
        { kp: '几何基础', c: '一个三角形三个内角分别为 35°、65°，第三个角是？', o: { A: '70°', B: '80°', C: '90°', D: '100°' }, a: 'B', an: '三角形内角和为 180°，所以第三角 = 180 - 35 - 65 = 80°。' },
        { kp: '百分数', c: '一件商品原价 200 元，打 8 折后售价是？', o: { A: '140 元', B: '150 元', C: '160 元', D: '170 元' }, a: 'C', an: '8 折即原价的 80%，200 × 0.8 = 160 元。' },
        { kp: '平均数', c: '5 个数的平均数是 12，去掉一个数后平均数变为 10，去掉的数是？', o: { A: '15', B: '18', C: '20', D: '22' }, a: 'C', an: '5 个数总和 = 12 × 5 = 60；去掉后 4 个数总和 = 10 × 4 = 40；去掉的数 = 60 - 40 = 20。' },
        { kp: '因式分解', c: '因式分解 x² - 9 的结果是？', o: { A: '(x+3)(x-3)', B: '(x+9)(x-1)', C: '(x-3)²', D: '(x+3)²' }, a: 'A', an: '运用平方差公式：a² - b² = (a+b)(a-b)，所以 x² - 9 = x² - 3² = (x+3)(x-3)。' },
      ],
      提高: [
        { kp: '二次函数', c: '二次函数 y = x² - 4x + 3 的顶点坐标是？', o: { A: '(2, -1)', B: '(2, 1)', C: '(-2, -1)', D: '(-2, 1)' }, a: 'A', an: '配方：y = (x² - 4x + 4) - 1 = (x - 2)² - 1，所以顶点坐标为 (2, -1)。' },
        { kp: '圆的性质', c: '圆的半径为 5 cm，弦 AB = 8 cm，则圆心到弦 AB 的距离是？', o: { A: '2 cm', B: '3 cm', C: '4 cm', D: '5 cm' }, a: 'B', an: '设圆心为 O，作 OD⊥AB 于 D，则 AD = 4 cm。由勾股定理 OD² + AD² = OA²，得 OD = √(25-16) = 3 cm。' },
        { kp: '概率', c: '从 1-10 中随机取一个数，取到质数的概率是？', o: { A: '2/5', B: '3/10', C: '1/2', D: '4/10' }, a: 'D', an: '1-10 中的质数是 2,3,5,7 共 4 个，概率 = 4/10 = 2/5。' },
        { kp: '函数图像', c: '函数 y = kx + b 经过点 (0, 2) 和 (1, 5)，则 k + b = ?', o: { A: '5', B: '6', C: '7', D: '8' }, a: 'A', an: '点 (0, 2) 代入得 b = 2；点 (1, 5) 代入得 k + 2 = 5，k = 3。所以 k + b = 3 + 2 = 5。' },
        { kp: '三角函数', c: '在直角三角形中，∠A = 30°，斜边 c = 10，则对边 a = ?', o: { A: '5', B: '5√3', C: '10√3', D: '5√2' }, a: 'A', an: 'sin30° = a/c = 1/2，所以 a = c·sin30° = 10 × 1/2 = 5。' },
      ],
      挑战: [
        { kp: '数列', c: '等差数列 {aₙ} 中，a₃ = 7，a₇ = 15，则 a₁₀ = ?', o: { A: '20', B: '21', C: '22', D: '23' }, a: 'B', an: '公差 d = (a₇ - a₃)/(7-3) = 8/4 = 2；a₁₀ = a₇ + 3d = 15 + 6 = 21。' },
        { kp: '不等式', c: '若关于 x 的不等式 x² - ax + 1 < 0 的解集为空集，则 a 的取值范围是？', o: { A: 'a < -2 或 a > 2', B: '-2 ≤ a ≤ 2', C: 'a < -2', D: 'a > 2' }, a: 'B', an: '解集为空集等价于判别式 Δ = a² - 4 ≤ 0，解得 -2 ≤ a ≤ 2。' },
        { kp: '立体几何', c: '正方体棱长为 2，则其外接球的表面积是？', o: { A: '8π', B: '12π', C: '16π', D: '24π' }, a: 'B', an: '正方体外接球直径 = 体对角线 = 2√3，半径 R = √3，表面积 = 4πR² = 4π × 3 = 12π。' },
      ],
    },
    英语: {
      基础: [
        { kp: '词汇-冠词', c: 'She is _____ English teacher.', o: { A: 'a', B: 'an', C: 'the', D: '/' }, a: 'B', an: 'English 以元音音素开头，且 teacher 是可数名词单数，需用不定冠词 an。' },
        { kp: '时态', c: 'Tom _____ to school every day.', o: { A: 'go', B: 'goes', C: 'going', D: 'went' }, a: 'B', an: 'every day 表示一般现在时，主语 Tom 是第三人称单数，动词用 goes。' },
        { kp: '代词', c: 'This is my book. That is _____.', o: { A: 'you', B: 'your', C: 'yours', D: 'yourself' }, a: 'C', an: 'yours 是名词性物主代词，相当于 your book。your 是形容词性物主代词，后面要接名词。' },
        { kp: '介词', c: 'I usually get up _____ 6:30 in the morning.', o: { A: 'in', B: 'on', C: 'at', D: 'for' }, a: 'C', an: '表示具体时刻要用介词 at。in 用于年/月/季节，on 用于具体日期。' },
        { kp: '形容词', c: 'This movie is _____ than that one.', o: { A: 'interesting', B: 'more interesting', C: 'most interesting', D: 'the most interesting' }, a: 'B', an: 'than 表示比较，interesting 是多音节词，比较级前加 more。' },
        { kp: '连词', c: 'Hurry up, _____ you will be late for school.', o: { A: 'and', B: 'or', C: 'but', D: 'so' }, a: 'B', an: '"祈使句 + or + 陈述句"表示"否则"，意为：快点，否则你上学要迟到了。' },
        { kp: '名词复数', c: 'There are many _____ on the farm.', o: { A: 'sheep', B: 'sheeps', C: 'a sheep', D: 'sheepes' }, a: 'A', an: 'sheep 单复数同形，many 后面接复数名词。' },
      ],
      提高: [
        { kp: '现在完成时', c: 'I _____ in this city for ten years.', o: { A: 'live', B: 'lived', C: 'have lived', D: 'am living' }, a: 'C', an: 'for ten years 是现在完成时的标志，表示从过去持续到现在的动作或状态。' },
        { kp: '被动语态', c: 'The book _____ by millions of people every year.', o: { A: 'reads', B: 'is read', C: 'read', D: 'reading' }, a: 'B', an: '书是"被读"，要用被动语态。一般现在时被动：am/is/are + 过去分词。' },
        { kp: '宾语从句', c: 'Can you tell me _____?', o: { A: 'where does he live', B: 'where he lives', C: 'where he live', D: 'he lives where' }, a: 'B', an: '宾语从句要用陈述语序，排除 A。主语 he 是第三人称单数，动词用 lives。' },
        { kp: '情态动词', c: 'You _____ smoke in the library. It\'s not allowed.', o: { A: 'needn\'t', B: 'may not', C: 'mustn\'t', D: 'couldn\'t' }, a: 'C', an: 'mustn\'t 表示"禁止、不准"，语气最强。needn\'t 是"不必"，may not 是"可能不"。' },
        { kp: '定语从句', c: 'The man _____ is wearing a blue shirt is my teacher.', o: { A: 'who', B: 'which', C: 'whom', D: 'whose' }, a: 'A', an: '先行词是 man（人），关系代词在从句中作主语，用 who。which 代物，whom 作宾语，whose 作定语。' },
      ],
      挑战: [
        { kp: '虚拟语气', c: 'If I _____ you, I would take the chance.', o: { A: 'am', B: 'was', C: 'were', D: 'be' }, a: 'C', an: '与现在事实相反的虚拟条件句中，be 动词用 were 而不用 was。' },
        { kp: '倒装句', c: 'Never _____ such a beautiful sunset before.', o: { A: 'I have seen', B: 'have I seen', C: 'I saw', D: 'did I see' }, a: 'B', an: '否定副词 never 位于句首时，句子需要部分倒装（助动词提前），before 是完成时标志。' },
        { kp: '非谓语动词', c: '_____ the homework, he went out to play.', o: { A: 'Finished', B: 'Finishing', C: 'Having finished', D: 'To finish' }, a: 'C', an: '"完成作业"发生在"出去玩"之前，用现在分词的完成式 Having finished 作时间状语。' },
      ],
    },
    语文: {
      基础: [
        { kp: '字音字形', c: '下列词语中，加点字读音完全正确的一项是：', o: { A: '踌躇(chóu)', B: '踌躇(zhù)', C: '踌躇(shòu)', D: '踌躇(chòu)' }, a: 'A', an: '"踌躇"的"踌"应读 chóu，注意不要读半边字。' },
        { kp: '成语运用', c: '"画蛇添足"这个成语比喻：', o: { A: '多此一举，弄巧成拙', B: '锦上添花', C: '做事认真', D: '技艺高超' }, a: 'A', an: '画蛇时添上脚，比喻做了多余的事反而把事情弄坏，即多此一举。' },
        { kp: '文学常识', c: '《论语》是记录谁言行的书？', o: { A: '孟子', B: '孔子及其弟子', C: '老子', D: '庄子' }, a: 'B', an: '《论语》是儒家经典，记录了孔子及其弟子的言行，由孔子弟子及再传弟子编纂。' },
        { kp: '病句辨析', c: '下列句子没有语病的是：', o: { A: '他的学习成绩一直在不断提高', B: '通过这次活动，使我深受教育', C: '我们要发扬和继承优良传统', D: '能否刻苦学习是取得好成绩的关键' }, a: 'A', an: 'B 缺主语（去掉"使"）；C 语序不当（继承和发扬）；D 两面对一面（去掉"能否"）。' },
        { kp: '修辞手法', c: '"黄河是中华民族的摇篮"运用了什么修辞？', o: { A: '比喻', B: '拟人', C: '夸张', D: '排比' }, a: 'A', an: '将黄河比作摇篮，是暗喻（本体+喻体），形象地说明黄河孕育了中华文明。' },
        { kp: '古诗文默写', c: '"床前明月光，疑是地上霜"的作者是？', o: { A: '杜甫', B: '李白', C: '白居易', D: '王维' }, a: 'B', an: '此句出自唐代诗人李白的《静夜思》，是千古传诵的思乡名篇。' },
        { kp: '标点符号', c: '下列标点使用正确的是：', o: { A: '"太好了！"他说，"我终于成功了。"', B: '"太好了"！他说："我终于成功了。"', C: '"太好了"他说，"我终于成功了"。', D: '"太好了！"他说："我终于成功了。"' }, a: 'A', an: '说话人在中间时，用逗号而不是冒号，感叹号和句号放在引号内。' },
      ],
      提高: [
        { kp: '诗词鉴赏', c: '"大漠孤烟直，长河落日圆"的意境特点是：', o: { A: '雄浑壮阔', B: '婉约细腻', C: '清新淡雅', D: '悲凉凄切' }, a: 'A', an: '王维《使至塞上》名句，大漠、长河、孤烟、落日构成了雄浑壮阔的边塞风光。' },
        { kp: '文言实词', c: '"策之不以其道"中"策"的意思是：', o: { A: '马鞭', B: '鞭打、驱使', C: '策略', D: '记载' }, a: 'B', an: '出自韩愈《马说》，"策"在这里是名词活用为动词，意为用鞭子打、驱使。' },
        { kp: '现代文阅读', c: '记叙文六要素中不包括：', o: { A: '时间', B: '地点', C: '人物', D: '抒情' }, a: 'D', an: '记叙文六要素是：时间、地点、人物、起因、经过、结果。抒情是表达方式，不是要素。' },
      ],
      挑战: [
        { kp: '文言文翻译', c: '"蚓无爪牙之利，筋骨之强"的句式是：', o: { A: '定语后置', B: '宾语前置', C: '状语后置', D: '主谓倒装' }, a: 'A', an: '"之"是定语后置标志，正常语序是：蚓无利之爪牙，强之筋骨。意为蚯蚓没有锋利的爪牙和强健的筋骨。' },
        { kp: '文学常识', c: '我国第一部编年体通史是：', o: { A: '《史记》', B: '《资治通鉴》', C: '《左传》', D: '《春秋》' }, a: 'B', an: '《史记》是纪传体通史，《资治通鉴》是编年体通史，《春秋》是第一部编年体史书（非通史）。' },
      ],
    },
    物理: {
      基础: [
        { kp: '力学单位', c: '力的国际单位是？', o: { A: '千克(kg)', B: '牛顿(N)', C: '焦耳(J)', D: '瓦特(W)' }, a: 'B', an: '力的单位是牛顿(N)，kg 是质量单位，J 是功/能单位，W 是功率单位。' },
        { kp: '匀速运动', c: '一辆汽车以 20 m/s 的速度匀速行驶 5 秒，通过的路程是？', o: { A: '80 m', B: '100 m', C: '120 m', D: '150 m' }, a: 'B', an: '匀速直线运动 s = vt = 20 × 5 = 100 m。' },
        { kp: '密度', c: '水的密度是 1.0×10³ kg/m³，它的物理意义是？', o: { A: '1 m³ 水的质量是 1.0×10³ kg', B: '1 kg 水的体积是 1 m³', C: '水的质量是 1.0×10³ kg', D: '水的体积是 1.0×10³ m³' }, a: 'A', an: '密度 ρ = m/V，表示单位体积物质的质量。所以 1.0×10³ kg/m³ 表示 1 立方米水的质量是 1000 千克。' },
        { kp: '重力', c: '质量为 2 kg 的物体受到的重力约为？(g=10N/kg)', o: { A: '2 N', B: '10 N', C: '20 N', D: '200 N' }, a: 'C', an: 'G = mg = 2 kg × 10 N/kg = 20 N。' },
        { kp: '压强', c: '增大压强的方法是？', o: { A: '增大受力面积', B: '减小压力', C: '减小受力面积', D: '同时减小压力和增大受力面积' }, a: 'C', an: '压强 P = F/S，要增大压强可以减小受力面积（S）或增大压力（F）。' },
        { kp: '光的反射', c: '入射光线与镜面夹角为 30°，则反射角为？', o: { A: '30°', B: '60°', C: '90°', D: '120°' }, a: 'B', an: '入射角是入射光线与法线的夹角 = 90° - 30° = 60°。根据反射定律，反射角等于入射角 = 60°。' },
        { kp: '电流单位', c: '电流的国际单位是？', o: { A: '伏特(V)', B: '安培(A)', C: '欧姆(Ω)', D: '库仑(C)' }, a: 'B', an: '电流单位是安培(A)，V 是电压单位，Ω 是电阻单位，C 是电量单位。' },
      ],
      提高: [
        { kp: '牛顿第二定律', c: '质量 5 kg 的物体受到 15 N 的合外力，加速度是？', o: { A: '2 m/s²', B: '3 m/s²', C: '5 m/s²', D: '10 m/s²' }, a: 'B', an: '由 F = ma 得 a = F/m = 15/5 = 3 m/s²。' },
        { kp: '功和功率', c: '把 100 N 的物体提升 2 m，用时 4 s，功率是？', o: { A: '25 W', B: '50 W', C: '100 W', D: '200 W' }, a: 'B', an: '功 W = Fs = 100 × 2 = 200 J，功率 P = W/t = 200/4 = 50 W。' },
        { kp: '欧姆定律', c: '电阻 10 Ω，电压 5 V，通过的电流是？', o: { A: '0.2 A', B: '0.5 A', C: '2 A', D: '5 A' }, a: 'B', an: '由 I = U/R = 5/10 = 0.5 A。' },
        { kp: '电功率', c: '"220V 40W"的灯泡正常工作 5 小时，耗电多少度？', o: { A: '0.2 度', B: '0.5 度', C: '2 度', D: '5 度' }, a: 'A', an: 'W = Pt = 0.04 kW × 5 h = 0.2 kWh = 0.2 度（1 度 = 1 kWh）。' },
      ],
      挑战: [
        { kp: '楞次定律', c: '楞次定律的内容是：感应电流的方向总是要？', o: { A: '使穿过回路的磁通量增大', B: '阻碍引起感应电流的磁通量变化', C: '与原磁场方向相同', D: '与原磁场方向相反' }, a: 'B', an: '楞次定律：感应电流的磁场总是阻碍引起感应电流的磁通量的变化，即"增反减同"。' },
        { kp: '能量守恒', c: '质量 2 kg 的物体从 10 m 高处自由落下（g=10），落地速度是？', o: { A: '10 m/s', B: '10√2 m/s', C: '20 m/s', D: '20√2 m/s' }, a: 'B', an: '机械能守恒：mgh = ½mv²，v = √(2gh) = √(2×10×10) = √200 = 10√2 m/s。' },
      ],
    },
    化学: {
      基础: [
        { kp: '化学变化', c: '下列属于化学变化的是？', o: { A: '冰融化', B: '铁生锈', C: '酒精挥发', D: '玻璃破碎' }, a: 'B', an: '化学变化有新物质生成。铁生锈是 Fe 变成 Fe₂O₃，生成新物质。其他都是物理变化。' },
        { kp: '元素符号', c: '铜元素的化学符号是？', o: { A: 'Ca', B: 'Co', C: 'Cu', D: 'Cr' }, a: 'C', an: 'Cu 是铜（来自拉丁语 cuprum）。Ca 是钙，Co 是钴，Cr 是铬。' },
        { kp: '纯净物', c: '下列属于纯净物的是？', o: { A: '空气', B: '海水', C: '蒸馏水', D: '石油' }, a: 'C', an: '纯净物由一种物质组成。蒸馏水只含 H₂O。空气、海水、石油都是混合物。' },
        { kp: '化合反应', c: '下列属于化合反应的是？', o: { A: '2H₂O → 2H₂ + O₂', B: '2H₂ + O₂ → 2H₂O', C: 'CaCO₃ → CaO + CO₂', D: 'Zn + H₂SO₄ → ZnSO₄ + H₂' }, a: 'B', an: '化合反应：A + B → AB（多变一）。氢气和氧气反应生成水是化合反应。A、C 是分解反应，D 是置换反应。' },
        { kp: '溶液pH', c: 'pH = 7 的溶液呈？', o: { A: '酸性', B: '碱性', C: '中性', D: '无法判断' }, a: 'C', an: 'pH < 7 酸性，pH = 7 中性，pH > 7 碱性。' },
        { kp: '化合价', c: '在 NaCl 中，钠元素的化合价是？', o: { A: '-1', B: '0', C: '+1', D: '+2' }, a: 'C', an: 'NaCl 中 Cl 为 -1 价，根据化合物化合价代数和为 0，Na 为 +1 价。' },
        { kp: '实验操作', c: '给试管中的液体加热时，液体体积不应超过试管容积的？', o: { A: '1/4', B: '1/3', C: '1/2', D: '2/3' }, a: 'B', an: '加热液体时，液体不超过试管容积的 1/3，防止沸腾时溅出伤人。' },
      ],
      提高: [
        { kp: '化学方程式', c: '配平化学方程式：Fe + O₂ → Fe₃O₄，Fe 的系数是？', o: { A: '1', B: '2', C: '3', D: '4' }, a: 'C', an: '配平后为：3Fe + 2O₂ = Fe₃O₄（点燃条件）。Fe 系数为 3，O₂ 系数为 2。' },
        { kp: '摩尔质量', c: '2 mol 水（H₂O）的质量是？(H=1, O=16)', o: { A: '18 g', B: '36 g', C: '54 g', D: '72 g' }, a: 'B', an: '水的摩尔质量 M = 1×2 + 16 = 18 g/mol，质量 m = n×M = 2×18 = 36 g。' },
        { kp: '金属活动性', c: '下列金属活动性最强的是？', o: { A: 'Fe', B: 'Cu', C: 'Ag', D: 'Al' }, a: 'D', an: '金属活动性顺序（部分）：K Ca Na Mg Al Zn Fe Sn Pb (H) Cu Hg Ag Pt Au。Al 在最前面。' },
        { kp: '酸碱中和', c: '中和反应一定属于什么类型？', o: { A: '化合反应', B: '分解反应', C: '置换反应', D: '复分解反应' }, a: 'D', an: '中和反应是酸和碱反应生成盐和水，属于复分解反应（两种化合物互相交换成分）。' },
      ],
      挑战: [
        { kp: '氧化还原', c: '在反应 Cu + 2H₂SO₄(浓) → CuSO₄ + SO₂↑ + 2H₂O 中，还原剂是？', o: { A: 'Cu', B: 'H₂SO₄', C: 'CuSO₄', D: 'SO₂' }, a: 'A', an: '还原剂失电子被氧化。Cu 从 0 价升高到 +2 价（失电子），所以 Cu 是还原剂。' },
        { kp: '化学平衡', c: '对于可逆反应 N₂ + 3H₂ ⇌ 2NH₃，增大压强平衡如何移动？', o: { A: '向正反应方向', B: '向逆反应方向', C: '不移动', D: '无法判断' }, a: 'A', an: '增大压强，平衡向气体分子数减少的方向移动。左 1+3=4，右 2，所以向正反应方向移动。' },
      ],
    },
    生物: {
      基础: [
        { kp: '细胞结构', c: '细胞的"控制中心"是？', o: { A: '细胞膜', B: '细胞质', C: '细胞核', D: '线粒体' }, a: 'C', an: '细胞核含有遗传物质 DNA，控制细胞的生命活动，是细胞的控制中心。' },
        { kp: '光合作用', c: '绿色植物进行光合作用的场所是？', o: { A: '线粒体', B: '叶绿体', C: '核糖体', D: '细胞核' }, a: 'B', an: '叶绿体含有叶绿素，是进行光合作用的场所，将光能转化为化学能储存在有机物中。' },
        { kp: '食物链', c: '在"草→兔→鹰"这条食物链中，生产者是？', o: { A: '草', B: '兔', C: '鹰', D: '兔和鹰' }, a: 'A', an: '生产者是能自己制造有机物的生物，主要是绿色植物。草能进行光合作用制造有机物。' },
        { kp: '遗传物质', c: '生物的主要遗传物质是？', o: { A: '蛋白质', B: 'DNA', C: 'RNA', D: '糖类' }, a: 'B', an: 'DNA（脱氧核糖核酸）是绝大多数生物的遗传物质，携带遗传信息。' },
        { kp: '人体器官', c: '人体最大的消化腺是？', o: { A: '唾液腺', B: '胃腺', C: '肝脏', D: '胰腺' }, a: 'C', an: '肝脏是人体最大的消化腺，能分泌胆汁，胆汁储存在胆囊中，对脂肪起乳化作用。' },
        { kp: '生态系统', c: '生态系统的组成成分中，分解者主要是？', o: { A: '植物', B: '动物', C: '细菌和真菌', D: '阳光' }, a: 'C', an: '分解者（如腐生细菌、真菌）分解动植物遗体中的有机物为无机物，归还无机环境。' },
        { kp: '呼吸作用', c: '人体呼吸作用的实质是？', o: { A: '制造有机物，贮存能量', B: '分解有机物，释放能量', C: '合成淀粉', D: '吸收二氧化碳' }, a: 'B', an: '呼吸作用是有机物（主要是葡萄糖）在细胞内被氧化分解，释放能量供生命活动需要。' },
      ],
      提高: [
        { kp: '细胞分裂', c: '有丝分裂过程中，染色体数目加倍发生在？', o: { A: '前期', B: '中期', C: '后期', D: '末期' }, a: 'C', an: '后期着丝点分裂，姐妹染色单体分开成为两条染色体，染色体数目加倍。' },
        { kp: '遗传规律', c: '基因分离定律的实质是？', o: { A: '姐妹染色单体分离', B: '等位基因随同源染色体分离而分开', C: '非等位基因自由组合', D: 'DNA 复制' }, a: 'B', an: '基因分离定律实质：减数第一次分裂后期，等位基因随同源染色体分开而分离，分别进入不同配子。' },
        { kp: '内环境', c: '内环境稳态的调节机制主要是？', o: { A: '神经调节', B: '体液调节', C: '神经-体液-免疫调节', D: '免疫调节' }, a: 'C', an: '目前公认：神经-体液-免疫调节网络是机体维持稳态的主要调节机制。' },
        { kp: '激素调节', c: '能降低血糖浓度的激素是？', o: { A: '甲状腺激素', B: '胰岛素', C: '胰高血糖素', D: '肾上腺素' }, a: 'B', an: '胰岛素是唯一降血糖的激素，通过促进组织细胞摄取、利用和储存葡萄糖降低血糖。' },
      ],
      挑战: [
        { kp: '基因工程', c: '基因工程中，常用作运载体的是？', o: { A: '质粒', B: '染色体', C: '核糖体', D: '溶酶体' }, a: 'A', an: '质粒是小型环状 DNA 分子，具有自我复制能力，是基因工程中最常用的运载体（载体）。' },
        { kp: '进化论', c: '达尔文自然选择学说的核心内容是？', o: { A: '用进废退', B: '适者生存，不适者被淘汰', C: '获得性遗传', D: '基因突变' }, a: 'B', an: '达尔文自然选择学说：过度繁殖→生存斗争→遗传变异→适者生存，核心是自然选择即适者生存。' },
      ],
    },
  };

  let qId = 1;
  const questionRows = [];
  const subjectQuestions = {};
  for (const [subject, diffMap] of Object.entries(questionBank)) {
    subjectQuestions[subject] = [];
    for (const [diff, list] of Object.entries(diffMap)) {
      for (const item of list) {
        const code = `Q-${subject.slice(0,1).toUpperCase()}-${diff.slice(0,1).toUpperCase()}-${String(qId).padStart(4, '0')}`;
        questionRows.push({
          code,
          subject,
          difficulty: diff,
          type: '单选',
          knowledgePoint: item.kp,
          content: item.c,
          options: item.o,
          correctAnswer: item.a,
          analysis: item.an,
          score: diff === '基础' ? 8 : (diff === '提高' ? 10 : 12),
          active: true,
        });
        subjectQuestions[subject].push(questionRows[questionRows.length - 1]);
        qId += 1;
      }
    }
  }
  const createdQuestions = await Question.bulkCreate(questionRows, { validate: true });
  const qIdByCode = {};
  for (let i = 0; i < createdQuestions.length; i += 1) {
    qIdByCode[createdQuestions[i].code] = createdQuestions[i].id;
  }

  async function seedQuizForUser(user, subject, diffList, qCount, daysAgoVal) {
    const picks = [];
    for (const diff of diffList) {
      const pool = subjectQuestions[subject].filter((q) => q.difficulty === diff);
      const need = Math.ceil(qCount / diffList.length);
      const taken = sample(rng, pool, Math.min(need, pool.length));
      for (const q of taken) {
        if (picks.length < qCount) picks.push(q);
      }
    }
    const totalScore = picks.reduce((s, q) => s + q.score, 0);
    const started = daysAgo(daysAgoVal);
    const timeSpent = qCount * 45 + Math.floor(rng() * 120);
    const submitted = new Date(started.getTime() + timeSpent * 1000);

    let correctCount = 0;
    const ansList = picks.map((q) => {
      const userAns = rng() > (diffList.includes('挑战') ? 0.45 : 0.6) ? q.correctAnswer : pick(rng, Object.keys(q.options).filter((k) => k !== q.correctAnswer));
      if (userAns === q.correctAnswer) correctCount += 1;
      return { userAns, q };
    });

    const score = ansList.reduce((s, x) => s + (x.userAns === x.q.correctAnswer ? x.q.score : 0), 0);

    const code = `QUIZ-${user.id}-${String(Date.now() + daysAgoVal * 1000).slice(-7)}`;
    const quiz = await Quiz.create({
      code,
      userId: user.id,
      subject,
      difficulty: diffList.length === 1 ? diffList[0] : '混合',
      questionCount: qCount,
      totalScore,
      status: '已提交',
      sourceType: rng() > 0.8 ? '错题再练' : '随机',
      score,
      correctCount,
      timeSpentSeconds: timeSpent,
      startedAt: started,
      submittedAt: submitted,
    });

    const qqList = ansList.map((x, i) => ({
      quizId: quiz.id,
      questionId: qIdByCode[x.q.code],
      sortOrder: i,
      score: x.q.score,
      userAnswer: x.userAns,
      isCorrect: x.userAns === x.q.correctAnswer,
    }));
    await QuizQuestion.bulkCreate(qqList, { validate: true });
    return quiz;
  }

  const sampleQuizzes = [];
  sampleQuizzes.push(await seedQuizForUser(student, '数学', ['基础'], 10, 28));
  sampleQuizzes.push(await seedQuizForUser(student, '数学', ['基础', '提高'], 12, 24));
  sampleQuizzes.push(await seedQuizForUser(student, '英语', ['基础'], 10, 20));
  sampleQuizzes.push(await seedQuizForUser(student, '物理', ['基础', '提高'], 10, 16));
  sampleQuizzes.push(await seedQuizForUser(student, '数学', ['提高'], 10, 12));
  sampleQuizzes.push(await seedQuizForUser(student, '英语', ['基础', '提高'], 12, 8));
  sampleQuizzes.push(await seedQuizForUser(student, '化学', ['基础'], 10, 5));
  sampleQuizzes.push(await seedQuizForUser(student, '数学', ['提高', '挑战'], 10, 2));


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

  const completedUserResources = await UserResource.findAll({
    where: { status: '已完成' },
    include: [{ model: Resource, as: 'resource', where: { deleted: false } }],
  });

  const reviewComments = [
    '讲解非常清晰，知识点覆盖全面，练习题质量很高，强烈推荐！',
    '内容很实用，老师讲得通俗易懂，对考试帮助很大。',
    '视频画面清晰，节奏适中，适合自主学习。配套练习设计得很好。',
    '难度循序渐进，从基础到提高都有覆盖，适合不同层次的学生。',
    '知识点讲解透彻，例题典型，做完后感觉提升很明显。',
    '老师上课生动有趣，把复杂的知识点讲得很简单，容易理解。',
    '资料整理得很系统，复习的时候用非常方便，节省了很多时间。',
    '题型很新，和考试方向一致，做完以后正确率明显提高了。',
    '总结的解题技巧很实用，遇到类似题目可以快速找到思路。',
    '作为基础巩固非常好，概念讲得很清楚，适合打基础的同学。',
  ];

  const reviewRows = [];
  const usedPairs = new Set();
  for (const ur of completedUserResources) {
    if (rng() > 0.55) continue;
    const key = `${ur.userId}-${ur.resourceId}`;
    if (usedPairs.has(key)) continue;
    usedPairs.add(key);

    const rating = 3 + Math.floor(rng() * 3);
    const hasComment = rng() > 0.3;
    const reviewDate = new Date(ur.completedAt?.getTime() || Date.now());
    reviewDate.setDate(reviewDate.getDate() + Math.floor(rng() * 3));

    reviewRows.push({
      userId: ur.userId,
      resourceId: ur.resourceId,
      rating,
      comment: hasComment ? pick(rng, reviewComments) : null,
      isRecommended: rating >= 4 && rng() > 0.3,
      likesCount: Math.floor(rng() * 20),
      createdAt: reviewDate,
      updatedAt: reviewDate,
    });
  }
  await ResourceReview.bulkCreate(reviewRows, { validate: true, ignoreDuplicates: true });

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

  await createLearningPathTemplates();
  logger.info('learning_path_templates_created');

  logger.info('seed_done', {
    users: 2 + extraUsers.length,
    resources: resources.length,
    tags: resourceTagRows.length,
    batches: batches.length,
    notes: noteRows.length,
    notifications: notificationRows.length,
    reviews: reviewRows.length,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('seed_failed', { message: err?.message, stack: err?.stack });
    process.exit(1);
  });
