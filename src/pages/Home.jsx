import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, BookOpen, Images, PlaySquare } from 'lucide-react'
import { QUARTERS, SDGS, TOPICS } from '../data/constants'
import { useData } from '../context/DataContext'

const MODULES = [
  {
    to: '/drawings',
    icon: Images,
    title: 'VCD Drawings Library',
    blurb: 'Filterable gallery of drafting plates with a zoom-and-pan viewer for inspecting line work and dimensions.',
    topics: TOPICS.length,
    unit: 'topics',
  },
  {
    to: '/materials',
    icon: BookOpen,
    title: 'PDF Learning Materials',
    blurb: 'In-browser reader with progress tracking, bookmarks and download, organised by lesson and quarter.',
    topics: 0,
    unit: '',
  },
  {
    to: '/videos',
    icon: PlaySquare,
    title: 'Video Activities',
    blurb: 'Step-by-step sketching and rendering lessons where you submit a sketch or render for rubric grading.',
    topics: 0,
    unit: '',
  },
  {
    to: '/analytics',
    icon: BarChart3,
    title: 'Research Analytics',
    blurb: 'Frequency, percentage, mean, SD and a one-sample t-test against the 3.00 neutral point, with CSV export.',
    topics: 0,
    unit: '',
  },
]

export default function Home() {
  const { plates, pdfs, videos } = useData()
  const published = pdfs.filter((p) => p.published)

  return (
    <div className="space-y-10">
      <section className="card overflow-hidden">
        <div className="grid gap-6 bg-gradient-to-br from-teal-800 to-teal-600 p-6 text-white sm:p-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="badge bg-white/15 text-white">Grade 11 · Visual Graphics Design</span>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">Learn to draft with the SDGs in view</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-teal-50">
              Study contextualized technical drawing plates, work through structured lessons, and submit your own
              drafting work for feedback — all in one place, on any device, even with limited school internet.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/drawings" className="btn bg-white text-teal-800 hover:bg-teal-50">
                Browse drawing plates <ArrowRight size={16} />
              </Link>
              <Link to="/materials" className="btn border border-white/40 text-white hover:bg-white/10">
                Open lesson PDFs
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 self-center text-center">
            {[
              { value: plates.length, label: 'Drawing plates' },
              { value: published.length, label: 'Lesson PDFs' },
              { value: videos.length, label: 'Video activities' },
              { value: SDGS.length, label: 'SDG themes' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-white/10 px-3 py-4">
                <dt className="text-2xl font-semibold">{stat.value}</dt>
                <dd className="mt-0.5 text-[11px] text-teal-100">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Core modules</h2>
        <p className="mt-1 text-sm text-slate-500">Four modules, one shared dataset.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {MODULES.map((module) => (
            <Link
              key={module.to}
              to={module.to}
              className="card group p-5 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-50 text-teal-700">
                <module.icon size={20} />
              </span>
              <h3 className="mt-3 text-base font-semibold text-slate-900">{module.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{module.blurb}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal-700">
                Open module <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Learning pathway by quarter</h2>
          <ol className="mt-3 space-y-2">
            {QUARTERS.map((quarter, index) => {
              const count = plates.filter((p) => p.quarter === quarter.id).length
              const pdfCount = pdfs.filter((p) => p.quarter === quarter.id).length
              return (
                <li key={quarter.id} className="card flex items-start gap-3 p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{quarter.label}</p>
                    <p className="text-sm text-slate-600">{quarter.theme}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {count} plate{count === 1 ? '' : 's'} · {pdfCount} lesson PDF{pdfCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">SDG alignment</h2>
          <p className="mt-1 text-sm text-slate-500">Every plate, lesson and activity is tagged with the goal it serves.</p>
          <div className="mt-3 space-y-2">
            {SDGS.map((sdg) => {
              const plateCount = plates.filter((p) => p.sdgs.includes(sdg.id)).length
              const pdfCount = pdfs.filter((p) => p.sdgs.includes(sdg.id)).length
              return (
                <div key={sdg.id} className="card flex items-center gap-3 p-4">
                  <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: sdg.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {sdg.code} · {sdg.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {plateCount} plates · {pdfCount} lesson PDFs
                    </p>
                  </div>
                  <Link to={`/drawings?sdg=${sdg.id}`} className="btn-secondary px-2.5 py-1.5 text-xs">
                    View
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
