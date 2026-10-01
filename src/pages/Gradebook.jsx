import { useMemo, useState } from 'react'
import { Download, Search, TrendingUp } from 'lucide-react'
import { useData } from '../context/DataContext'
import { RUBRIC_CRITERIA } from '../data/seed'
import { Avatar } from '../components/Avatar'
import { downloadCsv, downloadSpreadsheet } from '../lib/csv'
import { mean, sampleSd } from '../lib/stats'
import { formatDateTime } from '../utils/format'

const VIEWS = [
  { id: 'students', label: 'By student' },
  { id: 'rubric', label: 'By rubric criterion' },
  { id: 'activities', label: 'By activity' },
]

export default function Gradebook() {
  const { submissions, students, pdfs, plates, videos } = useData()
  const [view, setView] = useState('students')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const graded = submissions.filter((s) => s.status === 'graded')

    if (view === 'students') {
      return students
        .map((student) => {
          const mine = graded.filter((s) => s.studentId === student.id)
          const all = submissions.filter((s) => s.studentId === student.id)
          const flat = mine.flatMap((s) =>
            RUBRIC_CRITERIA.map((c) => s.rubricScores?.[c.id]).filter((v) => typeof v === 'number'),
          )
          const checklistScores = mine.map((s) => s.checklistScore).filter((v) => typeof v === 'number')
          return {
            id: student.id,
            label: student.name,
            sublabel: student.section,
            color: student.avatarColor,
            graded: mine.length,
            submitted: all.length,
            raw: flat.length ? mean(flat) : null,
            weighted: mine.length
              ? mean(
                  mine.map((s) =>
                    RUBRIC_CRITERIA.reduce((sum, c) => sum + ((s.rubricScores?.[c.id] ?? 0) * c.weight) / 100, 0),
                  ),
                )
              : null,
            checklist: checklistScores.length ? mean(checklistScores) : null,
            last: all.length ? all.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0].submittedAt : null,
          }
        })
        .filter((row) => !query || row.label.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => (b.raw ?? -1) - (a.raw ?? -1))
    }

    if (view === 'rubric') {
      return RUBRIC_CRITERIA.map((criterion) => {
        const values = graded.map((s) => s.rubricScores?.[criterion.id]).filter((v) => typeof v === 'number')
        return {
          id: criterion.id,
          label: criterion.label,
          sublabel: `Weight ${criterion.weight}%`,
          n: values.length,
          mean: values.length ? mean(values) : null,
          sd: values.length > 1 ? sampleSd(values) : null,
        }
      })
    }

    const allItems = [
      ...plates.map((p) => ({ id: p.id, title: p.title, kind: 'plate' })),
      ...videos.map((v) => ({ id: v.id, title: v.title, kind: 'video' })),
    ]
    return allItems
      .map((item) => {
        const mine = graded.filter((s) => s.refId === item.id)
        const values = mine.flatMap((s) =>
          RUBRIC_CRITERIA.map((c) => s.rubricScores?.[c.id]).filter((v) => typeof v === 'number'),
        )
        return {
          id: item.id,
          label: item.title,
          sublabel: item.kind,
          submitted: submissions.filter((s) => s.refId === item.id).length,
          graded: mine.length,
          mean: values.length ? mean(values) : null,
          sd: values.length > 1 ? sampleSd(values) : null,
        }
      })
      .filter((row) => !query || row.label.toLowerCase().includes(query.toLowerCase()))
  }, [view, students, submissions, plates, videos, query])

  const classStats = useMemo(() => {
    const values = submissions
      .filter((s) => s.status === 'graded')
      .flatMap((s) => RUBRIC_CRITERIA.map((c) => s.rubricScores?.[c.id]).filter((v) => typeof v === 'number'))
    return { n: values.length, mean: values.length ? mean(values) : 0, sd: values.length > 1 ? sampleSd(values) : 0 }
  }, [submissions])

  const exportCsv = () => {
    const header =
      view === 'rubric'
        ? ['Criterion', 'Weight', 'n', 'Mean', 'SD']
        : view === 'activities'
          ? ['Activity', 'Type', 'Submitted', 'Graded', 'Mean', 'SD']
          : ['Student', 'Section', 'Submitted', 'Graded', 'Raw mean', 'Weighted mean', 'Checklist mean', 'Last submission']
    const body = rows.map((row) =>
      view === 'rubric'
        ? [row.label, row.sublabel.replace('Weight ', ''), row.n, row.mean?.toFixed(2) ?? '', row.sd?.toFixed(2) ?? '']
        : view === 'activities'
          ? [row.label, row.sublabel, row.submitted, row.graded, row.mean?.toFixed(2) ?? '', row.sd?.toFixed(2) ?? '']
          : [
              row.label,
              row.sublabel,
              row.submitted,
              row.graded,
              row.raw?.toFixed(2) ?? '',
              row.weighted?.toFixed(2) ?? '',
              row.checklist?.toFixed(2) ?? '',
              row.last ? formatDateTime(row.last) : '',
            ],
    )
    downloadCsv(`vgd-gradebook-${view}`, [header, ...body])
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Gradebook</h1>
          <p className="mt-1 text-sm text-slate-500">
            Class mean {classStats.mean.toFixed(2)} / 5.00 · SD {classStats.sd.toFixed(2)} · {classStats.n} criterion
            scores recorded
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCsv} className="btn-secondary">
            <Download size={15} /> CSV
          </button>
          <button
            type="button"
            onClick={() =>
              downloadSpreadsheet(`vgd-gradebook-${view}`, [
                {
                  name: `Gradebook — ${view}`,
                  rows: [
                    view === 'rubric'
                      ? ['Criterion', 'Weight', 'n', 'Mean', 'SD']
                      : ['Item', 'Detail', 'Submitted', 'Graded', 'Mean', 'SD'],
                    ...rows.map((row) =>
                      view === 'rubric'
                        ? [row.label, row.sublabel, row.n, row.mean?.toFixed(2) ?? '', row.sd?.toFixed(2) ?? '']
                        : [row.label, row.sublabel, row.submitted ?? '', row.graded ?? '', row.raw?.toFixed(2) ?? row.mean?.toFixed(2) ?? '', row.sd?.toFixed(2) ?? row.checklist?.toFixed(2) ?? ''],
                    ),
                  ],
                },
              ])
            }
            className="btn-secondary"
          >
            <Download size={15} /> Excel
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Students" value={students.length} />
        <Stat label="Published lessons" value={pdfs.filter((p) => p.published).length} />
        <Stat label="Submissions" value={submissions.length} />
        <Stat label="Graded" value={submissions.filter((s) => s.status === 'graded').length} />
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setView(option.id)}
              className={`chip ${
                view === option.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-600'
              }`}
            >
              {option.label}
            </button>
          ))}
          <div className="relative ml-auto min-w-48 flex-1 sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <input
              className="input py-1.5 pl-8 text-xs"
              placeholder="Filter…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter gradebook"
            />
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {view === 'students' && (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] tracking-wide text-slate-500 uppercase">
                <th className="px-4 py-2.5">Student</th>
                <th className="px-3 py-2.5">Submitted</th>
                <th className="px-3 py-2.5">Graded</th>
                <th className="px-3 py-2.5">Raw mean</th>
                <th className="px-3 py-2.5">Weighted</th>
                <th className="px-3 py-2.5">Checklist</th>
                <th className="px-4 py-2.5">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={row.label} color={row.color} size={28} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{row.label}</p>
                        <p className="truncate text-[11px] text-slate-500">{row.sublabel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{row.submitted}</td>
                  <td className="px-3 py-2.5 tabular-nums">{row.graded}</td>
                  <td className="px-3 py-2.5">
                    <ScoreCell value={row.raw} />
                  </td>
                  <td className="px-3 py-2.5">
                    <ScoreCell value={row.weighted} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {row.checklist != null ? `${row.checklist.toFixed(1)}/12` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{row.last ? formatDateTime(row.last) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {view === 'rubric' && (
          <table className="w-full min-w-560 text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] tracking-wide text-slate-500 uppercase">
                <th className="px-4 py-2.5">Criterion</th>
                <th className="px-3 py-2.5">n</th>
                <th className="px-3 py-2.5">Mean</th>
                <th className="px-3 py-2.5">SD</th>
                <th className="px-4 py-2.5">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-800">{row.label}</p>
                    <p className="text-[11px] text-slate-500">{row.sublabel}</p>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{row.n}</td>
                  <td className="px-3 py-2.5">
                    <ScoreCell value={row.mean} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{row.sd?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-teal-600" style={{ width: `${((row.mean ?? 0) / 5) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {view === 'activities' && (
          <table className="w-full min-w-560 text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] tracking-wide text-slate-500 uppercase">
                <th className="px-4 py-2.5">Activity</th>
                <th className="px-3 py-2.5">Submitted</th>
                <th className="px-3 py-2.5">Graded</th>
                <th className="px-3 py-2.5">Mean</th>
                <th className="px-4 py-2.5">SD</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-800">{row.label}</p>
                    <p className="text-[11px] text-slate-500">{row.sublabel}</p>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{row.submitted}</td>
                  <td className="px-3 py-2.5 tabular-nums">{row.graded}</td>
                  <td className="px-3 py-2.5">
                    <ScoreCell value={row.mean} />
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{row.sd?.toFixed(2) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <TrendingUp size={12} /> Weighted scores apply the rubric weights (technical accuracy 30%, conventions 20%,
        creativity 15%, SDG relevance 20%, presentation 15%).
      </p>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="card p-3">
      <p className="text-[11px] tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800 tabular-nums">{value}</p>
    </div>
  )
}

function ScoreCell({ value }) {
  if (value == null) return <span className="text-slate-400">—</span>
  const pct = (value / 5) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 font-semibold text-slate-800 tabular-nums">{value.toFixed(2)}</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: value >= 4 ? '#15803d' : value >= 3 ? '#0ea5e9' : '#f59e0b' }}
        />
      </div>
    </div>
  )
}
