/**
 * Supabase data adapter.
 *
 * Every read and write in the app goes through this module. When
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are present it talks to
 * Postgres; otherwise it falls back to the seeded local adapter in
 * `localAdapter.js` so the app still runs with no backend.
 *
 * Row shapes are normalised to the camelCase contract the pages expect:
 *   profile.full_name   -> name
 *   profile.student_no  -> studentNo
 *   lesson.size_kb      -> sizeKb
 *   video.video_id      -> videoId
 *   submission.ref_id   -> refId
 *   progress.user_id    -> userId
 */

import { isSupabaseConfigured, supabase, uploadDataUrl, removeFile, resolveFileUrl, resolveFileUrls, BUCKETS } from './supabase'
import { localAdapter, findUserByEmail, findUserById, rolePassword } from './localAdapter'
import { readSession } from './localStore'
import { lessonPdfUrl } from './pdf'
import { PLATE_SEED } from '../data/seed'
import { SUBJECT } from '../data/constants'

const SUBJECT_GRADE = `${SUBJECT.grade} - ${SUBJECT.course}`

export const usingSupabase = isSupabaseConfigured

export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/* --------------------------------- auth --------------------------------- */

/**
 * Sign in with email + password.
 * Supabase: real credential check against auth.users.
 * Local: matches the role password used by the demo buttons.
 */
export async function signInWithPassword(email, password) {
  if (!usingSupabase) {
    const user = findUserByEmail(email)
    if (!user) return { error: 'No account found for that email address.' }
    if (user.isActive === false) return { error: 'That account has been deactivated. Ask your admin to re-enable it.' }
    if (password !== rolePassword(user.role)) {
      return { error: 'Incorrect password. Use the demo password for your role.' }
    }
    return { user }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      return { error: 'Incorrect email or password.' }
    }
    return { error: error.message }
  }
  return { session: data.session, userId: data.user?.id }
}

export async function signUpWithPassword({ email, password, fullName, role, section, studentNo }) {
  if (!usingSupabase) throw new Error('Sign-up requires Supabase. Add the project URL and anon key to .env.local.')

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        requested_role: role,
        section: role === 'student' ? section : null,
        student_no: role === 'student' ? studentNo.trim() || null : null,
      },
    },
  })
  if (error) throw error
  return {
    user: data.user,
    session: data.session,
    pendingApproval: true,
    requestedRole: role,
    requiresEmailConfirmation: !data.session,
  }
}

export async function signOut() {
  if (!usingSupabase) return
  await supabase.auth.signOut()
}

export function onAuthChange(handler) {
  if (!usingSupabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    handler(session)
  })
  return () => data.subscription.unsubscribe()
}

export async function getSessionUserId() {
  if (!usingSupabase) {
    const session = readSession()
    return session?.userId ?? null
  }
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

/**
 * Account creation goes through the `create-user` Edge Function because the
 * Auth Admin API needs the service role key, which must stay on the server.
 */
export async function createUserAccount({ email, password, fullName, role, section, studentNo, gender }) {
  if (!usingSupabase) throw new Error('Creating accounts needs Supabase configured.')
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: { email, password, fullName, role, section, studentNo, gender },
  })
  if (error) {
    throw new Error(
      error.message === 'Failed to fetch' || error.status === 404
        ? 'The create-user function is not deployed yet. Run: supabase functions deploy create-user'
        : error.message,
    )
  }
  if (data?.error) throw new Error(data.error)
  return data
}

/* ------------------------------ normalisers ------------------------------ */

const mapProfile = (r) => ({
  id: r.id,
  name: r.full_name,
  email: r.email,
  role: r.role,
  requestedRole: r.requested_role,
  section: r.section,
  studentNo: r.student_no,
  gender: r.gender,
  avatarColor: r.avatar_color,
  phone: r.phone,
  isActive: r.is_active,
  lastSeenAt: r.last_seen_at,
})

/**
 * Plate rows in Postgres hold metadata only, so the line work is bundled with
 * the app. Plates uploaded through Storage keep their own file.
 */
const bundledPlateSvg = new Map(PLATE_SEED.map((p) => [p.id, p.svg]))

function resolvePlateSvg(plate) {
  if (plate.svg) return plate.svg
  return bundledPlateSvg.get(plate.id) ?? null
}

const mapPlate = (r) => ({
  id: r.id,
  title: r.title,
  topic: r.topic,
  difficulty: r.difficulty,
  sdgs: r.sdgs ?? [],
  quarter: r.quarter,
  scale: r.scale,
  description: r.description,
  svg: r.svg ?? null,
  filePath: r.file_path ?? null,
  featured: r.featured,
  uploadedBy: r.uploaded_by,
})

