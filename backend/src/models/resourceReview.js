module.exports = (sequelize, DataTypes) => {
  const ResourceReview = sequelize.define(
    'ResourceReview',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      resourceId: { type: DataTypes.INTEGER, allowNull: false },
      rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
      comment: { type: DataTypes.TEXT, allowNull: true },
      likesCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isRecommended: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    },
    {
      tableName: 'resource_reviews',
      indexes: [
        { unique: true, fields: ['user_id', 'resource_id'] },
        { fields: ['resource_id'] },
        { fields: ['resource_id', 'rating'] },
        { fields: ['created_at'] },
      ],
    }
  );

  return ResourceReview;
};
