module.exports = (sequelize, DataTypes) => {
  const ChatSession = sequelize.define(
    'ChatSession',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      resourceId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(128), allowNull: false, defaultValue: '新会话' },
      lastMessageAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      messageCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'chat_sessions',
      indexes: [
        { fields: ['user_id', 'resource_id'] },
        { fields: ['user_id', 'last_message_at'] },
      ],
    }
  );

  return ChatSession;
};
