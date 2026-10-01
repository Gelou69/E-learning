import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, Clock, ListChecks, PlayCircle, Send, Upload } from 'lucide-react'
import { useActions, useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { QUARTERS, SDGS } from '../data/constants'
import { SdgBadge, SdgFilterChip } from '../components/SdgBadge'
import { Chip, FilterBar } from '../components/FilterChips'
import { EmptyState } from '../components/EmptyState'
import Modal from '../components/Modal'
import SketchCanvas from '../components/SketchCanvas'
import { exportStrokesPng } from '../lib/sketchExport'
import { readFileAsDataUrl } from '../utils/files'
import { formatDateTime } from '../utils/format'
import { ROLE_LABELS } from '../data/roles'

export default function VideoActivities() {
  const { videos, submissions, mySubmissions } = useData()
  const { user } = useAuth()
  const { addSubmission } = useActions()

  const [quarters, setQuarters] = useState([])
  const [sdgs, setSdgs] = useState([])
  const [activeId, setActiveId] = useState(null)

  const filtered = useMemo(
    () =>
      videos.filter((video) => {
        if (quarters.length && !quarters.includes(video.quarter)) return false
        if (sdgs.length && !sdgs.some((id) => video.sdgs.includes(id))) return false
        return true
      }),
    [videos, quarters, sdgs],
  )

  const active = videos.find((v) => v.id === activeId) ?? null
  const activeSubmissions = active ? submissions.filter((s) => s.kind === 'video' && s.refId === active.id) : []
  const activeMine = active ? mySubmissions.filter((s) => s.kind === 'video' && s.refId === active.id) : []

  const toggle = (setter, value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Video Activities</h1>
        <p className="mt-1 text-sm text-slate-500">
          Watch a lesson, complete the step-by-step tasks, then submit a sketch or render for rubric grading.
        </p>
      </header>

      <div className="card p-4">
        <FilterBar
          onClear={
            quarters.length || sdgs.length
              ? () => {
                  setQuarters([])
                  setSdgs([])
                }
              : null
          }
        >
          <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Quarter</span>
          {QUARTERS.map((q) => (
            <Chip key={q.id} active={quarters.includes(q.id)} onClick={() => toggle(setQuarters, q.id)}>
              {q.label.replace('Quarter ', 'Q')}
            </Chip>
          ))}
          <span className="ml-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">SDG</span>
          {SDGS.map((sdg) => (
            <SdgFilterChip key={sdg.id} id={sdg.id} active={sdgs.includes(sdg.id)} onToggle={(id) => toggle(setSdgs, id)} />
          ))}
        </FilterBar>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🎬" title="No activities match those filters" description="Try another quarter or SDG." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((video) => {
            const count = submissions.filter((s) => s.kind === 'video' && s.refId === video.id).length
            const mine = mySubmissions.filter((s) => s.kind === 'video' && s.refId === video.id)
            return (
              <button
                key={video.id}
                type="button"
                onClick={() => setActiveId(video.id)}
                className="card group overflow-hidden text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
              >
                <div className="relative aspect-video bg-slate-900">
                  <img
                    src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover opacity-90"
                    onError={(e) => {
                      e.currentTarget.style.visibility = 'hidden'
                    }}
                  />
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-teal-800 shadow">
                      <PlayCircle size={26} />
                    </span>
                  </span>
                  <span className="absolute right-2 bottom-2 badge bg-slate-900/80 text-white">
                    <Clock size={11} /> {video.duration}
                  </span>
                  {mine.length > 0 && (
                    <span className="absolute top-2 left-2 badge bg-emerald-600 text-white">
                      <CheckCircle2 size={11} /> Submitted
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-teal-800">{video.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{video.summary}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {video.sdgs.map((id) => (
                      <SdgBadge key={id} id={id} />
                    ))}
                    <span className="badge bg-slate-100 text-slate-600">{video.level}</span>
                    <span className="badge bg-slate-100 text-slate-600">{video.tasks.length} tasks</span>
                    <span className="badge bg-slate-100 text-slate-600">{count} submissions</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <Modal
        open={!!active}
        onClose={() => setActiveId(null)}
        title={active?.title ?? ''}
        subtitle={active ? `${active.topic} · ${active.level} · ${active.duration}` : ''}
        size="xl"
        footer={
          <button type="button" className="btn-primary" onClick={() => setActiveId(null)}>
            Close
          </button>
        }
      >
        {active && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {active.sdgs.map((id) => (
                <SdgBadge key={id} id={id} size="lg" showTitle />
              ))}
              {activeMine.length > 0 && (
                <span className="badge bg-emerald-100 text-emerald-700">You submitted {activeMine.length} time(s)</span>
              )}
            </div>

            <div className="aspect-video overflow-hidden rounded-xl bg-slate-900">
              <iframe
                key={active.id}
                src={`https://www.youtube-nocookie.com/embed/${active.videoId}?rel=0&modestbranding=1`}
                title={active.title}
                allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
                loading="lazy"
              />
            </div>

            <p className="text-sm leading-relaxed text-slate-600">{active.summary}</p>

            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ListChecks size={16} /> Step-by-step tasks
              </h3>
              <ol className="mt-2 space-y-2">
                {active.tasks.map((task, index) => (
                  <li key={task.id} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-700 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{task.title}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{task.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {user?.role === 'student' ? (
              <SubmitWork
                video={active}
                onSubmit={(payload) => addSubmission({ ...payload, kind: 'video', refId: active.id })}
                mySubmissions={activeMine}
              />
            ) : (
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Class submissions ({activeSubmissions.length})</h3>
                <ul className="mt-2 divide-y divide-slate-100">
                  {activeSubmissions.slice(0, 8).map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="font-medium text-slate-800">{s.student?.name}</span>
                      <span className="text-xs text-slate-500">{s.section}</span>
                      <span className="ml-auto text-xs text-slate-500">{formatDateTime(s.submittedAt)}</span>
                      <Link to="/review" className="btn-secondary px-2 py-1 text-xs">
                        Grade
                      </Link>
                    </li>
                  ))}
                  {activeSubmissions.length === 0 && <li className="py-3 text-sm text-slate-500">No submissions yet.</li>}
                </ul>
              </div>
            )}

            <p className="text-[11px] text-slate-500">Signed in as {ROLE_LABELS[user?.role]}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

function SubmitWork({ video, onSubmit, mySubmissions }) {
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [strokes, setStrokes] = useState([])
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleFile = async (event) => {
    const picked = event.target.files?.[0]
    if (!picked) return
    if (picked.size > 6 * 1024 * 1024) {
      setError('Keep uploads under 6 MB so they save on your phone.')
      return
    }
    setError('')
    setFile({ name: picked.name, dataUrl: await readFileAsDataUrl(picked) })
  }

  const submit = async () => {
    const dataUrl = file?.dataUrl ?? (strokes.length ? exportStrokesPng(strokes) : null)
    if (!dataUrl) {
      setError('Upload a sketch or render, or draw one on the canvas below.')
      return
    }
    const fileName = file?.name ?? `${video.id}-canvas-sketch.png`
    setBusy(true)
    setError('')
    try {
      await onSubmit({ fileName, fileDataUrl: dataUrl, notes })
      setNotes('')
      setFile(null)
      setStrokes([])
      setDone(true)
      setTimeout(() => setDone(false), 4000)
    } catch (err) {
      setError(err?.message ?? 'Could not upload your work. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-teal-200 bg-teal-50/40 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Upload size={16} /> Submit your sketch or render
      </h3>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="label" htmlFor="video-file">
            Upload file
          </label>
          <input id="video-file" type="file" accept="image/*" className="input" onChange={handleFile} />
          <p className="mt-1.5 text-[11px] text-slate-500">PNG, JPG or WebP up to 6 MB. Name: SURNAME_ActivityID.png</p>
          {file && (
            <img src={file.dataUrl} alt="Your upload preview" className="mt-3 aspect-video w-full rounded-lg border border-slate-200 bg-slate-100 object-contain" />
          )}

          <label className="label mt-4" htmlFor="video-notes">
            Notes for your teacher (optional)
          </label>
          <textarea
            id="video-notes"
            className="input min-h-20"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you find difficult in this activity?"
          />
        </div>

        <div>
          <p className="label">Or practise in the sketch canvas</p>
          <SketchCanvas initialStrokes={strokes} onChange={setStrokes} label="Video activity sketch" height={260} />
          <p className="mt-1.5 text-[11px] text-slate-500">Canvas strokes are exported as PNG when you submit.</p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={submit} className="btn-primary" disabled={busy}>
              <Send size={15} /> {busy ? 'Uploading…' : 'Submit for grading'}
        </button>
        {done && <span className="text-sm text-emerald-700">Submitted. Your teacher will return feedback shortly.</span>}
        <Link to="/submissions" className="btn-ghost text-xs">
          <ChevronLeft size={13} /> View my submissions
        </Link>
      </div>

      {mySubmissions.length > 0 && (
        <div className="border-t border-teal-200 pt-3">
          <p className="text-xs font-semibold text-slate-700">Your previous submissions</p>
          <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
            {mySubmissions.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <span className="font-medium">{s.fileName}</span>
                <span className="text-slate-400">{formatDateTime(s.submittedAt)}</span>
                <span
                  className={`badge ml-auto ${s.status === 'graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}
                >
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
