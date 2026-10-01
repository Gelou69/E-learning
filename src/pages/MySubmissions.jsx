import { useMemo, useState } from 'react'
import { CheckCircle2, Filter, Send, Trash2, Upload } from 'lucide-react'
import { useActions, useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { SdgBadge } from '../components/SdgBadge'
import { EmptyState } from '../components/EmptyState'
import ZoomViewer from '../components/ZoomViewer'
import SketchCanvas from '../components/SketchCanvas'
import { exportStrokesPng } from '../lib/sketchExport'
import { readFileAsDataUrl } from '../utils/files'
import { formatDateTime } from '../utils/format'
import { RUBRIC_CRITERIA } from '../data/seed'
import { mean } from '../lib/stats'

const STATUS_STYLES = {
  submitted: 'bg-sky-100 text-sky-700',
  graded: 'bg-emerald-100 text-emerald-700',
  returned: 'bg-rose-100 text-rose-700',
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'plate', label: 'Drawing plates' },
  { id: 'video', label: 'Video activities' },
  { id: 'submitted', label: 'Awaiting feedback' },
  { id: 'graded', label: 'Graded' },
]

export default function MySubmissions() {
  const { mySubmissions } = useData()
  const { user } = useAuth()
  const { deleteSubmission } = useActions()
  const [filter, setFilter] = useState('all')
  const [openId, setOpenId] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const visible = useMemo(() => {
    if (filter === 'all') return mySubmissions
    if (filter === 'plate' || filter === 'video') return mySubmissions.filter((s) => s.kind === filter)
    return mySubmissions.filter((s) => s.status === filter)
  }, [mySubmissions, filter])

  const active = mySubmissions.find((s) => s.id === openId) ?? null
  const stats = useMemo(
    () => ({
      total: mySubmissions.length,
      awaiting: mySubmissions.filter((s) => s.status !== 'graded').length,
      graded: mySubmissions.filter((s) => s.status === 'graded').length,
    }),
    [mySubmissions],
  )

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">My Submissions</h1>
          <p className="mt-1 text-sm text-slate-500">
            {stats.total} submitted · {stats.awaiting} awaiting feedback · {stats.graded} graded
          </p>
        </div>
        <button type="button" onClick={() => setUploadOpen(true)} className="btn-primary">
          <Upload size={15} /> New submission
        </button>
      </header>

      <div className="card flex flex-wrap items-center gap-2 p-3">
        <Filter size={15} className="text-slate-400" />
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            className={`chip ${
              filter === option.id
                ? 'border-teal-700 bg-teal-700 text-white'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            {option.label}
            {option.id === 'all' && <span className="opacity-75">({mySubmissions.length})</span>}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="📤"
          title="No submissions here yet"
          description="Upload a drawing plate or a sketch from a video activity to receive teacher feedback and a rubric score."
          action={
            <button type="button" onClick={() => setUploadOpen(true)} className="btn-primary">
              Upload work
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              onOpen={() => setOpenId(submission.id)}
              onDelete={async () => {
                if (window.confirm('Delete this submission? This cannot be undone.')) await deleteSubmission(submission.id)
              }}
            />
          ))}
        </div>
      )}

      {active && <SubmissionDetail submission={active} onClose={() => setOpenId(null)} />}

      <QuickUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      {user && <p className="sr-only">Signed in as {user.name}</p>}
    </div>
  )
}

function SubmissionCard({ submission, onOpen, onDelete }) {
  const scores = RUBRIC_CRITERIA.map((c) => submission.rubricScores?.[c.id]).filter((v) => typeof v === 'number')
  const average = scores.length ? mean(scores) : null

  return (
    <article className="card flex gap-3 p-4">
      {submission.fileDataUrl ? (
        <img
          src={submission.fileDataUrl}
          alt={submission.fileName}
          className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover"
        />
      ) : (
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
          <Send size={20} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{submission.item?.title ?? submission.refId}</p>
        <p className="truncate text-xs text-slate-500">{submission.fileName}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(submission.submittedAt)}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={`badge ${STATUS_STYLES[submission.status]}`}>{submission.status}</span>
          {submission.item?.sdgs?.map((id) => (
            <SdgBadge key={id} id={id} />
          ))}
          {average !== null && (
            <span className="badge bg-slate-800 text-white">
              <CheckCircle2 size={11} /> {average.toFixed(2)} / 5
            </span>
          )}
        </div>

        {submission.feedback && (
          <p className="mt-2 line-clamp-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900">
            <span className="font-semibold">Teacher:</span> {submission.feedback}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={onOpen} className="btn-secondary px-2.5 py-1 text-xs">
            View details
          </button>
          <button type="button" onClick={onDelete} className="btn-ghost px-2 py-1 text-rose-600" aria-label="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </article>
  )
}

function SubmissionDetail({ submission, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="pd-fade-in relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-slate-900">{submission.item?.title ?? submission.refId}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {submission.fileName} · {formatDateTime(submission.submittedAt)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary py-1.5 text-xs">
            Close
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {submission.fileDataUrl ? (
            <ZoomViewer src={submission.fileDataUrl} alt={submission.fileName} background="#f8fafc" />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              This seeded submission has no stored image. Upload your own work to see a live preview here.
            </div>
          )}

          {submission.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-700">My notes</p>
              <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{submission.notes}</p>
            </div>
          )}

          {submission.feedback && (
            <div>
              <p className="text-xs font-semibold text-slate-700">Teacher feedback</p>
              <p className="mt-1 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{submission.feedback}</p>
            </div>
          )}

          {submission.rubricScores && Object.keys(submission.rubricScores).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-700">Rubric breakdown</p>
              <ul className="mt-2 space-y-2">
                {RUBRIC_CRITERIA.map((criterion) => (
                  <li key={criterion.id} className="rounded-lg border border-slate-200 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-slate-700">{criterion.label}</p>
                      <span className="text-sm font-semibold text-slate-800">{submission.rubricScores[criterion.id]} / 5</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {criterion.descriptors[submission.rubricScores[criterion.id]]} · Weight {criterion.weight}%
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickUploadModal({ open, onClose }) {
  const { plates, videos } = useData()
  const { addSubmission } = useActions()
  const [kind, setKind] = useState('plate')
  const [refId, setRefId] = useState(plates[0]?.id ?? '')
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [strokes, setStrokes] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const items = kind === 'plate' ? plates : videos

  const submit = async () => {
    const dataUrl = file?.dataUrl ?? (strokes.length ? exportStrokesPng(strokes) : null)
    if (!dataUrl) {
      setError('Upload a file or draw on the sketch canvas first.')
      return
    }
    if (!refId) {
      setError('Choose which activity this work belongs to.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await addSubmission({
        kind,
        refId,
        fileName: file?.name ?? `${refId}-canvas-sketch.png`,
        fileDataUrl: dataUrl,
        notes,
      })
      setFile(null)
      setNotes('')
      setStrokes([])
      onClose()
    } catch (err) {
      setError(err?.message ?? 'Could not upload the submission. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="pd-fade-in relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-slate-900">New submission</h2>
        <p className="mt-0.5 text-sm text-slate-500">Attach your drawing to a plate or a video activity.</p>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            {[
              { id: 'plate', label: 'Drawing plate' },
              { id: 'video', label: 'Video activity' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setKind(option.id)
                  setRefId(option.id === 'plate' ? plates[0]?.id : videos[0]?.id)
                }}
                className={`btn flex-1 py-1.5 text-xs ${
                  kind === option.id ? 'bg-teal-700 text-white' : 'border border-slate-300 bg-white text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div>
            <label className="label" htmlFor="quick-ref">
              Activity
            </label>
            <select id="quick-ref" className="input" value={refId} onChange={(e) => setRefId(e.target.value)}>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="quick-file">
              Upload image (optional if drawing below)
            </label>
            <input
              id="quick-file"
              type="file"
              accept="image/*"
              className="input"
              onChange={async (e) => {
                const picked = e.target.files?.[0]
                if (picked) setFile({ name: picked.name, dataUrl: await readFileAsDataUrl(picked) })
              }}
            />
            {file && (
              <img src={file.dataUrl} alt="Preview" className="mt-2 aspect-video w-full rounded-lg border border-slate-200 bg-slate-100 object-contain" />
            )}
          </div>

          <div>
            <p className="label">Or sketch here</p>
            <SketchCanvas initialStrokes={strokes} onChange={setStrokes} label="Submission sketch" height={220} />
          </div>

          <div>
            <label className="label" htmlFor="quick-notes">
              Notes
            </label>
            <textarea
              id="quick-notes"
              className="input min-h-16"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything your teacher should know about this work?"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy}>
            <Send size={15} /> {busy ? 'Uploading…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
