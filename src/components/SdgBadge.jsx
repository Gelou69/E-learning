import { SDG_MAP } from '../data/constants'

export function SdgBadge({ id, size = 'sm', showTitle = false }) {
  const sdg = SDG_MAP[id]
  if (!sdg) return null
  return (
    <span
      className={`badge ${size === 'lg' ? 'px-3 py-1 text-sm' : ''}`}
      style={{ backgroundColor: `${sdg.color}1a`, color: sdg.color }}
      title={sdg.title}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: sdg.color }} />
      {sdg.code}
      {showTitle && <span className="hidden font-normal sm:inline">· {sdg.title}</span>}
    </span>
  )
}

export function SdgFilterChip({ id, active, onToggle, count }) {
  const sdg = SDG_MAP[id]
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="chip"
      style={
        active
          ? { backgroundColor: sdg.color, borderColor: sdg.color, color: '#fff' }
          : { borderColor: `${sdg.color}66`, color: sdg.color, backgroundColor: `${sdg.color}0d` }
      }
      aria-pressed={active}
    >
      {sdg.code}
      {count !== undefined && <span className="opacity-75">({count})</span>}
    </button>
  )
}
