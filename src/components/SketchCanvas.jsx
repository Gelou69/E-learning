import { useCallback, useId, useRef, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { DRAW_TOOLS } from '../constants/tools'
import { exportStrokesPng } from '../lib/sketchExport'

const TOOL_STYLE = {
  pen: { width: 2, opacity: 1, cap: 'round' },
  marker: { width: 6, opacity: 0.9, cap: 'round' },
  highlight: { width: 16, opacity: 0.28, cap: 'square' },
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 500

/**
 * Compact freehand sketching canvas rendered as SVG.
 * Works with mouse, touch and pen; exports PNG for submission.
 */
export default function SketchCanvas({ initialStrokes = [], onChange, height = 320, label = 'Sketch canvas', grid = true }) {
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#0f172a')
  const [width, setWidth] = useState(2)
  const [eraser, setEraser] = useState(false)
  const [strokes, setStrokes] = useState(initialStrokes)
  const [canvasSize, setCanvasSize] = useState(height >= 400 ? 'large' : 'small')
  const gridId = useId().replace(/:/g, '')
  const drawingRef = useRef(false)
  const strokesRef = useRef(strokes)

  strokesRef.current = strokes

  const commit = useCallback(
    (next) => {
      strokesRef.current = next
      setStrokes(next)
      onChange?.(next)
    },
    [onChange],
  )

  const getPoint = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / box.width
    const scaleY = CANVAS_HEIGHT / box.height
    return { x: Math.round((event.clientX - box.left) * scaleX * 10) / 10, y: Math.round((event.clientY - box.top) * scaleY * 10) / 10 }
  }

  const canvasHeight = canvasSize === 'large' ? Math.max(height, 480) : Math.min(height, 260)
  const canvasMaxWidth = Math.round((canvasHeight * CANVAS_WIDTH) / CANVAS_HEIGHT)

  const eraseAt = (point) => {
    const radius = 14
    const keep = strokesRef.current.filter((stroke) =>
      (stroke.points ?? []).every((p) => Math.hypot(p.x - point.x, p.y - point.y) > radius),
    )
    if (keep.length !== strokesRef.current.length) commit(keep)
  }

  const handleDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const point = getPoint(event)
    if (eraser) {
      eraseAt(point)
      return
    }
    drawingRef.current = true
    commit([...strokesRef.current, { tool, color, width, points: [point] }])
  }

  const handleMove = (event) => {
    if (eraser) {
      eraseAt(getPoint(event))
      return
    }
    if (!drawingRef.current) return
    const point = getPoint(event)
    const next = [...strokesRef.current]
    const last = next[next.length - 1]
    if (!last) return
    next[next.length - 1] = { ...last, points: [...last.points, point] }
    strokesRef.current = next
    setStrokes(next)
  }

  const stop = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    onChange?.(strokesRef.current)
  }

  const exportPng = () => exportStrokesPng(strokesRef.current, CANVAS_WIDTH, CANVAS_HEIGHT)

  const savePng = () => {
    const url = exportPng()
    const link = document.createElement('a')
    link.href = url
    link.download = `${label.toLowerCase().replace(/\W+/g, '-')}-sketch.png`
    link.click()
    return url
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-2">
        {DRAW_TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTool(item.id)
              setWidth(TOOL_STYLE[item.id]?.width ?? 2)
              setEraser(false)
            }}
            className={`btn px-2.5 py-1.5 text-xs ${
              tool === item.id && !eraser ? 'bg-teal-700 text-white' : 'border border-slate-300 bg-white text-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-slate-200" />
        {['#0f172a', '#0f766e', '#b45309', '#be123c', '#0369a1'].map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Colour ${c}`}
            onClick={() => {
              setColor(c)
              setEraser(false)
            }}
            className={`h-6 w-6 rounded-full border-2 ${color === c && !eraser ? 'border-slate-900' : 'border-slate-200'}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          Size {width}
          <input
            type="range"
            min="1"
            max="20"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-20"
            aria-label="Stroke size"
          />
        </label>
        <div className="flex items-center rounded-md border border-slate-200 p-0.5" role="group" aria-label="Canvas size">
          <button
            type="button"
            aria-pressed={canvasSize === 'small'}
            title="Small canvas"
            onClick={() => setCanvasSize('small')}
            className={`btn px-2 py-1 text-xs ${canvasSize === 'small' ? 'bg-teal-700 text-white' : 'text-slate-600'}`}
          >
            <Minimize2 size={13} /> Small
          </button>
          <button
            type="button"
            aria-pressed={canvasSize === 'large'}
            title="Large canvas"
            onClick={() => setCanvasSize('large')}
            className={`btn px-2 py-1 text-xs ${canvasSize === 'large' ? 'bg-teal-700 text-white' : 'text-slate-600'}`}
          >
            <Maximize2 size={13} /> Large
          </button>
        </div>
        <button
          type="button"
          onClick={() => setEraser((v) => !v)}
          className={`btn px-2.5 py-1.5 text-xs ${eraser ? 'bg-rose-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
        >
          Eraser
        </button>
        <button type="button" onClick={() => commit(strokesRef.current.slice(0, -1))} className="btn-ghost px-2.5 py-1.5 text-xs">
          Undo
        </button>
        <button type="button" onClick={() => commit([])} className="btn-ghost px-2.5 py-1.5 text-xs">
          Clear
        </button>
        <div className="ml-auto">
          <button type="button" onClick={savePng} className="btn-secondary px-2.5 py-1.5 text-xs">
            Save PNG
          </button>
        </div>
      </div>

      <div className="relative mx-auto w-full" style={{ maxWidth: canvasMaxWidth }}>
        <svg
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          preserveAspectRatio="xMidYMid meet"
          className={`block h-auto w-full touch-none select-none ${eraser ? 'cursor-cell' : 'cursor-crosshair'}`}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          role="application"
          aria-label={label}
        >
          <defs>
            <pattern id={gridId} width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#e9eef2" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={grid ? `url(#${gridId})` : '#ffffff'} />
          {strokes.map((stroke, i) => {
            if (!stroke.points?.length) return null
            const style = TOOL_STYLE[stroke.tool] ?? TOOL_STYLE.pen
            return (
              <polyline
                key={i}
                points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.width ?? style.width}
                strokeOpacity={stroke.opacity ?? style.opacity}
                strokeLinecap={style.cap}
                strokeLinejoin="round"
              />
            )
          })}
        </svg>
        {!strokes.length && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Draw here for quick practice — {label.toLowerCase()}
          </p>
        )}
      </div>
    </div>
  )
}
