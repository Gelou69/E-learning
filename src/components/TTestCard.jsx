import { useMemo, useState } from 'react'
import { fmtP, oneSampleTTest } from '../lib/stats'

export function TTestCard({ title, values, mu0 = 3, neutralLabel = 'Neutral (3.00)', domain }) {
  const result = useMemo(() => oneSampleTTest(values, mu0), [values, mu0])

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {domain && <p className="text-xs text-slate-500">{domain}</p>}
        </div>
        <span
          className={`badge ${
            !result.significant
              ? 'bg-slate-100 text-slate-600'
              : result.mean > mu0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
          }`}
        >
          {result.significant ? (result.mean > mu0 ? 'Significantly higher' : 'Significantly lower') : 'Not significant'}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <Stat label="n" value={result.n} />
        <Stat label="Mean" value={result.mean.toFixed(2)} />
        <Stat label="SD" value={result.sd.toFixed(2)} />
        <Stat label="SE" value={result.se.toFixed(3)} />
        <Stat label="t" value={result.t.toFixed(3)} />
        <Stat label="df" value={result.df} />
        <Stat label="p" value={fmtP(result.p)} />
        <Stat label={`t-crit (±)`} value={Number.isFinite(result.critical) ? result.critical.toFixed(3) : '—'} />
      </dl>

      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
        <span className="font-semibold text-slate-800">H₀:</span> μ = {mu0.toFixed(2)} ({neutralLabel}) ·{' '}
        <span className="font-semibold text-slate-800">H₁:</span> μ ≠ {mu0.toFixed(2)}, α = .05, two-tailed.
        <br />
        {result.decision}
      </p>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="font-semibold text-slate-800 tabular-nums">{value}</dd>
    </div>
  )
}

export function LikertDistribution({ rows, total }) {
  const [mode, setMode] = useState('frequency')
  const max = Math.max(...rows.map((r) => (mode === 'frequency' ? r.frequency : r.percentage)), 1)
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">Response distribution</h3>
        <div className="flex rounded-lg border border-slate-300 p-0.5 text-xs">
          {['frequency', 'percentage'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`cursor-pointer rounded-md px-2 py-1 font-medium ${
                mode === option ? 'bg-slate-800 text-white' : 'text-slate-600'
              }`}
            >
              {option === 'frequency' ? 'Freq' : '%'}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((row) => {
          const value = mode === 'frequency' ? row.frequency : row.percentage
          return (
            <div key={row.category} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs text-slate-600">{row.label}</span>
              <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                <div
                  className="h-full rounded bg-teal-600 transition-all"
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs font-medium text-slate-700 tabular-nums">
                {row.frequency} ({row.percentage.toFixed(1)}%)
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">Base n = {total} responses</p>
    </div>
  )
}
