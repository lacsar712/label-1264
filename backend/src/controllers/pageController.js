const { getHomeData } = require('../services/pages/homeService');
const { getResourcesData } = require('../services/pages/resourcesService');
const { getRecommendationAnalysisData } = require('../services/pages/recommendationAnalysisService');
const { getProgressData } = require('../services/pages/progressService');
const { getAdminUsersData } = require('../services/pages/adminUsersService');
const { getAdminResourcesData } = require('../services/pages/adminResourcesService');
const { getAdminSystemData } = require('../services/pages/adminSystemService');
const { getNotesData, getAdminNotesData, getNoteDetail, getAdminNoteDetail, getAvailableResources } = require('../services/pages/notesService');
const { getLearningPathSummary, getFullLearningPath } = require('../services/pages/learningPathService');
const {
  SUBJECTS,
  DIFFICULTIES,
  createQuiz,
  getQuizDetail,
  getQuizHistory,
  getRecentQuizSummary,
} = require('../services/pages/quizService');

async function home(req, res) {
  res.json({ ok: true, data: await getHomeData(req.user.id) });
}

async function resources(req, res) {
  res.json({ ok: true, data: await getResourcesData(req.user.id) });
}

async function recommendationAnalysis(req, res) {
  res.json({ ok: true, data: await getRecommendationAnalysisData(req.user.id) });
}

async function progress(req, res) {
  res.json({ ok: true, data: await getProgressData(req.user.id) });
}

async function userAdmin(req, res) {
  res.json({ ok: true, data: await getAdminUsersData() });
}

async function resourceAdmin(req, res) {
  res.json({ ok: true, data: await getAdminResourcesData() });
}

async function systemConfig(req, res) {
  res.json({ ok: true, data: await getAdminSystemData() });
}

async function notes(req, res) {
  res.json({ ok: true, data: await getNotesData(req.user.id) });
}

async function adminNotes(req, res) {
  res.json({ ok: true, data: await getAdminNotesData() });
}

async function noteDetail(req, res) {
  const { noteId } = req.params;
  const data = await getNoteDetail(req.user.id, parseInt(noteId));
  if (!data) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '笔记不存在' } });
  }
  res.json({ ok: true, data });
}

async function adminNoteDetail(req, res) {
  const { noteId } = req.params;
  const data = await getAdminNoteDetail(parseInt(noteId));
  if (!data) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '笔记不存在' } });
  }
  res.json({ ok: true, data });
}

async function noteResources(req, res) {
  const { keyword } = req.query;
  res.json({ ok: true, data: await getAvailableResources(req.user.id, keyword) });
}

async function learningPathSummary(req, res) {
  res.json({ ok: true, data: await getLearningPathSummary(req.user.id) });
}

async function learningPath(req, res) {
  res.json({ ok: true, data: await getFullLearningPath(req.user.id) });
}

async function quizConfig(req, res) {
  res.json({ ok: true, data: { subjects: SUBJECTS, difficulties: DIFFICULTIES.concat(['混合']) } });
}

async function quizDetail(req, res) {
  const { quizId } = req.params;
  const data = await getQuizDetail({ userId: req.user.id, quizId: parseInt(quizId) });
  if (!data) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: '试卷不存在' } });
  }
  res.json({ ok: true, data });
}

async function quizHistory(req, res) {
  const { subject, limit, offset } = req.query;
  const data = await getQuizHistory({
    userId: req.user.id,
    subject,
    limit: parseInt(limit) || 20,
    offset: parseInt(offset) || 0,
  });
  res.json({ ok: true, data });
}

async function quizRecentSummary(req, res) {
  res.json({ ok: true, data: await getRecentQuizSummary({ userId: req.user.id }) });
}

module.exports = {
  home,
  resources,
  recommendationAnalysis,
  progress,
  userAdmin,
  resourceAdmin,
  systemConfig,
  notes,
  adminNotes,
  noteDetail,
  adminNoteDetail,
  noteResources,
  learningPathSummary,
  learningPath,
  quizConfig,
  quizDetail,
  quizHistory,
  quizRecentSummary,
};
