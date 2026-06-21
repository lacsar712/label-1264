const { DataTypes } = require('sequelize');

const { sequelize } = require('../config/database');

const User = require('./user')(sequelize, DataTypes);
const UserTag = require('./userTag')(sequelize, DataTypes);
const Resource = require('./resource')(sequelize, DataTypes);
const ResourceCategory = require('./resourceCategory')(sequelize, DataTypes);
const ResourceTag = require('./resourceTag')(sequelize, DataTypes);
const RecommendationBatch = require('./recommendationBatch')(sequelize, DataTypes);
const Recommendation = require('./recommendation')(sequelize, DataTypes);
const UserResource = require('./userResource')(sequelize, DataTypes);
const LearningDaily = require('./learningDaily')(sequelize, DataTypes);
const LearningGoal = require('./learningGoal')(sequelize, DataTypes);
const WrongQuestion = require('./wrongQuestion')(sequelize, DataTypes);
const UserBehavior = require('./userBehavior')(sequelize, DataTypes);
const RecommendationRule = require('./recommendationRule')(sequelize, DataTypes);
const SystemParam = require('./systemParam')(sequelize, DataTypes);
const SystemLog = require('./systemLog')(sequelize, DataTypes);
const LearningNote = require('./learningNote')(sequelize, DataTypes);
const Notification = require('./notification')(sequelize, DataTypes);
const LearningPathTemplate = require('./learningPathTemplate')(sequelize, DataTypes);
const LearningPhaseTemplate = require('./learningPhaseTemplate')(sequelize, DataTypes);
const PhaseResourceTemplate = require('./phaseResourceTemplate')(sequelize, DataTypes);
const UserLearningPath = require('./userLearningPath')(sequelize, DataTypes);
const UserLearningPhase = require('./userLearningPhase')(sequelize, DataTypes);
const UserPhaseResource = require('./userPhaseResource')(sequelize, DataTypes);
const Question = require('./question')(sequelize, DataTypes);
const Quiz = require('./quiz')(sequelize, DataTypes);
const QuizQuestion = require('./quizQuestion')(sequelize, DataTypes);
const ResourceReview = require('./resourceReview')(sequelize, DataTypes);
const StudyGroup = require('./studyGroup')(sequelize, DataTypes);
const StudyGroupMember = require('./studyGroupMember')(sequelize, DataTypes);
const StudyGroupActivity = require('./studyGroupActivity')(sequelize, DataTypes);

User.hasMany(UserTag, { foreignKey: 'userId', as: 'tags' });
User.hasMany(LearningNote, { foreignKey: 'userId', as: 'learningNotes' });
LearningNote.belongsTo(User, { foreignKey: 'userId', as: 'user' });
LearningNote.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });
UserTag.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Resource.hasMany(ResourceTag, { foreignKey: 'resourceId', as: 'tags' });
ResourceTag.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });

User.hasMany(RecommendationBatch, { foreignKey: 'userId', as: 'recommendationBatches' });
RecommendationBatch.belongsTo(User, { foreignKey: 'userId', as: 'user' });

RecommendationBatch.hasMany(Recommendation, { foreignKey: 'batchId', as: 'recommendations' });
Recommendation.belongsTo(RecommendationBatch, { foreignKey: 'batchId', as: 'batch' });

User.hasMany(Recommendation, { foreignKey: 'userId', as: 'recommendations' });
Recommendation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Resource.hasMany(Recommendation, { foreignKey: 'resourceId', as: 'recommendations' });
Recommendation.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });

User.hasMany(UserResource, { foreignKey: 'userId', as: 'userResources' });
UserResource.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Resource.hasMany(UserResource, { foreignKey: 'resourceId', as: 'userResources' });
UserResource.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });

User.hasMany(LearningDaily, { foreignKey: 'userId', as: 'learningDaily' });
LearningDaily.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(LearningGoal, { foreignKey: 'userId', as: 'goals' });
LearningGoal.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(WrongQuestion, { foreignKey: 'userId', as: 'wrongQuestions' });
WrongQuestion.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserBehavior, { foreignKey: 'userId', as: 'behaviors' });
UserBehavior.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Resource.hasMany(UserBehavior, { foreignKey: 'resourceId', as: 'behaviors' });
UserBehavior.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });

