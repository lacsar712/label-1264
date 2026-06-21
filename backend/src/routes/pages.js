const express = require('express');

const page = require('../controllers/pageController');
const { auth, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/home', auth, asyncHandler(page.home));
router.get('/resources', auth, asyncHandler(page.resources));
router.get('/recommendation-analysis', auth, asyncHandler(page.recommendationAnalysis));
router.get('/progress', auth, asyncHandler(page.progress));

router.get('/admin/users', auth, requireAdmin, asyncHandler(page.userAdmin));
router.get('/admin/resources', auth, requireAdmin, asyncHandler(page.resourceAdmin));
router.get('/admin/system', auth, requireAdmin, asyncHandler(page.systemConfig));

router.get('/notes', auth, asyncHandler(page.notes));
router.get('/notes/:noteId', auth, asyncHandler(page.noteDetail));
router.get('/notes/resources/available', auth, asyncHandler(page.noteResources));

router.get('/admin/notes', auth, requireAdmin, asyncHandler(page.adminNotes));
router.get('/admin/notes/:noteId', auth, requireAdmin, asyncHandler(page.adminNoteDetail));

router.get('/learning-path/summary', auth, asyncHandler(page.learningPathSummary));
router.get('/learning-path', auth, asyncHandler(page.learningPath));

router.get('/quiz/config', auth, asyncHandler(page.quizConfig));
router.get('/quiz/recent-summary', auth, asyncHandler(page.quizRecentSummary));
router.get('/quiz/history', auth, asyncHandler(page.quizHistory));
router.get('/quiz/:quizId', auth, asyncHandler(page.quizDetail));

router.get('/calendar/month', auth, asyncHandler(page.calendarMonth));
router.get('/calendar/day', auth, asyncHandler(page.calendarDay));
router.get('/settings', auth, asyncHandler(page.settings));
router.get('/study-groups', auth, asyncHandler(page.studyGroups));
router.get('/study-groups/:groupId', auth, asyncHandler(page.studyGroupDetail));

router.get('/qa', auth, asyncHandler(page.qaIndex));
router.get('/qa/session/:sessionId', auth, asyncHandler(page.qaSession));
router.get('/qa/resource/:resourceId', auth, asyncHandler(page.qaSessionByResource));

module.exports = router;
