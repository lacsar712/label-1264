module.exports = (sequelize, DataTypes) => {
  const StudyGroup = sequelize.define(
    'StudyGroup',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(64), allowNull: false },
      inviteCode: { type: DataTypes.STRING(8), allowNull: false, unique: true },
      maxMembers: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      creatorId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: 'study_groups',
    }
  );

  return StudyGroup;
};
