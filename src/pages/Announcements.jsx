import { useMemo, useState } from 'react'
import { CheckCircle2, Download, Lock, MessageSquare, Plus, Trash2, Users } from 'lucide-react'
import { useActions, useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Avatar } from '../components/Avatar'
import { EmptyState } from '../components/EmptyState'
import { formatDateTime, timeAgo } from '../utils/format'
import { downloadCsv, downloadSpreadsheet } from '../lib/csv'

export default function Announcements() {
  const { announcements, students } = useData()
  const { user, isTeacher, isAdmin } = useAuth()
  const { addAnnouncement, deleteAnnouncement } = useActions()
  const [form, setForm] = useState({ title: '', body: '', audience: 'all', pinned: false })
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const visible = useMemo(() => {
    const list = user?.role === 'student' ? announcements.filter((a) => a.audience === 'all' || a.audience === 'students') : announcements
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [announcements, user])

  const canPost = isTeacher || isAdmin

  const submit = async (event) => {
    event.preventDefault()
    if (!form.title.trim() || !form.body.trim()) {
      setError('Both a title and a message are required.')
      return
    }
    setBusy(true)
    try {
      await addAnnouncement(form)
      setForm({ title: '', body: '', audience: 'all', pinned: false })
      setError('')
      setOpen(false)
    } catch (err) {
      setError(err?.message ?? 'Could not post the announcement.')
    } finally {
      setBusy(false)
    }
  }

  const exportRoster = () => {
    downloadCsv('vgd-class-roster', [
      ['Student ID', 'Name', 'Email', 'Section', 'Gender', 'Student no.'],
      ...students.map((s) => [s.id, s.name, s.email, s.section, s.gender, s.studentNo]),
    ])
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Announcements</h1>
          <p className="mt-1 text-sm text-slate-500">
            {canPost ? 'Post class notices and pinned reminders' : 'Class notices from your teachers'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPost && (
            <button type="button" onClick={() => setOpen((v) => !v)} className="btn-primary">
              <Plus size={15} /> New announcement
            </button>
          )}
          {isTeacher && (
            <button type="button" onClick={exportRoster} className="btn-secondary">
              <Download size={15} /> Export roster
            </button>
          )}
        </div>
      </header>

      {open && canPost && (
        <form onSubmit={submit} className="card space-y-3 p-4">
          <div>
            <label className="label" htmlFor="an-title">
              Title
            </label>
            <input
              id="an-title"
              className="input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Q3 site plan plate is now open"
            />
          </div>
          <div>
            <label className="label" htmlFor="an-body">
              Message
            </label>
            <textarea
              id="an-body"
              className="input min-h-24"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="audience"
                checked={form.audience === 'all'}
                onChange={() => setForm((f) => ({ ...f, audience: 'all' }))}
              />
              Everyone
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="audience"
                checked={form.audience === 'students'}
                onChange={() => setForm((f) => ({ ...f, audience: 'students' }))}
              />
              Students only
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-teal-700"
              />
              Pin to dashboard
            </label>
          </div>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Posting…' : 'Post announcement'}
            </button>
          </div>
        </form>
      )}

      {visible.length === 0 ? (
        <EmptyState icon="📣" title="No announcements yet" description="Nothing to show right now." />
      ) : (
        <ul className="space-y-3">
          {visible.map((a) => (
            <li
              key={a.id}
              className={`card p-4 ${a.pinned ? 'border-amber-300 bg-amber-50/40' : ''}`}
            >
              <div className="flex flex-wrap items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                  {a.audience === 'students' ? <Users size={16} /> : <MessageSquare size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                    {a.pinned && (
                      <span className="badge bg-amber-500 text-white">
                        <Lock size={10} /> Pinned
                      </span>
                    )}
                    {a.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-slate-600">{a.body}</p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    {a.author} · {formatDateTime(a.createdAt)} · {timeAgo(a.createdAt)} ·{' '}
                    {a.audience === 'students' ? 'Students only' : 'Everyone'}
                  </p>
                </div>
                {canPost && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`Delete "${a.title}"?`)) await deleteAnnouncement(a.id)
                    }}
                    className="btn-ghost px-2 py-1 text-rose-600"
                    aria-label="Delete announcement"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isTeacher && (
        <section className="card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CheckCircle2 size={16} /> Class roster
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {[...new Set(students.map((s) => s.section))].map((section) => (
              <div key={section} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-xs font-semibold text-slate-700">{section}</p>
                <p className="text-[11px] text-slate-500">{students.filter((s) => s.section === section).length} students</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadSpreadsheet('vgd-class-roster', [
                  {
                    name: 'Roster',
                    rows: [
                      ['ID', 'Name', 'Email', 'Section', 'Gender', 'Student no.'],
                      ...students.map((s) => [s.id, s.name, s.email, s.section, s.gender, s.studentNo]),
                    ],
                  },
                ])
              }
              className="btn-secondary py-1.5 text-xs"
            >
              <Download size={14} /> Excel roster
            </button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Avatar name={user?.name} color={user?.avatarColor} size={28} />
        <p className="text-xs text-slate-500">Signed in as {user?.name}</p>
      </div>
    </div>
  )
}
