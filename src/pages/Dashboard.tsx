import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { formatINR } from '../utils/currency'
import { MONTH_NAMES } from '../utils/dateUtils'

export function Dashboard() {
  const settings = useLiveQuery(() => db.settings.toCollection().first())
  const itemCount = useLiveQuery(() => db.items.count())
  const latestReport = useLiveQuery(() => db.monthlyReports.orderBy('id').last())

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">Business</p>
        <p className="text-lg font-semibold">{settings?.businessName ?? 'My Shop'}</p>
        {settings?.branchLabel && <p className="text-sm text-slate-500 dark:text-slate-400">{settings.branchLabel}</p>}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          to="/generate"
          className="rounded-xl border border-slate-200 bg-white p-4 text-center font-medium hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900"
        >
          Generate report
        </Link>
        <Link
          to="/items"
          className="rounded-xl border border-slate-200 bg-white p-4 text-center font-medium hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900"
        >
          Item master
          <span className="mt-1 block text-xs font-normal text-slate-500">{itemCount ?? 0} items</span>
        </Link>
        <Link
          to="/history"
          className="rounded-xl border border-slate-200 bg-white p-4 text-center font-medium hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900"
        >
          Report history
        </Link>
        <Link
          to="/settings"
          className="rounded-xl border border-slate-200 bg-white p-4 text-center font-medium hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900"
        >
          Settings
        </Link>
      </section>

      {latestReport && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Most recent report</p>
          <p className="text-base font-semibold">
            {MONTH_NAMES[latestReport.month - 1]} {latestReport.year}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Grand total: {formatINR(latestReport.actualGrandTotal)}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Bills {latestReport.startingBillNumber}–{latestReport.endingBillNumber}
          </p>
          <Link
            to={`/reports/${latestReport.id}`}
            className="mt-3 inline-block text-sm font-medium text-emerald-600 dark:text-emerald-400"
          >
            View report →
          </Link>
        </section>
      )}
    </div>
  )
}
