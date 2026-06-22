const { Op } = require('sequelize');

const { User, LearningDaily, Quiz } = require('../../models');

function toDateOnly(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const AVATAR_PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e',
];

function avatarColorFor(index) {
  return AVATAR_PALETTE[index % AVATAR_PALETTE.length];
}

async function getLeaderboardData(userId) {
  const currentUser = await User.findByPk(userId);
  if (!currentUser) {
    return null;
  }

  const stage = currentUser.stage;
  const sinceDate = toDateOnly(daysAgo(6));
  const prevSinceDate = toDateOnly(daysAgo(13));
  const prevUntilDate = toDateOnly(daysAgo(7));

  const classmates = await User.findAll({
    where: { stage, role: 'student', active: true },
    attributes: ['id', 'name', 'stage', 'avatarColor'],
  });

  const classmateIds = classmates.map((u) => u.id);
  const classmateMap = {};
  for (const u of classmates) {
    classmateMap[u.id] = {
      id: u.id,
      name: u.name,
      avatarColor: u.avatarColor || '#2563eb',
      studyMinutes: 0,
      completedResources: 0,
      accuracy: 0,
      quizCount: 0,
      correctSum: 0,
      questionSum: 0,
    };
  }

  const weeklyDaily = await LearningDaily.findAll({
    where: {
      userId: { [Op.in]: classmateIds },
      date: { [Op.gte]: sinceDate },
    },
  });

  for (const d of weeklyDaily) {
    const entry = classmateMap[d.userId];
    if (!entry) continue;
    entry.studyMinutes += safeNumber(d.studyMinutes);
    entry.completedResources += safeNumber(d.completedCount);
  }

  const weeklyQuizzes = await Quiz.findAll({
    where: {
      userId: { [Op.in]: classmateIds },
      status: '已提交',
      submittedAt: { [Op.gte]: sinceDate },
    },
  });

  for (const q of weeklyQuizzes) {
    const entry = classmateMap[q.userId];
    if (!entry) continue;
    entry.quizCount += 1;
    entry.correctSum += safeNumber(q.correctCount);
    entry.questionSum += safeNumber(q.questionCount);
  }

  for (const id of Object.keys(classmateMap)) {
    const e = classmateMap[id];
    e.accuracy = e.questionSum > 0
      ? Math.round((e.correctSum / e.questionSum) * 1000) / 10
      : 0;
  }

  const prevDaily = await LearningDaily.findAll({
    where: {
      userId: { [Op.in]: classmateIds },
      date: { [Op.gte]: prevSinceDate, [Op.lte]: prevUntilDate },
    },
  });

  const prevStats = {};
  for (const id of classmateIds) {
    prevStats[id] = { studyMinutes: 0, completedResources: 0, accuracy: 0, correctSum: 0, questionSum: 0 };
  }
  for (const d of prevDaily) {
    const s = prevStats[d.userId];
    if (!s) continue;
    s.studyMinutes += safeNumber(d.studyMinutes);
    s.completedResources += safeNumber(d.completedCount);
  }

  const prevQuizzes = await Quiz.findAll({
    where: {
      userId: { [Op.in]: classmateIds },
      status: '已提交',
      submittedAt: { [Op.gte]: prevSinceDate, [Op.lte]: prevUntilDate },
    },
  });

  for (const q of prevQuizzes) {
    const s = prevStats[q.userId];
    if (!s) continue;
    s.correctSum += safeNumber(q.correctCount);
    s.questionSum += safeNumber(q.questionCount);
  }

  for (const id of classmateIds) {
    const s = prevStats[id];
    s.accuracy = s.questionSum > 0
      ? Math.round((s.correctSum / s.questionSum) * 1000) / 10
      : 0;
  }

  function buildRankedList(metric) {
    const items = Object.values(classmateMap)
      .map((e) => ({
        userId: e.id,
        name: e.name,
        studyMinutes: e.studyMinutes,
        completedResources: e.completedResources,
        accuracy: e.accuracy,
        avatarColor: e.avatarColor,
        sortValue: e[metric],
      }))
      .sort((a, b) => b.sortValue - a.sortValue);

    return items.map((item, idx) => {
      const { sortValue, ...rest } = item;
      return { rank: idx + 1, ...rest };
    });
  }

  const studyTimeRanking = buildRankedList('studyMinutes');
  const completedResourcesRanking = buildRankedList('completedResources');
  const accuracyRanking = buildRankedList('accuracy');

  function findRank(ranking) {
    const entry = ranking.find((r) => r.userId === userId);
    return entry ? entry.rank : null;
  }

  function findPrevRank(metric) {
    const prevItems = Object.entries(prevStats)
      .map(([id, s]) => ({ userId: Number(id), sortValue: s[metric] }))
      .sort((a, b) => b.sortValue - a.sortValue);
    const idx = prevItems.findIndex((item) => item.userId === userId);
    return idx >= 0 ? idx + 1 : null;
  }

  function calcGap(ranking, currentRank, metric) {
    if (!currentRank || currentRank <= 1) return 0;
    const me = ranking.find((r) => r.rank === currentRank);
    const prev = ranking.find((r) => r.rank === currentRank - 1);
    if (!me || !prev) return 0;
    const diff = prev[metric] - me[metric];
    if (metric === 'accuracy') {
      return Math.round(diff * 10) / 10;
    }
    return diff;
  }

  const curRanks = {
    studyTime: findRank(studyTimeRanking),
    completedResources: findRank(completedResourcesRanking),
    accuracy: findRank(accuracyRanking),
  };

  const lastWeekRanks = {
    studyTime: findPrevRank('studyMinutes'),
    completedResources: findPrevRank('completedResources'),
    accuracy: findPrevRank('accuracy'),
  };

  const prevUserGap = {
    studyTime: calcGap(studyTimeRanking, curRanks.studyTime, 'studyMinutes'),
    completedResources: calcGap(completedResourcesRanking, curRanks.completedResources, 'completedResources'),
    accuracy: calcGap(accuracyRanking, curRanks.accuracy, 'accuracy'),
  };

  const startDate = toDateOnly(daysAgo(6));
  const endDate = toDateOnly(daysAgo(0));

  return {
    grade: stage,
    weekRange: `${startDate} ~ ${endDate}`,
    rankings: {
      studyTime: studyTimeRanking,
      completedResources: completedResourcesRanking,
      accuracy: accuracyRanking,
    },
    currentUser: {
      userId,
      name: currentUser.name,
      ranks: curRanks,
      lastWeekRanks,
      prevUserGap,
      avatarColor: currentUser.avatarColor || '#2563eb',
    },
  };
}

module.exports = { getLeaderboardData };
