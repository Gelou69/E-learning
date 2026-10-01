const C = {
  ink: '#0f172a',
  teal: '#0f766e',
  amber: '#b45309',
}

const LINE_PATTERNS = {
  outline: { w: 1.6, dash: null, color: C.ink },
  medium: { w: 1.1, dash: null, color: C.ink },
  thin: { w: 0.7, dash: null, color: C.ink },
  centre: { w: 0.9, dash: '20 5 4 5', color: C.ink },
  hidden: { w: 1, dash: '6 4', color: C.ink },
  construction: { w: 0.5, dash: '4 3', color: '#94a3b8' },
  guide: { w: 0.6, dash: '2 4', color: '#94a3b8' },
  bold: { w: 2.6, dash: null, color: C.ink },
  accent: { w: 2, dash: null, color: C.teal },
  accentAmber: { w: 2, dash: null, color: C.amber },
  highlight: { w: 3, dash: null, color: '#f59e0b' },
}

function line(x1, y1, x2, y2, style = 'thin', opts = {}) {
  const p = LINE_PATTERNS[style] ?? LINE_PATTERNS.thin
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${opts.color ?? p.color}" stroke-width="${opts.w ?? p.w}"${
    (opts.dash ?? p.dash) ? ` stroke-dasharray="${opts.dash ?? p.dash}"` : ''
  } stroke-linecap="${opts.cap ?? 'round'}"${opts.opacity ? ` opacity="${opts.opacity}"` : ''}/>`
}

function rect(x, y, w, h, style = 'outline', opts = {}) {
  const p = LINE_PATTERNS[style] ?? LINE_PATTERNS.outline
  const rx = opts.rx ?? 0
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${opts.fill ?? 'none'}" stroke="${
    opts.color ?? p.color
  }" stroke-width="${opts.w ?? p.w}"${(opts.dash ?? p.dash) ? ` stroke-dasharray="${opts.dash ?? p.dash}"` : ''}/>`
}

function circle(cx, cy, r, style = 'medium', opts = {}) {
  const p = LINE_PATTERNS[style] ?? LINE_PATTERNS.medium
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${opts.fill ?? 'none'}" stroke="${opts.color ?? p.color}" stroke-width="${
    opts.w ?? p.w
  }"${(opts.dash ?? p.dash) ? ` stroke-dasharray="${opts.dash ?? p.dash}"` : ''}/>`
}

function ellipse(cx, cy, rx, ry, style = 'medium', opts = {}) {
  const p = LINE_PATTERNS[style] ?? LINE_PATTERNS.medium
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${opts.fill ?? 'none'}" stroke="${
    opts.color ?? p.color
  }" stroke-width="${opts.w ?? p.w}"${(opts.dash ?? p.dash) ? ` stroke-dasharray="${opts.dash ?? p.dash}"` : ''}/>`
}

function polyline(points, style = 'medium', opts = {}) {
  const p = LINE_PATTERNS[style] ?? LINE_PATTERNS.medium
  const d = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt[0]} ${pt[1]}`).join(' ')
  return `<path d="${d}${opts.close ? ' Z' : ''}" fill="${opts.fill ?? 'none'}" stroke="${opts.color ?? p.color}" stroke-width="${
    opts.w ?? p.w
  }" stroke-linejoin="round"${(opts.dash ?? p.dash) ? ` stroke-dasharray="${opts.dash ?? p.dash}"` : ''}/>`
}

function polygon(points, opts = {}) {
  return polyline(points, 'outline', { ...opts, close: true })
}

function arc(cx, cy, r, a0, a1, style = 'medium', opts = {}) {
  const p = LINE_PATTERNS[style] ?? LINE_PATTERNS.medium
  const rad = (deg) => (deg * Math.PI) / 180
  const x0 = cx + r * Math.cos(rad(a0))
  const y0 = cy + r * Math.sin(rad(a0))
  const x1 = cx + r * Math.cos(rad(a1))
  const y1 = cy + r * Math.sin(rad(a1))
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0
  return `<path d="M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="${
    opts.color ?? p.color
  }" stroke-width="${opts.w ?? p.w}"${(opts.dash ?? p.dash) ? ` stroke-dasharray="${opts.dash ?? p.dash}"` : ''}/>`
}

function text(x, y, value, opts = {}) {
  const size = opts.size ?? 13
  return `<text x="${x}" y="${y}" font-family="${opts.font ?? 'Helvetica, Arial, sans-serif'}" font-size="${size}" fill="${
    opts.color ?? C.ink
  }"${opts.anchor ? ` text-anchor="${opts.anchor}"` : ''}${opts.weight ? ` font-weight="${opts.weight}"` : ''}${
    opts.spacing ? ` letter-spacing="${opts.spacing}"` : ''
  }>${value}</text>`
}

