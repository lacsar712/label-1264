const { Op } = require('sequelize');

const { LearningNote, User, Resource } = require('../../models');

async function getNotesData(userId) {
  const notes = await LearningNote.findAll({
    where: { userId },
    include: [
      {
        model: Resource,
        as: 'resource',
        attributes: ['id', 'code', 'name', 'subject', 'type'],
        required: false,
      },
    ],
    order: [['updatedAt', 'DESC']],
  });

  const subjects = [...new Set(notes.map((n) => n.subject))].sort();

  const noteList = notes.map((n) => ({
    id: n.id,
    title: n.title,
    subject: n.subject,
    summary: n.content ? n.content.slice(0, 80) : '',
    resourceId: n.resourceId,
    resourceName: n.resource?.name || null,
    resourceCode: n.resource?.code || null,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));

  const subjectStats = subjects.map((s) => ({
    subject: s,
    count: notes.filter((n) => n.subject === s).length,
  }));

  return {
    noteList,
    subjects,
    subjectStats,
  };
}

async function getAdminNotesData() {
  const notes = await LearningNote.findAll({
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username'],
        required: true,
      },
      {
        model: Resource,
        as: 'resource',
        attributes: ['id', 'code', 'name', 'subject', 'type'],
        required: false,
      },
    ],
    order: [['updatedAt', 'DESC']],
  });

  const subjects = [...new Set(notes.map((n) => n.subject))].sort();
  const students = [...new Map(notes.map((n) => [n.user.id, { id: n.user.id, name: n.user.name, username: n.user.username }])).values()];

  const noteList = notes.map((n) => ({
    id: n.id,
    userId: n.userId,
    userName: n.user.name,
    userUsername: n.user.username,
    title: n.title,
    subject: n.subject,
    summary: n.content ? n.content.slice(0, 80) : '',
    resourceId: n.resourceId,
    resourceName: n.resource?.name || null,
    resourceCode: n.resource?.code || null,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));

  const subjectStats = subjects.map((s) => ({
    subject: s,
    count: notes.filter((n) => n.subject === s).length,
  }));

  const studentStats = students.map((s) => ({
    userId: s.id,
    name: s.name,
    count: notes.filter((n) => n.userId === s.id).length,
  }));

  return {
    noteList,
    subjects,
    students,
    subjectStats,
    studentStats,
  };
}

async function getNoteDetail(userId, noteId) {
  const note = await LearningNote.findOne({
    where: { id: noteId, userId },
    include: [
      {
        model: Resource,
        as: 'resource',
        attributes: ['id', 'code', 'name', 'subject', 'type'],
        required: false,
      },
    ],
  });

  if (!note) return null;

  return {
    id: note.id,
    title: note.title,
    content: note.content,
    subject: note.subject,
    resourceId: note.resourceId,
    resourceName: note.resource?.name || null,
    resourceCode: note.resource?.code || null,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

async function getAdminNoteDetail(noteId) {
  const note = await LearningNote.findOne({
    where: { id: noteId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username'],
        required: true,
      },
      {
        model: Resource,
        as: 'resource',
        attributes: ['id', 'code', 'name', 'subject', 'type'],
        required: false,
      },
    ],
  });

  if (!note) return null;

  return {
    id: note.id,
    userId: note.userId,
    userName: note.user.name,
    userUsername: note.user.username,
    title: note.title,
    content: note.content,
    subject: note.subject,
    resourceId: note.resourceId,
    resourceName: note.resource?.name || null,
    resourceCode: note.resource?.code || null,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

async function getAvailableResources(userId, keyword = '') {
  const where = {
    status: '上架',
    deleted: false,
  };

  if (keyword && keyword.trim()) {
    const kw = keyword.trim().toLowerCase();
    where[Op.or] = [
      { code: { [Op.like]: `%${kw}%` } },
      { name: { [Op.like]: `%${kw}%` } },
    ];
  }

  const resources = await Resource.findAll({
    where,
    attributes: ['id', 'code', 'name', 'subject', 'type', 'difficulty'],
    limit: 50,
    order: [['heat', 'DESC']],
  });

  return resources.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    subject: r.subject,
    type: r.type,
    difficulty: r.difficulty,
  }));
}

module.exports = {
  getNotesData,
  getAdminNotesData,
  getNoteDetail,
  getAdminNoteDetail,
  getAvailableResources,
};