function mapPlateWithArt(row) {
  const plate = mapPlate(row)
  return { ...plate, svg: resolvePlateSvg(plate), imageUrl: null }
}

const mapLesson = (r) => ({
  id: r.id,
  title: r.title,
  topic: r.topic,
  quarter: r.quarter,
  sdgs: r.sdgs ?? [],
  pages: r.pages,
  sizeKb: r.size_kb,
  summary: r.summary,
  sections: r.sections ?? [],
  published: r.published,
  generated: r.generated,
  filePath: r.file_path ?? null,
  fileName: r.file_name ?? null,
  uploadedBy: r.uploaded_by,
  url: null,
})

const mapVideo = (r) => ({
  id: r.id,
  title: r.title,
  topic: r.topic,
  quarter: r.quarter,
  sdgs: r.sdgs ?? [],
  duration: r.duration,
  level: r.level,
  provider: r.provider,
  videoId: r.video_id,
  summary: r.summary,
  tasks: r.tasks ?? [],
})

const mapSubmission = (r) => ({
  id: r.id,
  kind: r.kind,
  refId: r.ref_id,
  studentId: r.student_id,
  section: r.section,
  fileName: r.file_name,
  filePath: r.file_path ?? null,
  notes: r.notes ?? '',
  status: r.status,
  feedback: r.feedback ?? '',
  rubricScores: r.rubric_scores ?? {},
  checklistScore: r.checklist_score,
  graderId: r.grader_id ?? null,
  submittedAt: r.submitted_at,
  gradedAt: r.graded_at ?? null,
})

const mapProgress = (r, bookmarks) => ({
  id: r.id,
  userId: r.user_id,
  refId: r.ref_id,
  status: r.status,
  page: r.page,
  lastOpened: r.last_opened,
  bookmarks: bookmarks ?? [],
})

const mapSurvey = (r) => ({
  id: r.id,
  userId: r.user_id,
  section: r.section,
  answers: r.answers ?? {},
  submittedAt: r.submitted_at,
})

const mapChecklist = (r) => ({
  id: r.id,
  userId: r.user_id,
  section: r.section,
  responses: r.responses ?? {},
  selfAssessed: r.self_assessed,
  submittedAt: r.submitted_at,
})

const mapAnnouncement = (r) => ({
  id: r.id,
  title: r.title,
  body: r.body,
  audience: r.audience,
  author: r.author,
  authorId: r.author_id ?? null,
  pinned: r.pinned,
  createdAt: r.created_at,
})

const mapActivity = (r) => ({
  id: r.id,
  kind: r.kind,
  userId: r.user_id ?? null,
  refId: r.ref_id ?? null,
  fileName: r.file_name ?? null,
  meta: r.meta ?? {},
  at: r.at,
})

/* --------------------------------- reads --------------------------------- */

async function run(name, args) {
  const fn = localAdapter[name]
  const result = await fn(...args)
  if (result?.error) throw result.error
  return result
}

