import { useCallback, useRef, useState } from 'react'

const MIN_SCALE = 0.4
const MAX_SCALE = 8

/**
 * Zoom & pan viewer for technical drawings / uploaded images.
 * Wheel to zoom, drag to pan, double-tap to fit. Touch pinch is supported.
 */
export default function ZoomViewer({ src, alt = 'Drawing', fitToParent = true, background = '#f8fafc', isSvg = false, className = '' }) {
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const gestureRef = useRef(null)

  const clamp = useCallback((value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value)), [])

  const fit = useCallback(() => {
    const node = wrapRef.current
    if (!node || !fitToParent) return
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [fitToParent])

  const [viewedSrc, setViewedSrc] = useState(src)
  if (viewedSrc !== src) {
    setViewedSrc(src)
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  const onWheel = (event) => {
    if (!event.ctrlKey && Math.abs(event.deltaY) < 2) return
    event.preventDefault()
    const node = wrapRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const px = event.clientX - rect.left - rect.width / 2
    const py = event.clientY - rect.top - rect.height / 2
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15
    setScale((prev) => {
      const next = clamp(prev * factor)
      const ratio = next / prev
      setOffset((o) => ({ x: px - (px - o.x) * ratio, y: py - (py - o.y) * ratio }))
      return next
    })
  }

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    gestureRef.current = {
      pointers: new Map([[event.pointerId, { x: event.clientX, y: event.clientY }]]),
      last: { x: event.clientX, y: event.clientY },
      startDistance: 0,
    }
    setDragging(true)
  }

  const onPointerMove = (event) => {
    const gesture = gestureRef.current
    if (!gesture) return
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (gesture.pointers.size === 1) {
      const dx = event.clientX - gesture.last.x
      const dy = event.clientY - gesture.last.y
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }))
      gesture.last = { x: event.clientX, y: event.clientY }
      return
    }

    if (gesture.pointers.size === 2) {
      const [a, b] = [...gesture.pointers.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (gesture.startDistance) {
        const factor = distance / gesture.startDistance
        setScale((prev) => clamp(prev * factor))
      }
      gesture.startDistance = distance
    }
  }

  const endPointer = (event) => {
    gestureRef.current?.pointers.delete(event.pointerId)
    if (gestureRef.current?.pointers.size < 2) gestureRef.current.startDistance = 0
    if (gestureRef.current?.pointers.size === 0) {
      gestureRef.current = null
      setDragging(false)
    }
  }

  const zoomTo = (next) => setScale(clamp(next))

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => zoomTo(scale * 1.25)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => zoomTo(scale / 1.25)} aria-label="Zoom out">
          −
        </button>
        <span className="min-w-14 rounded bg-white px-2 py-1 text-center text-xs font-medium text-slate-600 tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={fit}>
          Fit
        </button>
        <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => zoomTo(1)}>
          100%
        </button>
        <button
          type="button"
          className={`btn px-2 py-1 text-xs ${showGrid ? 'bg-slate-800 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
          onClick={() => setShowGrid((v) => !v)}
        >
          Grid
        </button>
        <span className="ml-auto hidden text-[11px] text-slate-500 sm:block">Scroll to zoom · drag to pan · pinch on touch</span>
      </div>

      <div
        ref={wrapRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
        onDoubleClick={fit}
        className={`relative overflow-hidden ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          height: 'min(70vh, 620px)',
          background: showGrid
            ? `repeating-linear-gradient(0deg, transparent, transparent 27px, #e2e8f0 27px, #e2e8f0 28px), repeating-linear-gradient(90deg, transparent, transparent 27px, #e2e8f0 27px, #e2e8f0 28px), ${background}`
            : background,
          touchAction: 'none',
        }}
      >
        {isSvg ? (
          <div
            className="flex h-full w-full items-center justify-center p-4"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center center' }}
            dangerouslySetInnerHTML={{ __html: src }}
          />
        ) : (
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="mx-auto max-w-full select-none object-contain p-4"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center center' }}
          />
        )}
      </div>
    </div>
  )
}
