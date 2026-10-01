/** Statistics helpers for the research-facing analytics module. */

const LAPLACE = 0.3989422804014327

function logGamma(x) {
  const cof = [
    76.1800917294715, -86.5053203294168, 24.0140982408309, -1.231739572450155, 0.00120865097386618,
    -0.00000539523938495,
  ]
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j += 1) {
    y += 1
    ser += cof[j] / y
  }
  return -tmp + Math.log((2.506628274631 * ser) / x)
}

function betacf(a, b, x) {
  const MAXIT = 200
  const EPS = 3e-12
  const FPMIN = 1e-300
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= MAXIT; m += 1) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

export function betai(a, b, x) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a
  return 1 - (bt * betacf(b, a, 1 - x)) / b
}

/** Two-tailed p-value for Student's t. */
export function tDistributionP(t, df) {
  if (!Number.isFinite(t) || df <= 0) return Number.NaN
  return betai(df / 2, 0.5, df / (df + t * t))
}

export function tCritical(df, alpha = 0.05) {
  let lo = 0
  let hi = 100
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2
    if (1 - tDistributionP(mid, df) > alpha / 2) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function mean(values) {
  if (!values.length) return Number.NaN
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function sampleSd(values) {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

export function median(values) {
  if (!values.length) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function mode(values) {
  const counts = new Map()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best = null
  let bestCount = -1
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best
}

export function frequencyTable(values, categories) {
  const counts = new Map(categories.map((c) => [c, 0]))
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  const total = values.length || 1
  return categories.map((category) => ({
    category,
    frequency: counts.get(category) ?? 0,
    percentage: ((counts.get(category) ?? 0) / total) * 100,
  }))
}

export function percentChange(before, after) {
  if (!before) return 0
  return ((after - before) / before) * 100
}

/**
 * One-sample t-test against a hypothesised neutral point.
 * @param {number[]} values
 * @param {number} mu0 typically 3.00 for a 1-5 Likert scale
 */
export function oneSampleTTest(values, mu0 = 3) {
  const n = values.length
  if (n < 2) {
    return { n, mean: mean(values), sd: 0, se: 0, t: 0, df: 0, p: 1, significant: false, decision: 'Not enough responses to test.' }
  }
  const m = mean(values)
  const sd = sampleSd(values)
  const se = sd / Math.sqrt(n)
  const t = se === 0 ? 0 : (m - mu0) / se
  const df = n - 1
  const p = tDistributionP(t, df)
  const significant = p < 0.05
  const direction = m > mu0 ? 'higher' : m < mu0 ? 'lower' : 'equal to'
  return {
    n,
    mean: m,
    sd,
    se,
    t,
    df,
    p,
    critical: tCritical(df, 0.05),
    significant,
    mu0,
    decision: significant
      ? `Reject H₀. Mean (${m.toFixed(2)}) is significantly ${direction} the neutral point of ${mu0.toFixed(2)} (p = ${fmtP(p)}).`
      : `Fail to reject H₀. Mean (${m.toFixed(2)}) is not significantly different from ${mu0.toFixed(2)} (p = ${fmtP(p)}).`,
  }
}

export function fmtP(p) {
  if (!Number.isFinite(p)) return '—'
  if (p < 0.001) return '<.001'
  return p.toFixed(3)
}

export function round(value, places = 2) {
  if (!Number.isFinite(value)) return value
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

export function interpretEffectSize(d) {
  const abs = Math.abs(d)
  if (abs < 0.2) return 'Negligible'
  if (abs < 0.5) return 'Small'
  if (abs < 0.8) return 'Moderate'
  return 'Large'
}

export { LAPLACE }