/** Load everything the UI needs in one pass. */
export async function loadAll({ userId } = {}) {
  if (!usingSupabase) return localAdapter.loadAll({ userId })

  const [profiles, plates, lessons, videos, announcements, submissions, progress, surveys, checklists, activity] =
    await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('plates').select('*').order('id'),
      supabase.from('lessons').select('*').order('id'),
      supabase.from('videos').select('*').order('id'),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('submissions').select('*').order('submitted_at', { ascending: false }),
      supabase.from('lesson_progress').select('*').order('last_opened', { ascending: false }),
      supabase.from('survey_responses').select('*').order('submitted_at', { ascending: false }),
      supabase.from('checklist_assessments').select('*').order('submitted_at', { ascending: false }),
      supabase.from('activity_log').select('*').order('at', { ascending: false }).limit(200),
    ])

  const firstError = [profiles, plates, lessons, videos, announcements, submissions, progress, surveys, checklists, activity].find(
    (r) => r.error,
  )
  if (firstError) throw firstError.error

  const bookmarkRows = userId
    ? (await supabase.from('bookmarks').select('*').eq('user_id', userId)).data ?? []
    : []
  const bookmarksByRef = new Map()
  bookmarkRows.forEach((b) => {
    if (!bookmarksByRef.has(b.ref_id)) bookmarksByRef.set(b.ref_id, [])
    bookmarksByRef.get(b.ref_id).push({ page: b.page, note: b.note ?? '', at: b.created_at })
  })

  const submissionRows = submissions.data ?? []
  const submissionFiles = await resolveFileUrls(
    BUCKETS.submissions,
    submissionRows.map((r) => r.file_path),
  )

  const plateRows = plates.data ?? []
  const plateFiles = await resolveFileUrls(
    BUCKETS.plates,
    plateRows.map((r) => r.file_path),
    { signed: false },
  )

  return {
    users: (profiles.data ?? []).map(mapProfile),
    plates: plateRows.map((r) => ({
      ...mapPlateWithArt(r),
      imageUrl: r.file_path ? (plateFiles.get(r.file_path) ?? null) : null,
    })),
    pdfs: (lessons.data ?? []).map(mapLesson),
    videos: (videos.data ?? []).map(mapVideo),
    announcements: (announcements.data ?? []).map(mapAnnouncement),
    submissions: submissionRows.map((r) => ({
      ...mapSubmission(r),
      fileDataUrl: r.file_path ? (submissionFiles.get(r.file_path) ?? null) : null,
    })),
    progress: (progress.data ?? []).map((r) => mapProgress(r, bookmarksByRef.get(r.ref_id))),
    surveys: (surveys.data ?? []).map(mapSurvey),
    checklists: (checklists.data ?? []).map(mapChecklist),
    activity: (activity.data ?? []).map(mapActivity),
  }
}

/* ------------------------------- profiles -------------------------------- */

export async function updateProfile(userId, patch) {
  if (!usingSupabase) return run('updateProfile', [userId, patch])
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: patch.name,
      section: patch.section,
      student_no: patch.studentNo,
      gender: patch.gender,
      avatar_color: patch.avatarColor,
      phone: patch.phone,
      is_active: patch.isActive,
    })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return mapProfile(data)
}

export async function listUsers() {
  if (!usingSupabase) return run('listUsers', [])
  const { data, error } = await supabase.from('profiles').select('*').order('full_name')
  if (error) throw error
  return data.map(mapProfile)
}

export async function getProfile(userId) {
  if (!userId) return null
  if (!usingSupabase) return findUserById(userId)
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data ? mapProfile(data) : null
}

export async function setUserActive(userId, isActive) {
  if (!usingSupabase) return run('setUserActive', [userId, isActive])
  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId)
  if (error) throw error
}

export async function approveUser(userId, role) {
  if (!usingSupabase) throw new Error('Account approval requires Supabase.')
  if (!['student', 'teacher'].includes(role)) throw new Error('Invalid account role for approval.')
  const { data, error } = await supabase
    .from('profiles')
    .update({ role, requested_role: null, is_active: true })
    .eq('id', userId)
    .eq('requested_role', role)
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('This account is no longer awaiting approval.')
}

export async function touchLastSeen(userId) {
  if (!usingSupabase) return
  await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId)
}

/* -------------------------------- plates --------------------------------- */

