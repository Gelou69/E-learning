/**
 * Local persistence layer.
 * A small store backed by localStorage that behaves like an API, so the whole
 * platform runs offline (PWA-first) and can be swapped for a REST backend later.
 */

import {
  ANNOUNCEMENTS_SEED,
  CHECKLIST_INDICATORS,
  PDF_SEED,
  PLATE_SEED,
  RUBRIC_CRITERIA,
  SURVEY_ITEMS,
  VIDEO_SEED,
} from '../data/seed'

const DB_KEY = 'vgd-hub-db-v1'
const SESSION_KEY = 'vgd-hub-session-v1'

const FIRST = ['Maria', 'Jomar', 'Kyla', 'Diego', 'Angel', 'Prince', 'Nicole', 'Paolo', 'Grace', 'Marco', 'Camille', 'Rico', 'Jasmine', 'Noel', 'Tara', 'Luis', 'Bea', 'Ethan', 'Sofia', 'Nico', 'Alma', 'Gab', 'Rhea', 'Carlo', 'Mika', 'Denise', 'Fran', 'Liza', 'Omar', 'Kat']
const LAST = ['Dela Cruz', 'Santos', 'Reyes', 'Bautista', 'Garcia', 'Mendoza', 'Torres', 'Aquino', 'Ramos', 'Cruz', 'Villanueva', 'Padilla', 'Domingo', 'Navarro', 'Salazar', 'Ocampo']
const SECTIONS = ['VGD 11 - Section A', 'VGD 11 - Section B', 'VGD 11 - Section C']

function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20261001)

function pick(list) {
  return list[Math.floor(rand() * list.length)]
}

function makeStudents() {
  const students = []
  for (let i = 0; i < 30; i += 1) {
    const first = FIRST[i % FIRST.length]
    const last = LAST[Math.floor(i / 2) % LAST.length]
    students.push({
      id: `stu-${String(i + 1).padStart(2, '0')}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase().replace(/\s+/g, '')}@student.vgd.edu.ph`,
      role: 'student',
      section: SECTIONS[i % SECTIONS.length],
      gender: i % 2 === 0 ? 'Female' : 'Male',
      avatarColor: ['#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1', '#15803d'][i % 6],
      studentNo: `2026-${String(1001 + i)}`,
    })
  }
  return students
}

function makeUsers() {
  return [
    {
      id: 'tea-01',
      name: 'Engr. Bea Villanueva',
      email: 'villanueva@vgd.edu.ph',
      role: 'teacher',
      subject: 'Visual Graphics Design',
      avatarColor: '#0f766e',
    },
    {
      id: 'tea-02',
      name: 'Mr. Rico Navarro',
      email: 'navarro@vgd.edu.ph',
      role: 'teacher',
      subject: 'Visual Graphics Design',
      avatarColor: '#b45309',
    },
    {
      id: 'adm-01',
      name: 'Sammy Malik',
      email: 'sammymalik@admin.edu.ph',
      role: 'admin',
      title: 'Department Head',
      avatarColor: '#7c3aed',
    },
    ...makeStudents(),
  ]
}

const FEEDBACK_NOTES = [
  'Line weights are consistent; check that hidden lines are 0.35 mm on your next plate.',
  'Good alignment between views. Dimension the opening, not the wall thickness.',
  'Strong sectional view — remember fasteners and shafts are never hatched.',
  'Nice idea for the roof angle. Tighten your title block lettering.',
  'Projection is accurate. Add a centre line through the bore.',
  'The isometric grid drifts near the base. Rebuild it before adding detail.',
]

function makeSubmissions(students) {
  const submissions = []
  PLATE_SEED.forEach((plate, plateIndex) => {
    students.forEach((student, studentIndex) => {
      const chance = 0.35 + (studentIndex % 5) * 0.07
      if (rand() > chance) return
      const graded = rand() > 0.22
      const base = 2.6 + rand() * 1.9
      const rubricScores = {}
      RUBRIC_CRITERIA.forEach((criterion) => {
        rubricScores[criterion.id] = Math.min(5, Math.max(1, Math.round(base + (rand() - 0.5) * 1.2)))
      })
      const checklistScore = CHECKLIST_INDICATORS.reduce(
        (sum, indicator, i) => sum + (rand() > 0.22 + ((i + studentIndex) % 7) * 0.02 ? 1 : 0),
        0,
      )
      const daysAgo = Math.floor(rand() * 40) + 1
      submissions.push({
        id: `sub-${plateIndex + 1}-${studentIndex + 1}`,
        kind: 'plate',
        refId: plate.id,
        studentId: student.id,
        section: student.section,
        fileName: `${student.name.split(' ').join('_')}_${plate.id}_plate.png`,
        notes: rand() > 0.7 ? pick(FEEDBACK_NOTES) : '',
        submittedAt: new Date(Date.now() - daysAgo * 864e5 - Math.floor(rand() * 8e7)).toISOString(),
        status: graded ? 'graded' : 'submitted',
        feedback: graded ? pick(FEEDBACK_NOTES) : '',
        checklistScore,
        rubricScores,
      })
    })
  })
  return submissions
}

