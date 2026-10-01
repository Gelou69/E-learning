import { Eraser, Grid3x3, PenLine, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import SketchCanvas from '../components/SketchCanvas'
import { QUARTERS } from '../data/constants'

const PRESETS = [
  { id: 'iso', name: 'Isometric grid', build: (s) => isoGrid(s) },
  { id: 'blank', name: 'Blank sheet', build: (s) => s },
  { id: 'ortho', name: 'Projection guides', build: (s) => orthoGuides(s) },
]

export default function Practice() {
  const [strokes, setStrokes] = useState([])
  const [preset, setPreset] = useState('blank')
  const [grid, setGrid] = useState(true)
  const [title, setTitle] = useState('')
  const [savedSheets, setSavedSheets] = useState(() => readSavedSheets())
  const [flash, setFlash] = useState('')

  const buildGrid = (s) => PRESETS.find((p) => p.id === preset)?.build(s) ?? s

  const applyPreset = (id) => {
    setPreset(id)
    setStrokes([])
  }

  const saveSheet = () => {
    const record = {
      id: `ps-${Date.now()}`,
      title: title.trim() || `Untitled practice ${savedSheets.length + 1}`,
      preset: PRESETS.find((p) => p.id === preset)?.name ?? preset,
      strokes: strokes.length,
      savedAt: new Date().toISOString(),
    }
    const next = [record, ...savedSheets].slice(0, 12)
    setSavedSheets(next)
    writeSavedSheets(next)
    setFlash(`Saved “${record.title}” locally.`)
    setTimeout(() => setFlash(''), 4000)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Sketch Pad</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quick in-browser practice. This sketch is not graded — submit work from a plate or video activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setStrokes([])}
          >
            <Trash2 size={15} /> Clear
          </button>
        </div>
      </header>

      <div className="card grid gap-3 p-4 sm:grid-cols-3">
        {PRESETS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => applyPreset(option.id)}
            className={`rounded-lg border p-3 text-left transition ${
              preset === option.id ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              {option.id === 'iso' ? <Grid3x3 size={15} /> : option.id === 'ortho' ? <PenLine size={15} /> : <Eraser size={15} />}
              {option.name}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {option.id === 'iso'
                ? '30° isometric axes for freehand solids'
                : option.id === 'ortho'
                  ? 'Projection layout with centre and fold lines'
                  : 'Plain sheet for lettering practice'}
            </p>
          </button>
        ))}
      </div>

      <SketchCanvas
        key={preset}
        initialStrokes={buildGrid([])}
        onChange={setStrokes}
        label="Practice"
        height={480}
        grid={grid}
      />

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="practice-title">
            Label this practice sheet
          </label>
          <input
            id="practice-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Isometric box practice — attempt 2"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={grid}
            onChange={(e) => setGrid(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-teal-700"
          />
          Show grid
        </label>
        <button type="button" className="btn-primary" onClick={saveSheet}>
          <Save size={15} /> Save practice sheet
        </button>
        {flash && <span className="pb-2 text-sm text-emerald-700">{flash}</span>}
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-slate-800">Suggested drills</h2>
        <ul className="mt-2 grid gap-2 md:grid-cols-2">
          {[
            ['Line weight ladder', 'Draw the same square five times at increasing weight. Compare with Plate 01.'],
            ['Isometric box', 'Box a 400 x 300 x 250 solid on the isometric grid without measuring.'],
            ['Projection transfer', 'On the projection guides, practise 45° mitre transfers between views.'],
            ['Technical lettering', `Write SURNAME in 1:2 ratio on a blank sheet for ${QUARTERS[0].label.toLowerCase()} portfolio.`,
            ],
            ['Hatch practice', 'Fill a 30 x 20 mm rectangle with 45° hatching at even 2 mm spacing.'],
            ['Foreshortening', 'Sketch a cylinder in isometric — check the ellipses align with the grid.'],
          ].map(([name, detail]) => (
            <li key={name} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-800">{name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
            </li>
          ))}
        </ul>
        <button type="button" className="btn-secondary mt-3" onClick={() => setStrokes([])}>
          <RotateCcw size={15} /> Start fresh
        </button>
      </div>

      {savedSheets.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-800">Saved practice sheets</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {savedSheets.map((sheet) => (
              <li key={sheet.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium text-slate-800">{sheet.title}</span>
                <span className="text-xs text-slate-500">
                  {sheet.preset} · {sheet.strokes} strokes
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const GRID_W = 800
const GRID_H = 500

function isoGrid() {
  const strokes = []
  const w = GRID_W
  const h = GRID_H
  const step = 40
  for (let x = -h; x < w + h; x += step) {
    strokes.push({
      tool: 'pen',
      color: '#cbd5e1',
      width: 1,
      points: [
        { x, y: 0 },
        { x: x + h / 2, y: h },
      ],
    })
    strokes.push({
      tool: 'pen',
      color: '#cbd5e1',
      width: 1,
      points: [
        { x, y: h },
        { x: x + h / 2, y: 0 },
      ],
    })
  }
  return strokes
}

function orthoGuides() {
  const line = (color, x1, y1, x2, y2) => ({ tool: 'pen', color, width: 1, points: [{ x: x1, y: y1 }, { x: x2, y: y2 }] })
  return [
    line('#94a3b8', 0, GRID_H / 2, GRID_W, GRID_H / 2),
    line('#94a3b8', 0, GRID_H / 4, GRID_W, GRID_H / 4),
    line('#94a3b8', 0, (GRID_H * 3) / 4, GRID_W, (GRID_H * 3) / 4),
    line('#cbd5e1', GRID_W / 4, 0, GRID_W / 4, GRID_H),
    line('#cbd5e1', (GRID_W * 3) / 4, 0, (GRID_W * 3) / 4, GRID_H),
  ]
}

const SAVED_KEY = 'vgd-hub-practice-v1'

function readSavedSheets() {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeSavedSheets(sheets) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(sheets))
  } catch {
    /* storage full or unavailable — practice sheets stay in memory only */
  }
}
