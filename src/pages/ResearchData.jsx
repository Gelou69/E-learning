import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Table2 } from 'lucide-react'
import { CHECKLIST_INDICATORS, RUBRIC_CRITERIA, SURVEY_DOMAINS, SURVEY_ITEMS } from '../data/seed'
import { useData } from '../context/DataContext'
import { downloadCsv, downloadSpreadsheet } from '../lib/csv'
import { mean, oneSampleTTest } from '../lib/stats'

export default function ResearchData() {
  const { surveys, checklists, submissions, students } = useData()
  const [table, setTable] = useState('survey')

  const surveyRows = useMemo(
    () => [
      ['Participant', 'Section', 'Submitted at', ...SURVEY_ITEMS.map((i) => i.id), 'Mean', 'Domain means'],
      ...surveys
        .slice()
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
        .map((s) => {
          const values = SURVEY_ITEMS.map((i) => s.answers[i.id]).filter((v) => typeof v === 'number')
          const domainMeans = SURVEY_DOMAINS.map((domain) => {
            const domainValues = SURVEY_ITEMS.filter((i) => i.domain === domain)
              .map((i) => s.answers[i.id])
              .filter((v) => typeof v === 'number')
            return domainValues.length ? mean(domainValues).toFixed(2) : ''
          })
          return [
            students.find((st) => st.id === s.userId)?.name ?? s.userId,
            s.section,
            s.submittedAt.slice(0, 10),
            ...SURVEY_ITEMS.map((i) => s.answers[i.id] ?? ''),
            values.length ? mean(values).toFixed(2) : '',
            domainMeans.join(' | '),
          ]
        }),
    ],
    [surveys, students],
  )

  const checklistRows = useMemo(
    () => [
      ['Participant', 'Section', 'Self-assessed', 'Indicators achieved', 'Total', ...CHECKLIST_INDICATORS.map((c) => c.id)],
      ...checklists
        .slice()
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
        .map((c) => {
          const achieved = Object.values(c.responses ?? {}).filter((v) => v === 1).length
          return [
            students.find((st) => st.id === c.userId)?.name ?? c.userId,
            c.section,
            c.selfAssessed ? 'yes' : 'no',
            achieved,
            CHECKLIST_INDICATORS.length,
            ...CHECKLIST_INDICATORS.map((i) => c.responses?.[i.id] ?? ''),
          ]
        }),
    ],
    [checklists, students],
  )

  const rubricRows = useMemo(
    () => {
      const graded = submissions.filter((s) => s.status === 'graded')
      return [
        ['Participant', 'Section', 'Activity', 'Type', 'Submitted', 'Raw mean', 'Weighted', ...RUBRIC_CRITERIA.map((c) => c.id), 'Feedback'],
        ...graded
          .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
          .map((s) => {
            const values = RUBRIC_CRITERIA.map((c) => s.rubricScores?.[c.id]).filter((v) => typeof v === 'number')
            const weighted = RUBRIC_CRITERIA.reduce(
              (sum, c) => sum + ((s.rubricScores?.[c.id] ?? 0) * c.weight) / 100,
              0,
            )
            return [
              students.find((st) => st.id === s.studentId)?.name ?? s.studentId,
              s.section,
              s.item?.title ?? s.refId,
              s.kind,
              s.submittedAt.slice(0, 10),
              values.length ? mean(values).toFixed(2) : '',
              weighted.toFixed(2),
              ...RUBRIC_CRITERIA.map((c) => s.rubricScores?.[c.id] ?? ''),
              s.feedback ?? '',
            ]
          }),
      ]
    },
    [submissions, students],
  )

  const current = { survey: surveyRows, checklist: checklistRows, rubric: rubricRows }[table]

  const exportCodebook = () => {
    downloadCsv('vgd-instrument-codebook', [
      ['Instrument', 'Code', 'Label / statement', 'Domain', 'Weight', 'Scoring'],
      ...SURVEY_ITEMS.map((i) => [
        'Usefulness & relevance survey',
        i.id,
        i.text,
        i.domain,
        '',
        `Likert 1-5${i.reverse ? ' (reverse-scored: 6 − raw)' : ''}`,
      ]),
      ...RUBRIC_CRITERIA.map((c) => [
        'Design performance rubric',
        c.id,
        c.label,
        c.domain,
        `${c.weight}%`,
        'Ordinal 1-5',
      ]),
      ...CHECKLIST_INDICATORS.map((c) => [
        'Technical skills checklist',
        c.id,
        c.label,
        c.domain,
        '',
        'Binary 0/1 achieved',
      ]),
      [],
      ['Analysis', 'Hypothesis', 'H0: mean = 3.00 (neutral Likert midpoint); H1: mean != 3.00; two-tailed; alpha = .05'],
      ['Analysis', 'Test', "One-sample t-test"],
      ['Analysis', 'Reported', 'frequency, percentage, mean, SD, t, df, p, decision'],
    ])
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Research Data</h1>
          <p className="mt-1 text-sm text-slate-500">
            Raw response tables in the shape a thesis appendix needs, ready for SPSS, R or Excel.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCodebook} className="btn-secondary">
            <Table2 size={15} /> Codebook
          </button>
          <button
            type="button"
            onClick={() =>
              downloadSpreadsheet(
                'vgd-research-dataset',
                [
                  { name: 'Survey responses', rows: surveyRows },
                  { name: 'Checklist', rows: checklistRows },
                  { name: 'Rubric', rows: rubricRows },
                ],
              )
            }
            className="btn-primary"
          >
            <FileSpreadsheet size={15} /> Full workbook
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Survey responses" value={surveys.length} />
        <Kpi label="Checklist records" value={checklists.length} />
        <Kpi label="Graded submissions" value={submissions.filter((s) => s.status === 'graded').length} />
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'survey', label: 'Survey responses', rows: surveyRows },
            { id: 'checklist', label: 'Technical skills checklist', rows: checklistRows },
            { id: 'rubric', label: 'Design performance rubric', rows: rubricRows },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTable(option.id)}
              className={`chip ${
                table === option.id ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-600'
              }`}
            >
              {option.label}
              <span className="opacity-75">({option.rows.length - 1})</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => downloadCsv(`vgd-${table}-data`, current)}
            className="btn-secondary ml-auto px-2.5 py-1 text-xs"
          >
            <Download size={14} /> Download this table
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px] text-xs">
          <thead className="bg-slate-50">
            <tr>
              {current[0].map((header, i) => (
                <th key={i} className="border-b border-slate-200 px-3 py-2 text-left font-semibold whitespace-nowrap text-slate-600">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {current.slice(1).map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-slate-100 hover:bg-slate-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-1.5 whitespace-nowrap text-slate-600">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-800">Pre-computed statistics</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] tracking-wide text-slate-500 uppercase">
                <th className="py-2 pr-3">Scale</th>
                <th className="py-2 pr-3">n</th>
                <th className="py-2 pr-3">Mean</th>
                <th className="py-2 pr-3">SD</th>
                <th className="py-2 pr-3">t</th>
                <th className="py-2 pr-3">df</th>
                <th className="py-2 pr-3">p</th>
                <th className="py-2">Decision at α = .05</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows(surveys, submissions).map((row) => (
                <tr key={row.label} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-medium text-slate-700">{row.label}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.n}</td>
                  <td className="py-2 pr-3 font-semibold tabular-nums">{row.mean.toFixed(2)}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.sd.toFixed(2)}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.test.t.toFixed(2)}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.test.df}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.test.p < 0.001 ? '<.001' : row.test.p.toFixed(3)}</td>
                  <td className="py-2 text-xs text-slate-600">
                    {row.test.significant
                      ? row.test.mean > 3
                        ? 'Mean significantly above the 3.00 neutral point'
                        : 'Mean significantly below the 3.00 neutral point'
                      : 'No significant difference from the 3.00 neutral point'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function summaryRows(surveys, submissions) {
  const rows = []

  const all = surveys.flatMap((s) => Object.values(s.answers).filter((v) => typeof v === 'number'))
  rows.push({ label: 'Usefulness & relevance (pooled)', values: all })

  for (const domain of SURVEY_DOMAINS) {
    const values = surveys.flatMap((s) =>
      SURVEY_ITEMS.filter((i) => i.domain === domain)
        .map((i) => s.answers[i.id])
        .filter((v) => typeof v === 'number'),
    )
    rows.push({ label: domain, values })
  }

  const rubric = submissions
    .filter((s) => s.status === 'graded')
    .flatMap((s) => RUBRIC_CRITERIA.map((c) => s.rubricScores?.[c.id]).filter((v) => typeof v === 'number'))
  rows.push({ label: 'Design performance (pooled)', values: rubric })

  for (const criterion of RUBRIC_CRITERIA) {
    const values = submissions
      .filter((s) => s.status === 'graded')
      .map((s) => s.rubricScores?.[criterion.id])
      .filter((v) => typeof v === 'number')
    rows.push({ label: criterion.label, values })
  }

  return rows.map((row) => {
    const test = oneSampleTTest(row.values, 3)
    return { label: row.label, n: row.values.length, mean: test.mean, sd: test.sd, test }
  })
}

function Kpi({ label, value }) {
  return (
    <div className="card p-3">
      <p className="text-[11px] tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800 tabular-nums">{value}</p>
    </div>
  )
}
