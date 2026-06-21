module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define(
    'Question',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
      subject: { type: DataTypes.STRING(32), allowNull: false },
      difficulty: { type: DataTypes.ENUM('基础', '提高', '挑战'), allowNull: false, defaultValue: '基础' },
      type: { type: DataTypes.ENUM('单选'), allowNull: false, defaultValue: '单选' },
      knowledgePoint: { type: DataTypes.STRING(128), allowNull: true },
      content: { type: DataTypes.TEXT, allowNull: false },
      options: { type: DataTypes.JSON, allowNull: false },
      correctAnswer: { type: DataTypes.STRING(4), allowNull: false },
      analysis: { type: DataTypes.TEXT, allowNull: true },
      score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'questions',
    }
  );

  return Question;
};
