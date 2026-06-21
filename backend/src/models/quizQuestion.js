module.exports = (sequelize, DataTypes) => {
  const QuizQuestion = sequelize.define(
    'QuizQuestion',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      quizId: { type: DataTypes.INTEGER, allowNull: false },
      questionId: { type: DataTypes.INTEGER, allowNull: false },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      userAnswer: { type: DataTypes.STRING(4), allowNull: true },
      isCorrect: { type: DataTypes.BOOLEAN, allowNull: true },
    },
    {
      tableName: 'quiz_questions',
    }
  );

  return QuizQuestion;
};
