module.exports = (sequelize, DataTypes) => {
  const ChatMessage = sequelize.define(
    'ChatMessage',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      sessionId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      role: { type: DataTypes.ENUM('user', 'assistant'), allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'chat_messages',
      indexes: [
        { fields: ['sessionId', 'createdAt'] },
      ],
    }
  );

  return ChatMessage;
};
