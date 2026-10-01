/**
 * Seed content for the VGD E-Learning Hub.
 * Every plate is a plain SVG string so the viewer can zoom into real
 * line work, dimensions and title blocks without binary image assets.
 */

import { lessonPdfUrl } from '../lib/pdf'

const TEAL = '#0f766e'
const INK = '#111827'

function svg(inner, { width = 900, height = 620, title = 'drawing' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${title}"><rect width="${width}" height="${height}" fill="#fdfdfb"/>${inner}</svg>`
}

function titleBlock(x, y, w, h, lines) {
  const rowH = h / lines.length
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${INK}" stroke-width="1.6"/>
    ${lines
      .map((line, i) => {
        const ly = y + i * rowH
        const isLast = i === lines.length - 1
        return `${isLast ? '' : `<line x1="${x}" y1="${ly}" x2="${x + w}" y2="${ly}" stroke="${INK}" stroke-width="1"/>`}
        <text x="${x + 10}" y="${ly + rowH / 2 + 4}" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="${INK}">${line}</text>`
      })
      .join('')}
    <line x1="${x + w * 0.55}" y1="${y}" x2="${x + w * 0.55}" y2="${y + h}" stroke="${INK}" stroke-width="1"/>
  </g>`
}

function dimH(x1, x2, y, label, offset = 18) {
  const arrow = (x) =>
    `M${x} ${y - 4} l6 4 l-6 4` + (x === x1 ? '' : ' l-6 4 l6 4')
  return `<g stroke="${INK}" stroke-width="1" fill="none">
    <line x1="${x1}" y1="${y + offset}" x2="${x2}" y2="${y + offset}"/>
    <line x1="${x1}" y1="${y}" x2="${x1}" y2="${y + offset + 6}" stroke-dasharray="4 3"/>
    <line x1="${x2}" y1="${y}" x2="${x2}" y2="${y + offset + 6}" stroke-dasharray="4 3"/>
    <path d="M${x1 + 1} ${y + offset} ${arrow(x1).slice(arrow(x1).indexOf('M') + 1)}"/>
    <path d="M${x2 - 1} ${y + offset} l-6 -4 l6 -4"/>
    <text x="${(x1 + x2) / 2}" y="${y + offset - 4}" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="${INK}" text-anchor="middle">${label}</text>
  </g>`
}

function dimV(x, y1, y2, label, offset = 18) {
  return `<g stroke="${INK}" stroke-width="1" fill="none">
    <line x1="${x + offset}" y1="${y1}" x2="${x + offset}" y2="${y2}"/>
    <line x1="${x}" y1="${y1}" x2="${x + offset + 6}" y2="${y1}" stroke-dasharray="4 3"/>
    <line x1="${x}" y1="${y2}" x2="${x + offset + 6}" y2="${y2}" stroke-dasharray="4 3"/>
    <path d="M${x + offset} ${y1 + 1} l-4 -6 l8 0"/>
    <path d="M${x + offset} ${y2 - 1} l4 6 l-8 0"/>
    <text x="${x + offset + 8}" y="${(y1 + y2) / 2}" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="${INK}">${label}</text>
  </g>`
}

function leader(x, y, tx, ty, label) {
  return `<g stroke="${INK}" stroke-width="1" fill="none">
    <line x1="${x}" y1="${y}" x2="${tx}" y2="${ty}"/>
    <circle cx="${x}" cy="${y}" r="2.5" fill="${INK}"/>
    <text x="${tx + 6}" y="${ty - 4}" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="${INK}">${label}</text>
  </g>`
}

const plateLineTypes = svg(`
  <g stroke="${INK}" fill="none">
    <line x1="70" y1="90" x2="560" y2="90" stroke-width="0.35"/>
    <line x1="70" y1="135" x2="560" y2="135" stroke-width="0.5"/>
    <line x1="70" y1="180" x2="560" y2="180" stroke-width="0.7"/>
    <line x1="70" y1="225" x2="560" y2="225" stroke-width="1"/>
    <line x1="70" y1="270" x2="560" y2="270" stroke-width="1.4"/>
    <line x1="70" y1="315" x2="560" y2="315" stroke-width="2"/>
    <line x1="70" y1="360" x2="560" y2="360" stroke-width="2.6"/>
    <line x1="70" y1="405" x2="560" y2="405" stroke-width="3.2"/>
    <line x1="70" y1="450" x2="560" y2="450" stroke-dasharray="18 6 4 6 2 6" stroke-width="1.2"/>
    <line x1="70" y1="495" x2="560" y2="495" stroke-dasharray="2 5" stroke-width="1.4"/>
  </g>
  <g font-family="Helvetica, Arial, sans-serif" font-size="12" fill="${INK}">
    <text x="575" y="94">Continuous thin — 0.25 mm (extension, dimension lines)</text>
    <text x="575" y="139">Continuous thin — 0.25 mm (dimension figures)</text>
    <text x="575" y="184">Continuous thin — 0.35 mm (dimension figures)</text>
    <text x="575" y="229">Continuous thick — 0.50 mm (visible outlines)</text>
    <text x="575" y="274">Continuous thick — 0.70 mm (cutting plane)</text>
    <text x="575" y="319">Continuous very thick — 1.0 mm (revision emphasis)</text>
    <text x="575" y="364">Continuous very thick — 1.4 mm (drawing frames)</text>
    <text x="575" y="409">Double line — 0.7 mm (frames on large sheets)</text>
    <text x="575" y="454">Chain thin double line — centre lines</text>
    <text x="575" y="499">Dashed thin double line — hidden edges</text>
  </g>
  ${titleBlock(600, 300, 250, 150, ['LINE TYPE REFERENCE', 'Sheet 1 of 1', 'Scale: NTS', 'SDG 4 — Quality Education'])}
`)

const plateOrthographic = svg(`
  <g stroke="${INK}" fill="none" stroke-width="1.6">
    <rect x="90" y="90" width="250" height="150"/>
    <line x1="90" y1="90" x2="110" y2="70"/>
    <line x1="340" y1="90" x2="360" y2="70"/>
    <line x1="340" y1="240" x2="360" y2="220"/>
    <line x1="90" y1="240" x2="110" y2="220"/>
    <line x1="110" y1="70" x2="360" y2="70"/>
    <line x1="360" y1="70" x2="360" y2="220"/>
    <line x1="360" y1="220" x2="110" y2="220"/>
    <line x1="110" y1="220" x2="110" y2="70"/>
    <rect x="150" y="140" width="70" height="55" stroke-dasharray="6 4" stroke-width="1"/>
    <line x1="470" y1="70" x2="470" y2="240" stroke-dasharray="20 5 4 5" stroke-width="0.9"/>
    <rect x="540" y="90" width="130" height="150"/>
    <line x1="540" y1="200" x2="670" y2="200" stroke-width="1.2"/>
    <line x1="615" y1="90" x2="615" y2="240" stroke-dasharray="20 5 4 5" stroke-width="0.9"/>
    <line x1="560" y1="120" x2="650" y2="120" stroke-dasharray="6 4" stroke-width="1"/>
  </g>
  <g font-family="Helvetica, Arial, sans-serif" font-size="15" fill="${INK}">
    <text x="200" y="330" text-anchor="middle">FRONT ELEVATION</text>
    <text x="605" y="330" text-anchor="middle">RIGHT SIDE VIEW</text>
    <text x="200" y="355" text-anchor="middle">(third-angle projection)</text>
  </g>
  ${dimH(90, 340, 240, '250')}
  ${dimV(90, 90, 240, '150')}
  ${dimH(540, 670, 240, '130')}
  ${dimV(540, 90, 240, '150')}
  ${leader(185, 150, 210, 430, 'hidden recess 70 x 55')}
  ${titleBlock(560, 380, 250, 130, ['ORTHOGRAPHIC SET', 'Drawn: R. Santos', 'Scale 1:20', 'SDG 11 — Sustainable Cities'])}
`)

const plateIsometric = svg(`
  <g stroke="${INK}" fill="none" stroke-width="1.6" stroke-linejoin="round">
    <path d="M150 300 L330 200 L510 300 L330 400 Z"/>
    <path d="M150 300 L150 400 L330 500 L330 400"/>
    <path d="M510 300 L510 400 L330 500"/>
    <path d="M240 250 L420 350 L420 290 L240 190 Z" stroke-width="1"/>
  </g>
  <g font-family="Helvetica, Arial, sans-serif" font-size="15" fill="${INK}">
    <text x="330" y="545" text-anchor="middle">ISOMETRIC AXONOMETRIC VIEW — 30° / 30° axes</text>
  </g>
  <g stroke="${INK}" stroke-width="1" fill="none">
    <line x1="150" y1="560" x2="330" y2="460" stroke-dasharray="4 3"/>
    <line x1="330" y1="460" x2="510" y2="560" stroke-dasharray="4 3"/>
    <line x1="150" y1="560" x2="330" y2="660" stroke-dasharray="4 3"/>
    <text x="170" y="575" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="${INK}">30°</text>
    <text x="500" y="575" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="${INK}">30°</text>
  </g>
  ${titleBlock(600, 330, 250, 130, ['ISOMETRIC SOLID', 'Exercise 3-2', 'Scale: NTS', 'SDG 9 — Innovation'])}
`)

const plateSection = svg(`
  <g stroke="${INK}" fill="none" stroke-width="1.6">
    <path d="M120 120 L420 120 L420 200 L120 200 Z"/>
    <path d="M150 200 L150 320 L390 320 L390 200"/>
    <line x1="270" y1="120" x2="270" y2="200" stroke-width="1"/>
    <line x1="120" y1="260" x2="420" y2="260" stroke-dasharray="18 6 4 6 2 6" stroke-width="1"/>
    <line x1="80" y1="380" x2="460" y2="380" stroke-width="2.6"/>
    <line x1="80" y1="360" x2="120" y2="360" stroke-width="0.5"/>
    <line x1="420" y1="360" x2="460" y2="360" stroke-width="0.5"/>
    <line x1="96" y1="364" l0 32 M120 364 l0 32" stroke-width="2.4"/>
    <line x1="400" y1="364" l0 32 M424 364 l0 32" stroke-width="2.4"/>
    <g stroke-width="1" stroke-dasharray="8 5 2 5 2 5">
      <line x1="140" y1="90" x2="140" y2="360"/>
      <line x1="200" y1="90" x2="200" y2="360"/>
      <line x1="340" y1="90" x2="340" y2="360"/>
      <line x1="400" y1="90" x2="400" y2="360"/>
    </g>
    <text x="158" y="82" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="${INK}">A</text>
    <text x="218" y="82" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="${INK}">A</text>
    <text x="358" y="82" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="${INK}">A</text>
    <text x="418" y="82" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="${INK}">A</text>
  </g>
  <g font-family="Helvetica, Arial, sans-serif" font-size="15" fill="${INK}">
    <text x="270" y="430" text-anchor="middle">FULL SECTION A–A WITH HATCHING AT 45°</text>
  </g>
  ${titleBlock(560, 200, 260, 150, ['SECTION A-A', 'Hatch angle: 45°', 'Scale 1:15', 'SDG 9 — Infrastructure'])}
`)

const plateDimensioning = svg(`
  <g stroke="${INK}" fill="none" stroke-width="1.6">
    <rect x="150" y="120" width="300" height="180"/>
    <rect x="200" y="170" width="120" height="80" stroke-width="1.2"/>
    <circle cx="400" cy="210" r="18" stroke-width="1.2"/>
  </g>
  ${dimH(150, 450, 300, '300 (overall)')}
  ${dimH(200, 320, 345, '120 (reference)')}
  ${dimH(150, 200, 388, '50')}
  ${dimV(150, 120, 300, '180')}
  ${dimV(200, 170, 250, '80')}
  <g font-family="Helvetica, Arial, sans-serif" font-size="12" fill="${INK}">
    <text x="150" y="430">Rules: place dimensions outside the view; never dimension to hidden lines;</text>
    <text x="150" y="450">avoid duplicating dimensions; prefer functional (operational) sizes.</text>
  </g>
  ${titleBlock(560, 300, 260, 140, ['DIMENSIONING PLATE', 'Avoid duplication', 'Scale 1:10', 'SDG 4 — Quality Education'])}
`)

const plateAuxiliary = svg(`
  <g stroke="${INK}" fill="none" stroke-width="1.6">
    <rect x="90" y="120" width="220" height="150"/>
    <line x1="90" y1="150" x2="310" y2="150" stroke-width="1.1"/>
    <line x1="90" y1="240" x2="310" y2="240" stroke-width="1.1"/>
    <g stroke-dasharray="18 5 4 5" stroke-width="0.9">
      <line x1="350" y1="270" x2="470" y2="120"/>
      <line x1="350" y1="270" x2="610" y2="270"/>
    </g>
    <path d="M470 120 L640 240 L640 400 L470 280 Z" stroke-width="1.4"/>
    <line x1="470" y1="180" x2="640" y2="300" stroke-width="1.1"/>
    <line x1="470" y1="240" x2="640" y2="360" stroke-width="1.1"/>
    <text x="360" y="440" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="${INK}">fold line (45°)</text>
  </g>
  <g font-family="Helvetica, Arial, sans-serif" font-size="15" fill="${INK}">
    <text x="200" y="330" text-anchor="middle">FRONT VIEW</text>
    <text x="555" y="440" text-anchor="middle">AUXILIARY VIEW (projected true size)</text>
  </g>
  ${titleBlock(120, 470, 250, 120, ['AUXILIARY VIEW', 'True size of slope', 'Scale 1:12', 'SDG 11 — Resilient cities'])}
`)

const plateCartography = svg(`
  <g stroke="${INK}" fill="none">
    <path d="M110 470 L140 200 L330 130 L520 190 L560 400 L430 500 Z" stroke-width="1.8"/>
    <path d="M170 250 L360 210 L470 260 L420 380 L230 400 Z" stroke-width="1" stroke-dasharray="8 5"/>
    <g stroke-width="1.2">
      <path d="M110 470 L300 200 L560 400"/>
      <path d="M140 200 L420 380 L430 500"/>
      <path d="M330 130 L230 400"/>
    </g>
    <rect x="250" y="290" width="60" height="45" stroke-width="1.6"/>
    <circle cx="280" cy="312" r="6" stroke-width="1"/>
    <g stroke="#1d4ed8" stroke-width="1.4">
      <path d="M120 440 C 200 400, 260 430, 340 400 S 480 350, 545 380"/>
    </g>
    <path d="M60 300 C 150 250, 300 290, 420 250 S 520 220, 580 240" stroke="#1d4ed8" stroke-width="1.2"/>
  </g>
  <g font-family="Helvetica, Arial, sans-serif" font-size="12" fill="${INK}">
    <text x="115" y="185">NORTH (grid north shown with meridian)</text>
    <text x="130" y="445">Scale 1:2000 — contour interval 2 m</text>
  </g>
  <g transform="translate(620,180)">
    <circle cx="40" cy="40" r="34" stroke="${INK}" stroke-width="1.6" fill="none"/>
    <path d="M40 6 L48 40 L40 74 L32 40 Z" fill="${TEAL}"/>
    <text x="40" y="98" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="${INK}" text-anchor="middle">N</text>
  </g>
  ${titleBlock(600, 300, 240, 150, ['SITE PLAN', 'Barangay flood-mapping', 'Scale 1:2000', 'SDG 13 — Climate Action'])}
`)

const plateSchematic = svg(`
  <g stroke="${INK}" fill="none" stroke-width="1.6">
    <rect x="110" y="120" width="180" height="90"/>
    <rect x="440" y="120" width="200" height="90"/>
    <rect x="110" y="380" width="180" height="90"/>
    <rect x="440" y="380" width="200" height="90"/>
    <path d="M290 150 L440 150" marker-end="none"/>
    <path d="M300 156 L428 156"/>
    <path d="M290 400 L440 400"/>
    <path d="M200 210 L200 380"/>
    <circle cx="200" cy="295" r="26" stroke-width="1.2"/>
    <circle cx="540" cy="295" r="26" stroke-width="1.2"/>
    <path d="M200 295 L540 295" stroke-dasharray="10 6" stroke-width="1"/>
    <path d="M540 210 L540 380"/>
  </g>
  <g font-family="Helvetica, Arial, sans-serif" font-size="12" fill="${INK}">
    <text x="130" y="170">SOLAR PANEL ARRAY</text>
    <text x="460" y="170">INVERTER</text>
    <text x="130" y="430">BATTERY BANK</text>
    <text x="460" y="430">LOAD / LAMP LOOP</text>
    <text x="170" y="300">CHARGE</text>
    <text x="510" y="300">LOAD</text>
    <text x="300" y="145">DC BUS</text>
  </g>
  <g transform="translate(430,196)"><path d="M0 0 l10 0 M0 0 l0 10" stroke="${INK}" stroke-width="1"/></g>
  ${titleBlock(600, 120, 240, 160, ['SCHEMATIC — SOLAR', 'Off-grid lighting system', 'Scale: NTS', 'SDG 13 — Climate Action'])}
`)

const plateRendering = svg(`
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#bae6fd"/><stop offset="100%" stop-color="#fef3c7"/>
    </linearGradient>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e7e5e4"/><stop offset="100%" stop-color="#a8a29e"/>
    </linearGradient>
  </defs>
  <rect x="90" y="90" width="520" height="300" fill="url(#sky)"/>
  <rect x="120" y="220" width="200" height="170" fill="url(#wall)"/>
  <path d="M120 220 L220 170 L420 170 L320 220 Z" fill="#78716c"/>
  <rect x="150" y="260" width="60" height="50" fill="#0ea5e9"/>
  <rect x="230" y="260" width="60" height="50" fill="#0ea5e9" opacity="0.8"/>
  <rect x="400" y="200" width="150" height="190" fill="#d6d3d1"/>
  <path d="M400 200 L475 150 L550 200 Z" fill="#57534e"/>
  <rect x="430" y="240" width="40" height="60" fill="#fbbf24"/>
  <rect x="90" y="390" width="520" height="40" fill="#a7f3d0"/>
  <g stroke="${INK}" stroke-width="1" fill="none" opacity="0.6">
    <line x1="90" y1="120" x2="610" y2="120" stroke-dasharray="3 5"/>
    <line x1="90" y1="200" x2="610" y2="200" stroke-dasharray="3 5"/>
  </g>
  <text x="90" y="470" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="${INK}">Value study: one-point perspective, consistent light source from the left</text>
  ${titleBlock(600, 90, 240, 150, ['RENDERING STUDY', 'Pastel + marker', 'Scale: NTS', 'SDG 11 — Green community'])}
`)

const plateLettering = svg(`
  <g fill="${INK}" font-family="Helvetica, Arial, sans-serif">
    <text x="120" y="120" font-size="44" letter-spacing="2">ABCDEFGHIJKLMNOPQRSTUVWXYZ</text>
    <text x="120" y="175" font-size="44" letter-spacing="2">abcdefghijklmnopqrstuvwxyz</text>
    <text x="120" y="230" font-size="44" letter-spacing="2">0123456789 . , : ; / ( ) = + - % ° ′ ″</text>
  </g>
  <g stroke="${INK}" stroke-width="0.5" fill="none">
    ${[120, 240, 360, 480, 600, 720].map((x) => `<line x1="${x}" y1="260" x2="${x}" y2="420"/>`).join('')}
    ${[280, 300, 320, 340, 360, 380, 400].map((y) => `<line x1="100" y1="${y}" x2="740" y2="${y}"/>`).join('')}
  </g>
  <g fill="${INK}" font-family="Helvetica, Arial, sans-serif">
    <text x="130" y="320" font-size="64">TECHNICAL</text>
    <text x="130" y="390" font-size="64">DRAWING 11</text>
  </g>
  <text x="120" y="470" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="${INK}">Ratio 1 : 2 (2 : 1 width to height) · single-stroke Gothic · uniform line weight</text>
  ${titleBlock(560, 280, 260, 130, ['TECHNICAL LETTERING', 'Ratio 1:2', 'Scale 1:1', 'SDG 4 — Quality Education'])}
`)

const plateScale = svg(`
  <g stroke="${INK}" fill="none" stroke-width="1.5">
    <rect x="110" y="120" width="220" height="120"/>
    <rect x="330" y="120" width="120" height="120"/>
    <rect x="450" y="120" width="180" height="120"/>
    <path d="M120 470 L180 420 L240 470 Z" stroke-width="1.2"/>
    <path d="M260 470 L300 440 L340 470 Z" stroke-width="1.2"/>
    <line x1="110" y1="330" x2="660" y2="330"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="${110 + i * 110}" y1="320" x2="${110 + i * 110}" y2="340"/>`).join('')}
  </g>
  <g font-family="Helvetica, Arial, sans-serif" font-size="13" fill="${INK}">
    <text x="160" y="360">0</text><text x="270" y="360">1</text><text x="380" y="360">2</text>
    <text x="490" y="360">3</text><text x="600" y="360">4</text><text x="700" y="360">5 m</text>
    <text x="130" y="105">Scale 1:50 — drawing 220 mm</text>
    <text x="350" y="105">Scale 1:100 — drawing 120 mm</text>
    <text x="470" y="105">Scale 1:20 — drawing 180 mm</text>
  </g>
  ${titleBlock(600, 380, 240, 140, ['SCALE COMPARISON', 'Metres on site', 'Scale 1:50', 'SDG 9 — Built environment'])}
`)

const plateOblique = svg(`
  <g stroke="${INK}" fill="none" stroke-width="1.6" stroke-linejoin="round">
    <rect x="130" y="150" width="280" height="200"/>
    <path d="M410 150 L500 100 L500 300 L410 350 Z"/>
    <path d="M130 150 L220 100 L500 100 L410 150"/>
    <path d="M130 350 L220 300 L500 300 L410 350"/>
    <line x1="180" y1="150" x2="270" y2="100" stroke-width="1.1"/>
    <line x1="180" y1="350" x2="270" y2="300" stroke-width="1.1"/>
  </g>
  <text x="315" y="420" font-family="Helvetica, Arial, sans-serif" font-size="15" fill="${INK}" text-anchor="middle">CAVALIER OBLIQUE (45°, scale 1:1)</text>
  ${titleBlock(600, 160, 250, 130, ['OBLIQUE PROJECTION', 'Circular objects in true shape', 'Scale 1:20', 'SDG 4 — Foundation'])}
`)

const plateLadderFrame = svg(`
  <g stroke="${INK}" fill="none" stroke-width="1.2">
    <rect x="70" y="60" width="760" height="500"/>
    <rect x="80" y="70" width="740" height="480" stroke-width="0.6"/>
  </g>
  <g font-family="Helvetica, Arial, sans-serif" font-size="15" fill="${INK}">
    ${[1, 2, 3, 4, 5].map((n) => `<text x="95" y="${110 + (n - 1) * 88}">${n}</text>`).join('')}
    ${['A', 'B', 'C', 'D', 'E', 'F'].map((c, i) => `<text x="${95 + (i + 1) * 100}" y="540">${c}</text>`).join('')}
  </g>
  <g stroke="${INK}" stroke-width="0.4" fill="none">
    ${[1, 2, 3, 4, 5].map((n) => `<line x1="70" y1="${100 + (n - 1) * 88}" x2="830" y2="${100 + (n - 1) * 88}"/>`).join('')}
    ${['A', 'B', 'C', 'D', 'E', 'F'].map((c, i) => `<line x1="${90 + (i + 1) * 100}" y1="60" x2="${90 + (i + 1) * 100}" y2="560"/>`).join('')}
  </g>
  ${titleBlock(600, 340, 220, 130, ['DRAWING FRAME', 'Ladder & grid reference', 'ISO A1', 'SDG 4 — Standards'])}
`)

const plateSolarSection = svg(`
  <g stroke="${INK}" fill="none" stroke-width="1.5">
    <rect x="120" y="120" width="380" height="90"/>
    <path d="M160 120 L200 60 L420 60 L460 120"/>
    <g stroke-width="0.8">
      ${[180, 220, 260, 300, 340, 380, 420].map((x) => `<line x1="${x}" y1="120" x2="${x + 40}" y2="60"/>`).join('')}
    </g>
    <line x1="180" y1="210" x2="180" y2="420" stroke-width="1.2"/>
    <line x1="440" y1="210" x2="440" y2="420" stroke-width="1.2"/>
    <line x1="180" y1="420" x2="440" y2="420"/>
    <path d="M200 420 L260 380 L320 420 Z" stroke-width="1.1"/>
    <circle cx="310" cy="330" r="28" stroke-width="1.1" stroke-dasharray="6 4"/>
    <path d="M300 320 l20 20 M320 320 l-20 20" stroke-width="1.4"/>
  </g>
  <g font-family="Helvetica, Arial, sans-serif" font-size="13" fill="${INK}">
    <text x="300" y="450" text-anchor="middle">BATTERY ENCLOSURE — 260 x 200 x 180 (mm)</text>
    <text x="120" y="480">Cross-section shows IP65 sealed casing and cable gland entry.</text>
  </g>
  ${titleBlock(600, 200, 240, 140, ['DETAIL SECTION', 'Sealed battery unit', 'Scale 2:1', 'SDG 13 — Climate Action'])}
`)

export const PLATE_SEED = [
  {
    id: 'plate-01',
    title: 'Line Types & Line Weight Reference Plate',
    topic: 'Line Types & Line Weight',
    difficulty: 'Beginner',
    sdgs: [4],
    quarter: 'q1',
    pages: 1,
    scale: 'NTS',
    description:
      'Master reference for the eight ISO line types and their relative weights. Use it as a visual gauge before every plate you draw.',
    svg: plateLineTypes,
    featured: true,
  },
  {
    id: 'plate-02',
    title: 'Orthographic Projection: Three-View Set',
    topic: 'Orthographic Projection',
    difficulty: 'Beginner',
    sdgs: [11],
    quarter: 'q1',
    pages: 1,
    scale: '1:20',
    description:
      'Front elevation, top view and right side view of a sustainable drainage structure, laid out in third-angle projection.',
    svg: plateOrthographic,
    featured: true,
  },
  {
    id: 'plate-03',
    title: 'Isometric Axonometric Study',
    topic: 'Isometric & Oblique Drawing',
    difficulty: 'Beginner',
    sdgs: [9],
    quarter: 'q1',
    pages: 1,
    scale: 'NTS',
    description:
      '30°/30° isometric construction of a modular water tank, with construction lines revealed for tracing practice.',
    svg: plateIsometric,
  },
  {
    id: 'plate-04',
    title: 'Full Section A–A with 45° Hatching',
    topic: 'Sectional Views',
    difficulty: 'Intermediate',
    sdgs: [9],
    quarter: 'q2',
    pages: 1,
    scale: '1:15',
    description:
      'A cut through a modular housing frame showing cutting-plane line conventions, hatching direction and cut arrows.',
    svg: plateSection,
    featured: true,
  },
  {
    id: 'plate-05',
    title: 'Dimensioning Rules in Practice',
    topic: 'Dimensioning',
    difficulty: 'Intermediate',
    sdgs: [4],
    quarter: 'q2',
    pages: 1,
    scale: '1:10',
    description:
      'Chain, parallel, baseline and reference dimensions annotated on a single part, with the redundancy rules made visible.',
    svg: plateDimensioning,
  },
  {
    id: 'plate-06',
    title: 'Auxiliary View from 45° Fold Line',
    topic: 'Auxiliary Views',
    difficulty: 'Advanced',
    sdgs: [11],
    quarter: 'q2',
    pages: 1,
    scale: '1:12',
    description:
      'Projecting the true size of an inclined roof face for a climate-resilient community building.',
    svg: plateAuxiliary,
  },
  {
    id: 'plate-07',
    title: 'Site Plan: Flood-Risk Mapping',
    topic: 'Cartography & Site Plans',
    difficulty: 'Advanced',
    sdgs: [13, 11],
    quarter: 'q3',
    pages: 1,
    scale: '1:2000',
    description:
      'Topographic site plan with a watercourse, flood-prone zone, road hierarchy and true-north meridian.',
    svg: plateCartography,
    featured: true,
  },
  {
    id: 'plate-08',
    title: 'Schematic: Off-Grid Solar Lighting System',
    topic: 'Schematic Diagrams',
    difficulty: 'Intermediate',
    sdgs: [13],
    quarter: 'q3',
    pages: 1,
    scale: 'NTS',
    description:
      'Block-and-line schematic of a solar array, inverter, battery bank and lamp loop for a rural classroom.',
    svg: plateSchematic,
  },
  {
    id: 'plate-09',
    title: 'Rendering Study: Community Center',
    topic: 'Rendering & Shading',
    difficulty: 'Intermediate',
    sdgs: [11],
    quarter: 'q4',
    pages: 1,
    scale: 'NTS',
    description:
      'One-point perspective value study with a consistent light source, used to bridge drafting and presentation.',
    svg: plateRendering,
  },
  {
    id: 'plate-10',
    title: 'Technical Lettering Plate — 1:2 Ratio',
    topic: 'Technical Lettering',
    difficulty: 'Beginner',
    sdgs: [4],
    quarter: 'q1',
    pages: 1,
    scale: '1:1',
    description:
      'Alph-numeral specimen sheet with guide boxes for single-stroke Gothic practice and title-block lettering.',
    svg: plateLettering,
  },
  {
    id: 'plate-11',
    title: 'Scale Comparison Plate',
    topic: 'Scale & Measurement',
    difficulty: 'Beginner',
    sdgs: [9],
    quarter: 'q1',
    pages: 1,
    scale: '1:50',
    description:
      'The same building footprint at 1:50, 1:100 and 1:20 with a graphic scale bar for reading off distances.',
    svg: plateScale,
  },
  {
    id: 'plate-12',
    title: 'Cavalier Oblique Projection',
    topic: 'Isometric & Oblique Drawing',
    difficulty: 'Intermediate',
    sdgs: [4],
    quarter: 'q2',
    pages: 1,
    scale: '1:20',
    description:
      'Cavalier projection at 45° with a 1:1 receding scale, preserving circular features in true shape.',
    svg: plateOblique,
  },
  {
    id: 'plate-13',
    title: 'Drawing Frame with Ladder & Grid',
    topic: 'Technical Drawing Conventions',
    difficulty: 'Beginner',
    sdgs: [4],
    quarter: 'q1',
    pages: 1,
    scale: 'ISO A1',
    description:
      'Sheet border, title block zone and the ladder/grid reference system required for multi-plate submissions.',
    svg: plateLadderFrame,
  },
  {
    id: 'plate-14',
    title: 'Detail Section: Sealed Battery Unit',
    topic: 'Sectional Views',
    difficulty: 'Advanced',
    sdgs: [13, 9],
    quarter: 'q3',
    pages: 1,
    scale: '2:1',
    description:
      'Enlarged cross-section of an IP65 battery enclosure, aligning with SDG 13 energy and reliability goals.',
    svg: plateSolarSection,
  },
]

export const PDF_SEED = [
  {
    id: 'pdf-01',
    title: 'Lesson 1 — Line Types, Line Weight & Pencil Control',
    topic: 'Line Types & Line Weight',
    quarter: 'q1',
    sdgs: [4],
    pages: 4,
    sizeKb: 186,
    published: true,
    summary:
      'How to keep a uniform line weight freehand, the ISO line-type families, and how line weight communicates object hierarchy.',
    sections: [
      {
        heading: 'Learning targets',
        bullets: [
          'Produce four visible line weights that remain distinguishable at print scale.',
          'Select the correct line type for visible, hidden, centre and cutting-plane edges.',
          'Explain why line hierarchy matters in a safety-critical drawing.',
        ],
      },
      {
        heading: 'Why this matters for SDG 4',
        body: 'Clear, conventional line work is the language of technical communication. A student who cannot read a line cannot contribute to a safer, more efficient design process later. This lesson treats drafting literacy as the foundation of quality technical education.',
      },
      {
        heading: 'Procedure',
        body: [
          '1. Sharpen your pencil to a 2H for construction lines and a 2B for final outlines.',
          '2. Draw construction lines at 0.25 mm equivalent — light, continuous, never broken.',
          '3. Darken visible outlines in one confident stroke. Never go over the same line twice.',
          '4. Add hidden details with the same pencil but 0.35 mm, using a dashed pattern.',
          '5. Erase construction lines with a soft eraser held at a shallow angle to avoid burnishing the paper.',
        ],
      },
      {
        heading: 'Checkpoint task',
        body: 'Draw the block in Plate 01 at 1:1. Label each of the eight line types you used. Upload your plate to the Drawings Library for teacher feedback.',
      },
    ],
  },
  {
    id: 'pdf-02',
    title: 'Lesson 2 — Orthographic Projection in Three Views',
    topic: 'Orthographic Projection',
    quarter: 'q1',
    sdgs: [11],
    pages: 5,
    sizeKb: 214,
    published: true,
    summary:
      'Third-angle projection layout, projection rules between views, and reading a three-view set of a drainage structure.',
    sections: [
      {
        heading: 'Learning targets',
        bullets: [
          'Lay out front, top and side views using the 45° miter line or projector method.',
          'Apply the "width equals width, height equals height" projection rules without error.',
          'Justify third-angle over first-angle projection for a manufacturing context.',
        ],
      },
      {
        heading: 'The 45° mitre line method',
        body: [
          'Draw the front view first in the most descriptive position.',
          'From each corner of the front view, draw thin projectors at 45° to the mitre line.',
          'From the mitre line, project horizontally into the top view position.',
          'From the top view corners, project vertically down to locate the side view depth.',
          'Complete the side view, then darken all visible edges to 0.5 mm.',
        ],
      },
      {
        heading: 'Context: sustainable drainage',
        body: 'The worked example is a pre-cast stormwater inspection chamber. Sustainable cities depend on drainage systems that can be built accurately from drawings, so the projection accuracy you practise here translates directly to civic infrastructure.',
      },
      {
        heading: 'Checkpoint task',
        body: 'Reproduce Plate 02 at 1:20. Upload to My Submissions and self-check against the Technical Skills Checklist.',
      },
    ],
  },
  {
    id: 'pdf-03',
    title: 'Lesson 3 — Dimensioning Without Redundancy',
    topic: 'Dimensioning',
    quarter: 'q2',
    sdgs: [4],
    pages: 4,
    sizeKb: 172,
    published: true,
    summary:
      'Chain, parallel, baseline and reference dimensioning. Choosing functional over nominal dimensions and eliminating duplicates.',
    sections: [
      {
        heading: 'Learning targets',
        bullets: [
          'Choose between chain, parallel and baseline dimensioning and justify the choice.',
          'Place dimensions where they are easiest to read, never dimensioning to hidden lines.',
          'Mark reference dimensions in parentheses so they are not used for manufacture.',
        ],
      },
      {
        heading: 'The six rules',
        body: [
          '1. Put dimensions where the feature is most clearly shown.',
          '2. Never dimension to a hidden line or a centre line.',
          '3. Do not repeat a dimension in the same view; give it once.',
          '4. Avoid using a dimension chain when the end result matters — dimension the end result.',
          '5. Leave a clear gap between the dimension and the object.',
          '6. Use millimetres throughout; write the unit once in the title block.',
        ],
      },
      {
        heading: 'Checkpoint task',
        body: 'Dimension Plate 05 twice: once with chain dimensions and once with parallel dimensions. Explain in a caption which you would submit to a fabricator and why.',
      },
    ],
  },
  {
    id: 'pdf-04',
    title: 'Lesson 4 — Sectional Views and Hatching',
    topic: 'Sectional Views',
    quarter: 'q2',
    sdgs: [9],
    pages: 5,
    sizeKb: 231,
    published: true,
    summary:
      'Full, half, offset and revolved sections. Cutting-plane line conventions, hatch spacing and what must never be hatched.',
    sections: [
      {
        heading: 'Learning targets',
        bullets: [
          'Choose the correct section type for a given part and drawing intent.',
          'Draw cutting-plane lines with the correct thickness, arrowheads and letters.',
          'Apply hatch at 45° with even spacing and never hatch fasteners or ribs longitudinally.',
        ],
      },
      {
        heading: 'Hatch spacing',
        body: 'Use 2–3 mm between lines on a 1:1 drawing. Keep spacing constant across the entire cut surface. Adjacent different parts use opposite 45° directions or different spacing angles so the interface remains readable.',
      },
      {
        heading: 'Context: modular housing',
        body: 'A sectioned modular housing frame is the SDG 9 example: industry and infrastructure require drawings that a factory can interpret without ambiguity.',
      },
      {
        heading: 'Checkpoint task',
        body: 'Create a full section for Plate 04 and identify three features you deliberately left unhatched, stating the reason for each.',
      },
    ],
  },
  {
    id: 'pdf-05',
    title: 'Lesson 5 — Reading and Drawing Site Plans',
    topic: 'Cartography & Site Plans',
    quarter: 'q3',
    sdgs: [13, 11],
    pages: 6,
    sizeKb: 268,
    published: true,
    summary:
      'Contours, spot heights, watercourses, road hierarchy, flood-prone overlays and true-north indication for community site plans.',
    sections: [
      {
        heading: 'Learning targets',
        bullets: [
          'Interpret contour lines and spot heights to read ground slope.',
          'Symbolise watercourses, flood-prone zones and built footprints consistently.',
          'State a representative scale and contour interval for a community site plan.',
        ],
      },
      {
        heading: 'Flood-risk overlay',
        body: 'A 100-year flood level is drawn as a distinct boundary. Buildings inside this boundary require raised floor levels; this single convention communicates a climate adaptation decision to every reader of the plan.',
      },
      {
        heading: 'Checkpoint task',
        body: 'Sketch a flood-risk site plan for your own barangay at 1:2000. Mark the watercourse, the road hierarchy and two proposed community facilities.',
      },
    ],
  },
  {
    id: 'pdf-06',
    title: 'Lesson 6 — Schematics for Community Energy Systems',
    topic: 'Schematic Diagrams',
    quarter: 'q3',
    sdgs: [13, 9],
    pages: 4,
    sizeKb: 158,
    published: true,
    summary:
      'Block-and-line schematic conventions for a solar lighting system: array, controller, inverter, battery bank and load loop.',
    sections: [
      {
        heading: 'Learning targets',
        bullets: [
          'Draw a single-line schematic using standard blocks and directional flow arrows.',
          'Label every component and the cable path without cluttering the drawing.',
          'Connect a schematic to a real community off-grid lighting need.',
        ],
      },
      {
        heading: 'Component order',
        body: 'Array → charge controller → inverter → battery bank → load. Draw the load loop last so the drawing builds from source to use.',
      },
    ],
  },
  {
    id: 'pdf-07',
    title: 'Lesson 7 — Rendering Values and Light Consistency',
    topic: 'Rendering & Shading',
    quarter: 'q4',
    sdgs: [11],
    pages: 5,
    sizeKb: 205,
    published: true,
    summary:
      'Building a value scale in greyscale, choosing one light direction, and rendering a technical drawing as a presentation image.',
    sections: [
      {
        heading: 'Learning targets',
        bullets: [
          'Mix a five-step value scale and apply it consistently across a rendering.',
          'Keep a single light source; check cast shadows all point the same way.',
          'Translate line work into a presentation rendering without losing accuracy.',
        ],
      },
      {
        heading: 'Value scale practice',
        body: 'Fill five equal squares from pure black to white. Label them 1 to 5. Use this scale to check every mid-tone in your rendering before you add colour.',
      },
    ],
  },
  {
    id: 'pdf-08',
    title: 'Lesson 8 — Technical Lettering for Title Blocks',
    topic: 'Technical Lettering',
    quarter: 'q1',
    sdgs: [4],
    pages: 3,
    sizeKb: 141,
    published: true,
    summary: 'Single-stroke Gothic at a 1:2 ratio, spacing rhythm, and the minimum text standard for a submittable sheet.',
    sections: [
      {
        heading: 'Learning targets',
        bullets: [
          'Write legible single-stroke letters at a 1:2 width-to-height ratio.',
          'Maintain uniform stroke weight and consistent spacing.',
          'Complete a title block that satisfies sheet identification requirements.',
        ],
      },
      {
        heading: 'Minimum text standard',
        body: 'Title, scale, sheet number, date, drawn-by and approved-by must all be present. Missing identification is the most common reason a plate is returned.',
      },
    ],
  },
  {
    id: 'pdf-09',
    title: 'Assessment Pack — Technical Skills Checklist & Design Rubric',
    topic: 'Technical Drawing Conventions',
    quarter: 'q4',
    sdgs: [4, 9],
    pages: 7,
    sizeKb: 244,
    published: true,
    summary:
      'The full instrument used in this study: the 12-point technical skills checklist, the 5-criterion design performance rubric, and the Likert questionnaire.',
    sections: [
      {
        heading: 'Technical Skills Checklist (12 indicators)',
        bullets: [
          'Uses correct line types and line weights consistently.',
          'Applies the correct projection method between views.',
          'Constructs views with accurate alignment and transfer.',
          'Places dimensions clearly, legibly and without redundancy.',
          'Uses proper dimension arrows, leaders and extension lines.',
          'Draws accurate sections with correct hatch angle and spacing.',
          'Applies standard symbols and conventional representations.',
          'Maintains uniform, single-stroke line quality.',
          'Completes an accurate title block with all required data.',
          'Selects and applies an appropriate drawing scale.',
          'Keeps the sheet neat, legible and free of stray marks.',
          'Submits within the deadline and follows the file-naming convention.',
        ],
      },
      {
        heading: 'Design Performance Rubric (5 criteria, 1–5)',
        bullets: [
          'Technical accuracy and completeness of the drawing.',
          'Appropriateness of conventions, scale and layout.',
          'Creativity and originality of the solution presented.',
          'Relevance to the SDG sustainability context.',
          'Clarity of communication and quality of presentation.',
        ],
      },
      {
        heading: 'Usefulness and Relevance Questionnaire (Likert 1–5)',
        body: 'Ten Likert items across three domains — technical skill development, design performance, and usefulness/relevance of the platform. The neutral point is 3.00; responses are analysed with a one-sample t-test against that value.',
      },
    ],
  },
  {
    id: 'pdf-10',
    title: 'Reference — ISO Line & Symbol Standards Digest',
    topic: 'Technical Drawing Conventions',
    quarter: 'q4',
    sdgs: [4],
    pages: 8,
    sizeKb: 296,
    published: true,
    summary: 'A condensed standards digest used for the technical skills checklist scoring reference.',
    sections: [
      {
        heading: 'Line weights',
        body: 'Thin lines 0.25–0.35 mm. Visible outlines 0.5 mm. Cutting planes 0.7 mm. Frames 1.4 mm. Print at 100% scale; do not scale a plot to fit.',
      },
      {
        heading: 'Common symbols',
        bullets: [
          'Centre mark: two thin chain-dash lines crossing at the arc centre.',
          'Radius: R followed by the value, preceded by a leader arrow.',
          'Diameter: the diameter symbol followed by the value.',
          'Square: the square symbol followed by the side value.',
        ],
      },
    ],
  },
  {
    id: 'pdf-11',
    title: 'Draft 2 — Auxiliary Views (unpublished review copy)',
    topic: 'Auxiliary Views',
    quarter: 'q2',
    sdgs: [11],
    pages: 4,
    sizeKb: 189,
    published: false,
    summary: 'Pending review: fold-line placement and the common error of projecting from a misaligned fold line.',
    sections: [{ heading: 'Status', body: 'This draft is not yet released to students. Ask your teacher to publish it from the teacher console.' }],
  },
  {
    id: 'pdf-12',
    title: 'Guide — Uploading Drawings and Using the Zoom Viewer',
    topic: 'Technical Drawing Conventions',
    quarter: 'q1',
    sdgs: [4],
    pages: 2,
    sizeKb: 96,
    published: true,
    summary: 'A short walkthrough of the Drawings Library: filters, zoom and pan, upload requirements and feedback workflow.',
    sections: [
      {
        heading: 'Upload requirements',
        bullets: [
          'PDF, PNG or JPG, up to 10 MB.',
          'Name your file SURNAME_PlateID_Q1.png so your teacher can find it.',
          'Scan or photograph flat, with even lighting and no fingers in frame.',
        ],
      },
      {
        heading: 'Getting feedback',
        body: 'Your teacher returns annotated feedback and a rubric score within five school days. Check My Submissions for the status: Submitted, Under review, or Returned with feedback.',
      },
    ],
  },
]

for (const doc of PDF_SEED) {
  // eslint-disable-next-line no-param-reassign
  doc.generated = true
  doc.url = lessonPdfUrl(doc.id, {
    title: doc.title,
    subtitle: doc.summary,
    meta: [`Grade 11 - Visual Graphics Design`, `SDG ${doc.sdgs.join(', SDG ')}`, `${doc.pages} pages`],
    sections: doc.sections,
  })
}

export const VIDEO_SEED = [
  {
    id: 'vid-01',
    title: 'Sketching: Freehand Line Quality in 12 Minutes',
    topic: 'Line Types & Line Weight',
    quarter: 'q1',
    sdgs: [4],
    duration: '12:04',
    level: 'Beginner',
    provider: 'youtube',
    videoId: 'MsXW_fErGBg',
    summary: 'Warm-up drills for a steady hand, pen pressure control, and how to correct a wobbly line without redrawing it.',
    tasks: [
      { id: 't1', title: 'Continuous line drill', detail: 'Draw 20 straight lines that start and end on your construction marks. Aim for < 1 mm deviation.' },
      { id: 't2', title: 'Weight ladder', detail: 'Draw the same square five times at 0.25, 0.5, 0.7, 1.0 and 1.4 mm equivalent weights.' },
      { id: 't3', title: 'Hidden detail drill', detail: 'Redraw Plate 02 with the hidden recess shown in a 0.35 mm dashed line.' },
    ],
  },
  {
    id: 'vid-02',
    title: 'Isometric Sketching: Building a Water Tank in 18 Minutes',
    topic: 'Isometric & Oblique Drawing',
    quarter: 'q1',
    sdgs: [9],
    duration: '18:22',
    level: 'Beginner',
    provider: 'youtube',
    videoId: 'nzgCmzXonj0',
    summary: 'Constructing an isometric grid, then boxing out a modular water tank step by step with a shared screen.',
    tasks: [
      { id: 't1', title: 'Grid warm-up', detail: 'Draw a 30° isometric grid covering a quarter of your sheet, both directions.' },
      { id: 't2', title: 'Box the tank', detail: 'Box out the 400 x 300 x 250 mm tank on your grid before adding any detail.' },
      { id: 't3', title: 'Add the inlet pipe', detail: 'Add the inlet pipe and the level-gauge window. Check every edge runs along a grid axis.' },
    ],
  },
  {
    id: 'vid-03',
    title: 'Rendering: Five-Step Value Scale for Beginners',
    topic: 'Rendering & Shading',
    quarter: 'q4',
    sdgs: [11],
    duration: '15:47',
    level: 'Intermediate',
    provider: 'youtube',
    videoId: 'VKO00lZ5c-4',
    summary: 'Mixing a controlled value scale, then rendering a community center box with one consistent light source.',
    tasks: [
      { id: 't1', title: 'Value scale', detail: 'Mix five distinct greys, darkest to lightest, and label them 1 to 5.' },
      { id: 't2', title: 'Box the building', detail: 'Render the community center in one-point perspective at value 2 walls, value 4 shadow, value 1 openings.' },
      { id: 't3', title: 'Check the light', detail: 'Add cast shadows. Every shadow must point away from the single light source you chose.' },
    ],
  },
  {
    id: 'vid-04',
    title: 'Dimensioning a Solar Mount: A Practical Walkthrough',
    topic: 'Dimensioning',
    quarter: 'q2',
    sdgs: [13],
    duration: '14:11',
    level: 'Intermediate',
    provider: 'youtube',
    videoId: 'nAXoQoWYVjY',
    summary: 'Dimensioning a real solar mounting bracket, deciding which dimensions are functional and which are reference.',
    tasks: [
      { id: 't1', title: 'Sketch then dimension', detail: 'Sketch a solar mount bracket, then dimension it twice: once nominally, once functionally.' },
      { id: 't2', title: 'Justify', detail: 'Write two sentences explaining which dimension set a fabricator must use and why.' },
    ],
  },
  {
    id: 'vid-05',
    title: 'Freehand Perspective Sketch: Your School in 20 Minutes',
    topic: 'Rendering & Shading',
    quarter: 'q4',
    sdgs: [11],
    duration: '20:35',
    level: 'Advanced',
    provider: 'youtube',
    videoId: 'rx4WTameWjo',
    summary: 'A location sketch of a familiar building, ending with a value pass and an SDG-relevant observation to annotate.',
    tasks: [
      { id: 't1', title: 'Two-minute thumbnails', detail: 'Produce six two-minute thumbnails of your school from different angles. Pick the clearest.' },
      { id: 't2', title: 'Refine one', detail: 'Refine the chosen thumbnail with construction lines, then clean up.' },
      { id: 't3', title: 'Value pass', detail: 'Add a three-value pass and annotate one sustainability feature you observed on site.' },
    ],
  },
  {
    id: 'vid-06',
    title: 'Sectional Views: Reading a Cut in a Community Building',
    topic: 'Sectional Views',
    quarter: 'q2',
    sdgs: [9],
    duration: '16:40',
    level: 'Advanced',
    provider: 'youtube',
    videoId: 'd-pWSWmyPgY',
    summary: 'Why sections exist, how the cutting-plane line is labelled, and what must never be hatched.',
    tasks: [
      { id: 't1', title: 'Label the plane', detail: 'Draw the cutting-plane line and arrows on Plate 04 before cutting anything.' },
      { id: 't2', title: 'Hatch at 45°', detail: 'Apply hatching at 45° with even spacing across the entire cut surface.' },
      { id: 't3', title: 'No-hatch audit', detail: 'Circle three features you left unhatched and write the standard that requires it.' },
    ],
  },
]

export const CHECKLIST_INDICATORS = [
  { id: 'c1', label: 'Uses correct line types and line weights consistently', domain: 'Technical Skills' },
  { id: 'c2', label: 'Applies the correct projection method between views', domain: 'Technical Skills' },
  { id: 'c3', label: 'Constructs views with accurate alignment and transfer', domain: 'Technical Skills' },
  { id: 'c4', label: 'Places dimensions clearly and without redundancy', domain: 'Technical Skills' },
  { id: 'c5', label: 'Uses proper dimension arrows, leaders and extension lines', domain: 'Technical Skills' },
  { id: 'c6', label: 'Draws accurate sections with correct hatch angle and spacing', domain: 'Technical Skills' },
  { id: 'c7', label: 'Applies standard symbols and conventional representations', domain: 'Technical Skills' },
  { id: 'c8', label: 'Maintains uniform, single-stroke line quality', domain: 'Technical Skills' },
  { id: 'c9', label: 'Completes an accurate title block with all required data', domain: 'Technical Skills' },
  { id: 'c10', label: 'Selects and applies an appropriate drawing scale', domain: 'Technical Skills' },
  { id: 'c11', label: 'Keeps the sheet neat, legible and free of stray marks', domain: 'Technical Skills' },
  { id: 'c12', label: 'Submits on time and follows the file-naming convention', domain: 'Technical Skills' },
]

export const RUBRIC_CRITERIA = [
  {
    id: 'r1',
    label: 'Technical accuracy and completeness of the drawing',
    weight: 30,
    domain: 'Design Performance',
    descriptors: {
      1: 'Major errors; views do not project correctly and the solution is unreadable.',
      2: 'Several projection or accuracy errors; needs substantial teacher correction.',
      3: 'Acceptable accuracy; minor errors that do not affect readability.',
      4: 'Accurate, complete drawing with only trivial deviations.',
      5: 'Exemplary accuracy; the drawing could be used as a class reference.',
    },
  },
  {
    id: 'r2',
    label: 'Appropriateness of conventions, scale and layout',
    weight: 20,
    domain: 'Design Performance',
    descriptors: {
      1: 'Conventions largely ignored; unusable sheet layout.',
      2: 'Some conventions applied but layout is disorganised.',
      3: 'Conventions mostly correct; layout is functional.',
      4: 'All conventions applied with a clear, efficient layout.',
      5: 'Layout is exemplary and teaches the conventions to others.',
    },
  },
  {
    id: 'r3',
    label: 'Creativity and originality of the solution',
    weight: 15,
    domain: 'Design Performance',
    descriptors: {
      1: 'No original development; copied directly.',
      2: 'Minimal variation on a copied example.',
      3: 'Some original development within the brief.',
      4: 'Clearly original and well-developed solution.',
      5: 'Highly original concept with thoughtful design decisions.',
    },
  },
  {
    id: 'r4',
    label: 'Relevance to the SDG sustainability context',
    weight: 20,
    domain: 'Design Performance',
    descriptors: {
      1: 'No connection to the sustainability context.',
      2: 'Superficial mention of sustainability only.',
      3: 'Sustainability considered but not integrated into the drawing.',
      4: 'Sustainability is clearly integrated into the design.',
      5: 'Sustainability is central and demonstrates deep understanding.',
    },
  },
  {
    id: 'r5',
    label: 'Clarity of communication and quality of presentation',
    weight: 15,
    domain: 'Design Performance',
    descriptors: {
      1: 'Cannot be understood without explanation.',
      2: 'Needs verbal explanation to be understood.',
      3: 'Understood with some effort.',
      4: 'Immediately clear and well presented.',
      5: 'Presentation quality is professional and engaging.',
    },
  },
]

export const SURVEY_DOMAINS = ['Technical Skill Development', 'Design Performance', 'Usefulness and Relevance']

export const SURVEY_ITEMS = [
  { id: 'q1', domain: 'Technical Skill Development', text: 'The lessons improved my technical drafting skills.', reverse: false },
  { id: 'q2', domain: 'Technical Skill Development', text: 'I can now apply line types and line weights correctly on my own plate.', reverse: false },
  { id: 'q3', domain: 'Technical Skill Development', text: 'I am more confident drawing orthographic projections.', reverse: false },
  { id: 'q4', domain: 'Technical Skill Development', text: 'I understand how to dimension a part without redundant dimensions.', reverse: false },
  { id: 'q5', domain: 'Technical Skill Development', text: 'I can produce an accurate sectional view.', reverse: false },
  { id: 'q6', domain: 'Design Performance', text: 'My design solutions are more complete and better organised than before.', reverse: false },
  { id: 'q7', domain: 'Design Performance', text: 'The drawing plates helped me generate original design ideas.', reverse: false },
  { id: 'q8', domain: 'Design Performance', text: 'I can present my design clearly to other people.', reverse: false },
  { id: 'q9', domain: 'Usefulness and Relevance', text: 'The VCD lessons are relevant to my current needs as a Grade 11 student.', reverse: false },
  { id: 'q10', domain: 'Usefulness and Relevance', text: 'The SDG context makes the lessons more meaningful.', reverse: false },
  { id: 'q11', domain: 'Usefulness and Relevance', text: 'I would recommend this learning platform to my classmates.', reverse: false },
  { id: 'q12', domain: 'Usefulness and Relevance', text: 'The platform works well even with limited internet connection.', reverse: true },
]

export const LIKERT_LABELS = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly agree' },
]

