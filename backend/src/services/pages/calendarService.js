const { Op } = require('sequelize');
const { LearningDaily, UserPhaseResource, Resource, Quiz, QuizQuestion } = require('../../models');

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'];

function toDateOnly(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getMonthRange(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    startDate: toDateOnly(start),
    endDate: toDateOnly(end),
    daysInMonth: end.getDate(),
  };
}

function getIntensityLevel(minutes) {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 90) return 3;
  if (minutes < 120) return 4;
  return 5;
}

function calculateConsecutiveDays(dailyMap, targetDate, startDate) {
  let consecutive = 0;
  const current = new Date(targetDate);
  
  while (true) {
    const dateStr = toDateOnly(current);
    if (dateStr < startDate) break;
    
    const totalMinutes = dailyMap[dateStr]?.totalMinutes || 0;
    if (totalMinutes >= 60) {
      consecutive += 1;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }
  
  return consecutive >= 3 ? consecutive : 0;
}

async function getMonthCalendarData(userId, year, month) {
  const { startDate, endDate, daysInMonth } = getMonthRange(year, month);
  
  const dailyRecords = await LearningDaily.findAll({
    where: {
      userId,
      date: { [Op.between]: [startDate, endDate] },
    },
    order: [['date', 'ASC']],
  });
  
  const dailyMap = {};
  for (const record of dailyRecords) {
    if (!dailyMap[record.date]) {
      dailyMap[record.date] = {
        date: record.date,
        totalMinutes: 0,
        subjects: [],
        completedCount: 0,
        avgMatchScore: 0,
      };
    }
    dailyMap[record.date].totalMinutes += safeNumber(record.studyMinutes);
    dailyMap[record.date].completedCount += safeNumber(record.completedCount);
    dailyMap[record.date].subjects.push(record.subject);
    dailyMap[record.date].avgMatchScore = Math.max(
      dailyMap[record.date].avgMatchScore,
      safeNumber(record.avgMatchScore)
    );
  }
  
  const calendarDays = [];
  const today = toDateOnly(new Date());
  
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = dailyMap[dateStr] || { date: dateStr, totalMinutes: 0, subjects: [], completedCount: 0, avgMatchScore: 0 };
    const consecutiveDays = calculateConsecutiveDays(dailyMap, dateStr, startDate);
    
    calendarDays.push({
      date: dateStr,
      day,
      totalMinutes: dayData.totalMinutes,
      intensityLevel: getIntensityLevel(dayData.totalMinutes),
      completedCount: dayData.completedCount,
      avgMatchScore: dayData.avgMatchScore,
      subjects: [...new Set(dayData.subjects)],
      consecutiveDays,
      isToday: dateStr === today,
      hasData: dayData.totalMinutes > 0,
    });
  }
  
  const monthSummary = {
    totalDays: daysInMonth,
    studyDays: Object.values(dailyMap).filter(d => d.totalMinutes > 0).length,
    totalMinutes: Object.values(dailyMap).reduce((sum, d) => sum + d.totalMinutes, 0),
    avgMinutesPerDay: Math.round(
      Object.values(dailyMap).reduce((sum, d) => sum + d.totalMinutes, 0) / daysInMonth
    ),
    maxConsecutiveDays: Math.max(...calendarDays.map(d => d.consecutiveDays)),
  };
  
  return {
    year,
    month,
    calendarDays,
    monthSummary,
  };
}

async function getDayDetailData(userId, date) {
  const dateOnly = toDateOnly(date);
  const dayStart = new Date(dateOnly);
  const dayEnd = new Date(dateOnly);
  dayEnd.setHours(23, 59, 59, 999);
  
  const dailyRecords = await LearningDaily.findAll({
    where: { userId, date: dateOnly },
  });
  
  const resources = await UserPhaseResource.findAll({
    where: {
      userId,
      completedAt: { [Op.between]: [dayStart, dayEnd] },
      completed: true,
    },
    include: [{ model: Resource, as: 'resource' }],
  });
  
  const quizzes = await Quiz.findAll({
    where: {
      userId,
      submittedAt: { [Op.between]: [dayStart, dayEnd] },
      status: '已提交',
    },
    include: [{ model: QuizQuestion, as: 'quizQuestions' }],
  });
  
  const subjectBreakdown = dailyRecords.map(record => ({
    subject: record.subject,
    studyMinutes: safeNumber(record.studyMinutes),
    completedCount: safeNumber(record.completedCount),
    avgMatchScore: safeNumber(record.avgMatchScore),
    targetAchieveRate: safeNumber(record.targetAchieveRate),
    note: record.note,
  }));
  
  const resourceList = resources.map(r => ({
    resourceId: r.resourceId,
    resourceName: r.resource?.name || '未知资源',
    resourceType: r.resource?.type || '未知',
    subject: r.resource?.subject || '未知',
    difficulty: r.resource?.difficulty || '未知',
    studyMinutes: r.estimatedMinutes || 30,
    progressPercent: safeNumber(r.progressPercent),
    completedAt: r.completedAt,
  }));
  
  const quizList = quizzes.map(q => {
    const totalQuestions = q.quizQuestions?.length || 0;
    const correctCount = q.quizQuestions?.filter(qq => qq.isCorrect)?.length || 0;
    const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;
    
    return {
      quizId: q.id,
      quizCode: q.code,
      subject: q.subject,
      difficulty: q.difficulty,
      totalScore: q.totalScore,
      score: q.score,
      totalQuestions,
      correctCount,
      accuracy,
      timeSpentSeconds: q.timeSpentSeconds,
      submittedAt: q.submittedAt,
    };
  });
  
  const totalMinutes = subjectBreakdown.reduce((sum, s) => sum + s.studyMinutes, 0);
  const totalCompleted = subjectBreakdown.reduce((sum, s) => sum + s.completedCount, 0);
  const avgAccuracy = quizList.length > 0
    ? quizList.reduce((sum, q) => sum + q.accuracy, 0) / quizList.length
    : 0;
  
  return {
    date: dateOnly,
    summary: {
      totalMinutes,
      totalCompleted,
      resourceCount: resourceList.length,
      quizCount: quizList.length,
      avgAccuracy,
      intensityLevel: getIntensityLevel(totalMinutes),
    },
    subjectBreakdown,
    resources: resourceList,
    quizzes: quizList,
  };
}

module.exports = {
  getMonthCalendarData,
  getDayDetailData,
  getIntensityLevel,
  toDateOnly,
};
