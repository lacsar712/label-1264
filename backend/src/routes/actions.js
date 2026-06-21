const express = require('express');
const { body } = require('express-validator');

const action = require('../controllers/actionController');
const notification = require('../controllers/notificationController');
const { auth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.post('/recommendations/:recommendationId/favorite', auth, asyncHandler(action.favorite));
router.post('/recommendations/:recommendationId/learn', auth, asyncHandler(action.learn));
router.delete('/user-resources/:userResourceId', auth, asyncHandler(action.unfavorite));
router.post('/user-resources/:userResourceId/move-to-queue', auth, asyncHandler(action.moveToQueue));

router.post(
  '/admin/users/:userId/status',
  auth,
  requireAdmin,
  [body('active').isBoolean()],
  validate,
  asyncHandler(action.adminUpdateUserStatus)
);

router.put(
  '/admin/users/:userId/profile',
  auth,
  requireAdmin,
  [
    body('name').optional().isString().trim().isLength({ min: 1, max: 64 }),
    body('stage').optional().isString().trim().isLength({ min: 1, max: 32 }),
    body('learningStyle').optional().isString().trim().isLength({ min: 1, max: 32 }),
    body('subjectPreference').optional().isArray(),
  ],
  validate,
  asyncHandler(action.adminUpdateUserProfile)
);

router.post(
  '/admin/user-tags',
  auth,
  requireAdmin,
  [body('userId').isInt(), body('name').isString().trim().isLength({ min: 1, max: 64 }), body('category').isString().trim().isLength({ min: 1, max: 32 }), body('weight').isFloat({ min: 0, max: 1 })],
  validate,
  asyncHandler(action.adminCreateUserTag)
);

router.put(
  '/admin/user-tags/:tagId',
  auth,
  requireAdmin,
  [body('name').optional().isString().trim().isLength({ min: 1, max: 64 }), body('category').optional().isString().trim().isLength({ min: 1, max: 32 }), body('weight').optional().isFloat({ min: 0, max: 1 })],
  validate,
  asyncHandler(action.adminUpdateUserTag)
);

router.delete('/admin/user-tags/:tagId', auth, requireAdmin, asyncHandler(action.adminDeleteUserTag));

router.put(
  '/admin/resources/:resourceId',
  auth,
  requireAdmin,
  [
    body('name').optional().isString().trim().isLength({ min: 1, max: 128 }),
    body('subject').optional().isString().trim().isLength({ min: 1, max: 32 }),
    body('type').optional().isIn(['课程', '课件', '题库', '视频']),
    body('difficulty').optional().isIn(['基础', '提高', '挑战']),
    body('status').optional().isIn(['上架', '下架', '审核中']),
    body('heat').optional().isInt({ min: 0 }),
  ],
  validate,
  asyncHandler(action.adminUpdateResource)
);

router.post(
  '/admin/resources/:resourceId/review',
  auth,
  requireAdmin,
  [body('status').isIn(['上架', '下架', '审核中'])],
  validate,
  asyncHandler(action.adminReviewResource)
);

router.post('/admin/resources/:resourceId/take-down', auth, requireAdmin, asyncHandler(action.adminTakeDownResource));
router.delete('/admin/resources/:resourceId', auth, requireAdmin, asyncHandler(action.adminDeleteResource));

router.put(
  '/admin/system/params/:paramCode',
  auth,
  requireAdmin,
  [body('value').exists()],
  validate,
  asyncHandler(action.adminUpdateSystemParam)
);

router.post('/admin/system/params/:paramCode/restore', auth, requireAdmin, asyncHandler(action.adminRestoreSystemParam));

router.put(
  '/admin/system/rules/:ruleCode/weights',
  auth,
  requireAdmin,
  [body('weightRatio').isArray({ min: 1 })],
  validate,
  asyncHandler(action.adminUpdateRuleWeights)
);

router.post(
  '/admin/resource-categories',
  auth,
  requireAdmin,
  [
    body('categoryName').isString().trim().isLength({ min: 1, max: 64 }),
    body('parentCategory').isString().trim().isLength({ min: 1, max: 64 }),
    body('subject').isString().trim().isLength({ min: 1, max: 32 }),
    body('type').isIn(['课程', '课件', '题库', '视频']),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  validate,
  asyncHandler(action.adminCreateResourceCategory)
);

router.put(
  '/admin/resource-categories/:categoryId',
  auth,
  requireAdmin,
  [
    body('categoryName').optional().isString().trim().isLength({ min: 1, max: 64 }),
    body('parentCategory').optional().isString().trim().isLength({ min: 1, max: 64 }),
    body('subject').optional().isString().trim().isLength({ min: 1, max: 32 }),
    body('type').optional().isIn(['课程', '课件', '题库', '视频']),
    body('sortOrder').optional().isInt({ min: 0 }),
  ],
  validate,
  asyncHandler(action.adminUpdateResourceCategory)
);

router.post(
  '/admin/resource-categories/:categoryId/merge',
  auth,
  requireAdmin,
  [body('targetCategoryId').isString().trim().isLength({ min: 1, max: 64 })],
  validate,
  asyncHandler(action.adminMergeResourceCategory)
);

router.post(
  '/notes',
  auth,
  [
    body('title').optional().isString().trim().isLength({ min: 1, max: 128 }),
    body('content').optional().isString(),
    body('subject').isString().trim().isLength({ min: 1, max: 32 }),
    body('resourceId').optional().isInt({ min: 1 }),
  ],
  validate,
  asyncHandler(action.createNote)
);

router.put(
  '/notes/:noteId',
  auth,
  [
    body('title').optional().isString().trim().isLength({ min: 1, max: 128 }),
    body('content').optional().isString(),
    body('subject').optional().isString().trim().isLength({ min: 1, max: 32 }),
    body('resourceId').optional(),
  ],
  validate,
  asyncHandler(action.updateNote)
);

router.delete('/notes/:noteId', auth, asyncHandler(action.deleteNote));

router.get('/notifications', auth, asyncHandler(notification.getNotifications));
router.get('/notifications/unread-count', auth, asyncHandler(notification.getUnreadCount));
router.post('/notifications/:notificationId/read', auth, asyncHandler(notification.markAsRead));
router.post('/notifications/read-all', auth, asyncHandler(notification.markAllAsRead));
router.delete('/notifications/:notificationId', auth, asyncHandler(notification.deleteNotification));
router.delete('/notifications/clear-read', auth, asyncHandler(notification.clearReadNotifications));

router.post(
  '/admin/notifications/send',
  auth,
  requireAdmin,
  [
    body('userIds').isArray({ min: 1 }),
    body('type').optional().isIn(['system', 'recommendation', 'homework']),
    body('title').isString().trim().isLength({ min: 1, max: 128 }),
    body('content').isString().trim().isLength({ min: 1 }),
    body('linkUrl').optional().isString().trim().isLength({ max: 255 }),
    body('linkText').optional().isString().trim().isLength({ max: 64 }),
  ],
  validate,
  asyncHandler(notification.adminSendNotification)
);

router.get(
  '/admin/notifications',
  auth,
  requireAdmin,
  asyncHandler(notification.adminGetNotificationList)
);

router.post(
  '/learning-path/resources/:phaseResourceId/toggle',
  auth,
  [body('completed').isBoolean()],
  validate,
  asyncHandler(action.togglePhaseResource)
);

router.post(
  '/quiz/create',
  auth,
  [
    body('subject').isString().trim().isLength({ min: 1, max: 32 }),
    body('difficulty').optional().isIn(['基础', '提高', '挑战', '混合']),
    body('questionCount').optional().isInt({ min: 1, max: 100 }),
    body('sourceType').optional().isIn(['随机', '错题再练']),
  ],
  validate,
  asyncHandler(action.createUserQuiz)
);

router.post(
  '/quiz/:quizId/answer/:questionId',
  auth,
  [body('userAnswer').optional().isString().trim()],
  validate,
  asyncHandler(action.answerQuizQuestion)
);

router.post(
  '/quiz/:quizId/submit',
  auth,
  [body('timeSpentSeconds').optional().isInt({ min: 0 })],
  validate,
  asyncHandler(action.submitUserQuiz)
);

module.exports = router;
