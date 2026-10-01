import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-700">
        <Compass size={26} />
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">That page is not on this sheet</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        This address may have changed. Go back to the previous page or open your dashboard.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeft size={15} /> Go back
        </button>
        <Link to="/dashboard" className="btn-primary">
          Go to my dashboard
        </Link>
        <Link to="/drawings" className="btn-secondary">
          Browse drawing plates
        </Link>
      </div>
    </div>
  )
}
