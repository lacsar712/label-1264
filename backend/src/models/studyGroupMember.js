module.exports = (sequelize, DataTypes) => {
  const StudyGroupMember = sequelize.define(
    'StudyGroupMember',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      groupId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      role: { type: DataTypes.ENUM('leader', 'member'), allowNull: false, defaultValue: 'member' },
      joinedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'study_group_members',
      indexes: [{ unique: true, fields: ['group_id', 'user_id'] }],
    }
  );

  return StudyGroupMember;
};
