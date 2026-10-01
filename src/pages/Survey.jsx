import { useMemo, useState } from 'react'
import { CheckCircle2, Info, Save, Send } from 'lucide-react'
import { LIKERT_LABELS, SURVEY_DOMAINS, SURVEY_ITEMS } from '../data/seed'
import { useActions, useData } from '../context/DataContext'
import { formatDateTime } from '../utils/format'

export default function Survey() {
  const { mySurvey } = useData()
  const { saveSurvey } = useActions()
  const [answers, setAnswers] = useState(() => mySurvey?.answers ?? {})
  const [comment, setComment] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const answered = Object.keys(answers).length
  const progress = (answered / SURVEY_ITEMS.length) * 100

  const grouped = useMemo(
    () =>
      SURVEY_DOMAINS.map((domain) => ({
        domain,
        items: SURVEY_ITEMS.filter((item) => item.domain === domain),
      })),
    [],
  )

  const submit = async (event) => {
    event.preventDefault()
    if (answered < SURVEY_ITEMS.length) {
      setError(`Please answer all ${SURVEY_ITEMS.length} items before submitting.`)
      return
    }
    setBusy(true)
    try {
      await saveSurvey(answers)
      setSaved(true)
      setError('')
    } catch (err) {
      setError(err?.message ?? 'Could not save your answers.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Usefulness and Relevance Questionnaire</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Ten-plus Likert items across three domains. Rate each statement from 1 (strongly disagree) to 5 (strongly
          agree). Responses are anonymous to your teachers and reported as group statistics only.
        </p>
      </header>

      {mySurvey && (
        <div className="card flex flex-wrap items-center gap-3 border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 size={20} className="text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">Survey completed</p>
            <p className="text-xs text-emerald-800">
              Submitted {formatDateTime(mySurvey.submittedAt)} · {Object.keys(mySurvey.answers).length} items answered.
              You may update your answers at any time.
            </p>
          </div>
        </div>
      )}

      <div className="card sticky top-0 z-10 flex flex-wrap items-center gap-3 p-3">
        <div className="h-2 min-w-40 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm font-medium text-slate-700 tabular-nums">
          {answered} / {SURVEY_ITEMS.length}
        </span>
        <span className="text-xs text-slate-500">Neutral point = 3.00</span>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {grouped.map((group) => (
          <fieldset key={group.domain} className="card overflow-hidden">
            <legend className="w-full border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
              {group.domain}
            </legend>
            <div className="divide-y divide-slate-100">
              {group.items.map((item, index) => (
                <div key={item.id} className="p-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-semibold text-slate-400">{index + 1}.</span>
                    <p className="flex-1 text-sm text-slate-800">{item.text}</p>
                    {item.reverse && (
                      <span className="badge bg-slate-100 text-slate-500" title="Scored in reverse for analysis">
                        reverse-scored
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {LIKERT_LABELS.map((option) => {
                      const active = answers[item.id] === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAnswers((a) => ({ ...a, [item.id]: option.value }))}
                          aria-pressed={active}
                          className={`cursor-pointer rounded-lg border px-1 py-2 text-center transition ${
                            active
                              ? 'border-teal-700 bg-teal-700 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-teal-400'
                          }`}
                        >
                          <span className="block text-sm font-semibold">{option.value}</span>
                          <span className="mt-0.5 hidden text-[10px] leading-tight sm:block">{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="card p-4">
          <label className="label" htmlFor="survey-comment">
            Optional comment
          </label>
          <textarea
            id="survey-comment"
            className="input min-h-24"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was the most useful part of the platform, and what should change?"
          />
        </div>

        <div className="card flex flex-wrap items-center gap-3 p-4">
          <button type="button" onClick={() => setAnswers(mySurvey?.answers ?? {})} className="btn-secondary">
            Reset to saved
          </button>
          <button type="button" onClick={() => setAnswers({})} className="btn-ghost">
            Clear all
          </button>
          <button type="submit" className="btn-primary ml-auto" disabled={busy}>
            <Send size={15} /> {busy ? 'Saving…' : 'Submit responses'}
          </button>
        </div>

        {error && (
          <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            <Info size={15} /> {error}
          </p>
        )}
        {saved && (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <Save size={15} /> Responses saved. Your teacher can now include them in the class statistics.
          </p>
        )}
      </form>
    </div>
  )
}
