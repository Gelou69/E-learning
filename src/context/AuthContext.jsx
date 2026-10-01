import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  getProfile,
  getSessionUserId,
  onAuthChange,
  signInWithPassword,
  signOut as apiSignOut,
  touchLastSeen,
  usingSupabase,
} from '../lib/api'
import { readSession, writeSession } from '../lib/localStore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // loading | authenticated | anonymous
  const [error, setError] = useState(null)

  const loadUser = useCallback(async () => {
    const userId = await getSessionUserId()
    if (!userId) {
      setUser(null)
      setStatus('anonymous')
      return null
    }
    const profile = await getProfile(userId)
    if (!profile || profile.isActive === false) {
      setUser(null)
      setStatus('anonymous')
      if (profile) {
        setError(
          profile.requestedRole
            ? 'Your account is awaiting administrator approval.'
            : 'Your account has been deactivated. Contact your admin.',
        )
      }
      return null
    }
    setUser(profile)
    setStatus('authenticated')
    touchLastSeen(userId).catch(() => {})
    return profile
  }, [])

  useEffect(() => {
    loadUser().catch(() => setStatus('anonymous'))
  }, [loadUser])

  // Keep the profile in sync when another tab or a realtime event signs out.
  useEffect(() => {
    if (!usingSupabase) return undefined
    return onAuthChange((session) => {
      if (!session) {
        writeSession(null)
        setUser(null)
        setStatus('anonymous')
        return
      }
      loadUser().catch(() => {})
    })
  }, [loadUser])

  const signIn = useCallback(
    async (email, password) => {
      setError(null)
      const result = await signInWithPassword(email, password)
      if (result.error) {
        setError(result.error)
        return { ok: false, error: result.error }
      }
      if (!usingSupabase && result.user) writeSession(result.user.id)

      // Supabase returns only a user id here, so the profile row must be loaded
      // before the app can render a role-aware session.
      setStatus('loading')
      const profile = await loadUser()
      if (!profile) {
        const userId = await getSessionUserId()
        const inactiveProfile = userId ? await getProfile(userId) : null
        const message = inactiveProfile?.requestedRole
          ? 'Your account is awaiting administrator approval.'
          : 'Your account could not be loaded. It may be inactive — contact your admin.'
        setError(message)
        await apiSignOut().catch(() => {})
        return { ok: false, error: message }
      }
      return { ok: true, user: profile }
    },
    [loadUser],
  )

  const signOut = useCallback(async () => {
    await apiSignOut()
    writeSession(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      loading: status === 'loading',
      signIn,
      signOut,
      isStudent: user?.role === 'student',
      isTeacher: user?.role === 'teacher',
      isAdmin: user?.role === 'admin',
      isStaff: user?.role === 'teacher' || user?.role === 'admin',
      backend: usingSupabase ? 'supabase' : 'local',
      refreshUser: loadUser,
    }),
    [user, status, error, signIn, signOut, loadUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export { readSession }
