import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpDown, Eye, Ruler as RulerIcon, Search, Star, Trash2, Upload } from 'lucide-react'
import { useActions, useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { DIFFICULTIES, QUARTERS, SDGS, TOPICS } from '../data/constants'
import { SdgBadge, SdgFilterChip } from '../components/SdgBadge'
import { Chip, FilterBar } from '../components/FilterChips'
import ZoomViewer from '../components/ZoomViewer'
import Modal from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { fileSizeFromBase64, formatBytes } from '../utils/format'
import { readFileAsDataUrl } from '../utils/files'
import { buildPlatePlaceholder } from '../lib/plateBuilder'

const SORTS = {
  title: 'Title A–Z',
  difficulty: 'Difficulty',
  topic: 'Topic',
  sdg: 'SDG focus',
}

export default function DrawingsLibrary() {
  const { plates, submissions, mySubmissions } = useData()
  const { user, isTeacher, isAdmin } = useAuth()
  const { addPlate, deletePlate } = useActions()
  const [params, setParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [sdgs, setSdgs] = useState(() => (params.get('sdg') ? [Number(params.get('sdg'))] : []))
  const [difficulties, setDifficulties] = useState([])
  const [topics, setTopics] = useState([])
  const [quarters, setQuarters] = useState([])
  const [sort, setSort] = useState('title')
  const [ascending, setAscending] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const canManage = isTeacher || isAdmin

  const counts = useMemo(
    () => ({
      sdg: Object.fromEntries(SDGS.map((s) => [s.id, plates.filter((p) => p.sdgs.includes(s.id)).length])),
      difficulty: Object.fromEntries(
        DIFFICULTIES.map((d) => [d, plates.filter((p) => p.difficulty === d).length]),
      ),
      topic: Object.fromEntries(TOPICS.map((t) => [t, plates.filter((p) => p.topic === t).length])),
    }),
    [plates],
  )

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    const list = plates.filter((plate) => {
      if (term && !`${plate.title} ${plate.topic} ${plate.description}`.toLowerCase().includes(term)) return false
      if (sdgs.length && !sdgs.some((id) => plate.sdgs.includes(id))) return false
      if (difficulties.length && !difficulties.includes(plate.difficulty)) return false
      if (topics.length && !topics.includes(plate.topic)) return false
      if (quarters.length && !quarters.includes(plate.quarter)) return false
      return true
    })

    const weight = { Beginner: 1, Intermediate: 2, Advanced: 3 }
    const sorted = [...list].sort((a, b) => {
      if (sort === 'difficulty') return weight[a.difficulty] - weight[b.difficulty]
      if (sort === 'topic') return a.topic.localeCompare(b.topic)
      if (sort === 'sdg') return (a.sdgs[0] ?? 0) - (b.sdgs[0] ?? 0)
      return a.title.localeCompare(b.title)
    })
    return ascending ? sorted : sorted.reverse()
  }, [plates, query, sdgs, difficulties, topics, quarters, sort, ascending])

  const active = plates.find((p) => p.id === activeId) ?? null
  const activeSubs = active ? submissions.filter((s) => s.kind === 'plate' && s.refId === active.id) : []
  const activeMine = active ? mySubmissions.filter((s) => s.kind === 'plate' && s.refId === active.id) : []

  const toggle = (setter, value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  const clearAll = () => {
    setSdgs([])
    setDifficulties([])
    setTopics([])
    setQuarters([])
    setQuery('')
    setParams({})
  }

  const hasFilters = sdgs.length || difficulties.length || topics.length || quarters.length || query

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">VCD Drawings Library</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filtered.length} of {plates.length} plates · filter by topic, difficulty and SDG
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <ArrowUpDown size={14} />
            <select className="input py-1.5 text-xs" value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-secondary px-2.5 py-1.5 text-xs"
            onClick={() => setAscending((v) => !v)}
            aria-label="Toggle sort direction"
          >
            {ascending ? 'A–Z' : 'Z–A'}
          </button>
          {canManage && (
            <button type="button" onClick={() => setUploadOpen(true)} className="btn-primary px-3 py-1.5 text-xs">
              <Upload size={14} /> Add plate
            </button>
          )}
        </div>
      </header>

      <div className="card space-y-3 p-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search plates by title, topic or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search plates"
          />
        </div>

        <div className="space-y-2">
          <FilterBar onClear={hasFilters ? clearAll : null}>
            <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">SDG</span>
            {SDGS.map((sdg) => (
              <SdgFilterChip
                key={sdg.id}
                id={sdg.id}
                count={counts.sdg[sdg.id]}
                active={sdgs.includes(sdg.id)}
                onToggle={(id) => toggle(setSdgs, id)}
              />
            ))}
          </FilterBar>

          <FilterBar onClear={hasFilters ? clearAll : null}>
            <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Difficulty</span>
            {DIFFICULTIES.map((d) => (
              <Chip key={d} active={difficulties.includes(d)} count={counts.difficulty[d]} onClick={() => toggle(setDifficulties, d)}>
                {d}
              </Chip>
            ))}
            <span className="ml-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Quarter</span>
            {QUARTERS.map((q) => (
              <Chip key={q.id} active={quarters.includes(q.id)} onClick={() => toggle(setQuarters, q.id)}>
                {q.label.replace('Quarter ', 'Q')}
              </Chip>
            ))}
          </FilterBar>

          <FilterBar onClear={hasFilters ? clearAll : null}>
            <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Topic</span>
            {TOPICS.filter((t) => counts.topic[t] > 0).map((t) => (
              <Chip key={t} active={topics.includes(t)} count={counts.topic[t]} onClick={() => toggle(setTopics, t)}>
                {t}
              </Chip>
            ))}
          </FilterBar>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No plates match those filters"
          description="Try removing a filter or clearing the search box."
          action={
            <button type="button" className="btn-secondary" onClick={clearAll}>
              Clear all filters
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((plate) => (
            <PlateCard
              key={plate.id}
              plate={plate}
              submissionCount={submissions.filter((s) => s.kind === 'plate' && s.refId === plate.id).length}
              onOpen={() => setActiveId(plate.id)}
            />
          ))}
        </div>
      )}

      <Modal
        open={!!active}
        onClose={() => setActiveId(null)}
        title={active?.title ?? ''}
        subtitle={active ? `${active.topic} · ${active.difficulty} · Scale ${active.scale}` : ''}
        size="xl"
        footer={
          active && (
            <>
              {canManage && (
                <button
                  type="button"
                  className="btn-danger mr-auto"
                  onClick={() => {
                    if (window.confirm(`Delete "${active.title}" from the library?`)) {
                      deletePlate(active.id)
                      setActiveId(null)
                    }
                  }}
                >
                  <Trash2 size={15} /> Delete plate
                </button>
              )}
              <Link to={`/videos`} className="btn-secondary">
                Related activities
              </Link>
              <button type="button" className="btn-primary" onClick={() => setActiveId(null)}>
                Close
              </button>
            </>
          )
        }
      >
        {active && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {active.sdgs.map((id) => (
                <SdgBadge key={id} id={id} size="lg" showTitle />
              ))}
              <span className="badge bg-slate-100 text-slate-600">
                <RulerIcon size={12} /> Scale {active.scale}
              </span>
              {active.featured && (
                <span className="badge bg-amber-100 text-amber-700">
                  <Star size={12} /> Featured
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed text-slate-600">{active.description}</p>

            {active.svg || active.imageUrl ? (
              <ZoomViewer
                src={active.imageUrl ?? active.svg}
                isSvg={!active.imageUrl}
                alt={active.title}
                background="#fdfdfb"
              />
            ) : (
              <p className="rounded-lg border border-slate-200 p-6 text-center text-sm text-slate-500">
                This plate has no artwork yet.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11px] tracking-wide text-slate-500 uppercase">Class submissions</p>
                <p className="text-2xl font-semibold text-slate-800">{activeSubs.length}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11px] tracking-wide text-slate-500 uppercase">Graded</p>
                <p className="text-2xl font-semibold text-slate-800">
                  {activeSubs.filter((s) => s.status === 'graded').length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11px] tracking-wide text-slate-500 uppercase">My submissions</p>
                <p className="text-2xl font-semibold text-slate-800">{activeMine.length}</p>
              </div>
            </div>

            {user?.role !== 'student' && activeSubs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Recent class submissions</h3>
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {activeSubs.slice(0, 6).map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-800">{s.student?.name}</span>
                      <span className="text-xs text-slate-500">{s.section}</span>
                      <span
                        className={`badge ml-auto ${
                          s.status === 'graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {s.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      <UploadPlateModal open={uploadOpen} onClose={() => setUploadOpen(false)} onCreate={addPlate} userId={user?.id} />
    </div>
  )
}

function PlateCard({ plate, submissionCount, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card group flex flex-col overflow-hidden text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
    >
      <div className="relative aspect-[9/6] overflow-hidden bg-slate-100">
        {plate.imageUrl ? (
          <img src={plate.imageUrl} alt={plate.title} className="h-full w-full object-contain" />
        ) : plate.svg ? (
          <div
            className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: plate.svg }}
          />
        ) : (
          <p className="grid h-full place-items-center px-4 text-center text-xs text-slate-500">
            No artwork yet
          </p>
        )}
        {plate.featured && (
          <span className="absolute top-2 left-2 badge bg-amber-500/90 text-white">
            <Star size={11} /> Featured
          </span>
        )}
        <span className="absolute right-2 bottom-2 badge bg-slate-900/75 text-white">
          <Eye size={11} /> {submissionCount} submissions
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-teal-800">{plate.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{plate.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {plate.sdgs.map((id) => (
            <SdgBadge key={id} id={id} />
          ))}
          <span className="badge bg-slate-100 text-slate-600">{plate.difficulty}</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          {plate.topic} · {plate.quarter.toUpperCase()} · Scale {plate.scale}
        </p>
      </div>
    </button>
  )
}

function UploadPlateModal({ open, onClose, onCreate, userId }) {
  const [form, setForm] = useState({
    title: '',
    topic: TOPICS[0],
    difficulty: 'Beginner',
    sdgs: [4],
    quarter: 'q1',
    scale: 'NTS',
    description: '',
  })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const handleFile = async (event) => {
    const picked = event.target.files?.[0]
    if (!picked) return
    if (picked.size > 6 * 1024 * 1024) {
      setError('Please keep plate images under 6 MB.')
      return
    }
    setError('')
    const dataUrl = await readFileAsDataUrl(picked)
    setFile({ name: picked.name, dataUrl, svg: null })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Give the plate a title.')
      return
    }
    if (!form.sdgs.length) {
      setError('Select at least one SDG alignment.')
      return
    }

    setBusy(true)
    try {
      // Uploaded artwork goes to Supabase Storage; otherwise keep the generated vector plate.
      const svg = file?.dataUrl
        ? null
        : buildPlatePlaceholder({ title: form.title, subtitle: form.topic, sdgs: form.sdgs, scale: form.scale })

      await onCreate({ ...form, svg, fileDataUrl: file?.dataUrl ?? null, uploadedBy: userId })
      setForm({
        title: '',
        topic: TOPICS[0],
        difficulty: 'Beginner',
        sdgs: [4],
        quarter: 'q1',
        scale: 'NTS',
        description: '',
      })
      setFile(null)
      onClose()
    } catch (err) {
      setError(err?.message ?? 'Could not save the plate. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a drawing plate"
      subtitle="Publish a plate to the shared library for students to study and trace."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="add-plate-form" className="btn-primary" disabled={busy}>
            {busy ? 'Publishing…' : 'Publish plate'}
          </button>
        </>
      }
    >
      <form id="add-plate-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="plate-title">
            Plate title
          </label>
          <input id="plate-title" className="input" required value={form.title} onChange={update('title')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="plate-topic">
              Topic
            </label>
            <select id="plate-topic" className="input" value={form.topic} onChange={update('topic')}>
              {TOPICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="plate-diff">
              Difficulty
            </label>
            <select id="plate-diff" className="input" value={form.difficulty} onChange={update('difficulty')}>
              {DIFFICULTIES.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="plate-quarter">
              Quarter
            </label>
            <select id="plate-quarter" className="input" value={form.quarter} onChange={update('quarter')}>
              {QUARTERS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="plate-scale">
              Scale
            </label>
            <input id="plate-scale" className="input" value={form.scale} onChange={update('scale')} />
          </div>
        </div>

        <fieldset>
          <legend className="label">SDG alignment</legend>
          <div className="flex flex-wrap gap-2">
            {SDGS.map((sdg) => (
              <SdgFilterChip
                key={sdg.id}
                id={sdg.id}
                active={form.sdgs.includes(sdg.id)}
                onToggle={(id) =>
                  setForm((f) => ({
                    ...f,
                    sdgs: f.sdgs.includes(id) ? f.sdgs.filter((s) => s !== id) : [...f.sdgs, id].sort(),
                  }))
                }
              />
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="plate-desc">
            Description
          </label>
          <textarea
            id="plate-desc"
            className="input min-h-20"
            value={form.description}
            onChange={update('description')}
            placeholder="What will students learn from this plate?"
          />
        </div>

        <div>
          <label className="label" htmlFor="plate-file">
            Plate image (optional)
          </label>
          <input id="plate-file" type="file" accept="image/png,image/jpeg,image/webp" className="input" onChange={handleFile} />
          <p className="mt-1.5 text-[11px] text-slate-500">
            PNG or JPG up to 6 MB. Without an image a labelled placeholder plate is generated — {formatBytes(
              file ? fileSizeFromBase64(file.dataUrl) : 0,
            )}{' '}
            stored offline.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}


