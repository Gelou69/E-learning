import { useEffect, useState } from 'react'
import { Cloud, Database, HardDriveDownload, RotateCcw, Save, UserCog, Wifi, WifiOff } from 'lucide-react'
import { useActions, useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { downloadText } from '../lib/csv'
import { QUARTERS, SUBJECT } from '../data/constants'

export default function Settings() {
  const { user } = useAuth()
  const { resetLearnerData, updateProfile } = useActions()
  const { plates, pdfs, videos, submissions, students, surveys, checklists, announcements, activity, backend, db } =
    useData()
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', section: '', studentNo: '', phone: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name ?? '',
      email: user.email ?? '',
      section: user.section ?? '',
      studentNo: user.studentNo ?? '',
      phone: user.phone ?? '',
    })
  }, [user])

  useEffect(() => {
    if (!confirmReset) return undefined
    const timer = setTimeout(() => setConfirmReset(false), 5000)
    return () => clearTimeout(timer)
  }, [confirmReset])

  const exportJson = () => {
    downloadText('vgd-hub-data-backup.json', JSON.stringify(db, null, 2), 'application/json')
  }

  const saveAccount = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      await updateProfile({
        name: form.name,
        section: form.section,
        studentNo: form.studentNo,
        phone: form.phone,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3500)
    } finally {
      setBusy(false)
    }
  }

  const counts = [
    ['Users', students.length + db.users.length - students.length],
    ['Drawing plates', plates.length],
    ['Lesson PDFs', pdfs.length],
    ['Video activities', videos.length],
    ['Submissions', submissions.length],
    ['Survey responses', surveys.length],
    ['Checklist self-assessments', checklists.length],
    ['Announcements', announcements.length],
    ['Activity log entries', activity.length],
  ]

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Account, data store and offline status.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Database size={16} /> Data store
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {backend === 'supabase'
              ? 'Connected to Supabase Postgres. Row Level Security restricts each role to its own records; uploads go to Supabase Storage.'
              : 'No Supabase credentials found, so this build is using the in-browser store. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local to switch to Postgres.'}
          </p>
          <p
            className={`mt-2 inline-flex items-center gap-1.5 badge ${
              backend === 'supabase' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Cloud size={12} /> {backend === 'supabase' ? 'Supabase (live database)' : 'Local browser storage'}
          </p>

          <dl className="mt-3 space-y-1.5 text-sm">
            {counts.map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-slate-600">{label}</dt>
                <dd className="font-semibold text-slate-800 tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={exportJson} className="btn-secondary">
              <HardDriveDownload size={15} /> Export JSON backup
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true)
                  return
                }
                setBusy(true)
                resetLearnerData()
                  .then(() => {
                    setResetDone(true)
                    setConfirmReset(false)
                    setTimeout(() => setResetDone(false), 4000)
                  })
                  .finally(() => setBusy(false))
              }}
              className={confirmReset ? 'btn-danger' : 'btn-secondary'}
            >
              <RotateCcw size={15} />{' '}
              {confirmReset ? 'Click again to confirm' : backend === 'supabase' ? 'Clear learner data' : 'Reset demo data'}
            </button>
          </div>
          {resetDone && (
            <p className="mt-2 text-sm text-emerald-700">
              {backend === 'supabase'
                ? 'Submissions, progress, surveys and checklists cleared. Re-run supabase/seed.sql to repopulate.'
                : 'Demo data restored to its seeded state.'}
            </p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <UserCog size={16} /> Your account
          </h2>
          <form className="mt-3 space-y-3" onSubmit={saveAccount}>
            <div>
              <label className="label" htmlFor="set-name">
                Full name
              </label>
              <input
                id="set-name"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="set-email">
                Email
              </label>
              <input id="set-email" className="input bg-slate-50" value={form.email} readOnly />
              <p className="mt-1 text-[11px] text-slate-500">Email is managed by Supabase Auth and cannot be edited here.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="set-section">
                  Section
                </label>
                <select
                  id="set-section"
                  className="input"
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  disabled={user?.role !== 'student'}
                >
                  <option value="">—</option>
                  {['A', 'B', 'C'].map((letter) => (
                    <option key={letter} value={`VGD 11 - Section ${letter}`}>
                      VGD 11 - Section {letter}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="set-no">
                  Student no.
                </label>
                <input
                  id="set-no"
                  className="input"
                  value={form.studentNo}
                  onChange={(e) => setForm({ ...form, studentNo: e.target.value })}
                  placeholder="2026-1001"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="set-phone">
                Contact number
              </label>
              <input
                id="set-phone"
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="09XX XXX XXXX"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn-primary" disabled={busy}>
                <Save size={15} /> {busy ? 'Saving…' : 'Save changes'}
              </button>
              {saved && <span className="text-sm text-emerald-700">Profile saved.</span>}
            </div>
          </form>
        </section>

        <section className="card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            {online ? <Wifi size={16} /> : <WifiOff size={16} />} Connectivity
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {online
              ? 'You are online. The app shell is pre-cached, so it reopens instantly even without a connection.'
              : 'You are offline. The installed app keeps working; anything not yet synced stays queued until you reconnect.'}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
            <li>• App shell and assets are pre-cached by the service worker</li>
            <li>• Lesson documents are cached after first open</li>
            <li>• Video embeds need a connection on first play</li>
            <li>• Light pages: no autoplay video, no heavy background images</li>
          </ul>
          <button type="button" className="btn-secondary mt-4" onClick={() => setOnline((v) => !v)}>
            Simulate {online ? 'offline' : 'online'} state
          </button>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-800">Subject configuration</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            {[
              ['Grade', SUBJECT.grade],
              ['Course', SUBJECT.course],
              ['Strand', SUBJECT.strand],
              ['School', SUBJECT.school],
              ['Quarters', QUARTERS.map((q) => q.label).join(', ')],
              ['Role', user?.role ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-slate-600">{label}</dt>
                <dd className="text-right font-medium text-slate-800 capitalize">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}
