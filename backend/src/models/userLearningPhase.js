module.exports = (sequelize, DataTypes) => {
  const UserLearningPhase = sequelize.define(
    'UserLearningPhase',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      learningPathId: { type: DataTypes.INTEGER, allowNull: false },
      phaseTemplateId: { type: DataTypes.INTEGER, allowNull: false },
      phaseOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      name: { type: DataTypes.STRING(128), allowNull: false },
      goal: { type: DataTypes.TEXT, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      estimatedHours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      difficulty: { type: DataTypes.ENUM('基础', '提高', '挑战'), allowNull: false, defaultValue: '基础' },
      milestone: { type: DataTypes.STRING(255), allowNull: true },
      progress: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
      completedResources: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      totalResources: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      status: { type: DataTypes.ENUM('未开始', '进行中', '已完成', '已锁定'), allowNull: false, defaultValue: '未开始' },
    },
    {
      tableName: 'user_learning_phases',
    }
  );

  return UserLearningPhase;
};
