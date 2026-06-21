module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, index: true },
      type: { type: DataTypes.ENUM('system', 'recommendation', 'homework'), allowNull: false, defaultValue: 'system' },
      title: { type: DataTypes.STRING(128), allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      linkUrl: { type: DataTypes.STRING(255), allowNull: true },
      linkText: { type: DataTypes.STRING(64), allowNull: true },
      isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      senderId: { type: DataTypes.INTEGER, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    },
    {
      tableName: 'notifications',
      indexes: [
        { fields: ['user_id', 'is_read'] },
        { fields: ['user_id', 'created_at'] },
      ],
    }
  );

  return Notification;
};