User.hasMany(SystemLog, { foreignKey: 'actorUserId', as: 'logs' });
SystemLog.belongsTo(User, { foreignKey: 'actorUserId', as: 'actor' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

LearningPathTemplate.hasMany(LearningPhaseTemplate, { foreignKey: 'templateId', as: 'phases' });
LearningPhaseTemplate.belongsTo(LearningPathTemplate, { foreignKey: 'templateId', as: 'template' });

LearningPhaseTemplate.hasMany(PhaseResourceTemplate, { foreignKey: 'phaseTemplateId', as: 'resources' });
PhaseResourceTemplate.belongsTo(LearningPhaseTemplate, { foreignKey: 'phaseTemplateId', as: 'phaseTemplate' });
PhaseResourceTemplate.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });

User.hasMany(UserLearningPath, { foreignKey: 'userId', as: 'learningPaths' });
UserLearningPath.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserLearningPath.belongsTo(LearningPathTemplate, { foreignKey: 'templateId', as: 'template' });
UserLearningPath.belongsTo(UserLearningPhase, { foreignKey: 'currentPhaseId', as: 'currentPhase' });

UserLearningPath.hasMany(UserLearningPhase, { foreignKey: 'learningPathId', as: 'phases' });
UserLearningPhase.belongsTo(UserLearningPath, { foreignKey: 'learningPathId', as: 'learningPath' });
UserLearningPhase.belongsTo(LearningPhaseTemplate, { foreignKey: 'phaseTemplateId', as: 'phaseTemplate' });

UserLearningPhase.hasMany(UserPhaseResource, { foreignKey: 'phaseId', as: 'resources' });
UserPhaseResource.belongsTo(UserLearningPhase, { foreignKey: 'phaseId', as: 'phase' });
UserPhaseResource.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });
UserPhaseResource.belongsTo(PhaseResourceTemplate, { foreignKey: 'resourceTemplateId', as: 'resourceTemplate' });

User.hasMany(Quiz, { foreignKey: 'userId', as: 'quizzes' });
Quiz.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Quiz.hasMany(QuizQuestion, { foreignKey: 'quizId', as: 'quizQuestions' });
QuizQuestion.belongsTo(Quiz, { foreignKey: 'quizId', as: 'quiz' });
QuizQuestion.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });

Resource.hasMany(ResourceReview, { foreignKey: 'resourceId', as: 'reviews' });
ResourceReview.belongsTo(Resource, { foreignKey: 'resourceId', as: 'resource' });
User.hasMany(ResourceReview, { foreignKey: 'userId', as: 'resourceReviews' });
ResourceReview.belongsTo(User, { foreignKey: 'userId', as: 'user' });

StudyGroup.hasMany(StudyGroupMember, { foreignKey: 'groupId', as: 'members' });
StudyGroupMember.belongsTo(StudyGroup, { foreignKey: 'groupId', as: 'group' });
StudyGroupMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

StudyGroup.hasMany(StudyGroupActivity, { foreignKey: 'groupId', as: 'activities' });
StudyGroupActivity.belongsTo(StudyGroup, { foreignKey: 'groupId', as: 'group' });
StudyGroupActivity.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(StudyGroupMember, { foreignKey: 'userId', as: 'groupMemberships' });
User.hasMany(StudyGroupActivity, { foreignKey: 'userId', as: 'groupActivities' });

module.exports = {
  sequelize,
  User,
  UserTag,
  Resource,
  ResourceCategory,
  ResourceTag,
  RecommendationBatch,
  Recommendation,
  UserResource,
  LearningDaily,
  LearningGoal,
  WrongQuestion,
  UserBehavior,
  RecommendationRule,
  SystemParam,
  SystemLog,
  LearningNote,
  Notification,
  LearningPathTemplate,
  LearningPhaseTemplate,
  PhaseResourceTemplate,
  UserLearningPath,
  UserLearningPhase,
  UserPhaseResource,
  Question,
  Quiz,
  QuizQuestion,
  ResourceReview,
  StudyGroup,
  StudyGroupMember,
  StudyGroupActivity,
};