function textPath(x, y, value, opts = {}) {
  return text(x, y, value, { size: 11, color: '#475569', ...opts })
}

function dimH(x1, x2, y, label, opts = {}) {
  const off = opts.offset ?? 20
  const style = opts.style ?? 'thin'
  return [
    line(x1, y, x1, y + off + 6, 'guide'),
    line(x2, y, x2, y + off + 6, 'guide'),
    line(x1, y + off, x2, y + off, style),
    `<path d="M${x1} ${y + off} l7 -3.2 l-1 6.4 z" fill="${C.ink}"/>`,
    `<path d="M${x2} ${y + off} l-7 -3.2 l1 6.4 z" fill="${C.ink}"/>`,
    text((x1 + x2) / 2, y + off - 5, label, { size: 12, anchor: 'middle' }),
  ].join('')
}

function dimV(x, y1, y2, label, opts = {}) {
  const off = opts.offset ?? 20
  const style = opts.style ?? 'thin'
  const mid = (y1 + y2) / 2
  return [
    line(x, y1, x + off + 6, y1, 'guide'),
    line(x, y2, x + off + 6, y2, 'guide'),
    line(x + off, y1, x + off, y2, style),
    `<path d="M${x + off} ${y1} l-3.2 7 l6.4 1 z" fill="${C.ink}"/>`,
    `<path d="M${x + off} ${y2} l3.2 -7 l-6.4 -1 z" fill="${C.ink}"/>`,
    `<g transform="translate(${x + off + 8} ${mid}) rotate(-90)">${text(0, 0, label, { size: 12, anchor: 'middle' })}</g>`,
  ].join('')
}

function leader(x, y, tx, ty, label, opts = {}) {
  const elbow = opts.elbow ?? 24
  const tipX = tx + elbow
  return [
    line(x, y, tx, ty, 'thin'),
    line(tx, ty, tipX, ty, 'thin'),
    circle(x, y, 2.4, 'thin', { fill: C.ink }),
    `<path d="M${tipX + 1} ${ty} l-7 -3.2 l1 6.4 z" fill="${C.ink}"/>`,
    text(tipX + 10, ty + 4, label, { size: 12 }),
  ].join('')
}

function arrow(x, y, angle, size = 9) {
  return `<path d="M0 0 l${size} 0 l${-size / 2} ${size} z" fill="${C.ink}" transform="translate(${x} ${y}) rotate(${angle})"/>`
}

function hatch(x, y, w, h, gap = 8, angle = 45, color = C.ink, width = 0.8) {
  const out = []
  const diag = Math.hypot(w, h)
  const steps = Math.ceil(diag / gap) + 2
  const rad = (angle * Math.PI) / 180
  for (let i = -steps; i <= steps; i += 1) {
    const offset = i * gap
    const x1 = x + offset * Math.cos(rad)
    const y1 = y + offset * Math.sin(rad)
    out.push(line(x1, y1, x1 + diag * Math.cos(rad + Math.PI / 2), y1 + diag * Math.sin(rad + Math.PI / 2), 'thin', { w: width, color, opacity: 0.75 }))
  }
  return out.join('')
}

function titleBlock(x, y, w, h, rows, opts = {}) {
  const rowH = h / rows.length
  return [
    rect(x, y, w, h, 'medium'),
    ...rows
      .map((row, i) => {
        const ly = y + i * rowH
        return `${i === rows.length - 1 ? '' : line(x, ly, x + w, ly, 'thin')}${text(x + 10, ly + rowH / 2 + 4, row, { size: 12 })}`
      })
      .join(''),
    opts.sdg ? text(x + w - 10, y + rowH * (rows.length - 1) + rowH / 2 + 4, opts.sdg, { size: 10, anchor: 'end', color: C.teal }) : '',
  ].join('')
}

function frame(w = 900, h = 620) {
  return [rect(20, 20, w - 40, h - 40, 'thin'), rect(32, 32, w - 64, h - 64, 'thin', { w: 0.4 })].join('')
}

function northArrow(cx, cy, r) {
  return [
    circle(cx, cy, r, 'medium'),
    polygon([
      [cx, cy - r + 3],
      [cx + r * 0.42, cy + r - 3],
      [cx, cy + r * 0.35],
      [cx - r * 0.42, cy + r - 3],
    ], { fill: C.teal }),
    text(cx, cy + r + 16, 'N', { size: 12, anchor: 'middle' }),
  ].join('')
}

export {
  line,
  rect,
  circle,
  ellipse,
  polyline,
  polygon,
  arc,
  text,
  textPath,
  dimH,
  dimV,
  leader,
  arrow,
  hatch,
  titleBlock,
  frame,
  northArrow,
  LINE_PATTERNS,
}