export async function createPlate(payload, userId) {
  if (!usingSupabase) return run('createPlate', [payload, userId])
  const id = payload.id ?? newId('plate')
  let svg = payload.svg ?? null
  let filePath = null
  if (payload.fileDataUrl) {
    filePath = await uploadDataUrl(BUCKETS.plates, `${id}/${Date.now()}.png`, payload.fileDataUrl)
    svg = null
  }
  const { data, error } = await supabase
    .from('plates')
    .insert({
      id,
      title: payload.title,
      topic: payload.topic,
      difficulty: payload.difficulty,
      sdgs: payload.sdgs,
      quarter: payload.quarter,
      scale: payload.scale,
      description: payload.description,
      svg,
      file_path: filePath,
      featured: payload.featured ?? false,
      uploaded_by: userId ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return mapPlateWithArt(data)
}

export async function deletePlate(id) {
  if (!usingSupabase) return run('deletePlate', [id])
  const { file_path: filePath } = await supabase.from('plates').select('file_path').eq('id', id).maybeSingle()
  if (filePath) await removeFile(BUCKETS.plates, filePath)
  const { error } = await supabase.from('plates').delete().eq('id', id)
  if (error) throw error
}

/* -------------------------------- lessons -------------------------------- */

export async function createLesson(payload, userId) {
  if (!usingSupabase) return run('createLesson', [payload, userId])
  const id = payload.id ?? newId('pdf')
  let filePath = null
  if (payload.file) {
    filePath = await uploadDataUrl(BUCKETS.lessons, `${id}/${Date.now()}.pdf`, payload.file)
  }
  const { data, error } = await supabase
    .from('lessons')
    .insert({
      id,
      title: payload.title,
      topic: payload.topic,
      quarter: payload.quarter,
      sdgs: payload.sdgs,
      pages: payload.pages,
      size_kb: payload.sizeKb,
      summary: payload.summary,
      sections: payload.sections ?? [],
      published: payload.published ?? false,
      generated: !filePath,
      file_path: filePath,
      file_name: filePath ? payload.fileName : null,
      uploaded_by: userId ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return mapLesson(data)
}

export async function setLessonPublished(id, published) {
  if (!usingSupabase) return run('setLessonPublished', [id, published])
  const { error } = await supabase.from('lessons').update({ published }).eq('id', id)
  if (error) throw error
}

export async function deleteLesson(id) {
  if (!usingSupabase) return run('deleteLesson', [id])
  const { data } = await supabase.from('lessons').select('file_path').eq('id', id).maybeSingle()
  if (data?.file_path) await removeFile(BUCKETS.lessons, data.file_path)
  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) throw error
}

export async function deleteLessonFile(id) {
  if (!usingSupabase) return run('deleteLessonFile', [id])
  const { data } = await supabase.from('lessons').select('file_path').eq('id', id).maybeSingle()
  if (data?.file_path) {
    await removeFile(BUCKETS.lessons, data.file_path)
    await supabase.from('lessons').update({ file_path: null, file_name: null, generated: true }).eq('id', id)
  }
}

/* -------------------------------- videos --------------------------------- */

export async function createVideo(payload) {
  if (!usingSupabase) return run('createVideo', [payload])
  const id = payload.id ?? newId('vid')
  const { data, error } = await supabase
    .from('videos')
    .insert({
      id,
      title: payload.title,
      topic: payload.topic,
      quarter: payload.quarter,
      sdgs: payload.sdgs,
      duration: payload.duration,
      level: payload.level,
      provider: payload.provider ?? 'youtube',
      video_id: payload.videoId,
      summary: payload.summary,
      tasks: payload.tasks ?? [],
    })
    .select()
    .single()
  if (error) throw error
  return mapVideo(data)
}

/* ----------------------------- submissions ------------------------------ */

export async function createSubmission(payload, userId) {
  if (!usingSupabase) return run('createSubmission', [payload, userId])
  const id = newId('sub')
  let filePath = null
  if (payload.fileDataUrl) {
    filePath = await uploadDataUrl(BUCKETS.submissions, `${userId}/${id}.png`, payload.fileDataUrl)
  }
  const { data, error } = await supabase
    .from('submissions')
    .insert({
      id,
      kind: payload.kind,
      ref_id: payload.refId,
      student_id: userId,
      section: payload.section ?? null,
      file_name: payload.fileName,
      file_path: filePath,
      notes: payload.notes ?? '',
      status: 'submitted',
    })
    .select()
    .single()
  if (error) throw error
  await logActivity({ kind: 'submission', userId, refId: payload.refId, fileName: payload.fileName })
  return mapSubmission(data)
}

export async function gradeSubmission(id, patch, graderId) {
  if (!usingSupabase) return run('gradeSubmission', [id, patch])
  const body = {
    feedback: patch.feedback ?? '',
    rubric_scores: patch.rubricScores ?? {},
    checklist_score: patch.checklistScore ?? null,
    status: patch.status ?? 'graded',
    graded_at: new Date().toISOString(),
    grader_id: graderId ?? null,
  }
  const { data, error } = await supabase.from('submissions').update(body).eq('id', id).select().single()
  if (error) throw error
  await logActivity({ kind: 'grade', userId: graderId, refId: id })
  return mapSubmission(data)
}

export async function deleteSubmission(id) {
  if (!usingSupabase) return run('deleteSubmission', [id])
  const { data } = await supabase.from('submissions').select('file_path').eq('id', id).maybeSingle()
  if (data?.file_path) await removeFile(BUCKETS.submissions, data.file_path)
  const { error } = await supabase.from('submissions').delete().eq('id', id)
  if (error) throw error
}

export async function logActivity(entry) {
  if (!usingSupabase) return run('logActivity', [entry])
  await supabase.from('activity_log').insert({
    id: newId('act'),
    kind: entry.kind,
    user_id: entry.userId ?? null,
    ref_id: entry.refId ?? null,
    file_name: entry.fileName ?? null,
  })
}

/* ------------------------------- progress -------------------------------- */

export async function saveProgress(userId, refId, status, page) {
  if (!usingSupabase) return run('saveProgress', [userId, refId, status, page])
  const existing = await supabase
    .from('lesson_progress')
    .select('id, status, page')
    .eq('user_id', userId)
    .eq('ref_id', refId)
    .maybeSingle()

  const body = {
    status: status ?? existing.data?.status ?? 'opened',
    page: page ?? existing.data?.page ?? 1,
    last_opened: new Date().toISOString(),
  }

  if (existing.data) {
    const { error } = await supabase.from('lesson_progress').update(body).eq('id', existing.data.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('lesson_progress').insert({
      id: newId('pr'),
      user_id: userId,
      ref_id: refId,
      ...body,
    })
    if (error) throw error
  }
}

export async function toggleBookmark(userId, refId, page, note) {
  if (!usingSupabase) return run('toggleBookmark', [userId, refId, page, note])
  const existing = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('ref_id', refId)
    .eq('page', page)
    .maybeSingle()

  if (existing.data) {
    const { error } = await supabase.from('bookmarks').delete().eq('id', existing.data.id)
    if (error) throw error
    return false
  }
  const { error } = await supabase.from('bookmarks').insert({
    id: newId('bm'),
    user_id: userId,
    ref_id: refId,
    page,
    note: note ?? '',
  })
  if (error) throw error
  return true
}

/* -------------------------- survey / checklist --------------------------- */

export async function saveSurvey(userId, section, answers) {
  if (!usingSupabase) return run('saveSurvey', [userId, section, answers])
  const { error } = await supabase.from('survey_responses').upsert(
    { user_id: userId, section, answers, submitted_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
  if (error) throw error
  await logActivity({ kind: 'survey', userId })
}

export async function saveChecklist(userId, section, responses, selfAssessed) {
  if (!usingSupabase) return run('saveChecklist', [userId, section, responses, selfAssessed])
  const { error } = await supabase.from('checklist_assessments').upsert(
    {
      user_id: userId,
      section,
      responses,
      self_assessed: !!selfAssessed,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error
  await logActivity({ kind: 'checklist', userId })
}

/* ----------------------------- announcements ----------------------------- */

export async function createAnnouncement(payload, authorId, authorName) {
  if (!usingSupabase) return run('createAnnouncement', [payload, authorName])
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      id: newId('an'),
      title: payload.title,
      body: payload.body,
      audience: payload.audience ?? 'all',
      author: authorName,
      author_id: authorId ?? null,
      pinned: payload.pinned ?? false,
    })
    .select()
    .single()
  if (error) throw error
  return mapAnnouncement(data)
}

export async function deleteAnnouncement(id) {
  if (!usingSupabase) return run('deleteAnnouncement', [id])
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw error
}

/* -------------------------------- storage -------------------------------- */

export async function submissionUrl(submission) {
  if (!submission) return null
  if (submission.filePath) return resolveFileUrl(BUCKETS.submissions, submission.filePath)
  return submission.fileDataUrl ?? null
}

/**
 * Usable URL for a lesson document.
 * Uploaded lessons resolve to a signed Storage URL; generated lessons fall
 * back to a locally generated PDF so seeded/teacher-written lessons still open.
 */
export async function lessonUrl(lesson) {
  if (!lesson) return null
  if (lesson.filePath) return resolveFileUrl(BUCKETS.lessons, lesson.filePath)
  if (lesson.url) return lesson.url
  if (lesson.sections?.length) {
    return lessonPdfUrl(lesson.id, {
      title: lesson.title,
      subtitle: lesson.summary,
      meta: [SUBJECT_GRADE, `SDG ${(lesson.sdgs ?? []).join(', SDG ')}`, `${lesson.pages} pages`],
      sections: lesson.sections,
    })
  }
  return null
}

export async function plateUrl(plate) {
  if (!plate?.filePath) return null
  return resolveFileUrl(BUCKETS.plates, plate.filePath, { signed: false })
}

/* ------------------------------ demo reset ------------------------------- */

/**
 * Wipe learner-generated rows so the admin can re-run the seed script.
 * Content (plates, lessons, videos, announcements) is kept.
 */
export async function resetLearnerData() {
  if (!usingSupabase) return run('resetLearnerData', [])
  const tables = ['activity_log', 'lesson_progress', 'bookmarks', 'survey_responses', 'checklist_assessments', 'submissions']
  const results = await Promise.all(tables.map((t) => supabase.from(t).delete().neq('id', '__never__')))
  const failed = results.find((r) => r.error)
  if (failed) throw failed.error
  return tables
}
