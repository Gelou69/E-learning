import { useMemo, useState } from 'react'
import { CheckCircle2, Filter, Save } from 'lucide-react'
import { CHECKLIST_INDICATORS, RUBRIC_CRITERIA } from '../data/seed'
import { useActions, useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Avatar } from '../components/Avatar'
import { EmptyState } from '../components/EmptyState'
import Modal from '../components/Modal'
import ZoomViewer from '../components/ZoomViewer'
import { formatDateTime, timeAgo } from '../utils/format'
import { mean } from '../lib/stats'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'Awaiting grading' },
  { id: 'graded', label: 'Graded' },
]

export default function ReviewQueue() {
  const { submissions } = useData()
  const [filter, setFilter] = useState('submitted')
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState(null)

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return submissions
      .filter((s) => {
        if (filter !== 'all' && s.status !== filter) return false
        if (!term) return true
        return `${s.student?.name ?? ''} ${s.item?.title ?? ''} ${s.fileName}`.toLowerCase().includes(term)
      })
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  }, [submissions, filter, query])

  const active = submissions.find((s) => s.id === activeId) ?? null

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Review Queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          {submissions.filter((s) => s.status !== 'graded').length} submissions waiting for feedback
        </p>
      </header>

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
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
              <span className="opacity-75">
                ({submissions.filter((s) => (option.id === 'all' ? true : s.status === option.id)).length})
              </span>
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="Search by student, activity or file name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search submissions"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="✅" title="Nothing in this queue" description="Try another filter or clear the search." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((submission) => (
            <article key={submission.id} className="card p-4">
              <div className="flex items-center gap-3">
                <Avatar name={submission.student?.name} color={submission.student?.avatarColor} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{submission.student?.name}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {submission.section} · {timeAgo(submission.submittedAt)}
                  </p>
                </div>
                <span
                  className={`badge ${
                    submission.status === 'graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  {submission.status}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm font-medium text-slate-800">{submission.item?.title}</p>
              <p className="truncate text-xs text-slate-500">{submission.fileName}</p>

              {submission.item?.sdgs && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {submission.item.sdgs.map((id) => (
                    <span
                      key={id}
                      className="badge bg-slate-100 text-slate-600"
                    >
                      SDG {id}
                    </span>
                  ))}
                </div>
              )}

              {submission.notes && (
                <p className="mt-2 line-clamp-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{submission.notes}</p>
              )}

              <button type="button" onClick={() => setActiveId(submission.id)} className="btn-primary mt-3 w-full py-1.5 text-xs">
                Grade this work
              </button>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!active}
        onClose={() => setActiveId(null)}
        title={active?.item?.title ?? 'Submission'}
        subtitle={active ? `${active.student?.name} · ${active.section} · submitted ${formatDateTime(active.submittedAt)}` : ''}
        size="xl"
      >
        {active && <GradingPanel submission={active} onDone={() => setActiveId(null)} />}
      </Modal>
    </div>
  )
}

function GradingPanel({ submission, onDone }) {
  const { updateSubmission } = useActions()
  const { user } = useAuth()
  const [scores, setScores] = useState(() => submission.rubricScores ?? {})
  const [feedback, setFeedback] = useState(submission.feedback ?? '')
  const [checklist, setChecklist] = useState(() =>
    Object.fromEntries(CHECKLIST_INDICATORS.map((c) => [c.id, submission.checklistScore === null ? 0 : 0])),
  )
  const [checklistMode, setChecklistMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const values = RUBRIC_CRITERIA.map((c) => scores[c.id]).filter((v) => typeof v === 'number')
  const rawMean = values.length ? mean(values) : 0
  const weighted = RUBRIC_CRITERIA.reduce((sum, c) => sum + ((scores[c.id] ?? 0) * c.weight) / 100, 0)
  const checklistCount = Object.values(checklist).filter((v) => v === 1).length

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await updateSubmission(submission.id, {
        status: 'graded',
        rubricScores: scores,
        feedback,
        checklistScore: checklistMode ? checklistCount : submission.checklistScore,
        gradedBy: user?.name,
        gradedAt: new Date().toISOString(),
      })
      onDone()
    } catch (err) {
      setError(err?.message ?? 'Could not save the grades.')
    } finally {
      setBusy(false)
    }
  }

  const returnForResubmission = async () => {
    setBusy(true)
    setError('')
    try {
      await updateSubmission(submission.id, {
        status: 'returned',
        feedback: feedback || 'Returned for resubmission.',
      })
      onDone()
    } catch (err) {
      setError(err?.message ?? 'Could not return the submission.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {submission.fileDataUrl ? (
        <ZoomViewer src={submission.fileDataUrl} alt={submission.fileName} background="#f8fafc" />
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No image stored for this seeded submission. Grading still works — scores and feedback are recorded.
        </div>
      )}

      {submission.notes && (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-700">Student notes</p>
          <p className="mt-1 text-sm text-slate-600">{submission.notes}</p>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Design Performance Rubric</h3>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              Raw mean <span className="font-semibold text-slate-800">{rawMean.toFixed(2)}</span>
            </span>
            <span className="text-slate-600">
              Weighted <span className="font-semibold text-slate-800">{weighted.toFixed(2)}</span> / 5.00
            </span>
          </div>
        </div>

        <ul className="mt-2 space-y-2">
          {RUBRIC_CRITERIA.map((criterion) => (
            <li key={criterion.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">{criterion.label}</p>
                <span className="text-[11px] text-slate-500">Weight {criterion.weight}%</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScores((s) => ({ ...s, [criterion.id]: value }))}
                    className={`btn w-11 py-1 text-sm ${
                      scores[criterion.id] === value
                        ? 'bg-teal-700 text-white'
                        : 'border border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              {scores[criterion.id] && (
                <p className="mt-1.5 text-[11px] text-slate-500">{criterion.descriptors[scores[criterion.id]]}</p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Technical Skills Checklist</h3>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={checklistMode}
              onChange={(e) => setChecklistMode(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-700"
            />
            Record observed indicators
          </label>
        </div>
        {checklistMode ? (
          <>
            <p className="mt-1 text-xs text-slate-500">
              {checklistCount} of {CHECKLIST_INDICATORS.length} observed as achieved
            </p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {CHECKLIST_INDICATORS.map((indicator) => (
                <li key={indicator.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-2 text-xs">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-teal-700"
                      checked={checklist[indicator.id] === 1}
                      onChange={(e) =>
                        setChecklist((c) => ({ ...c, [indicator.id]: e.target.checked ? 1 : 0 }))
                      }
                    />
                    <span className="text-slate-700">{indicator.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            {submission.checklistScore != null
              ? `Student's self-assessed checklist: ${submission.checklistScore} / ${CHECKLIST_INDICATORS.length} indicators.`
              : 'No self-assessment attached.'}
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="grading-feedback">
          Feedback to student
        </label>
        <textarea
          id="grading-feedback"
          className="input min-h-28"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Name one strength and one specific next step. Students see this verbatim."
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            'Check your line weights against Plate 01.',
            'Project all three views carefully before adding detail.',
            'Dimension the feature, not the wall thickness.',
            'Add a title block with scale and date.',
            'Great use of hatching — remember not to hatch fasteners.',
          ].map((snippet) => (
            <button
              key={snippet}
              type="button"
              onClick={() => setFeedback((f) => (f ? `${f} ${snippet}` : snippet))}
              className="chip border-slate-300 bg-white text-slate-600"
            >
              + {snippet.slice(0, 28)}…
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} className="btn-primary" disabled={busy}>
          <Save size={15} /> {busy ? 'Saving…' : 'Save grades & feedback'}
        </button>
        <button type="button" onClick={returnForResubmission} className="btn-secondary" disabled={busy}>
          Return without grading
        </button>
        {values.length === 5 && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-700">
            <CheckCircle2 size={14} /> All criteria scored
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
