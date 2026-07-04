import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToastStore } from '../store/useToastStore'
import { formatINR } from '../utils/currency'
import { MONTH_NAMES } from '../utils/dateUtils'
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
      <h2 className="text-base font-semibold">Report history</h2>

      {reports != null && reports.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
          No reports generated yet.
        </p>
      )}

      <ul className="space-y-2">
        {reports?.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <p className="font-medium">
                {MONTH_NAMES[r.month - 1]} {r.year}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Bills {r.startingBillNumber}–{r.endingBillNumber} · {formatINR(r.actualGrandTotal)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Link to={`/reports/${r.id}`} className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                View
              </Link>
              <button
                type="button"
                onClick={() => setDeleteTarget(r)}
                className="text-sm font-medium text-red-600 dark:text-red-400"
              >
                Delete
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
