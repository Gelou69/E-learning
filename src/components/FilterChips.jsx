export function Chip({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`chip ${
        active
          ? 'border-teal-700 bg-teal-700 text-white'
          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800'
      }`}
    >
      {children}
      {count !== undefined && <span className="opacity-70">({count})</span>}
    </button>
  )
}

export function FilterBar({ children, onClear, clearLabel = 'Clear filters' }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {onClear && (
        <button type="button" onClick={onClear} className="btn-ghost px-2 py-1 text-xs">
          ✕ {clearLabel}
        </button>
      )}
    </div>
  )
}
