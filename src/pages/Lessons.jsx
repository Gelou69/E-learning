import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Download, Save } from 'lucide-react'
import { useData } from '../context/DataContext'
import { QUARTERS } from '../data/constants'
import { SdgBadge } from '../components/SdgBadge'
import { downloadCsv } from '../lib/csv'

export default function Lessons() {
  const { plates, pdfs, videos, myProgress, mySubmissions } = useData()
  const [completedOnly, setCompletedOnly] = useState(false)
  const [q, setQ] = useState('')

  const progressFor = (id) => myProgress.find((p) => p.refId === id)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Lessons</h1>
          <p className="mt-1 text-sm text-slate-500">
            The full pathway: plates to study, PDFs to read, and video activities to submit.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCompletedOnly((v) => !v)}
          className={`chip ${completedOnly ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-600'}`}
        >
          {completedOnly ? 'Showing completed' : 'Show completed only'}
        </button>
      </header>

      <input
        className="input"
        placeholder="Filter lessons by keyword…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Filter lessons"
      />

      <div className="space-y-6">
        {QUARTERS.map((quarter) => {
          const term = q.trim().toLowerCase()
          const quarterPlates = plates.filter(
            (p) => p.quarter === quarter.id && (!term || `${p.title} ${p.topic}`.toLowerCase().includes(term)),
          )
          const quarterPdfs = pdfs.filter(
            (p) =>
              p.quarter === quarter.id &&
              p.published &&
              (!completedOnly || progressFor(p.id)?.status === 'completed') &&
              (!term || `${p.title} ${p.topic}`.toLowerCase().includes(term)),
          )
          const quarterVideos = videos.filter(
            (v) => v.quarter === quarter.id && (!term || `${v.title} ${v.topic}`.toLowerCase().includes(term)),
          )
          if (!quarterPlates.length && !quarterPdfs.length && !quarterVideos.length) return null

          return (
            <section key={quarter.id}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-base font-semibold text-slate-900">{quarter.label}</h2>
                <p className="text-sm text-slate-500">{quarter.theme}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {quarterPlates.map((plate) => (
                  <Link
                    key={plate.id}
                    to={`/drawings?sdg=${plate.sdgs[0]}`}
                    className="card flex gap-3 p-3 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-sm"
                  >
                    <div
                      className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: plate.svg ?? '' }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{plate.title}</p>
                      <p className="text-xs text-slate-500">{plate.topic}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {plate.sdgs.map((id) => (
                          <SdgBadge key={id} id={id} />
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}

                {quarterPdfs.map((pdf) => {
                  const progress = progressFor(pdf.id)
                  return (
                    <Link
                      key={pdf.id}
                      to={`/materials?lesson=${encodeURIComponent(pdf.id)}`}
                      className="card p-3 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-sm"
                    >
                      <div className="relative mb-3 flex aspect-video items-end justify-between overflow-hidden rounded-md bg-teal-800 p-4 text-white">
                        <span className="absolute top-0 left-0 h-1 w-full bg-emerald-300" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold tracking-wide text-teal-100 uppercase">
                            {quarter.label} · {pdf.pages} pages
                          </p>
                          <p className="mt-1 truncate text-xs text-emerald-200">{pdf.topic}</p>
                          <p className="mt-1 line-clamp-2 text-sm leading-snug font-semibold">{pdf.title}</p>
                        </div>
                        <BookOpen size={26} className="ml-3 shrink-0 text-teal-100" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{pdf.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{pdf.summary}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {pdf.sdgs.map((id) => (
                          <SdgBadge key={id} id={id} />
                        ))}
                        <span
                          className={`badge ${
                            progress?.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : progress
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {progress?.status === 'completed' ? 'Completed' : progress ? 'In progress' : 'Not started'}
                        </span>
                      </div>
                    </Link>
                  )
                })}

                {quarterVideos.map((video) => {
                  const mine = mySubmissions.filter((s) => s.kind === 'video' && s.refId === video.id)
                  return (
                    <Link
                      key={video.id}
                      to="/videos"
                      className="card overflow-hidden transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-sm"
                    >
                      <div className="relative aspect-video bg-slate-900">
                        <img
                          src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover opacity-80"
                        />
                        <span className="absolute right-2 bottom-2 badge bg-slate-900/80 text-white">{video.duration}</span>
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm font-semibold text-slate-900">{video.title}</p>
                        <p className="text-xs text-slate-500">
                          {video.tasks.length} tasks · {mine.length ? `${mine.length} submitted` : 'not submitted'}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {video.sdgs.map((id) => (
                            <SdgBadge key={id} id={id} />
                          ))}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <Save size={16} className="text-teal-700" />
        <p className="text-sm text-slate-600">
          Progress is saved automatically as you read. Download the pathway list for offline reference.
        </p>
        <button
          type="button"
          className="btn-secondary ml-auto py-1.5 text-xs"
          onClick={() =>
            downloadCsv('vgd-lesson-pathway', [
              ['Quarter', 'Type', 'Title', 'Topic', 'SDGs', 'Status'],
              ...QUARTERS.flatMap((quarter) => [
                ...plates
                  .filter((p) => p.quarter === quarter.id)
                  .map((p) => [quarter.label, 'Plate', p.title, p.topic, p.sdgs.join(', '), 'Available']),
                ...pdfs
                  .filter((p) => p.quarter === quarter.id && p.published)
                  .map((p) => [quarter.label, 'PDF', p.title, p.topic, p.sdgs.join(', '), progressFor(p.id)?.status ?? 'not started']),
                ...videos
                  .filter((v) => v.quarter === quarter.id)
                  .map((v) => [quarter.label, 'Video', v.title, v.topic, v.sdgs.join(', '), 'Available']),
              ]),
            ])
          }
        >
          <Download size={14} /> Download pathway
        </button>
      </div>
    </div>
  )
}
