const { Op } = require('sequelize');

const { ResourceReview, User, Resource, UserResource, SystemLog } = require('../models');

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function getResourceReviewStats(resourceId) {
  const reviews = await ResourceReview.findAll({
    where: { resourceId },
    attributes: ['rating'],
    raw: true,
  });

  const totalCount = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + safeNumber(r.rating), 0);
  const averageRating = totalCount > 0 ? sum / totalCount : 0;

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  }

  return {
    averageRating: Number(averageRating.toFixed(2)),
    totalCount,
    distribution,
  };
}

async function getResourceReviews(resourceId, page = 1, pageSize = 10) {
  const { count, rows } = await ResourceReview.findAndCountAll({
    where: { resourceId },
    include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    total: count,
    list: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user?.name || '匿名用户',
      rating: r.rating,
      comment: r.comment,
      isRecommended: r.isRecommended,
      likesCount: r.likesCount,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  };
}

async function getRecentReviews(limit = 20) {
  const rows = await ResourceReview.findAll({
    include: [
      { model: User, as: 'user', attributes: ['id', 'name'] },
      { model: Resource, as: 'resource', attributes: ['id', 'code', 'name'] },
    ],
    where: { comment: { [Op.ne]: null } },
    order: [['createdAt', 'DESC']],
    limit,
  });

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user?.name || '匿名用户',
    resourceId: r.resourceId,
    resourceCode: r.resource?.code,
    resourceName: r.resource?.name,
    rating: r.rating,
    comment: r.comment,
    isRecommended: r.isRecommended,
    likesCount: r.likesCount,
    createdAt: r.createdAt,
  }));
}

async function getUserReview(userId, resourceId) {
  const review = await ResourceReview.findOne({
    where: { userId, resourceId },
    raw: true,
  });
  return review;
}

async function createOrUpdateReview(userId, resourceId, rating, comment, isRecommended) {
  const userResource = await UserResource.findOne({
    where: { userId, resourceId, status: '已完成' },
  });
  if (!userResource) {
    throw new Error('只有已完成的资源才能评价');
  }

  const now = new Date();
  const [review, created] = await ResourceReview.findOrCreate({
    where: { userId, resourceId },
    defaults: {
      userId,
      resourceId,
      rating,
      comment: comment || null,
      isRecommended: Boolean(isRecommended),
      createdAt: now,
      updatedAt: now,
    },
  });

  if (!created) {
    await review.update({
      rating,
      comment: comment || null,
      isRecommended: Boolean(isRecommended),
      updatedAt: now,
    });
  }

  await SystemLog.create({
    actorUserId: userId,
    type: '资源评价',
    content: `${created ? '创建' : '更新'}资源评价 #${review.id} 资源#${resourceId} 评分:${rating}`,
    status: '成功',
  });

  return { review: review.toJSON(), created };
}

async function getResourcesWithRatings(resourceIds) {
  if (!resourceIds || resourceIds.length === 0) return {};

  const reviews = await ResourceReview.findAll({
    where: { resourceId: { [Op.in]: resourceIds } },
    attributes: ['resourceId', 'rating'],
    raw: true,
  });

  const statsMap = {};
  for (const r of reviews) {
    if (!statsMap[r.resourceId]) {
      statsMap[r.resourceId] = { sum: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }
    statsMap[r.resourceId].sum += safeNumber(r.rating);
    statsMap[r.resourceId].count += 1;
    statsMap[r.resourceId].distribution[r.rating] = (statsMap[r.resourceId].distribution[r.rating] || 0) + 1;
  }

  const result = {};
  for (const id of resourceIds) {
    const s = statsMap[id] || { sum: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    result[id] = {
      averageRating: s.count > 0 ? Number((s.sum / s.count).toFixed(2)) : 0,
      reviewCount: s.count,
      distribution: s.distribution,
    };
  }

  return result;
}

async function getTopRatedResources(limit = 20) {
  const { Resource } = require('../models');
  const allResources = await Resource.findAll({
    where: { deleted: false, status: '上架' },
    attributes: ['id', 'code', 'name', 'subject', 'difficulty', 'heat', 'updatedAt'],
    raw: true,
  });

  const resourceIds = allResources.map((r) => r.id);
  const ratingsMap = await getResourcesWithRatings(resourceIds);

  const withRatings = allResources
    .map((r) => ({
      resourceId: r.code,
      resourceDbId: r.id,
      name: r.name,
      subject: r.subject,
      difficulty: r.difficulty,
      heat: r.heat,
      updatedAt: r.updatedAt,
      averageRating: ratingsMap[r.id]?.averageRating || 0,
      reviewCount: ratingsMap[r.id]?.reviewCount || 0,
      distribution: ratingsMap[r.id]?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }))
    .filter((r) => r.reviewCount > 0)
    .sort((a, b) => {
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return b.reviewCount - a.reviewCount;
    })
    .slice(0, limit);

  return withRatings;
}

module.exports = {
  getResourceReviewStats,
  getResourceReviews,
  getRecentReviews,
  getUserReview,
  createOrUpdateReview,
  getResourcesWithRatings,
  getTopRatedResources,
};
