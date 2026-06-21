module.exports = (sequelize, DataTypes) => {
  const UserPhaseResource = sequelize.define(
    'UserPhaseResource',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      phaseId: { type: DataTypes.INTEGER, allowNull: false },
      resourceId: { type: DataTypes.INTEGER, allowNull: false },
      resourceTemplateId: { type: DataTypes.INTEGER, allowNull: false },
      resourceOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      estimatedMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
      isRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      note: { type: DataTypes.STRING(255), allowNull: true },
      completed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      progressPercent: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'user_phase_resources',
    }
  );

  return UserPhaseResource;
};
