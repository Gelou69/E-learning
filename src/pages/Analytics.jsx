import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download, Info, Printer, Sigma, TrendingUp } from 'lucide-react'
import { useData } from '../context/DataContext'
import { CHECKLIST_INDICATORS, LIKERT_LABELS, RUBRIC_CRITERIA, SURVEY_DOMAINS, SURVEY_ITEMS } from '../data/seed'
import { LikertDistribution, TTestCard } from '../components/TTestCard'
import { frequencyTable, mean, oneSampleTTest, sampleSd } from '../lib/stats'
import { downloadCsv, downloadSpreadsheet } from '../lib/csv'
import { SDGS } from '../data/constants'
import { LIKERT_COLORS } from '../constants/tools'

const SECTIONS = ['All sections', 'VGD 11 - Section A', 'VGD 11 - Section B', 'VGD 11 - Section C']

export default function Analytics() {
  const { surveys, checklists, submissions, students } = useData()
  const [section, setSection] = useState('All sections')

  const filteredSurveys = useMemo(
    () => (section === 'All sections' ? surveys : surveys.filter((s) => s.section === section)),
    [surveys, section],
  )
  const filteredChecklists = useMemo(
    () => (section === 'All sections' ? checklists : checklists.filter((s) => s.section === section)),
    [checklists, section],
  )
  const filteredSubmissions = useMemo(
    () => (section === 'All sections' ? submissions : submissions.filter((s) => s.section === section)),
    [submissions, section],
  )

  const itemStats = useMemo(
    () =>
      SURVEY_ITEMS.map((item) => {
        const values = filteredSurveys.map((s) => s.answers[item.id]).filter((v) => typeof v === 'number')
        return {
          id: item.id,
          domain: item.domain,
          text: item.text,
          reverse: item.reverse,
          n: values.length,
          mean: values.length ? mean(values) : 0,
          sd: values.length > 1 ? sampleSd(values) : 0,
          values,
          test: oneSampleTTest(values, 3),
        }
      }),
    [filteredSurveys],
  )

  const domainStats = useMemo(
    () =>
      SURVEY_DOMAINS.map((domain) => {
        const items = itemStats.filter((i) => i.domain === domain)
        const values = items.flatMap((i) => i.values)
        return {
          domain,
          items: items.length,
          n: values.length,
          mean: values.length ? mean(values) : 0,
          sd: values.length > 1 ? sampleSd(values) : 0,
          test: oneSampleTTest(values, 3),
        }
      }),
    [itemStats],
  )

  const overallTest = useMemo(() => {
    const values = filteredSurveys.flatMap((s) => SURVEY_ITEMS.map((i) => s.answers[i.id]).filter((v) => typeof v === 'number'))
    return oneSampleTTest(values, 3)
  }, [filteredSurveys])

  const overallDistribution = useMemo(
    () =>
      frequencyTable(
        filteredSurveys.flatMap((s) => Object.values(s.answers)).filter((v) => typeof v === 'number'),
        [1, 2, 3, 4, 5],
      ).map((row) => ({ ...row, label: LIKERT_LABELS.find((l) => l.value === row.category)?.label ?? row.category })),
    [filteredSurveys],
  )

  const checklistStats = useMemo(
    () =>
      CHECKLIST_INDICATORS.map((indicator) => {
        const values = filteredChecklists.map((c) => c.responses?.[indicator.id]).filter((v) => typeof v === 'number')
        const achieved = values.filter((v) => v === 1).length
        return {
          id: indicator.id,
          label: indicator.label,
          n: values.length,
          frequency: achieved,
          percentage: values.length ? (achieved / values.length) * 100 : 0,
        }
      }),
    [filteredChecklists],
  )

  const rubricStats = useMemo(
    () =>
      RUBRIC_CRITERIA.map((criterion) => {
        const values = filteredSubmissions
          .filter((s) => s.status === 'graded')
          .map((s) => s.rubricScores?.[criterion.id])
          .filter((v) => typeof v === 'number')
        return {
          id: criterion.id,
          label: criterion.label,
          weight: criterion.weight,
          n: values.length,
          mean: values.length ? mean(values) : 0,
          sd: values.length > 1 ? sampleSd(values) : 0,
          test: oneSampleTTest(values, 3),
        }
      }),
    [filteredSubmissions],
  )

  const radarData = domainStats.map((d) => ({ domain: d.domain.replace(' and ', ' &\n').replace('Development', 'Dev.'), mean: +d.mean.toFixed(2) }))

  const sdgCoverage = useMemo(
    () =>
      SDGS.map((sdg) => {
        const relevant = filteredSubmissions.filter((s) => s.item?.sdgs?.includes(sdg.id))
        const values = relevant
          .filter((s) => s.status === 'graded')
          .flatMap((s) => RUBRIC_CRITERIA.map((c) => s.rubricScores?.[c.id]).filter((v) => typeof v === 'number'))
        return {
          code: sdg.code,
          color: sdg.color,
          plates: relevant.length,
          rubric: values.length ? +(mean(values) / 5).toFixed(2) : 0,
        }
      }),
    [filteredSubmissions],
  )

  const exportAll = () => {
    const surveyRows = [
      ['Item', 'Domain', 'Reverse-scored', 'n', 'Mean', 'SD', 't', 'df', 'p', 'Significant at .05'],
      ...itemStats.map((i) => [
        `Q${SURVEY_ITEMS.indexOf(SURVEY_ITEMS[i]) + 1}`.replace('undefined', i.id),
        i.domain,
        i.reverse ? 'yes' : 'no',
        i.n,
        i.mean.toFixed(2),
        i.sd.toFixed(2),
        i.test.t.toFixed(3),
        i.test.df,
        i.test.p.toFixed(3),
        i.test.significant ? 'yes' : 'no',
      ]),
      [],
      ['Domain summary', 'Items', 'n', 'Mean', 'SD', 't', 'p', 'Significant at .05'],
      ...domainStats.map((d) => [d.domain, d.items, d.n, d.mean.toFixed(2), d.sd.toFixed(2), d.test.t.toFixed(3), d.test.p.toFixed(3), d.test.significant ? 'yes' : 'no']),
      [],
      ['Overall test vs 3.00', 'n', 'Mean', 'SD', 't', 'df', 'p', 'Decision'],
      ['All items pooled', overallTest.n, overallTest.mean.toFixed(2), overallTest.sd.toFixed(2), overallTest.t.toFixed(3), overallTest.df, overallTest.p.toFixed(3), overallTest.decision],
      [],
      ['Checklist indicator', 'n', 'Frequency achieved', 'Percentage'],
      ...checklistStats.map((c) => [c.label, c.n, c.frequency, c.percentage.toFixed(1)]),
      [],
      ['Rubric criterion', 'Weight %', 'n', 'Mean', 'SD', 't', 'p', 'Significant at .05'],
      ...rubricStats.map((r) => [r.label, r.weight, r.n, r.mean.toFixed(2), r.sd.toFixed(2), r.test.t.toFixed(3), r.test.p.toFixed(3), r.test.significant ? 'yes' : 'no']),
      [],
      ['Raw responses', 'Student', 'Section', 'Submitted', ...SURVEY_ITEMS.map((i) => i.id)],
      ...filteredSurveys.map((s) => [
        s.userId,
        students.find((st) => st.id === s.userId)?.name ?? s.userId,
        s.section,
        s.submittedAt,
        ...SURVEY_ITEMS.map((i) => s.answers[i.id] ?? ''),
      ]),
    ]

    downloadCsv(`vgd-analytics-${section.replace(/\s+/g, '-').toLowerCase()}`, surveyRows)
  }

  return (
    <div className="space-y-6">
      <header className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Research Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Frequency · percentage · mean · SD · one-sample t-test against the 3.00 neutral point
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input py-1.5 text-xs" value={section} onChange={(e) => setSection(e.target.value)}>
            {SECTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button type="button" onClick={exportAll} className="btn-primary">
            <Download size={15} /> Export CSV
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              downloadSpreadsheet('vgd-analytics-summary', [
                { name: 'Domain summary', rows: [['Domain', 'n', 'Mean', 'SD', 'p'], ...domainStats.map((d) => [d.domain, d.n, d.mean.toFixed(2), d.sd.toFixed(2), d.test.p.toFixed(3)])] },
                { name: 'Checklist', rows: [['Indicator', 'n', 'Frequency', '%'], ...checklistStats.map((c) => [c.label, c.n, c.frequency, c.percentage.toFixed(1)])] },
                { name: 'Rubric', rows: [['Criterion', 'n', 'Mean', 'SD'], ...rubricStats.map((r) => [r.label, r.n, r.mean.toFixed(2), r.sd.toFixed(2)])] },
              ])
            }
          >
            <Download size={15} /> Excel
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Survey respondents" value={filteredSurveys.length} sub={`${students.length} students enrolled`} />
        <Kpi label="Response rate" value={`${((filteredSurveys.length / (students.length || 1)) * 100).toFixed(0)}%`} sub="of enrolled students" />
        <Kpi label="Overall mean" value={overallTest.mean.toFixed(2)} sub={`vs 3.00 neutral · p = ${overallTest.p < 0.001 ? '<.001' : overallTest.p.toFixed(3)}`} />
        <Kpi
          label="Overall SD"
          value={overallTest.sd.toFixed(2)}
          sub={overallTest.significant ? 'Significantly above neutral' : 'No significant difference'}
          tone={overallTest.significant ? 'emerald' : 'slate'}
        />
      </section>

      <TTestCard
        title="Overall platform usefulness and relevance"
        domain={`All ${SURVEY_ITEMS.length} Likert items pooled${section === 'All sections' ? '' : ` · ${section}`}`}
        values={filteredSurveys.flatMap((s) => Object.values(s.answers).filter((v) => typeof v === 'number'))}
        mu0={3}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <LikertDistribution rows={overallDistribution} total={overallDistribution.reduce((s, r) => s + r.frequency, 0)} />

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-slate-800">Mean by research domain</h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domainStats} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="domain" tick={{ fontSize: 10 }} interval={0} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => Number(value).toFixed(2)}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                />
                <ReferenceLine y={3} stroke="#94a3b8" strokeDasharray="4 4" />
                <Bar dataKey="mean" radius={[6, 6, 0, 0]}>
                  {domainStats.map((d) => (
                    <Cell key={d.domain} fill={d.test.significant ? '#0f766e' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Dashed line = 3.00 neutral point. Green bars are significant at α = .05.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {domainStats.map((d) => (
          <TTestCard key={d.domain} title={d.domain} domain={`n = ${d.n} responses across ${d.items} items`} values={flattenDomain(itemStats, d.domain)} />
        ))}
      </div>

      <section className="card p-4">
        <h3 className="text-sm font-semibold text-slate-800">Per-item analysis</h3>
        <p className="mt-1 text-xs text-slate-500">
          Each item tested individually against μ = 3.00. Reverse-scored items are already recoded (6 − raw).
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] tracking-wide text-slate-500 uppercase">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Item</th>
                <th className="py-2 pr-3">Domain</th>
                <th className="py-2 pr-3">n</th>
                <th className="py-2 pr-3">Mean</th>
                <th className="py-2 pr-3">SD</th>
                <th className="py-2 pr-3">t</th>
                <th className="py-2 pr-3">p</th>
                <th className="py-2 pr-3">Decision</th>
                <th className="py-2">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {itemStats.map((item, index) => {
                const dist = frequencyTable(item.values, [1, 2, 3, 4, 5])
                return (
                  <tr key={item.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3 text-slate-400">{index + 1}</td>
                    <td className="max-w-xs py-2 pr-3 text-slate-700">
                      {item.text}
                      {item.reverse && <span className="ml-1.5 badge bg-slate-100 text-slate-500">R</span>}
                    </td>
                    <td className="py-2 pr-3 text-xs text-slate-500">{item.domain}</td>
                    <td className="py-2 pr-3 tabular-nums">{item.n}</td>
                    <td className="py-2 pr-3 font-semibold tabular-nums">{item.mean.toFixed(2)}</td>
                    <td className="py-2 pr-3 tabular-nums">{item.sd.toFixed(2)}</td>
                    <td className="py-2 pr-3 tabular-nums">{item.test.t.toFixed(2)}</td>
                    <td className="py-2 pr-3 tabular-nums">{item.test.p < 0.001 ? '<.001' : item.test.p.toFixed(3)}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`badge ${
                          item.test.significant
                            ? item.test.mean > 3
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.test.significant ? (item.test.mean > 3 ? 'Higher' : 'Lower') : 'n.s.'}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex items-end gap-0.5" style={{ height: 34 }}>
                        {dist.map((d) => {
                          const maxFreq = Math.max(...dist.map((x) => x.frequency), 1)
                          return (
                            <div key={d.category} className="flex flex-1 flex-col items-center" title={`${d.frequency} (${d.percentage.toFixed(1)}%)`}>
                              <div
                                className="w-full rounded-t"
                                style={{ height: `${(d.frequency / maxFreq) * 28}px`, backgroundColor: LIKERT_COLORS[d.category] }}
                              />
                              <span className="mt-0.5 text-[9px] text-slate-400">{d.category}</span>
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Sigma size={16} /> Technical Skills Checklist achievement
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {filteredChecklists.length} checklists recorded. Percentage of respondents reporting each indicator as
            achieved.
          </p>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={checklistStats.map((c) => ({ ...c, short: c.label.split(' ').slice(0, 4).join(' ') }))}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <YAxis type="category" dataKey="short" width={140} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                  labelFormatter={(label) => checklistStats.find((c) => c.short === label)?.label ?? label}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="percentage" fill="#0f766e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <TrendingUp size={16} /> Design Performance rubric means
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {filteredSubmissions.filter((s) => s.status === 'graded').length} graded submissions.
          </p>
          <ul className="mt-3 space-y-2.5">
            {rubricStats.map((criterion) => (
              <li key={criterion.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm text-slate-700">{criterion.label}</span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    M = {criterion.mean.toFixed(2)} · SD = {criterion.sd.toFixed(2)} · n = {criterion.n} ·{' '}
                    {criterion.test.significant ? (criterion.test.mean > 3 ? 'p<.05 ↑' : 'p<.05 ↓') : 'n.s.'}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-teal-600" style={{ width: `${(criterion.mean / 5) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <h3 className="text-sm font-semibold text-slate-800">Domain profile</h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="domain" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[1, 5]} tick={{ fontSize: 9 }} />
                <Radar dataKey="mean" stroke="#0f766e" fill="#0f766e" fillOpacity={0.35} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-4">
          <h3 className="text-sm font-semibold text-slate-800">SDG engagement and performance</h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sdgCoverage} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="plates" name="Submissions" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rubric" name="Mean rubric / 5" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="card p-4">
        <h3 className="text-sm font-semibold text-slate-800">Reporting notes</h3>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600">
          <li>
            <strong>Hypothesis.</strong> H₀: μ = 3.00, the neutral midpoint of the 1–5 Likert scale. H₁: μ ≠ 3.00,
            two-tailed, α = .05.
          </li>
          <li>
            <strong>Effect size.</strong> Cohen&apos;s d = (M − 3) / SD. Values above 0.5 are treated as a moderate-to-large
            effect and are reported alongside t.
          </li>
          <li>
            <strong>Assumptions.</strong> Central limit theorem applies for n ≥ 30; below that, interpret p-values
            cautiously and prefer the distribution table.
          </li>
          <li>
            <strong>Reverse-scored items.</strong> Items 12 recodes a negatively worded statement before analysis so
            higher scores consistently mean higher perceived usefulness.
          </li>
        </ul>
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">
          <Info size={14} className="mt-0.5 shrink-0 text-teal-700" />
          This build ships with deterministic seeded data so every statistic is reproducible. Connect a real backend
          and the same calculations run on live responses.
        </p>
      </section>
    </div>
  )
}

function flattenDomain(itemStats, domain) {
  return itemStats.filter((i) => i.domain === domain).flatMap((i) => i.values)
}

function Kpi({ label, value, sub, tone = 'teal' }) {
  const tones = { teal: 'text-teal-700', emerald: 'text-emerald-600', slate: 'text-slate-700' }
  return (
    <div className="card p-4">
      <p className="text-[11px] tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
    </div>
  )
}
