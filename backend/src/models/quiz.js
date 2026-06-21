module.exports = (sequelize, DataTypes) => {
  const Quiz = sequelize.define(
    'Quiz',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      subject: { type: DataTypes.STRING(32), allowNull: false },
      difficulty: { type: DataTypes.ENUM('基础', '提高', '挑战', '混合'), allowNull: false, defaultValue: '混合' },
      questionCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      totalScore: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
      status: { type: DataTypes.ENUM('草稿', '已提交'), allowNull: false, defaultValue: '草稿' },
      sourceType: { type: DataTypes.ENUM('随机', '错题再练'), allowNull: false, defaultValue: '随机' },
      score: { type: DataTypes.INTEGER, allowNull: true },
      correctCount: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      timeSpentSeconds: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      submittedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'quizzes',
    }
  );

  return Quiz;
};
