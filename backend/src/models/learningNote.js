module.exports = (sequelize, DataTypes) => {
  const LearningNote = sequelize.define(
    'LearningNote',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(128), allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      subject: { type: DataTypes.STRING(32), allowNull: false },
      resourceId: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    },
    {
      tableName: 'learning_notes',
      indexes: [
        { fields: ['userId'] },
        { fields: ['subject'] },
        { fields: ['userId', 'subject'] },
        { fields: ['updatedAt'] },
      ],
    }
  );

  return LearningNote;
};
