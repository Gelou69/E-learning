/**
 * Local (no-backend) implementation of the `api.js` surface.
 *
 * Same function names and arguments as the Supabase path, backed by
 * localStorage. Every function returns a plain value (never throws), and
 * `loadAll` returns the same normalised shape as the Supabase loader.
 */

import { getDb, updateDb, uid, appendActivity, findUserById, findUserByEmail, rolePassword } from './localStore'

const now = () => new Date().toISOString()
const lessonUrl = () => null

async function loadAll() {
  const db = getDb()
  return {
    users: db.users,
    plates: db.plates,
    pdfs: db.pdfs,
    videos: db.videos,
    announcements: db.announcements,
    submissions: db.submissions,
    progress: db.progress,
    surveys: db.surveys,
    checklists: db.checklists,
    activity: db.activity,
  }
}

async function listUsers() {
  return getDb().users
}

async function updateProfile(userId, patch) {
  let updated = null
  updateDb((draft) => {
    draft.users = draft.users.map((u) => {
      if (u.id !== userId) return u
      updated = { ...u, ...patch, id: u.id, email: u.email, role: u.role }
      return updated
    })
  })
  return updated ?? findUserById(userId)
}

async function setUserActive(userId, isActive) {
  updateDb((draft) => {
    draft.users = draft.users.map((u) => (u.id === userId ? { ...u, isActive } : u))
  })
}

async function createPlate(payload, userId) {
  const record = {
    id: payload.id ?? uid('plate'),
    title: payload.title,
    topic: payload.topic,
    difficulty: payload.difficulty,
    sdgs: payload.sdgs,
    quarter: payload.quarter,
    scale: payload.scale ?? 'NTS',
    description: payload.description,
    svg: payload.fileDataUrl ? null : (payload.svg ?? null),
    fileDataUrl: payload.fileDataUrl ?? null,
    featured: payload.featured ?? false,
    uploadedBy: userId ?? null,
  }
  updateDb((draft) => {
    draft.plates = [record, ...draft.plates]
  })
  return record
}

async function deletePlate(id) {
  updateDb((draft) => {
    draft.plates = draft.plates.filter((p) => p.id !== id)
  })
}

async function createLesson(payload, userId) {
  const record = {
    id: payload.id ?? uid('pdf'),
    title: payload.title,
    topic: payload.topic,
    quarter: payload.quarter,
    sdgs: payload.sdgs,
    pages: payload.pages,
    sizeKb: payload.sizeKb,
    summary: payload.summary,
    sections: payload.sections ?? [],
    published: payload.published ?? false,
    generated: !payload.file,
    filePath: null,
    fileDataUrl: payload.file ?? null,
    fileName: payload.fileName ?? null,
    url: lessonUrl(),
    uploadedBy: userId ?? null,
    uploadedAt: now(),
  }
  updateDb((draft) => {
    draft.pdfs = [record, ...draft.pdfs]
  })
  return record
}

async function setLessonPublished(id, published) {
  updateDb((draft) => {
    draft.pdfs = draft.pdfs.map((p) => (p.id === id ? { ...p, published } : p))
  })
}

async function deleteLesson(id) {
  updateDb((draft) => {
    draft.pdfs = draft.pdfs.filter((p) => p.id !== id)
  })
}

async function deleteLessonFile(id) {
  updateDb((draft) => {
    draft.pdfs = draft.pdfs.map((p) =>
      p.id === id ? { ...p, fileDataUrl: null, fileName: null, generated: true } : p,
    )
  })
}

async function createVideo(payload) {
  const record = {
    id: payload.id ?? uid('vid'),
    title: payload.title,
    topic: payload.topic,
    quarter: payload.quarter,
    sdgs: payload.sdgs,
    duration: payload.duration,
    level: payload.level,
    provider: payload.provider ?? 'youtube',
    videoId: payload.videoId,
    summary: payload.summary,
    tasks: payload.tasks ?? [],
  }
  updateDb((draft) => {
    draft.videos = [record, ...draft.videos]
  })
  return record
}

async function createSubmission(payload, userId) {
  const record = {
    id: uid('sub'),
    kind: payload.kind,
    refId: payload.refId,
    studentId: userId,
    section: payload.section ?? null,
    fileName: payload.fileName,
    filePath: null,
    fileDataUrl: payload.fileDataUrl ?? null,
    notes: payload.notes ?? '',
    submittedAt: now(),
    status: 'submitted',
    feedback: '',
    rubricScores: {},
    checklistScore: null,
    graderId: null,
    gradedAt: null,
  }
  updateDb((draft) => {
    draft.submissions = [record, ...draft.submissions]
  })
  appendActivity({ kind: 'submission', userId, refId: record.refId, fileName: record.fileName })
  return record
}