export const ANNOUNCEMENTS_SEED = [
  {
    id: 'an-1',
    title: 'Q3 site plan plate is now open',
    body: 'The flood-risk site plan activity (Lesson 5) is live. Use the Plate 07 viewer to trace the contour and flood boundary. Deadline: end of week.',
    audience: 'all',
    author: 'Teacher',
    createdAt: '2026-09-24T08:15:00.000Z',
    pinned: true,
  },
  {
    id: 'an-2',
    title: 'Reminder: survey closes on Friday',
    body: 'The usefulness and relevance questionnaire is the last part of the study. It takes about 6 minutes and is anonymous. Please complete it before Friday.',
    audience: 'students',
    author: 'Teacher',
    createdAt: '2026-09-22T13:00:00.000Z',
    pinned: false,
  },
  {
    id: 'an-3',
    title: 'Sketch canvas now saves to your submissions',
    body: 'Quick practice sketches made in the in-browser canvas can be submitted directly to the video activity for grading. Filenames are added automatically.',
    audience: 'students',
    author: 'Admin',
    createdAt: '2026-09-19T09:40:00.000Z',
    pinned: false,
  },
  {
    id: 'an-4',
    title: 'Device check for Thursday',
    body: 'Please clear the browser cache on the shared lab computers before the Thursday session so the PWA shell updates correctly.',
    audience: 'all',
    author: 'Admin',
    createdAt: '2026-09-15T11:05:00.000Z',
    pinned: false,
  },
]