function makeVideoSubmissions(students) {
  const submissions = []
  VIDEO_SEED.forEach((video, videoIndex) => {
    students.forEach((student, studentIndex) => {
      if (rand() > 0.3 + (studentIndex % 4) * 0.06) return
      const graded = rand() > 0.25
      const base = 2.5 + rand() * 2
      const rubricScores = {}
      RUBRIC_CRITERIA.forEach((criterion) => {
        rubricScores[criterion.id] = Math.min(5, Math.max(1, Math.round(base + (rand() - 0.5) * 1.4)))
      })
      submissions.push({
        id: `vsub-${videoIndex + 1}-${studentIndex + 1}`,
        kind: 'video',
        refId: video.id,
        studentId: student.id,
        section: student.section,
        fileName: `${student.name.split(' ').join('_')}_${video.id}_sketch.png`,
        notes: '',
        submittedAt: new Date(Date.now() - (Math.floor(rand() * 30) + 1) * 864e5).toISOString(),
        status: graded ? 'graded' : 'submitted',
        feedback: graded
          ? pick(['Good control of the line weight.', 'Check your cast shadows.', 'Nice value range in step 2.'])
          : '',
        rubricScores,
      })
    })
  })
  return submissions
}

function makeProgress(students) {
  const progress = []
  students.forEach((student) => {
    PDF_SEED.filter((pdf) => pdf.published).forEach((pdf) => {
      if (rand() > 0.55) return
      const r = rand()
      progress.push({
        id: `pr-${student.id}-${pdf.id}`,
        userId: student.id,
        refId: pdf.id,
        status: r > 0.62 ? 'completed' : 'opened',
        page: Math.min(pdf.pages, Math.max(1, Math.ceil(pdf.pages * (r > 0.62 ? 1 : rand() * 0.6 + 0.1)))),
        lastOpened: new Date(Date.now() - Math.floor(rand() * 25) * 864e5).toISOString(),
        bookmarks:
          rand() > 0.85
            ? [{ page: Math.max(1, Math.ceil(pdf.pages / 2)), note: 'Review this step before the quiz.', at: new Date().toISOString() }]
            : [],
      })
    })
  })
  return progress
}

function makeSurveyResponses(students) {
  return students
    .map((student) => {
      if (rand() > 0.78) return null
      const shift = (rand() - 0.35) * 0.9
      const answers = {}
      SURVEY_ITEMS.forEach((item) => {
        const raw = Math.min(5, Math.max(1, Math.round(3.35 + shift + (rand() - 0.5) * 1.5)))
        answers[item.id] = item.reverse ? 6 - raw : raw
      })
      return {
        id: `sur-${student.id}`,
        userId: student.id,
        section: student.section,
        submittedAt: new Date(Date.now() - Math.floor(rand() * 20) * 864e5).toISOString(),
        answers,
      }
    })
    .filter(Boolean)
}

function makeChecklistAssessments(students) {
  return students
    .map((student) => {
      if (rand() > 0.72) return null
      const responses = {}
      CHECKLIST_INDICATORS.forEach((indicator) => {
        responses[indicator.id] = rand() > 0.24 ? 1 : 0
      })
      return {
        id: `chk-${student.id}`,
        userId: student.id,
        section: student.section,
        responses,
        selfAssessed: rand() > 0.5,
        submittedAt: new Date(Date.now() - Math.floor(rand() * 22) * 864e5).toISOString(),
      }
    })
    .filter(Boolean)
}

function seedDb() {
  const users = makeUsers()
  const students = users.filter((u) => u.role === 'student')
  return {
    version: 1,
    users,
    plates: PLATE_SEED,
    pdfs: PDF_SEED.map((pdf) => ({ ...pdf })),
    videos: VIDEO_SEED,
    submissions: [...makeSubmissions(students), ...makeVideoSubmissions(students)],
    progress: makeProgress(students),
    surveys: makeSurveyResponses(students),
    checklists: makeChecklistAssessments(students),
    announcements: ANNOUNCEMENTS_SEED,
    activity: [],
  }
}

function read() {
  if (typeof window === 'undefined') return seedDb()
  try {
    const raw = window.localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.version === 1) return parsed
    }
  } catch {
    /* fall through to reseed */
  }
  const fresh = seedDb()
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(fresh))
  } catch {
    /* storage may be full; continue in memory */
  }
  return fresh
}

let db = read()
const listeners = new Set()
let queued = false

function persist() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    try {
      window.localStorage.setItem(DB_KEY, JSON.stringify(db))
    } catch {
      /* ignore quota errors */
    }
  })
}

export function getDb() {
  return db
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function commit(next) {
  db = next
  persist()
  for (const listener of listeners) listener(db)
}

export function updateDb(mutator) {
  const next = { ...db }
  mutator(next)
  commit(next)
  return next
}

export function resetDb() {
  const fresh = seedDb()
  commit(fresh)
  return fresh
}

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export function logActivity(entry) {
  updateDb((draft) => {
    draft.activity = [{ id: uid('act'), at: new Date().toISOString(), ...entry }, ...draft.activity].slice(0, 300)
  })
}

/* ------------------------------ session ------------------------------ */

export function readSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function writeSession(userId) {
  try {
    if (userId) window.localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, at: Date.now() }))
    else window.localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export const DEMO_ACCOUNTS = {
  student: { email: 'maria.delacruz@student.vgd.edu.ph', password: 'student123' },
  teacher: { email: 'villanueva@vgd.edu.ph', password: 'teacher123' },
  admin: { email: 'sammymalik@admin.edu.ph', password: 'admin123' },
}

const ROLE_PASSWORDS = { student: 'student123', teacher: 'teacher123', admin: 'admin123' }

export function findUserByEmail(email) {
  return db.users.find((u) => u.email.toLowerCase() === String(email ?? '').toLowerCase().trim())
}

export function findUserById(id) {
  return db.users.find((u) => u.id === id)
}

export function rolePassword(role) {
  return ROLE_PASSWORDS[role] ?? 'student123'
}
