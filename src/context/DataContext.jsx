import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../lib/api'
import { usingSupabase } from '../lib/api'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

const EMPTY = {
  users: [],
  plates: [],
  pdfs: [],
  videos: [],
  submissions: [],
  progress: [],
  surveys: [],
  checklists: [],
  announcements: [],
  activity: [],
}

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const next = await api.loadAll({ userId: user?.id })
      setData(next)
    } catch (err) {
      setError(err?.message ?? 'Could not load data from the database.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // Local mode writes straight to localStorage; watch for those changes.
  useEffect(() => {
    if (usingSupabase) return undefined
    let cancelled = false
    const onFocus = () => {
      if (!cancelled) load()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [load])

  const refresh = useCallback(() => load(), [load])

  const value = useMemo(() => {
    const { users, plates, pdfs, videos, submissions, progress, surveys, checklists, announcements, activity } = data

    const students = users.filter((u) => u.role === 'student')
    const teachers = users.filter((u) => u.role === 'teacher')

    const userById = new Map(users.map((u) => [u.id, u]))
    const plateById = new Map(plates.map((p) => [p.id, p]))
    const pdfById = new Map(pdfs.map((p) => [p.id, p]))
    const videoById = new Map(videos.map((v) => [v.id, v]))

    const enrichedSubmissions = submissions.map((submission) => ({
      ...submission,
      student: userById.get(submission.studentId) ?? null,
      item: submission.kind === 'video' ? videoById.get(submission.refId) : plateById.get(submission.refId),
    }))

    const mySubmissions = user
      ? enrichedSubmissions
          .filter((s) => s.studentId === user.id)
          .toSorted((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      : []

    return {
      db: { ...data, students, teachers },
      data,
      loading,
      error,
      users,
      students,
      teachers,
      plates,
      pdfs,
      videos,
      submissions: enrichedSubmissions,
      pendingSubmissions: enrichedSubmissions.filter((s) => s.status !== 'graded'),
      mySubmissions,
      progress,
      myProgress: user ? progress.filter((p) => p.userId === user.id) : [],
      surveys,
      mySurvey: user ? (surveys.find((s) => s.userId === user.id) ?? null) : null,
      checklists,
      myChecklist: user ? (checklists.find((c) => c.userId === user.id) ?? null) : null,
      announcements,
      activity,
      userById,
      plateById,
      pdfById,
      videoById,
      refresh,
      backend: usingSupabase ? 'supabase' : 'local',
    }
  }, [data, loading, error, user, refresh])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}

/* ------------------------------ mutations ------------------------------ */

/**
 * Every mutation writes to Postgres (or localStorage), then triggers a
 * reload so all derived views stay consistent.
 */
export function useActions() {
  const { user } = useAuth()
  const { refresh } = useData()

  return useMemo(() => {
    const requireUser = () => {
      if (!user) throw new Error('You must be signed in to do that.')
      return user
    }

    const wrap =
      (fn) =>
      async (...args) => {
        const result = await fn(...args)
        await refresh()
        return result
      }

    return {
      /* ---------- profile ---------- */
      updateProfile: wrap((patch) => api.updateProfile(requireUser().id, patch)),

      /* ---------- submissions ---------- */
      addSubmission: wrap((payload) =>
        api.createSubmission({ ...payload, section: requireUser().section }, requireUser().id),
      ),
      gradeSubmission: wrap((id, patch) => api.gradeSubmission(id, patch, requireUser().id)),
      deleteSubmission: wrap((id) => api.deleteSubmission(id)),

      /* ---------- lesson progress ---------- */
      markPdf: wrap((refId, status, page) => api.saveProgress(requireUser().id, refId, status, page)),
      toggleBookmark: wrap((refId, page, note) => api.toggleBookmark(requireUser().id, refId, page, note)),

      /* ---------- survey + checklist ---------- */
      saveSurvey: wrap((answers) => api.saveSurvey(requireUser().id, requireUser().section, answers)),
      saveChecklist: wrap((responses, selfAssessed) =>
        api.saveChecklist(requireUser().id, requireUser().section, responses, selfAssessed),
      ),

      /* ---------- teacher content ---------- */
      addPdf: wrap((payload) => api.createLesson(payload, requireUser().id)),
      togglePdfPublished: wrap((id, published) => api.setLessonPublished(id, published)),
      deletePdf: wrap((id) => api.deleteLesson(id)),
      deletePdfFile: wrap((id) => api.deleteLessonFile(id)),

      addPlate: wrap((payload) => api.createPlate(payload, requireUser().id)),
      deletePlate: wrap((id) => api.deletePlate(id)),

      addVideo: wrap((payload) => api.createVideo(payload)),

      /* ---------- announcements ---------- */
      addAnnouncement: wrap((payload) => api.createAnnouncement(payload, requireUser().id, requireUser().name)),
      deleteAnnouncement: wrap((id) => api.deleteAnnouncement(id)),

      /* ---------- admin ---------- */
      setUserActive: wrap((userId, isActive) => api.setUserActive(userId, isActive)),
      approveUser: wrap((userId, role) => api.approveUser(userId, role)),
      createUser: wrap((payload) => api.createUserAccount(payload)),
      resetLearnerData: wrap(() => api.resetLearnerData()),
    }
  }, [user, refresh])
}

export function useResetRef() {
  const { refresh } = useData()
  const [nonce, setNonce] = useState(0)
  return { nonce, refresh, reset: () => setNonce((n) => n + 1) }
}

export { api as dataApi }
