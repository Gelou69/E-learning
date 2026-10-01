import { Loader2, TriangleAlert } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { ROLE_LABELS } from '../data/roles'

function Centered({ children }) {
  return <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">{children}</div>
}

export default function RoleGuard({ allow, children }) {
  const { user, status } = useAuth()
  const { loading, error, refresh } = useData()

  if (status === 'loading') {
    return (
      <Centered>
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 size={22} className="animate-spin text-teal-700" />
          <p className="text-sm">Checking your session…</p>
        </div>
      </Centered>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allow && !allow.includes(user.role)) return <Navigate to="/dashboard" replace />

  if (loading) {
    return (
      <Centered>
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 size={22} className="animate-spin text-teal-700" />
          <p className="text-sm">Loading your data…</p>
        </div>
      </Centered>
    )
  }

  if (error) {
    return (
      <Centered>
        <div className="card max-w-md p-5 text-left">
          <p className="flex items-center gap-2 text-sm font-semibold text-rose-700">
            <TriangleAlert size={16} /> Could not load data
          </p>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <p className="mt-2 text-xs text-slate-500">
            Check that the Supabase schema has been run and that your anon key has the right policies.
          </p>
          <button type="button" onClick={refresh} className="btn-primary mt-4">
            Try again
          </button>
        </div>
      </Centered>
    )
  }

  return children
}

export function RoleGate({ allow, children, fallback = null }) {
  const { user } = useAuth()
  if (!user || !allow.includes(user.role)) return fallback
  return children
}

export { ROLE_LABELS }
