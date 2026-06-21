module.exports = (sequelize, DataTypes) => {
  const StudyGroupActivity = sequelize.define(
    'StudyGroupActivity',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      groupId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      type: { type: DataTypes.STRING(32), allowNull: false },
      content: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'study_group_activities',
      indexes: [{ fields: ['group_id', 'created_at'] }],
    }
  );

  return StudyGroupActivity;
};
