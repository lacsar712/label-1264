module.exports = (sequelize, DataTypes) => {
  const LearningPhaseTemplate = sequelize.define(
    'LearningPhaseTemplate',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      templateId: { type: DataTypes.INTEGER, allowNull: false },
      phaseOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      name: { type: DataTypes.STRING(128), allowNull: false },
      goal: { type: DataTypes.TEXT, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      estimatedHours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      difficulty: { type: DataTypes.ENUM('基础', '提高', '挑战'), allowNull: false, defaultValue: '基础' },
      milestone: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: 'learning_phase_templates',
    }
  );

  return LearningPhaseTemplate;
};
