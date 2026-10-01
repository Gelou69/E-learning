import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  Home,
  Images,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  NotebookPen,
  PlaySquare,
  Ruler,
  Send,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { Avatar } from '../components/Avatar'
import { SUBJECT } from '../data/constants'
import { ROLE_LABELS } from '../data/roles'

const NAV_BY_ROLE = {
  student: [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/lessons', label: 'Lessons', icon: BookOpen },
    { to: '/drawings', label: 'VCD Drawings', icon: Images },
    { to: '/materials', label: 'PDF Materials', icon: Ruler },
    { to: '/videos', label: 'Video Activities', icon: PlaySquare },
    { to: '/practice', label: 'Sketch Pad', icon: LayoutGrid },
    { to: '/submissions', label: 'My Submissions', icon: Send },
    { to: '/assessments', label: 'Assessments', icon: NotebookPen },
    { to: '/survey', label: 'Survey', icon: MessageSquare },
    { to: '/announcements', label: 'Announcements', icon: GraduationCap },
  ],
  teacher: [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/drawings', label: 'VCD Drawings', icon: Images },
    { to: '/materials', label: 'PDF Materials', icon: Ruler },
    { to: '/videos', label: 'Video Activities', icon: PlaySquare },
    { to: '/gradebook', label: 'Gradebook', icon: NotebookPen },
    { to: '/review', label: 'Review Queue', icon: Send },
    { to: '/announcements', label: 'Announcements', icon: GraduationCap },
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/research', label: 'Research Data', icon: BarChart3 },
    { to: '/drawings', label: 'VCD Drawings', icon: Images },
    { to: '/materials', label: 'PDF Materials', icon: Ruler },
    { to: '/users', label: 'Users', icon: Users },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
}

export default function AppLayout() {
  const { user, signOut, isStudent, isTeacher } = useAuth()
  const { pendingSubmissions, announcements } = useData()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const [lastPath, setLastPath] = useState(location.pathname)

  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    if (mobileOpen) setMobileOpen(false)
  }

  const nav = NAV_BY_ROLE[user?.role] ?? []
  const visibleAnnouncements = announcements.filter((a) => a.audience === 'all' || (isStudent && a.audience === 'students'))
  const reviewCount = isTeacher ? pendingSubmissions.length : 0

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3">
      <div className="mb-3 flex items-center gap-2 px-2 py-1">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-700 text-white">
          <Ruler size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">VGD E-Learning Hub</p>
          <p className="truncate text-[11px] text-slate-500">SDG-aligned · {SUBJECT.grade}</p>
        </div>
      </div>

      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`
          }
        >
          <item.icon size={17} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.to === '/review' && reviewCount > 0 && (
            <span className="rounded-full bg-rose-600 px-1.5 text-[10px] font-semibold text-white">{reviewCount}</span>
          )}
        </NavLink>
      ))}

      {isStudent && visibleAnnouncements.filter((a) => a.pinned).length > 0 && (
        <div className="mt-4 rounded-lg bg-amber-50 p-2.5">
          <p className="mb-1 text-[11px] font-semibold tracking-wide text-amber-800 uppercase">Pinned</p>
          {visibleAnnouncements
            .filter((a) => a.pinned)
            .slice(0, 2)
            .map((a) => (
              <p key={a.id} className="line-clamp-2 text-xs text-amber-900">
                {a.title}
              </p>
            ))}
        </div>
      )}

      <div className="mt-auto rounded-lg border border-slate-200 p-2.5">
        <div className="flex items-center gap-2">
          <Avatar name={user?.name} color={user?.avatarColor} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800">{user?.name}</p>
            <p className="truncate text-[11px] text-slate-500">{ROLE_LABELS[user?.role]}</p>
          </div>
        </div>
        <button type="button" onClick={signOut} className="btn-secondary mt-2 w-full py-1.5 text-xs">
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="pd-fade-in absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="btn-ghost absolute top-3 right-3 z-10 p-2"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="btn-ghost p-2" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-white">
            <Ruler size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">VGD E-Learning Hub</p>
            <p className="truncate text-[11px] text-slate-500">
              {SUBJECT.grade} · {user?.section ?? SUBJECT.course}
            </p>
          </div>
          <Avatar name={user?.name} color={user?.avatarColor} size={32} />
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-7">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>

        <footer className="no-print border-t border-slate-200 bg-white px-4 py-4 text-center text-[11px] text-slate-500 sm:px-6">
          <p>
            VGD E-Learning Hub · {SUBJECT.grade} {SUBJECT.course} · {SUBJECT.school}
          </p>
          <p className="mt-0.5">Aligned to SDGs 4, 9, 11 and 13 · Works offline once loaded</p>
        </footer>
      </div>

      {user?.role === 'student' && (
        <div className="pointer-events-none fixed right-0 bottom-0 z-20 hidden p-4 xl:block">
          <span className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 shadow-lg">
            <Shield size={12} className="text-teal-700" /> Research data collection active
          </span>
        </div>
      )}
    </div>
  )
}
