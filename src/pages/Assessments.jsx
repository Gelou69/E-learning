import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, ClipboardList, MessageSquare, TrendingUp } from 'lucide-react'
import { CHECKLIST_INDICATORS, RUBRIC_CRITERIA } from '../data/seed'
import { useActions, useData } from '../context/DataContext'
import { TTestCard } from '../components/TTestCard'
import { mean, sampleSd } from '../lib/stats'
import { formatDateTime } from '../utils/format'

export default function Assessments() {
  const { myChecklist, mySubmissions } = useData()
  const { saveChecklist } = useActions()

  const [responses, setResponses] = useState(() => myChecklist?.responses ?? {})
  const [selfAssessed, setSelfAssessed] = useState(myChecklist?.selfAssessed ?? true)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const graded = mySubmissions.filter((s) => s.status === 'graded')

  const scored = useMemo(() => {
    const entries = graded.map((s) => {
      const values = RUBRIC_CRITERIA.map((c) => s.rubricScores?.[c.id]).filter((v) => typeof v === 'number')
      const avg = values.length ? mean(values) : 0
      const weighted = weightedScore(s.rubricScores)
      return { submission: s, avg, weighted }
    })
    return {
      entries,
      meanAvg: entries.length ? mean(entries.map((e) => e.avg)) : 0,
      meanWeighted: entries.length ? mean(entries.map((e) => e.weighted)) : 0,
    }
  }, [graded])

  const checklistPct = (Object.values(responses).filter((v) => v === 1).length / CHECKLIST_INDICATORS.length) * 100

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await saveChecklist(responses, selfAssessed)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err?.message ?? 'Could not save your self-assessment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Assessments</h1>
        <p className="mt-1 text-sm text-slate-500">
          Three instruments, matching the three research domains: technical skills, design performance, and platform
          usefulness.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <DomainCard
          icon={CheckSquare}
          title="Technical Skills Checklist"
          subtitle="12 indicators, observed or self-assessed"
          to="#checklist"
          value={`${Object.values(responses).filter((v) => v === 1).length}/${CHECKLIST_INDICATORS.length}`}
          caption="indicators achieved"
        />
        <DomainCard
          icon={ClipboardList}
          title="Design Performance Rubric"
          subtitle="5 weighted criteria scored by your teacher"
          to="#rubric"
          value={scored.entries.length ? scored.meanWeighted.toFixed(2) : '—'}
          caption="mean weighted score"
        />
        <DomainCard
          icon={MessageSquare}
          title="Usefulness & Relevance Survey"
          subtitle="12 Likert items, 3.00 neutral point"
          to="/survey"
          value="Open"
          caption="anonymous questionnaire"
        />
      </div>

      <section id="checklist" className="card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Technical Skills Checklist</h2>
            <p className="text-xs text-slate-500">
              Tick each indicator you can currently do unaided. {myChecklist && `Last saved ${formatDateTime(myChecklist.submittedAt)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={selfAssessed}
                onChange={(e) => setSelfAssessed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-700"
              />
              Self-assessment
            </label>
            <button type="button" onClick={save} className="btn-primary py-1.5 text-xs" disabled={busy}>
              {busy ? 'Saving…' : 'Save checklist'}
            </button>
          </div>
        </header>

        <div className="p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${checklistPct}%` }} />
            </div>
            <span className="text-sm font-semibold text-slate-700 tabular-nums">{checklistPct.toFixed(0)}%</span>
          </div>

          <ul className="grid gap-2 md:grid-cols-2">
            {CHECKLIST_INDICATORS.map((indicator) => (
              <li key={indicator.id}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 p-2.5 transition hover:border-teal-300 hover:bg-teal-50/40">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700"
                    checked={responses[indicator.id] === 1}
                    onChange={(e) => setResponses((r) => ({ ...r, [indicator.id]: e.target.checked ? 1 : 0 }))}
                  />
                  <span className="text-sm text-slate-700">{indicator.label}</span>
                </label>
              </li>
            ))}
          </ul>

          {saved && <p className="mt-3 text-sm text-emerald-700">Checklist saved.</p>}
          {error && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>

      <section id="rubric" className="card overflow-hidden">
        <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Design Performance Rubric</h2>
          <p className="text-xs text-slate-500">Scored 1–5 per criterion by your teacher on each graded submission.</p>
        </header>

        {scored.entries.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No graded submissions yet. Submit work from a{' '}
            <Link to="/drawings" className="font-medium text-teal-700 underline">
              drawing plate
            </Link>{' '}
            or{' '}
            <Link to="/videos" className="font-medium text-teal-700 underline">
              video activity
            </Link>{' '}
            to receive rubric feedback.
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatBox label="Graded submissions" value={scored.entries.length} />
              <StatBox label="Mean raw score" value={scored.meanAvg.toFixed(2)} />
              <StatBox label="Mean weighted score" value={scored.meanWeighted.toFixed(2)} />
            </div>

            {RUBRIC_CRITERIA.map((criterion) => {
              const values = scored.entries
                .map((e) => e.submission.rubricScores?.[criterion.id])
                .filter((v) => typeof v === 'number')
              return (
                <div key={criterion.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{criterion.label}</p>
                    <p className="text-xs text-slate-500">
                      Weight {criterion.weight}% · mean {values.length ? mean(values).toFixed(2) : '—'} · SD{' '}
                      {values.length > 1 ? sampleSd(values).toFixed(2) : '—'}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-600"
                      style={{ width: `${values.length ? (mean(values) / 5) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )
            })}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                    <th className="py-2 pr-3">Activity</th>
                    <th className="py-2 pr-3">Submitted</th>
                    <th className="py-2 pr-3">Raw mean</th>
                    <th className="py-2">Weighted</th>
                  </tr>
                </thead>
                <tbody>
                  {scored.entries.map((entry) => (
                    <tr key={entry.submission.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 text-slate-800">{entry.submission.item?.title ?? entry.submission.refId}</td>
                      <td className="py-2 pr-3 text-xs text-slate-500">{formatDateTime(entry.submission.submittedAt)}</td>
                      <td className="py-2 pr-3 tabular-nums">{entry.avg.toFixed(2)}</td>
                      <td className="py-2 font-semibold tabular-nums">{entry.weighted.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <TrendingUp size={16} /> How your work compares to the class
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Raw rubric averages are scored on a 1–5 scale, so the neutral reference point of 3.00 is used for comparison
          against class results.
        </p>
        {scored.entries.length >= 2 ? (
          <TTestCard
            title="Your mean rubric score vs. the 3.00 neutral point"
            domain="Design Performance domain"
            values={scored.entries.map((e) => e.avg)}
            mu0={3}
          />
        ) : (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            Submit and receive feedback on at least two activities to see a personal t-test against the neutral point.
          </p>
        )}
      </section>
    </div>
  )
}

function weightedScore(scores = {}) {
  let total = 0
  for (const criterion of RUBRIC_CRITERIA) {
    const value = scores[criterion.id]
    if (typeof value === 'number') total += (value * criterion.weight) / 100
  }
  return total
}

function DomainCard({ icon: Icon, title, subtitle, to, value, caption }) {
  return (
    <a href={to} className="card p-4 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-50 text-teal-700">
        <Icon size={18} />
      </span>
      <h3 className="mt-2.5 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-800">{value}</p>
      <p className="text-[11px] text-slate-500">{caption}</p>
    </a>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-[11px] tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-800">{value}</p>
    </div>
  )
}
