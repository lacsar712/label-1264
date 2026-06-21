module.exports = (sequelize, DataTypes) => {
  const PhaseResourceTemplate = sequelize.define(
    'PhaseResourceTemplate',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      phaseTemplateId: { type: DataTypes.INTEGER, allowNull: false },
      resourceId: { type: DataTypes.INTEGER, allowNull: false },
      resourceOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      estimatedMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
      isRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      note: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: 'phase_resource_templates',
    }
  );

  return PhaseResourceTemplate;
};
