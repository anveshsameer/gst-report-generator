import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { formatINR } from '../utils/currency'
import { MONTH_NAMES } from '../utils/dateUtils'
import { EmptyState } from '../components/EmptyState'
import { GenerateIcon, HistoryIcon, ItemsIcon, SettingsIcon, SweetBoxIcon } from '../components/icons'

const QUICK_ACTIONS = [
  { to: '/generate', label: 'Generate report', Icon: GenerateIcon, hint: undefined as string | undefined },
  { to: '/items', label: 'Item master', Icon: ItemsIcon, hint: 'items' },
  { to: '/history', label: 'Report history', Icon: HistoryIcon, hint: undefined as string | undefined },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon, hint: undefined as string | undefined },
]

export function Dashboard() {
  const settings = useLiveQuery(() => db.settings.toCollection().first())
  const itemCount = useLiveQuery(() => db.items.count())
  const latestReport = useLiveQuery(() => db.monthlyReports.orderBy('id').last())

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
        <p className="text-sm text-stone-500 dark:text-stone-400">Business</p>
        <p className="text-lg font-semibold">{settings?.businessName ?? 'My Shop'}</p>
        {settings?.branchLabel && <p className="text-sm text-stone-500 dark:text-stone-400">{settings.branchLabel}</p>}
      </section>

      <section className="grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map(({ to, label, Icon, hint }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-2 rounded-xl border border-stone-200 bg-white p-4 text-center font-medium hover:border-amber-400 dark:border-stone-800 dark:bg-stone-900"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              <Icon className="h-5 w-5" />
            </span>
            {label}
            {hint && <span className="block text-xs font-normal text-stone-500">{itemCount ?? 0} {hint}</span>}
          </Link>
        ))}
      </section>

      {latestReport ? (
        <section className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm text-stone-500 dark:text-stone-400">Most recent report</p>
          <p className="text-base font-semibold">
            {MONTH_NAMES[latestReport.month - 1]} {latestReport.year}
          </p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            Grand total: {formatINR(latestReport.actualGrandTotal)}
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Bills {latestReport.startingBillNumber}–{latestReport.endingBillNumber}
          </p>
          <Link
            to={`/reports/${latestReport.id}`}
            className="mt-3 inline-block text-sm font-medium text-amber-700 dark:text-amber-400"
          >
            View report →
          </Link>
        </section>
      ) : (
        <EmptyState
          icon={SweetBoxIcon}
          title="No reports yet"
          description="Generate your first monthly GST report to see it here."
          action={{ label: 'Generate report', to: '/generate' }}
        />
      )}
    </div>
  )
}
