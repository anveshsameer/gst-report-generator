import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { useToastStore } from '../store/useToastStore'
import { formatINR } from '../utils/currency'
import { MONTH_NAMES } from '../utils/dateUtils'
import { HistoryIcon, TrashIcon } from '../components/icons'
import type { MonthlyReportRecord } from '../types'

export function History() {
  const reports = useLiveQuery(() => db.monthlyReports.orderBy('id').reverse().toArray())
  const push = useToastStore((s) => s.push)
  const [deleteTarget, setDeleteTarget] = useState<MonthlyReportRecord | null>(null)

  async function handleDelete() {
    const target = deleteTarget
    if (target?.id == null) return
    await db.transaction('rw', db.monthlyReports, db.bills, async () => {
      await db.bills.where('monthlyReportId').equals(target.id!).delete()
      await db.monthlyReports.delete(target.id!)
    })
    push('Report deleted.', 'success')
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-rose-900 dark:text-amber-400">
        <HistoryIcon className="h-5 w-5" />
        Report history
      </h2>

      {reports != null && reports.length === 0 && (
        <EmptyState
          icon={HistoryIcon}
          title="No reports generated yet"
          description="Reports you generate and save will show up here."
          action={{ label: 'Generate report', to: '/generate' }}
        />
      )}

      <ul className="space-y-2">
        {reports?.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
          >
            <div>
              <p className="font-medium">
                {MONTH_NAMES[r.month - 1]} {r.year}
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Bills {r.startingBillNumber}–{r.endingBillNumber} · {formatINR(r.actualGrandTotal)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Link to={`/reports/${r.id}`} className="text-sm font-medium text-amber-700 dark:text-amber-400">
                View
              </Link>
              <button
                type="button"
                onClick={() => setDeleteTarget(r)}
                aria-label="Delete"
                className="text-red-600 dark:text-red-400"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete report?"
        message={`Delete the ${deleteTarget ? MONTH_NAMES[deleteTarget.month - 1] : ''} ${deleteTarget?.year} report and all its bills? This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
