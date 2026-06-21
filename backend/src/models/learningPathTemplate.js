module.exports = (sequelize, DataTypes) => {
  const LearningPathTemplate = sequelize.define(
    'LearningPathTemplate',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(128), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      targetStage: { type: DataTypes.STRING(32), allowNull: false },
      targetSubjects: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      targetLearningStyles: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      totalEstimatedHours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'learning_path_templates',
    }
  );

  return LearningPathTemplate;
};