async function gradeSubmission(id, patch, graderId) {
  let updated = null
  updateDb((draft) => {
    draft.submissions = draft.submissions.map((s) => {
      if (s.id !== id) return s
      updated = {
        ...s,
        feedback: patch.feedback ?? s.feedback,
        rubricScores: patch.rubricScores ?? s.rubricScores,
        checklistScore: patch.checklistScore ?? s.checklistScore,
        status: patch.status ?? 'graded',
        graderId: graderId ?? null,
        gradedAt: now(),
      }
      return updated
    })
  })
  appendActivity({ kind: 'grade', userId: graderId, refId: id })
  return updated
}

async function deleteSubmission(id) {
  updateDb((draft) => {
    draft.submissions = draft.submissions.filter((s) => s.id !== id)
  })
}

async function logActivity(entry) {
  appendActivity(entry)
}

async function saveProgress(userId, refId, status, page) {
  updateDb((draft) => {
    const existing = draft.progress.find((p) => p.userId === userId && p.refId === refId)
    if (existing) {
      existing.status = status ?? existing.status
      existing.page = page ?? existing.page
      existing.lastOpened = now()
      draft.progress = [...draft.progress]
    } else {
      draft.progress = [
        { id: uid('pr'), userId, refId, status: status ?? 'opened', page: page ?? 1, lastOpened: now(), bookmarks: [] },
        ...draft.progress,
      ]
    }
  })
}

async function toggleBookmark(userId, refId, page, note) {
  let added = false
  updateDb((draft) => {
    let record = draft.progress.find((p) => p.userId === userId && p.refId === refId)
    if (!record) {
      record = { id: uid('pr'), userId, refId, status: 'opened', page: 1, lastOpened: now(), bookmarks: [] }
      draft.progress = [record, ...draft.progress]
    }
    const already = record.bookmarks.some((b) => b.page === page)
    record.bookmarks = already
      ? record.bookmarks.filter((b) => b.page !== page)
      : [...record.bookmarks, { page, note: note ?? '', at: now() }]
    added = !already
    draft.progress = [...draft.progress]
  })
  return added
}

async function saveSurvey(userId, section, answers) {
  updateDb((draft) => {
    const existing = draft.surveys.find((s) => s.userId === userId)
    const record = { id: existing?.id ?? uid('sur'), userId, section, answers, submittedAt: now() }
    draft.surveys = existing
      ? draft.surveys.map((s) => (s.userId === userId ? record : s))
      : [record, ...draft.surveys]
  })
  appendActivity({ kind: 'survey', userId })
}

async function saveChecklist(userId, section, responses, selfAssessed) {
  updateDb((draft) => {
    const existing = draft.checklists.find((c) => c.userId === userId)
    const record = {
      id: existing?.id ?? uid('chk'),
      userId,
      section,
      responses,
      selfAssessed: !!selfAssessed,
      submittedAt: now(),
    }
    draft.checklists = existing
      ? draft.checklists.map((c) => (c.userId === userId ? record : c))
      : [record, ...draft.checklists]
  })
  appendActivity({ kind: 'checklist', userId })
}

async function createAnnouncement(payload, authorId, authorName) {
  const record = {
    id: uid('an'),
    title: payload.title,
    body: payload.body,
    audience: payload.audience ?? 'all',
    author: authorName,
    authorId: authorId ?? null,
    pinned: payload.pinned ?? false,
    createdAt: now(),
  }
  updateDb((draft) => {
    draft.announcements = [record, ...draft.announcements]
  })
  return record
}

async function deleteAnnouncement(id) {
  updateDb((draft) => {
    draft.announcements = draft.announcements.filter((a) => a.id !== id)
  })
}

async function resetLearnerData() {
  const { resetDb } = await import('./localStore')
  resetDb()
  return ['activity_log', 'lesson_progress', 'bookmarks', 'survey_responses', 'checklist_assessments', 'submissions']
}

export const localAdapter = {
  loadAll,
  listUsers,
  updateProfile,
  setUserActive,
  touchLastSeen: async () => {},
  createPlate,
  deletePlate,
  createLesson,
  setLessonPublished,
  deleteLesson,
  deleteLessonFile,
  createVideo,
  createSubmission,
  gradeSubmission,
  deleteSubmission,
  logActivity,
  saveProgress,
  toggleBookmark,
  saveSurvey,
  saveChecklist,
  createAnnouncement,
  deleteAnnouncement,
  resetLearnerData,
}

export { findUserByEmail, findUserById, rolePassword }
