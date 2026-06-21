module.exports = (sequelize, DataTypes) => {
  const UserLearningPath = sequelize.define(
    'UserLearningPath',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      templateId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(128), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      totalEstimatedHours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      currentPhaseId: { type: DataTypes.INTEGER, allowNull: true },
      overallProgress: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      status: { type: DataTypes.ENUM('未开始', '进行中', '已完成', '已暂停'), allowNull: false, defaultValue: '未开始' },
    },
    {
      tableName: 'user_learning_paths',
    }
  );

  return UserLearningPath;
};
