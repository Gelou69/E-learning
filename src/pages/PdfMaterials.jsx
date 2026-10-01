import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BookmarkPlus,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  List,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { useActions, useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { lessonUrl } from '../lib/api'
import { QUARTERS, SDGS, TOPICS } from '../data/constants'
import { SdgBadge, SdgFilterChip } from '../components/SdgBadge'
import { Chip, FilterBar } from '../components/FilterChips'
import { EmptyState } from '../components/EmptyState'
import Modal from '../components/Modal'
import { blobToDataUrl, downloadBlobUrl } from '../utils/files'
import { formatBytes, formatDateTime } from '../utils/format'
import { buildPdf } from '../lib/pdf'

const STATUS_META = {
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700' },
  opened: { label: 'Opened', className: 'bg-amber-100 text-amber-700' },
  none: { label: 'Not started', className: 'bg-slate-100 text-slate-500' },
}

export default function PdfMaterials() {
  const { pdfs, myProgress } = useData()
  const { user, isTeacher, isAdmin } = useAuth()
  const { addPdf, togglePdfPublished, deletePdf, markPdf } = useActions()

  const [query, setQuery] = useState('')
  const [quarters, setQuarters] = useState([])
  const [sdgs, setSdgs] = useState([])
  const [topics, setTopics] = useState([])
  const [onlyMine, setOnlyMine] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeUrl, setActiveUrl] = useState(null)
  const [urlLoading, setUrlLoading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)

  const canManage = isTeacher || isAdmin
  const isStudent = user?.role === 'student'

  const progressByRef = useMemo(() => {
    const map = new Map()
    myProgress.forEach((p) => map.set(p.refId, p))
    return map
  }, [myProgress])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return pdfs.filter((pdf) => {
      if (isStudent && !pdf.published) return false
      if (term && !`${pdf.title} ${pdf.topic} ${pdf.summary}`.toLowerCase().includes(term)) return false
      if (quarters.length && !quarters.includes(pdf.quarter)) return false
      if (sdgs.length && !sdgs.some((id) => pdf.sdgs.includes(id))) return false
      if (topics.length && !topics.includes(pdf.topic)) return false
      if (onlyMine) {
        const p = progressByRef.get(pdf.id)
        if (!p || p.status !== 'completed') return false
      }
      return true
    })
  }, [pdfs, query, quarters, sdgs, topics, onlyMine, isStudent, progressByRef])

  const stats = useMemo(() => {
    const published = pdfs.filter((p) => p.published)
    const totalPages = published.reduce((sum, p) => sum + p.pages, 0)
    const opened = myProgress.filter((p) => p.status === 'opened').length
    const completed = myProgress.filter((p) => p.status === 'completed').length
    return { published: published.length, totalPages, opened, completed, rate: myProgress.length ? (completed / myProgress.length) * 100 : 0 }
  }, [pdfs, myProgress])

  const activeId = searchParams.get('lesson')
  const active = pdfs.find((p) => p.id === activeId) ?? null
  const activeProgress = active ? progressByRef.get(active.id) : null

  useEffect(() => {
    let cancelled = false
    if (!active) {
      setActiveUrl(null)
      setUrlLoading(false)
      return undefined
    }

    setActiveUrl(null)
    setUrlLoading(true)
    lessonUrl(active)
      .then((url) => {
        if (!cancelled) setActiveUrl(url)
      })
      .catch(() => {
        if (!cancelled) setActiveUrl(null)
      })
      .finally(() => {
        if (!cancelled) setUrlLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [active])

  const toggle = (setter, value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))

  const setActiveId = (id) => {
    const nextParams = new URLSearchParams(searchParams)
    if (id) nextParams.set('lesson', id)
    else nextParams.delete('lesson')
    setSearchParams(nextParams, { replace: !id })
  }

  const clearAll = () => {
    setQuery('')
    setQuarters([])
    setSdgs([])
    setTopics([])
    setOnlyMine(false)
  }

  const openPdf = async (pdf) => {
    setActiveId(pdf.id)
    if (isStudent) await markPdf(pdf.id, activeProgress?.status === 'completed' ? 'completed' : 'opened', 1)
  }

  const hasFilters = query || quarters.length || sdgs.length || topics.length || onlyMine

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">PDF Learning Materials</h1>
          <p className="mt-1 text-sm text-slate-500">
            {visible.length} lesson{visible.length === 1 ? '' : 's'} · organised by quarter and topic
          </p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setUploadOpen(true)} className="btn-primary">
            <Upload size={16} /> Upload lesson PDF
          </button>
        )}
      </header>

      {isStudent && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Lessons available" value={stats.published} />
          <StatCard label="Total pages" value={stats.totalPages} />
          <StatCard label="Completed" value={stats.completed} />
          <StatCard label="Completion rate" value={`${stats.rate.toFixed(0)}%`} />
        </div>
      )}

      <div className="card space-y-3 p-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search lessons by title, topic or summary…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search lessons"
          />
        </div>

        <FilterBar onClear={hasFilters ? clearAll : null}>
          <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Quarter</span>
          {QUARTERS.map((q) => (
            <Chip key={q.id} active={quarters.includes(q.id)} onClick={() => toggle(setQuarters, q.id)}>
              {q.label.replace('Quarter ', 'Q')}
            </Chip>
          ))}
        </FilterBar>

        <FilterBar onClear={hasFilters ? clearAll : null}>
          <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">SDG</span>
          {SDGS.map((sdg) => (
            <SdgFilterChip key={sdg.id} id={sdg.id} active={sdgs.includes(sdg.id)} onToggle={(id) => toggle(setSdgs, id)} />
          ))}
        </FilterBar>

        <FilterBar onClear={hasFilters ? clearAll : null}>
          <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Topic</span>
          {TOPICS.filter((t) => pdfs.some((p) => p.topic === t)).map((t) => (
            <Chip key={t} active={topics.includes(t)} onClick={() => toggle(setTopics, t)}>
              {t}
            </Chip>
          ))}
          {isStudent && (
            <Chip active={onlyMine} onClick={() => setOnlyMine((v) => !v)}>
              <CheckCircle2 size={12} /> Completed only
            </Chip>
          )}
        </FilterBar>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No lessons match those filters"
          description="Adjust the quarter, SDG or topic filters to see more materials."
          action={
            <button type="button" className="btn-secondary" onClick={clearAll}>
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {QUARTERS.filter((q) => visible.some((pdf) => pdf.quarter === q.id)).map((quarter) => (
            <section key={quarter.id}>
              <div className="mb-2 flex items-baseline gap-2">
                <h2 className="text-sm font-semibold text-slate-800">{quarter.label}</h2>
                <p className="text-xs text-slate-500">{quarter.theme}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visible
                  .filter((pdf) => pdf.quarter === quarter.id)
                  .map((pdf) => (
                    <PdfCard
                      key={pdf.id}
                      pdf={pdf}
                      progress={progressByRef.get(pdf.id)}
                      canManage={canManage}
                      onOpen={() => openPdf(pdf)}
                      onTogglePublish={() => togglePdfPublished(pdf.id, !pdf.published)}
                      onDelete={async () => {
                        if (window.confirm(`Delete "${pdf.title}"?`)) await deletePdf(pdf.id)
                      }}
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={!!active}
        onClose={() => setActiveId(null)}
        title={active?.title ?? ''}
        subtitle={active ? `${active.topic} · ${active.pages} pages · ${formatBytes(active.sizeKb)}` : ''}
        size="xl"
        footer={
          active && (
            <>
              <button
                type="button"
                className="btn-secondary mr-auto"
                onClick={() => activeUrl && downloadBlobUrl(activeUrl, `${active.title}.pdf`)}
                disabled={!activeUrl || urlLoading}
              >
                <Download size={15} /> Download
              </button>
              <button type="button" className="btn-primary" onClick={() => setActiveId(null)}>
                Close
              </button>
            </>
          )
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {active.sdgs.map((id) => (
                <SdgBadge key={id} id={id} showTitle />
              ))}
              {!active.published && <span className="badge bg-amber-100 text-amber-700">Draft — not visible to students</span>}
              {activeProgress && (
                <span className={`badge ${STATUS_META[activeProgress.status].className}`}>
                  {STATUS_META[activeProgress.status].label}
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed text-slate-600">{active.summary}</p>

            {urlLoading ? (
              <p className="rounded-lg border border-slate-200 p-6 text-center text-sm text-slate-500">Preparing lesson…</p>
            ) : activeUrl ? (
              <PdfReader pdf={active} url={activeUrl} onProgress={(status, page) => isStudent && markPdf(active.id, status, page)} />
            ) : (
              <p className="rounded-lg border border-slate-200 p-6 text-center text-sm text-slate-500">
                No document has been attached to this lesson yet.
              </p>
            )}

            {isStudent && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-3">
                <BookmarkPlus size={16} className="text-teal-700" />
                <span className="text-sm text-slate-600">Mark this lesson as</span>
                <button
                  type="button"
                  className="btn-secondary px-2.5 py-1 text-xs"
                  onClick={() => markPdf(active.id, 'opened', 1)}
                >
                  Opened
                </button>
                <button
                  type="button"
                  className="btn-primary px-2.5 py-1 text-xs"
                  onClick={() => markPdf(active.id, 'completed', active.pages)}
                >
                  Completed
                </button>
                {activeProgress?.lastOpened && (
                  <span className="ml-auto text-[11px] text-slate-500">Last opened {formatDateTime(activeProgress.lastOpened)}</span>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <UploadPdfModal open={uploadOpen} onClose={() => setUploadOpen(false)} onCreate={addPdf} />
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="card p-3">
      <p className="text-[11px] tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  )
}

function PdfCard({ pdf, progress, canManage, onOpen, onTogglePublish, onDelete }) {
  const status = progress ? STATUS_META[progress.status] : STATUS_META.none

  const download = async () => {
    const url = await lessonUrl(pdf)
    if (url) downloadBlobUrl(url, `${pdf.title}.pdf`)
  }
  return (
    <article className="card flex flex-col p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
          <FileText size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{pdf.title}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {pdf.pages} pages · {formatBytes(pdf.sizeKb)} · {pdf.quarter.toUpperCase()}
          </p>
        </div>
      </div>

      <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-600">{pdf.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {pdf.sdgs.map((id) => (
          <SdgBadge key={id} id={id} />
        ))}
        <span className={`badge ${status.className}`}>{status.label}</span>
        {!pdf.published && <span className="badge bg-slate-800 text-white">Draft</span>}
      </div>

      {progress && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-teal-600"
              style={{ width: `${Math.min(100, ((progress.page ?? 0) / pdf.pages) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Page {progress.page} of {pdf.pages}
            {progress.bookmarks?.length ? ` · ${progress.bookmarks.length} bookmark${progress.bookmarks.length === 1 ? '' : 's'}` : ''}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 pt-1">
        <button type="button" onClick={onOpen} className="btn-primary flex-1 py-1.5 text-xs">
          <BookOpen size={14} /> Read in browser
        </button>
        <button
          type="button"
          onClick={download}
          className="btn-secondary px-2.5 py-1.5 text-xs"
          aria-label="Download"
        >
          <Download size={14} />
        </button>
        {canManage && (
          <>
            <button type="button" onClick={onTogglePublish} className="btn-secondary px-2.5 py-1.5 text-xs">
              {pdf.published ? 'Unpublish' : 'Publish'}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="btn-ghost px-2 py-1.5 text-rose-600"
              aria-label="Delete"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </article>
  )
}

function PdfReader({ pdf, url, onProgress }) {
  const [page, setPage] = useState(1)
  const [frame, setFrame] = useState('object')

  const goTo = (next) => {
    const clamped = Math.min(pdf.pages, Math.max(1, next))
    setPage(clamped)
    onProgress?.(clamped >= pdf.pages ? 'completed' : 'opened', clamped)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
        <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => goTo(page - 1)} disabled={page <= 1}>
          ‹ Prev
        </button>
        <span className="text-xs font-medium text-slate-600">
          Page {page} / {pdf.pages}
        </span>
        <button
          type="button"
          className="btn-secondary px-2 py-1 text-xs"
          onClick={() => goTo(page + 1)}
          disabled={page >= pdf.pages}
        >
          Next ›
        </button>
        <input
          type="range"
          min="1"
          max={pdf.pages}
          value={page}
          onChange={(e) => goTo(Number(e.target.value))}
          className="ml-1 w-32"
          aria-label="Page"
        />
        <div className="ml-auto flex rounded-lg border border-slate-300 p-0.5 text-xs">
          {['object', 'embed'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFrame(mode)}
              className={`cursor-pointer rounded-md px-2 py-1 font-medium ${frame === mode ? 'bg-slate-800 text-white' : 'text-slate-600'}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        {frame === 'object' ? (
          <object
            key={page}
            data={`${url}#page=${page}&view=FitH&toolbar=0`}
            type="application/pdf"
            className="h-[70vh] w-full"
            aria-label={`${pdf.title} page ${page}`}
          >
            <p className="p-6 text-center text-sm text-slate-600">
              Your browser cannot display PDFs inline. Use the download button to open the file.
            </p>
          </object>
        ) : (
          <iframe key={page} src={`${url}#page=${page}&view=FitH`} title={`${pdf.title} page ${page}`} className="h-[70vh] w-full" />
        )}
      </div>

      <details className="rounded-lg border border-slate-200 p-3">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <List size={15} /> Text-only outline (works without the PDF viewer)
        </summary>
        <div className="mt-3 space-y-3 text-sm text-slate-600">
          {(pdf.sections ?? []).map((section, i) => (
            <div key={i}>
              {section.heading && <p className="font-semibold text-slate-800">{section.heading}</p>}
              {section.body && <p className="mt-1 leading-relaxed">{Array.isArray(section.body) ? section.body.join(' ') : section.body}</p>}
              {section.bullets?.length && (
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {section.bullets.map((bullet, j) => (
                    <li key={j}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

function UploadPdfModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '',
    topic: TOPICS[0],
    quarter: 'q1',
    sdgs: [4],
    pages: 3,
    summary: '',
    published: false,
  })
  const [sections, setSections] = useState([{ heading: 'Learning targets', bullets: '', body: '' }])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const update = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Give the lesson a title.')
      return
    }
    if (!form.sdgs.length) {
      setError('Select at least one SDG alignment.')
      return
    }

    const parsedSections = sections
      .filter((s) => s.heading || s.body || s.bullets)
      .map((s) => ({
        heading: s.heading || undefined,
        body: s.body || undefined,
        bullets: s.bullets
          ? s.bullets
              .split('\n')
              .map((line) => line.replace(/^[-•]\s*/, '').trim())
              .filter(Boolean)
          : undefined,
      }))

    const blob = buildPdf({
      title: form.title,
      subtitle: form.summary,
      meta: [`Grade 11 - Visual Graphics Design`, `SDG ${form.sdgs.join(', SDG ')}`, `${form.pages} pages`],
      sections: parsedSections,
    })

    setBusy(true)
    try {
      // The generated PDF is uploaded so students read the exact same file from Storage.
      await onCreate({
        ...form,
        sections: parsedSections,
        file: await blobToDataUrl(blob),
        sizeKb: Math.max(1, Math.round(blob.size / 1024)),
        fileName: `${form.title}.pdf`,
      })

      setForm({ title: '', topic: TOPICS[0], quarter: 'q1', sdgs: [4], pages: 3, summary: '', published: false })
      setSections([{ heading: 'Learning targets', bullets: '', body: '' }])
      setError('')
      onClose()
    } catch (err) {
      setError(err?.message ?? 'Could not save the lesson. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload lesson PDF"
      subtitle="Compose the lesson here and the platform generates a printable PDF for students."
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="upload-pdf-form" className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save lesson'}
          </button>
        </>
      }
    >
      <form id="upload-pdf-form" onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="pdf-title">
            Lesson title
          </label>
          <input id="pdf-title" className="input" required value={form.title} onChange={update('title')} />
        </div>

        <div>
          <label className="label" htmlFor="pdf-summary">
            Summary
          </label>
          <textarea id="pdf-summary" className="input min-h-16" value={form.summary} onChange={update('summary')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="pdf-topic">
              Topic
            </label>
            <select id="pdf-topic" className="input" value={form.topic} onChange={update('topic')}>
              {TOPICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pdf-quarter">
              Quarter
            </label>
            <select id="pdf-quarter" className="input" value={form.quarter} onChange={update('quarter')}>
              {QUARTERS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pdf-pages">
              Pages
            </label>
            <input
              id="pdf-pages"
              type="number"
              min="1"
              max="40"
              className="input"
              value={form.pages}
              onChange={update('pages')}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-teal-700"
              />
              Publish now
            </label>
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
          <div className="mb-2 flex items-center justify-between">
            <p className="label mb-0">Lesson sections</p>
            <button
              type="button"
              className="btn-secondary px-2 py-1 text-xs"
              onClick={() => setSections((s) => [...s, { heading: '', bullets: '', body: '' }])}
            >
              Add section
            </button>
          </div>
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div key={index} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <input
                    className="input"
                    placeholder="Section heading"
                    value={section.heading}
                    onChange={(e) =>
                      setSections((s) => s.map((item, i) => (i === index ? { ...item, heading: e.target.value } : item)))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setSections((s) => s.filter((_, i) => i !== index))}
                    className="btn-ghost px-2 py-1 text-rose-600"
                    aria-label="Remove section"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <textarea
                  className="input mt-2 min-h-16"
                  placeholder="Body text"
                  value={section.body}
                  onChange={(e) => setSections((s) => s.map((item, i) => (i === index ? { ...item, body: e.target.value } : item)))}
                />
                <textarea
                  className="input mt-2 min-h-20"
                  placeholder={'Bullets — one per line\n- Learning target one'}
                  value={section.bullets}
                  onChange={(e) =>
                    setSections((s) => s.map((item, i) => (i === index ? { ...item, bullets: e.target.value } : item)))
                  }
                />
              </div>
            ))}
          </div>
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
