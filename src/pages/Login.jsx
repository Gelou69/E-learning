import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { GraduationCap, Ruler, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { DEMO_ACCOUNTS } from '../lib/localStore'
import { signUpWithPassword, usingSupabase } from '../lib/api'
import { SDGS, SUBJECT } from '../data/constants'

const ROLE_CARDS = [
  {
    role: 'student',
    icon: GraduationCap,
    title: 'Student',
    blurb: 'Study plates, read lessons, submit work and complete the survey.',
  },
  {
    role: 'teacher',
    icon: Ruler,
    title: 'Teacher',
    blurb: 'Publish materials, grade submissions and monitor class performance.',
  },
  {
    role: 'admin',
    icon: ShieldCheck,
    title: 'Admin',
    blurb: 'Run the analytics, export research data and manage users.',
  },
]

const SECTIONS = ['VGD 11 - Section A', 'VGD 11 - Section B', 'VGD 11 - Section C']

export default function Login() {
  const { signIn, signOut, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState('signin')
  const [role, setRole] = useState('student')
  const [email, setEmail] = useState(DEMO_ACCOUNTS.student.email)
  const [password, setPassword] = useState(DEMO_ACCOUNTS.student.password)
  const [fullName, setFullName] = useState('')
  const [section, setSection] = useState(SECTIONS[0])
  const [studentNo, setStudentNo] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={location.state?.from ?? '/dashboard'} replace />

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      if (mode === 'signup') {
        const registration = await signUpWithPassword({ email, password, fullName, role, section, studentNo })
        if (registration.pendingApproval) {
          if (registration.session) await signOut()
          setMode('signin')
          setNotice(
            registration.requiresEmailConfirmation
              ? `Your ${registration.requestedRole} registration was submitted. Confirm your email, then wait for an administrator to approve it.`
              : `Your ${registration.requestedRole} registration was submitted. An administrator must approve it before you can sign in.`,
          )
          return
        }
        if (!registration.session) {
          setMode('signin')
          setNotice('Account created. Check your email to confirm it, then sign in.')
          return
        }

        const login = await signIn(email, password)
        if (!login.ok) {
          setMode('signin')
          setNotice('Account created. Sign in with your new email and password.')
          return
        }
      } else {
        const login = await signIn(email, password)
        if (!login.ok) {
          setError(login.error)
          return
        }
      }
      navigate(location.state?.from ?? '/dashboard', { replace: true })
    } catch (err) {
      setError(err?.message ?? 'Could not create the account.')
    } finally {
      setBusy(false)
    }
  }

  const fillDemo = (selectedRole) => {
    setEmail(DEMO_ACCOUNTS[selectedRole].email)
    setPassword(DEMO_ACCOUNTS[selectedRole].password)
    setError('')
    setNotice('')
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setNotice('')
    if (nextMode === 'signup') {
      setEmail('')
      setPassword('')
    } else {
      setEmail(DEMO_ACCOUNTS.student.email)
      setPassword(DEMO_ACCOUNTS.student.password)
    }
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-teal-800 p-10 text-teal-50 lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
              <Ruler size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">VGD E-Learning Hub</p>
              <p className="text-xs text-teal-200">
                {SUBJECT.grade} {SUBJECT.course}
              </p>
            </div>
          </div>

          <h1 className="mt-12 max-w-md text-3xl leading-tight font-semibold text-white">
            SDG-aligned drafting instruction that measures what it teaches.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-teal-100">
            A digital platform that delivers contextualized technical drawing content while collecting the same
            technical skill, design performance, and usefulness data your study measures.
          </p>

          <ul className="mt-10 grid max-w-md grid-cols-2 gap-3">
            {SDGS.map((sdg) => (
              <li key={sdg.id} className="rounded-lg bg-white/10 p-3">
                <span className="text-xs font-semibold" style={{ color: '#fde68a' }}>
                  {sdg.code}
                </span>
                <p className="mt-0.5 text-xs text-teal-100">{sdg.title}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-teal-200">Installs as an app · Works on school phones with limited data</p>
      </section>

      <section className="flex items-center justify-center bg-slate-50 px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-700 text-white">
                <Ruler size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">VGD E-Learning Hub</p>
                <p className="text-xs text-slate-500">
                  {SUBJECT.grade} {SUBJECT.course}
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-slate-900">{mode === 'signup' ? 'Create an account' : 'Sign in'}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'signup' ? 'Register as a student or teacher.' : 'Use your school account, or pick a demo role below.'}
          </p>

          {mode === 'signin' && (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {ROLE_CARDS.map((card) => (
                <button
                  key={card.role}
                  type="button"
                  onClick={() => fillDemo(card.role)}
                  className="rounded-lg border border-slate-200 bg-white p-2.5 text-left transition hover:border-teal-500 hover:shadow-sm"
                >
                  <card.icon size={16} className="text-teal-700" />
                  <p className="mt-1.5 text-xs font-semibold text-slate-800">{card.title}</p>
                  <p className="mt-0.5 hidden text-[10px] leading-snug text-slate-500 sm:block">{card.blurb}</p>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="card mt-4 space-y-4 p-5">
            {mode === 'signup' && (
              <>
                <div>
                  <span className="label">Account type</span>
                  <div className="grid grid-cols-2 gap-2">
                    {['student', 'teacher'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={role === option}
                        onClick={() => setRole(option)}
                        className={`rounded-md border px-3 py-2 text-sm font-medium capitalize ${
                          role === option
                            ? 'border-teal-700 bg-teal-700 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-teal-500'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="full-name">Full name</label>
                  <input
                    id="full-name"
                    autoComplete="name"
                    required
                    maxLength={120}
                    className="input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                {role === 'student' && (
                  <>
                    <div>
                      <label className="label" htmlFor="section">Class section</label>
                      <select id="section" required className="input" value={section} onChange={(e) => setSection(e.target.value)}>
                        {SECTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="student-number">Student number</label>
                      <input
                        id="student-number"
                        className="input"
                        maxLength={40}
                        value={studentNo}
                        onChange={(e) => setStudentNo(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </>
            )}
            <div>
              <label className="label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete={mode === 'signup' ? 'email' : 'username'}
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 8 : undefined}
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === 'signin' && <p className="mt-1.5 text-[11px] text-slate-500">
                Demo passwords: <code className="rounded bg-slate-100 px-1 py-0.5">student123</code>,{' '}
                <code className="rounded bg-slate-100 px-1 py-0.5">teacher123</code>,{' '}
                <code className="rounded bg-slate-100 px-1 py-0.5">admin123</code>
              </p>}
            </div>

            {mode === 'signup' && role === 'teacher' && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                Teacher accounts need administrator approval before they can access the site.
              </p>
            )}

            {!usingSupabase && mode === 'signup' && (
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-600" role="status">
                Sign-up is unavailable until Supabase is configured in .env.local.
              </p>
            )}

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
                {notice}
              </p>
            )}

            <button type="submit" disabled={busy || (mode === 'signup' && !usingSupabase)} className="btn-primary w-full">
              {busy ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            {mode === 'signup' ? 'Already registered?' : 'Need an account?'}{' '}
            <button type="button" className="font-semibold text-teal-800 hover:underline" onClick={() => changeMode(mode === 'signup' ? 'signin' : 'signup')}>
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-amber-500" />
            {usingSupabase
              ? 'Connected to Supabase. Accounts, submissions, grading and reports all read and write to Postgres.'
              : 'No Supabase credentials detected, so this build uses seeded demo data in the browser. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local to switch to a live database.'}
          </p>
        </div>
      </section>
    </div>
  )
}
