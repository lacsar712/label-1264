const { Op } = require('sequelize');
const { Question, Quiz, QuizQuestion, WrongQuestion, sequelize } = require('../../models');

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'];
const DIFFICULTIES = ['基础', '提高', '挑战'];

function generateCode(prefix) {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${ts}-${rand}`.toUpperCase();
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatQuestion(q) {
  return {
    id: q.id,
    code: q.code,
    subject: q.subject,
    difficulty: q.difficulty,
    type: q.type,
    knowledgePoint: q.knowledgePoint,
    content: q.content,
    options: q.options,
    score: q.score,
  };
}

function formatQuestionWithAnswer(q) {
  return {
    ...formatQuestion(q),
    correctAnswer: q.correctAnswer,
    analysis: q.analysis,
  };
}

async function pickRandomQuestions({ subject, difficulty, count }) {
  const where = { subject, active: true };
  if (difficulty !== '混合') {
    where.difficulty = difficulty;
  }
  const questions = await Question.findAll({ where });
  const shuffled = shuffleArray(questions);
  return shuffled.slice(0, count);
}

async function pickWrongQuestionsForUser({ userId, subject, count }) {
  const wrongWhere = { userId, corrected: false };

  const wrongs = await WrongQuestion.findAll({ where: wrongWhere, order: [['wrongCount', 'DESC']] });
  const codes = wrongs.map((w) => w.code);
  if (codes.length === 0) return [];

  const questionWhere = { code: { [Op.in]: codes }, active: true };
  if (subject) questionWhere.subject = subject;

  const questions = await Question.findAll({ where: questionWhere });

  const byCode = {};
  for (const q of questions) byCode[q.code] = q;
  const ordered = codes.map((c) => byCode[c]).filter(Boolean);
  return ordered.slice(0, count);
}

async function createQuiz({ userId, subject, difficulty, questionCount, sourceType = '随机' }) {
  let picked = [];
  if (sourceType === '错题再练') {
    picked = await pickWrongQuestionsForUser({ userId, subject, count: questionCount });
  }
  if (picked.length < questionCount) {
    const remaining = questionCount - picked.length;
    const extra = await pickRandomQuestions({ subject, difficulty, count: remaining });
    const pickedIds = new Set(picked.map((q) => q.id));
    for (const q of extra) {
      if (!pickedIds.has(q.id)) {
        picked.push(q);
        pickedIds.add(q.id);
      }
      if (picked.length >= questionCount) break;
    }
  }

  if (picked.length === 0) {
    return { error: '暂无可用题目，请稍后再试或调整筛选条件' };
  }

  const totalScore = picked.reduce((sum, q) => sum + Number(q.score || 10), 0);

  const t = await sequelize.transaction();
  try {
    const quiz = await Quiz.create(
      {
        code: generateCode('QUIZ'),
        userId,
        subject,
        difficulty,
        questionCount: picked.length,
        totalScore,
        status: '草稿',
        sourceType,
        startedAt: new Date(),
      },
      { transaction: t }
    );

    const qqList = [];
    for (let i = 0; i < picked.length; i += 1) {
      qqList.push(
        QuizQuestion.create(
          {
            quizId: quiz.id,
            questionId: picked[i].id,
            sortOrder: i,
            score: picked[i].score,
          },
          { transaction: t }
        )
      );
    }
    await Promise.all(qqList);

    await t.commit();

    return {
      quizId: quiz.id,
      code: quiz.code,
      subject,
      difficulty,
      questionCount: picked.length,
      totalScore,
      questions: picked.map(formatQuestion),
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function getQuizDetail({ userId, quizId }) {
  const quiz = await Quiz.findOne({
    where: { id: quizId, userId },
    include: [
      {
        model: QuizQuestion,
        as: 'quizQuestions',
        include: [{ model: Question, as: 'question' }],
        order: [['sortOrder', 'ASC']],
      },
    ],
  });
  if (!quiz) return null;

  const questions = (quiz.quizQuestions || []).map((qq) => {
    const base = formatQuestion(qq.question);
    const answered = !!qq.userAnswer;
    const reveal = quiz.status === '已提交' || answered;
    return {
      ...base,
      userAnswer: qq.userAnswer,
      isCorrect: reveal ? qq.isCorrect : undefined,
      quizQuestionId: qq.id,
      correctAnswer: reveal ? qq.question.correctAnswer : undefined,
      analysis: reveal ? qq.question.analysis : undefined,
    };
  });

  return {
    id: quiz.id,
    code: quiz.code,
    subject: quiz.subject,
    difficulty: quiz.difficulty,
    questionCount: quiz.questionCount,
    totalScore: quiz.totalScore,
    status: quiz.status,
    sourceType: quiz.sourceType,
    score: quiz.score,
    correctCount: quiz.correctCount,
    timeSpentSeconds: quiz.timeSpentSeconds,
    startedAt: quiz.startedAt,
    submittedAt: quiz.submittedAt,
    questions,
  };
}

async function answerQuestion({ userId, quizId, questionId, userAnswer }) {
  const quiz = await Quiz.findOne({ where: { id: quizId, userId } });
  if (!quiz) return { error: '试卷不存在' };
  if (quiz.status === '已提交') return { error: '试卷已提交，无法修改答案' };

  const qq = await QuizQuestion.findOne({
    where: { quizId, questionId },
    include: [{ model: Question, as: 'question' }],
  });
  if (!qq) return { error: '题目不存在' };

  const correct = String(qq.question.correctAnswer || '').trim().toUpperCase();
  const userAns = String(userAnswer || '').trim().toUpperCase();
  const isCorrect = userAns === correct;

  await qq.update({ userAnswer: userAns || null, isCorrect });

  return {
    ok: true,
    isCorrect,
    correctAnswer: correct,
    analysis: qq.question.analysis,
  };
}

async function submitQuiz({ userId, quizId, timeSpentSeconds }) {
  const quiz = await Quiz.findOne({ where: { id: quizId, userId } });
  if (!quiz) return { error: '试卷不存在' };
  if (quiz.status === '已提交') return { error: '试卷已提交，请勿重复提交' };

  const quizQuestions = await QuizQuestion.findAll({
    where: { quizId },
    include: [{ model: Question, as: 'question' }],
    order: [['sortOrder', 'ASC']],
  });

  let score = 0;
  let correctCount = 0;
  const wrongsToSave = [];

  for (const qq of quizQuestions) {
    if (qq.isCorrect) {
      score += Number(qq.score || 0);
      correctCount += 1;
    } else {
      const q = qq.question;
      wrongsToSave.push({
        userId,
        code: q.code,
        knowledgePoint: `${q.subject}·${q.knowledgePoint || q.difficulty}`,
      });
    }
  }

  const t = await sequelize.transaction();
  try {
    await quiz.update(
      {
        status: '已提交',
        score,
        correctCount,
        timeSpentSeconds: Number(timeSpentSeconds || 0),
        submittedAt: new Date(),
      },
      { transaction: t }
    );

    for (const w of wrongsToSave) {
      const [record, created] = await WrongQuestion.findOrCreate({
        where: { userId: w.userId, code: w.code },
        defaults: {
          ...w,
          wrongCount: 1,
          corrected: false,
          mastery: '低',
        },
        transaction: t,
      });
      if (!created) {
        await record.update(
          {
            wrongCount: record.wrongCount + 1,
            corrected: false,
            mastery: record.wrongCount + 1 >= 3 ? '低' : record.mastery,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  const detail = await getQuizDetail({ userId, quizId });
  return { ok: true, result: detail };
}

async function getQuizHistory({ userId, subject, status, limit = 20, offset = 0 }) {
  const where = { userId };
  if (subject) where.subject = subject;
  if (status) where.status = status;

  const { count, rows } = await Quiz.findAndCountAll({
    where,
    order: [
      [sequelize.literal("CASE WHEN status = '草稿' THEN 0 ELSE 1 END"), 'ASC'],
      [sequelize.literal("COALESCE(submitted_at, started_at)"), 'DESC'],
    ],
    limit,
    offset,
  });

  const draftIds = rows.filter((q) => q.status === '草稿').map((q) => q.id);
  const answeredCountMap = {};
  if (draftIds.length) {
    const counted = await QuizQuestion.findAll({
      where: { quizId: { [Op.in]: draftIds }, userAnswer: { [Op.ne]: null } },
      attributes: ['quizId', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
      group: ['quizId'],
      raw: true,
    });
    for (const c of counted) {
      answeredCountMap[c.quizId] = Number(c.cnt);
    }
  }

  return {
    total: count,
    list: rows.map((q) => ({
      id: q.id,
      code: q.code,
      subject: q.subject,
      difficulty: q.difficulty,
      questionCount: q.questionCount,
      totalScore: q.totalScore,
      score: q.score,
      correctCount: q.correctCount,
      answeredCount: q.status === '草稿' ? (answeredCountMap[q.id] || 0) : null,
      accuracy: q.questionCount && q.status === '已提交' ? Number(q.correctCount) / Number(q.questionCount) : null,
      timeSpentSeconds: q.timeSpentSeconds,
      sourceType: q.sourceType,
      status: q.status,
      startedAt: q.startedAt,
      submittedAt: q.submittedAt,
    })),
  };
}

async function getRecentQuizSummary({ userId }) {
  const recent = await Quiz.findAll({
    where: { userId, status: '已提交' },
    order: [['submittedAt', 'DESC']],
    limit: 5,
  });

  const inProgress = await Quiz.findAll({
    where: { userId, status: '草稿' },
    order: [['startedAt', 'DESC']],
    limit: 5,
  });

  const inProgressIds = inProgress.map((q) => q.id);
  const answeredCountMap = {};
  if (inProgressIds.length) {
    const counted = await QuizQuestion.findAll({
      where: { quizId: { [Op.in]: inProgressIds }, userAnswer: { [Op.ne]: null } },
      attributes: ['quizId', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
      group: ['quizId'],
      raw: true,
    });
    for (const c of counted) {
      answeredCountMap[c.quizId] = Number(c.cnt);
    }
  }

  const bySubject = SUBJECTS.reduce((acc, s) => {
    acc[s] = { subject: s, count: 0, totalScore: 0, earnedScore: 0 };
    return acc;
  }, {});

  for (const q of recent) {
    if (!bySubject[q.subject]) bySubject[q.subject] = { subject: q.subject, count: 0, totalScore: 0, earnedScore: 0 };
    bySubject[q.subject].count += 1;
    bySubject[q.subject].totalScore += Number(q.totalScore || 0);
    bySubject[q.subject].earnedScore += Number(q.score || 0);
  }

  const scoreCurve = await Quiz.findAll({
    where: { userId, status: '已提交' },
    order: [['submittedAt', 'ASC']],
    limit: 15,
  });

  return {
    recent: recent.map((q) => ({
      id: q.id,
      subject: q.subject,
      difficulty: q.difficulty,
      score: q.score,
      totalScore: q.totalScore,
      accuracy: q.questionCount ? (Number(q.correctCount) / Number(q.questionCount) * 100).toFixed(1) + '%' : '-',
      submittedAt: q.submittedAt,
    })),
    subjectSummary: SUBJECTS.concat(Object.keys(bySubject).filter((x) => !SUBJECTS.includes(x)))
      .map((s) => bySubject[s])
      .filter((x) => x && x.count > 0)
      .map((x) => ({
        ...x,
        avgScore: x.totalScore ? (x.earnedScore / x.totalScore * 100).toFixed(1) + '%' : '-',
      })),
    scoreCurve: scoreCurve.map((q, idx) => ({
      index: idx + 1,
      date: q.submittedAt,
      subject: q.subject,
      scoreRate: q.totalScore ? (Number(q.score) / Number(q.totalScore) * 100).toFixed(1) : 0,
    })),
    totalCount: (await Quiz.count({ where: { userId, status: '已提交' } })),
    inProgress: inProgress.map((q) => ({
      id: q.id,
      subject: q.subject,
      difficulty: q.difficulty,
      questionCount: q.questionCount,
      answeredCount: answeredCountMap[q.id] || 0,
      startedAt: q.startedAt,
      sourceType: q.sourceType,
    })),
    inProgressCount: inProgress.length,
  };
}

module.exports = {
  SUBJECTS,
  DIFFICULTIES,
  createQuiz,
  getQuizDetail,
  answerQuestion,
  submitQuiz,
  getQuizHistory,
  getRecentQuizSummary,
};
