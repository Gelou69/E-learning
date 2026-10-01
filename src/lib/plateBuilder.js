import { SDG_MAP } from '../data/constants'

/**
 * Generates a clean, convention-correct placeholder plate when a teacher
 * adds a plate without uploading artwork. Keeps the gallery visually consistent.
 */
export function buildPlatePlaceholder({ title, subtitle, sdgs = [], scale = 'NTS' }) {
  const esc = (value) =>
    String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const sdgText = sdgs.map((id) => SDG_MAP[id]?.code).filter(Boolean).join('  ·  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620" width="900" height="620" role="img" aria-label="${esc(title)}">
  <rect width="900" height="620" fill="#fdfdfb"/>
  <rect x="20" y="20" width="860" height="580" fill="none" stroke="#111827" stroke-width="1.2"/>
  <rect x="32" y="32" width="836" height="556" fill="none" stroke="#111827" stroke-width="0.5"/>
  <g fill="none" stroke="#111827">
    <line x1="120" y1="140" x2="520" y2="140" stroke-width="1.6"/>
    <line x1="120" y1="140" x2="120" y2="420" stroke-width="1.6"/>
    <line x1="520" y1="140" x2="520" y2="420" stroke-width="1.6"/>
    <line x1="120" y1="420" x2="520" y2="420" stroke-width="1.6"/>
    <line x1="120" y1="140" x2="520" y2="420" stroke-width="0.4" stroke-dasharray="4 3" stroke="#94a3b8"/>
    <line x1="520" y1="140" x2="120" y2="420" stroke-width="0.4" stroke-dasharray="4 3" stroke="#94a3b8"/>
    <circle cx="320" cy="280" r="70" stroke-width="1.2" stroke-dasharray="20 5 4 5"/>
    <circle cx="320" cy="280" r="8" stroke-width="1.2"/>
  </g>
  <g font-family="Helvetica, Arial, sans-serif">
    <text x="600" y="150" font-size="15" fill="#0f766e" font-weight="bold">PLATE UNDER PREPARATION</text>
    <text x="600" y="180" font-size="12" fill="#64748b">Upload artwork to replace</text>
    <text x="600" y="196" font-size="12" fill="#64748b">this construction frame.</text>
    <text x="600" y="240" font-size="13" fill="#111827">Scale: ${esc(scale)}</text>
    <text x="600" y="266" font-size="13" fill="#111827">${esc(sdgText)}</text>
  </g>
  <line x1="60" y1="480" x2="560" y2="480" stroke="#111827" stroke-width="0.9"/>
  <line x1="60" y1="468" x2="60" y2="492" stroke="#111827" stroke-width="0.9"/>
  <line x1="560" y1="468" x2="560" y2="492" stroke="#111827" stroke-width="0.9"/>
  <text x="310" y="470" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#111827" text-anchor="middle">200</text>
  <g font-family="Helvetica, Arial, sans-serif">
    <text x="60" y="540" font-size="24" fill="#111827" font-weight="bold">${esc(title)}</text>
    <text x="60" y="566" font-size="14" fill="#475569">${esc(subtitle ?? '')}</text>
  </g>
</svg>`
}
