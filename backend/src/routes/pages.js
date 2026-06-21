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

module.exports = router;
