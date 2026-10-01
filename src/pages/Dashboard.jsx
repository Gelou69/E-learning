import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Images,
  MessageSquare,
  PlaySquare,
  Send,
  TrendingUp,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { QUARTERS, SDGS, SUBJECT } from '../data/constants'
import { Avatar } from '../components/Avatar'
import { SdgBadge } from '../components/SdgBadge'
import { mean, sampleSd } from '../lib/stats'
import { RUBRIC_CRITERIA } from '../data/seed'
import { timeAgo } from '../utils/format'

export default function Dashboard() {
  const { user, isStudent, isTeacher, isAdmin } = useAuth()
  const data = useData()

  if (isStudent) return <StudentDashboard user={user} {...data} />
  if (isTeacher) return <TeacherDashboard user={user} {...data} />
  if (isAdmin) return <AdminDashboard user={user} {...data} />
  return null
}

function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

function StudentDashboard({ user, plates, pdfs, videos, mySubmissions, myProgress, mySurvey, myChecklist, announcements, submissions }) {
  const nextTasks = useMemo(() => {
    const inProgress = myProgress.filter((p) => p.status === 'opened').slice(0, 3)
    return inProgress.map((p) => ({ kind: 'pdf', ...p, item: pdfs.find((pdf) => pdf.id === p.refId) }))
  }, [myProgress, pdfs])

  const graded = mySubmissions.filter((s) => s.status === 'graded')
  const rubricMeans = graded
    .map((s) => {
      const values = RUBRIC_CRITERIA.map((c) => s.rubricScores?.[c.id]).filter((v) => typeof v === 'number')
      return values.length ? mean(values) : null
    })
    .filter((v) => v !== null)

  const published = pdfs.filter((p) => p.published)
  const completedCount = myProgress.filter((p) => p.status === 'completed').length
  const visibleAnnouncements = announcements.filter((a) => a.audience === 'all' || a.audience === 'students')

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center gap-4 bg-gradient-to-br from-teal-800 to-teal-600 p-5 text-white">
        <Avatar name={user.name} color="rgba(255,255,255,0.2)" size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold">Kumusta, {user.name.split(' ')[0]}!</h1>
          <p className="text-sm text-teal-100">
            {SUBJECT.grade} {SUBJECT.course} · {user.section}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="badge bg-white/15 text-white">
            <BarChart3 size={12} /> {graded.length} graded
          </span>
          <span className="badge bg-white/15 text-white">
            <CheckCircle2 size={12} /> {mySurvey ? 'Survey done' : 'Survey pending'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={Images} label="Plates available" value={plates.length} to="/drawings" />
        <MetricCard
          icon={BookOpen}
          label="Lessons complete"
          value={`${completedCount}/${published.length}`}
          to="/materials"
        />
        <MetricCard icon={PlaySquare} label="Video activities" value={videos.length} to="/videos" />
        <MetricCard icon={Send} label="My submissions" value={mySubmissions.length} to="/submissions" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Continue learning</h2>
            <Link to="/materials" className="text-xs font-medium text-teal-700">
              All lessons →
            </Link>
          </div>
          {nextTasks.length === 0 ? (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Nothing in progress. Open a lesson PDF to start tracking your progress.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {nextTasks.map((task) => (
                <li key={task.id}>
                  <Link
                    to="/materials"
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-teal-300 hover:bg-teal-50/40"
                  >
                    <FileText size={18} className="shrink-0 text-rose-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{task.item?.title}</p>
                      <p className="text-xs text-slate-500">
                        Page {task.page} of {task.item?.pages} · opened {timeAgo(task.lastOpened)}
                      </p>
                    </div>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${((task.page ?? 0) / (task.item?.pages || 1)) * 100}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-800">My performance</h2>
          {rubricMeans.length === 0 ? (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              No rubric scores yet. Submit a plate or activity to get feedback.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex items-end gap-3">
                <p className="text-3xl font-semibold text-slate-900">{mean(rubricMeans).toFixed(2)}</p>
                <p className="pb-1 text-xs text-slate-500">
                  mean rubric score / 5.00
                  {rubricMeans.length > 1 && ` · SD ${sampleSd(rubricMeans).toFixed(2)}`}
                </p>
              </div>
              {RUBRIC_CRITERIA.map((criterion) => {
                const values = graded
                  .map((s) => s.rubricScores?.[criterion.id])
                  .filter((v) => typeof v === 'number')
                if (!values.length) return null
                return (
                  <div key={criterion.id}>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span className="truncate pr-2">{criterion.label}</span>
                      <span className="shrink-0 font-medium tabular-nums">{mean(values).toFixed(1)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-600"
                        style={{ width: `${(mean(values) / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Assessment status</h2>
            <Link to="/assessments" className="text-xs font-medium text-teal-700">
              Open assessments →
            </Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <StatusRow
              icon={ClipboardCheck}
              label="Technical skills checklist"
              done={!!myChecklist}
              detail={myChecklist ? `Saved ${timeAgo(myChecklist.submittedAt)}` : 'Not started'}
            />
            <StatusRow
              icon={MessageSquare}
              label="Usefulness and relevance survey"
              done={!!mySurvey}
              detail={mySurvey ? `Submitted ${timeAgo(mySurvey.submittedAt)}` : 'Required to finish the study'}
            />
            <StatusRow
              icon={Send}
              label="Design performance submissions"
              done={mySubmissions.length > 0}
              detail={`${mySubmissions.length} submitted · ${submissions.filter((s) => s.studentId === user.id && s.status !== 'graded').length} awaiting feedback`}
            />
          </ul>
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Announcements</h2>
            <Link to="/announcements" className="text-xs font-medium text-teal-700">
              View all →
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {visibleAnnouncements.slice(0, 3).map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  {a.pinned && <span className="badge bg-amber-100 text-amber-700">Pinned</span>}
                  {a.title}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{a.body}</p>
                <p className="mt-1 text-[11px] text-slate-400">{timeAgo(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-slate-800">This quarter</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {QUARTERS.map((quarter) => {
            const plateCount = plates.filter((p) => p.quarter === quarter.id).length
            const pdfCount = published.filter((p) => p.quarter === quarter.id).length
            return (
              <div key={quarter.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold text-teal-700">{quarter.label}</p>
                <p className="mt-0.5 text-sm text-slate-700">{quarter.theme}</p>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {plateCount} plates · {pdfCount} lessons
                </p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function TeacherDashboard({ user, students, submissions, pendingSubmissions, pdfs, plates, videos, announcements, myProgress }) {
  const classSize = students.length
  const graded = submissions.filter((s) => s.status === 'graded')
  const ungraded = pendingSubmissions
  const avgRubric = useMemo(() => {
    const values = graded.flatMap((s) =>
      RUBRIC_CRITERIA.map((c) => s.rubricScores?.[c.id]).filter((v) => typeof v === 'number'),
    )
    return values.length ? mean(values) : 0
  }, [graded])

  const byStudent = useMemo(() => {
    return students
      .map((student) => {
        const mine = submissions.filter((s) => s.studentId === student.id)
        const scores = mine
          .filter((s) => s.status === 'graded')
          .flatMap((s) => RUBRIC_CRITERIA.map((c) => s.rubricScores?.[c.id]).filter((v) => typeof v === 'number'))
        return {
          student,
          total: mine.length,
          graded: mine.filter((s) => s.status === 'graded').length,
          score: scores.length ? mean(scores) : null,
        }
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  }, [students, submissions])

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good day, ${user.name.split(' ')[0]}`}
        subtitle={`${SUBJECT.grade} ${SUBJECT.course} · ${classSize} students across 3 sections`}
        actions={
          <>
            <Link to="/review" className="btn-primary">
              <ClipboardCheck size={15} /> Grade submissions{ungraded.length ? ` (${ungraded.length})` : ''}
            </Link>
            <Link to="/materials" className="btn-secondary">
              <BookOpen size={15} /> Manage materials
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={ClipboardCheck} label="Awaiting grading" value={ungraded.length} to="/review" tone="rose" />
        <MetricCard icon={TrendingUp} label="Mean rubric score" value={avgRubric ? avgRubric.toFixed(2) : '—'} to="/gradebook" />
        <MetricCard icon={BookOpen} label="Published lessons" value={pdfs.filter((p) => p.published).length} to="/materials" />
        <MetricCard icon={Images} label="Library plates" value={plates.length} to="/drawings" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="card overflow-hidden">
          <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Needs grading</h2>
            <Link to="/review" className="text-xs font-medium text-teal-700">
              Review queue →
            </Link>
          </header>
          {ungraded.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">The queue is clear. Nothing waiting for feedback.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {ungraded.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-3">
                  <Avatar name={s.student?.name} color={s.student?.avatarColor} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{s.student?.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {s.item?.title} · {timeAgo(s.submittedAt)}
                    </p>
                  </div>
                  <span className="badge bg-sky-100 text-sky-700">{s.kind}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-800">Class leaderboard</h2>
          <ul className="mt-3 space-y-2">
            {byStudent.slice(0, 8).map((row, index) => (
              <li key={row.student.id} className="flex items-center gap-3">
                <span className="w-5 text-xs font-semibold text-slate-400">{index + 1}</span>
                <Avatar name={row.student.name} color={row.student.avatarColor} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-800">{row.student.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {row.graded}/{row.total} graded
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-700 tabular-nums">
                  {row.score ? row.score.toFixed(2) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-800">Content health</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-slate-600">Draft lesson PDFs</span>
              <span className="font-medium text-slate-800">{pdfs.filter((p) => !p.published).length}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-600">Video activities</span>
              <span className="font-medium text-slate-800">{videos.length}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-600">Students in myProgress</span>
              <span className="font-medium text-slate-800">{new Set(myProgress.map((p) => p.userId)).size}</span>
            </li>
          </ul>
          <Link to="/materials" className="btn-secondary mt-3 w-full py-1.5 text-xs">
            Manage materials
          </Link>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-800">Submission volume by SDG</h2>
          <ul className="mt-3 space-y-2">
            {SDGS.map((sdg) => {
              const count = submissions.filter((s) => s.item?.sdgs?.includes(sdg.id)).length
              return (
                <li key={sdg.id} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-xs text-slate-600">{sdg.code}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                    <div
                      className="h-full rounded"
                      style={{ width: `${(count / (submissions.length || 1)) * 100}%`, backgroundColor: sdg.color }}
                    />
                  </div>
                  <span className="w-7 text-right text-xs text-slate-600 tabular-nums">{count}</span>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-800">Recent announcements</h2>
          <ul className="mt-3 space-y-2">
            {announcements.slice(0, 3).map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 p-2.5">
                <p className="text-sm font-medium text-slate-800">{a.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {a.author} · {timeAgo(a.createdAt)}
                </p>
              </li>
            ))}
          </ul>
          <Link to="/announcements" className="btn-secondary mt-3 w-full py-1.5 text-xs">
            Manage announcements
          </Link>
        </section>
      </div>
    </div>
  )
}

function AdminDashboard({ user, students, submissions, surveys, checklists, announcements, plates, pdfs, videos }) {
  const surveyRate = (surveys.length / (students.length || 1)) * 100
  const gradedCount = submissions.filter((s) => s.status === 'graded').length

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${user.name}, here is the department overview`}
        subtitle="Platform activity, assessment completion and research data readiness"
        actions={
          <>
            <Link to="/analytics" className="btn-primary">
              <BarChart3 size={15} /> Open analytics
            </Link>
            <Link to="/research" className="btn-secondary">
              Research data
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={BarChart3} label="Survey responses" value={surveys.length} to="/analytics" />
        <MetricCard icon={MessageSquare} label="Survey completion" value={`${surveyRate.toFixed(0)}%`} to="/analytics" />
        <MetricCard icon={ClipboardCheck} label="Checklists done" value={checklists.length} to="/analytics" />
        <MetricCard icon={Send} label="Graded submissions" value={gradedCount} to="/research" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-800">Content inventory</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between">
              <span className="text-slate-600">Drawing plates</span>
              <span className="font-medium text-slate-800">{plates.length}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-600">Lesson PDFs</span>
              <span className="font-medium text-slate-800">{pdfs.filter((p) => p.published).length} published</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-600">Video activities</span>
              <span className="font-medium text-slate-800">{videos.length}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-600">Students enrolled</span>
              <span className="font-medium text-slate-800">{students.length}</span>
            </li>
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-800">SDG coverage</h2>
          <ul className="mt-3 space-y-2">
            {SDGS.map((sdg) => (
              <li key={sdg.id} className="flex items-center gap-2">
                <SdgBadge id={sdg.id} />
                <span className="ml-auto text-xs text-slate-600 tabular-nums">
                  {plates.filter((p) => p.sdgs.includes(sdg.id)).length} plates
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-semibold text-slate-800">Announcement activity</h2>
          <ul className="mt-3 space-y-2">
            {announcements.slice(0, 4).map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 p-2.5">
                <p className="text-sm font-medium text-slate-800">{a.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{timeAgo(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, to, tone = 'teal' }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700',
    rose: 'bg-rose-50 text-rose-600',
  }
  return (
    <Link to={to} className="card p-3.5 transition hover:-translate-y-0.5 hover:shadow-md">
      <span className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}>
        <Icon size={16} />
      </span>
      <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
      <p className="flex items-center gap-1 text-[11px] text-slate-500">
        <Clock size={10} /> {label}
      </p>
    </Link>
  )
}

function StatusRow({ icon: Icon, label, done, detail }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{label}</p>
        <p className="truncate text-[11px] text-slate-500">{detail}</p>
      </div>
      {done ? (
        <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
      ) : (
        <span className="badge bg-amber-100 text-amber-700">pending</span>
      )}
    </li>
  )
}
