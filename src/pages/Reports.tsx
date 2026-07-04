import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { buildDetailedReport, buildOverviewReport } from '../engine/reportBuilder'
import { exportDetailedPdf, exportOverviewPdf } from '../utils/pdfExport'
import { formatINR } from '../utils/currency'
import { formatDisplayDate, MONTH_NAMES } from '../utils/dateUtils'
import { useToastStore } from '../store/useToastStore'

export function Reports() {
  const { reportId } = useParams()
  const id = Number(reportId)
  const push = useToastStore((s) => s.push)
  const [tab, setTab] = useState<'overview' | 'detailed'>('overview')

  const report = useLiveQuery(() => db.monthlyReports.get(id), [id])
  const bills = useLiveQuery(() => db.bills.where('monthlyReportId').equals(id).toArray(), [id])
  const settings = useLiveQuery(() => db.settings.toCollection().first())

  const overview = useMemo(() => (bills ? buildOverviewReport(bills) : null), [bills])
  const detailed = useMemo(() => (bills ? buildDetailedReport(bills) : null), [bills])

  if (!Number.isFinite(id)) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Report not found.</p>
        <Link to="/history" className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          ← Back to history
        </Link>
      </div>
    )
  }

  if (report === undefined || bills === undefined) {
    return <p className="text-sm text-slate-500">Loading…</p>
  }

  function handleExport() {
    if (!settings || !overview || !detailed || !report) return
    if (tab === 'overview') {
      exportOverviewPdf(overview, settings, report.month, report.year)
    } else {
      exportDetailedPdf(detailed, settings, report.month, report.year)
    }
    push('PDF exported.', 'success')
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">
          {MONTH_NAMES[report.month - 1]} {report.year}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Bills {report.startingBillNumber}–{report.endingBillNumber} · Grand total{' '}
          {formatINR(report.actualGrandTotal)}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('overview')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === 'overview'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setTab('detailed')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === 'detailed'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          Detailed
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="ml-auto rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Export PDF
        </button>
      </div>

      {tab === 'overview' && overview && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Bill number</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-right">CGST</th>
                <th className="px-3 py-2 text-right">SGST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {overview.rows.map((r) => (
                <tr key={r.date}>
                  <td className="px-3 py-2">{formatDisplayDate(r.date)}</td>
                  <td className="px-3 py-2">
                    {r.billFrom} to {r.billTo}
                  </td>
                  <td className="px-3 py-2 text-right">{formatINR(r.amountBeforeTax)}</td>
                  <td className="px-3 py-2 text-right">{formatINR(r.cgst)}</td>
                  <td className="px-3 py-2 text-right">{formatINR(r.sgst)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-300 font-semibold dark:border-slate-600">
                <td className="px-3 py-2" colSpan={2}>
                  TOTAL
                </td>
                <td className="px-3 py-2 text-right">{formatINR(overview.totalBeforeTax)}</td>
                <td className="px-3 py-2 text-right">{formatINR(overview.totalCgst)}</td>
                <td className="px-3 py-2 text-right">{formatINR(overview.totalSgst)}</td>
              </tr>
              <tr className="font-semibold">
                <td className="px-3 py-2" colSpan={2}>
                  Grand total
                </td>
                <td className="px-3 py-2 text-right" colSpan={3}>
                  {formatINR(overview.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {tab === 'detailed' && detailed && (
        <div className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-max text-xs">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-2 py-1.5 text-left">Bill No</th>
                <th className="px-2 py-1.5 text-left">Date</th>
                <th className="px-2 py-1.5 text-left">Item</th>
                <th className="px-2 py-1.5 text-right">Cost/Kg</th>
                <th className="px-2 py-1.5 text-right">Weight</th>
                <th className="px-2 py-1.5 text-right">Before Tax</th>
                <th className="px-2 py-1.5 text-right">CGST</th>
                <th className="px-2 py-1.5 text-right">SGST</th>
                <th className="px-2 py-1.5 text-right">Total GST</th>
                <th className="px-2 py-1.5 text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {detailed.map((r) => (
                <tr key={r.billNumber}>
                  <td className="px-2 py-1.5">{r.billNumber}</td>
                  <td className="px-2 py-1.5">{formatDisplayDate(r.date)}</td>
                  <td className="px-2 py-1.5">{r.itemName}</td>
                  <td className="px-2 py-1.5 text-right">{formatINR(r.costPerKg)}</td>
                  <td className="px-2 py-1.5 text-right">{r.weight.toFixed(3)}</td>
                  <td className="px-2 py-1.5 text-right">{formatINR(r.amountBeforeTax)}</td>
                  <td className="px-2 py-1.5 text-right">{formatINR(r.cgst)}</td>
                  <td className="px-2 py-1.5 text-right">{formatINR(r.sgst)}</td>
                  <td className="px-2 py-1.5 text-right">{formatINR(r.totalGst)}</td>
                  <td className="px-2 py-1.5 text-right">{formatINR(r.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
