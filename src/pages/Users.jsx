import { useMemo, useState } from 'react'
import { Download, Search, ShieldCheck, UserCheck, UserCog, Users as UsersIcon, UserX } from 'lucide-react'
import { useActions, useData } from '../context/DataContext'
import { Avatar } from '../components/Avatar'
import { downloadCsv, downloadSpreadsheet } from '../lib/csv'
import { ROLE_LABELS } from '../data/roles'

const ROLE_STYLES = {
  student: 'bg-sky-100 text-sky-700',
  teacher: 'bg-teal-100 text-teal-700',
  admin: 'bg-purple-100 text-purple-700',
}

export default function Users() {
  const { users } = useData()
  const { approveUser, setUserActive } = useActions()
  const [view, setView] = useState('approvals')
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('all')
  const [section, setSection] = useState('all')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pendingId, setPendingId] = useState(null)

  const pendingUsers = users.filter((user) => user.requestedRole)
  const approvedUsers = users.filter((user) => !user.requestedRole)
  const sections = [...new Set(users.map((user) => user.section).filter(Boolean))].sort()

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    const source = view === 'approvals' ? pendingUsers : approvedUsers
    return source.filter((u) => {
      if (role !== 'all' && (u.requestedRole ?? u.role) !== role) return false
      if (section !== 'all' && u.section !== section) return false
      if (!term) return true
      return `${u.name} ${u.email} ${u.section ?? ''}`.toLowerCase().includes(term)
    })
  }, [users, view, query, role, section])

  const studentGroups =
    view === 'directory' && role === 'student' && section === 'all'
      ? [...new Set(filtered.map((user) => user.section ?? 'Unassigned'))].sort()
      : null

  const exportUsers = () => {
    const rows = [
      ['ID', 'Name', 'Email', 'Role', 'Status', 'Section', 'Student no.', 'Gender'],
      ...users.map((u) => [
        u.id,
        u.name,
        u.email,
        ROLE_LABELS[u.requestedRole ?? u.role],
        u.requestedRole ? 'Pending approval' : u.isActive === false ? 'Inactive' : 'Approved',
        u.section ?? '',
        u.studentNo ?? '',
        u.gender ?? '',
      ]),
    ]
    downloadCsv('vgd-users', rows)
  }

  const toggleActive = async (target) => {
    setPendingId(target.id)
    setError('')
    setNotice('')
    try {
      if (target.requestedRole) {
        await approveUser(target.id, target.requestedRole)
        setNotice(`${target.name} is approved as a ${target.requestedRole}.`)
      } else {
        const isActive = target.isActive === false
        await setUserActive(target.id, isActive)
        setNotice(`${target.name}'s account is ${isActive ? 'active' : 'deactivated'}.`)
      }
    } catch (err) {
      setError(err?.message ?? 'Could not update that account.')
    } finally {
      setPendingId(null)
    }
  }

  const renderUser = (u) => (
    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar name={u.name} color={u.avatarColor} size={30} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{u.name}</p>
            <p className="truncate text-[11px] text-slate-500">{u.email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className={`badge ${ROLE_STYLES[u.requestedRole ?? u.role]}`}>
          {u.requestedRole ? `${ROLE_LABELS[u.requestedRole]} applicant` : ROLE_LABELS[u.role]}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-600">{u.section ?? '—'}</td>
      <td className="px-3 py-2.5 text-xs text-slate-600 tabular-nums">{u.studentNo ?? '—'}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            {u.requestedRole
              ? 'Waiting for administrator approval'
              : u.role === 'admin'
                ? 'Full access'
                : u.role === 'teacher'
                  ? 'Manage content, grade, view class stats'
                  : 'Study, submit, self-assess'}
          </span>
          <button
            type="button"
            disabled={pendingId === u.id}
            onClick={() => toggleActive(u)}
            className="btn-secondary px-2 py-1 text-xs"
          >
            {u.requestedRole ? <UserCheck size={13} /> : <UserX size={13} />}
            {pendingId === u.id
              ? 'Saving…'
              : u.requestedRole
                ? `Approve ${u.requestedRole}`
                : u.isActive === false
                  ? 'Activate'
                  : 'Deactivate'}
          </button>
        </div>
      </td>
    </tr>
  )

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Users</h1>
          <p className="mt-1 text-sm text-slate-500">
            {approvedUsers.filter((u) => u.role === 'student').length} approved students ·{' '}
            {approvedUsers.filter((u) => u.role === 'teacher').length} approved teachers ·{' '}
            {pendingUsers.length} awaiting approval
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportUsers} className="btn-secondary">
            <Download size={15} /> CSV
          </button>
          <button
            type="button"
            onClick={() =>
              downloadSpreadsheet('vgd-users', [
                {
                  name: 'Users',
                  rows: [
                    ['ID', 'Name', 'Email', 'Role', 'Status', 'Section', 'Student no.'],
                    ...users.map((u) => [
                      u.id,
                      u.name,
                      u.email,
                      ROLE_LABELS[u.requestedRole ?? u.role],
                      u.requestedRole ? 'Pending approval' : u.isActive === false ? 'Inactive' : 'Approved',
                      u.section ?? '',
                      u.studentNo ?? '',
                    ]),
                  ],
                },
              ])
            }
            className="btn-secondary"
          >
            Excel
          </button>
        </div>
      </header>

      {(error || notice) && (
        <p className={`rounded-lg px-3 py-2 text-sm ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`} role={error ? 'alert' : 'status'}>
          {error || notice}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setView('approvals')}
          aria-pressed={view === 'approvals'}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
            view === 'approvals' ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck size={15} /> Pending approvals
          <span className="badge bg-amber-100 text-amber-800">{pendingUsers.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setView('directory')}
          aria-pressed={view === 'directory'}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
            view === 'directory' ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UsersIcon size={15} /> Approved users
          <span className="badge bg-slate-100 text-slate-600">{approvedUsers.length}</span>
        </button>
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-4">
        <div className="relative min-w-48 flex-1">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />          <input
            className="input py-1.5 pl-8 text-xs"
            placeholder="Search by name, email or section…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search users"
          />
        </div>
        {['all', 'student', 'teacher', 'admin'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setRole(option)}
            className={`chip capitalize ${
              role === option ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            {option === 'all' ? 'All' : ROLE_LABELS[option]}
          </button>
        ))}
        <select
          className="input w-auto py-1.5 text-xs"
          aria-label="Filter by section"
          value={section}
          onChange={(event) => setSection(event.target.value)}
        >
          <option value="all">All sections</option>
          {sections.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <h2 className="font-semibold text-slate-800">{view === 'approvals' ? 'Applications awaiting review' : 'Approved user directory'}</h2>
        <span>{filtered.length} {filtered.length === 1 ? 'account' : 'accounts'}</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-2.5">User</th>
              <th className="px-3 py-2.5">Role</th>
              <th className="px-3 py-2.5">Section</th>
              <th className="px-3 py-2.5">Student no.</th>
              <th className="px-4 py-2.5">{view === 'approvals' ? 'Review' : 'Account access'}</th>
            </tr>
          </thead>
          <tbody>
            {studentGroups
              ? studentGroups.map((group) => {
                  const groupUsers = filtered.filter((user) => (user.section ?? 'Unassigned') === group)
                  return (
                    <Fragment key={group}>
                      <tr className="bg-slate-50">
                        <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-slate-700">
                          {group} <span className="font-normal text-slate-500">· {groupUsers.length} students</span>
                        </td>
                      </tr>
                      {groupUsers.map(renderUser)}
                    </Fragment>
                  )
                })
              : filtered.map(renderUser)}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  {view === 'approvals' ? 'No accounts are waiting for approval.' : 'No users match these filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ShieldCheck size={16} /> Role permissions
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: UsersIcon,
              role: 'Student',
              permissions: ['Study plates and lessons', 'Submit drawings and sketches', 'Complete checklist and survey', 'View own feedback'],
            },
            {
              icon: UserCog,
              role: 'Teacher',
              permissions: ['Publish and edit materials', 'Grade with rubric and checklist', 'View gradebook and class stats', 'Post announcements'],
            },
            {
              icon: ShieldCheck,
              role: 'Admin',
              permissions: ['Full analytics with t-tests', 'Export CSV / Excel research data', 'Manage users and content', 'Reset demo data'],
            },
          ].map((card) => (
            <div key={card.role} className="rounded-lg border border-slate-200 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <card.icon size={15} /> {card.role}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {card.permissions.map((permission) => (
                  <li key={permission} className="flex gap-1.5">
                    <span className="text-teal-600">✓</span>
                    {permission}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
