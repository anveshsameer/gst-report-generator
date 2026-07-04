import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import dayjs from 'dayjs'
import { db } from '../db/db'
import { generateMonthlyBills } from '../engine/billGenerator'
import { buildOverviewReport } from '../engine/reportBuilder'
import { Field, SelectField } from '../components/Field'
import { useToastStore } from '../store/useToastStore'
import { formatINR } from '../utils/currency'
import { MONTH_NAMES, daysInMonth, formatDisplayDate } from '../utils/dateUtils'
import type { Bill, MonthlyReportParams } from '../types'

const today = dayjs()

export function Generator() {
  const navigate = useNavigate()
  const push = useToastStore((s) => s.push)
  const items = useLiveQuery(() => db.items.toArray())
  const settings = useLiveQuery(() => db.settings.toCollection().first())
  const lastReport = useLiveQuery(() => db.monthlyReports.orderBy('id').last())

  const [month, setMonth] = useState(today.month() + 1)
  const [year, setYear] = useState(today.year())
  const [targetGrandTotal, setTargetGrandTotal] = useState(90000)
  const [gstRatePercent, setGstRatePercent] = useState(5)
  const [startingBillNumber, setStartingBillNumber] = useState(1)
  const [workingDays, setWorkingDays] = useState(() => daysInMonth(today.year(), today.month() + 1))
  const [billsPerDay, setBillsPerDay] = useState(10)
  const [minBillAmount, setMinBillAmount] = useState(100)
  const [maxBillAmount, setMaxBillAmount] = useState(5000)

  const [prefilled, setPrefilled] = useState(false)
  const [previewBills, setPreviewBills] = useState<Bill[] | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (prefilled || settings === undefined || lastReport === undefined) return
    if (settings) setGstRatePercent(settings.defaultGstRatePercent)
    if (lastReport) setStartingBillNumber(lastReport.endingBillNumber + 1)
    setPrefilled(true)
  }, [settings, lastReport, prefilled])

  const monthDayCount = daysInMonth(year, month)
  const overviewPreview = useMemo(() => (previewBills ? buildOverviewReport(previewBills) : null), [previewBills])

  const errors: string[] = []
  if (!(targetGrandTotal > 0)) errors.push('Target grand total must be greater than 0.')
  if (!(gstRatePercent > 0 && gstRatePercent < 100)) errors.push('GST % must be between 0 and 100.')
  if (!Number.isFinite(startingBillNumber) || startingBillNumber < 1) {
    errors.push('Starting bill number must be at least 1.')
  }
  if (!(workingDays >= 1 && workingDays <= monthDayCount)) {
    errors.push(`Working days must be between 1 and ${monthDayCount}.`)
  }
  if (!(billsPerDay >= 1)) errors.push('Bills per day must be at least 1.')
  if (!(minBillAmount >= 0) || !(maxBillAmount > 0)) errors.push('Min/Max bill amount must be positive.')
  if (minBillAmount > maxBillAmount) errors.push('Min bill amount cannot exceed max bill amount.')
  if (!items || items.length === 0) errors.push('Add at least one item in the Item Master first.')

  function buildParams(): MonthlyReportParams {
    return {
      month,
      year,
      targetGrandTotal,
      gstRatePercent,
      startingBillNumber,
      workingDays,
      billsPerDay,
      minBillAmount,
      maxBillAmount,
    }
  }

  function handlePreview() {
    if (errors.length > 0 || !items) return
    setPreviewBills(generateMonthlyBills(buildParams(), items, -1))
  }

  async function handleSave() {
    if (!previewBills || previewBills.length === 0) return
    setSaving(true)
    try {
      const overview = buildOverviewReport(previewBills)
      const endingBillNumber = previewBills[previewBills.length - 1].billNumber
      const id = (await db.monthlyReports.add({
        ...buildParams(),
        endingBillNumber,
        generatedOn: new Date().toISOString(),
        actualBeforeTaxTotal: overview.totalBeforeTax,
        actualCgstTotal: overview.totalCgst,
        actualSgstTotal: overview.totalSgst,
        actualGrandTotal: overview.grandTotal,
      })) as number
      const finalBills = previewBills.map((b) => ({ ...b, monthlyReportId: id }))
      await db.bills.bulkAdd(finalBills)
      push('Monthly report saved.', 'success')
      navigate(`/reports/${id}`)
    } catch (err) {
      push(err instanceof Error ? err.message : 'Could not save report.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold">Monthly generator</h2>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </SelectField>
          <Field label="Year" type="number" value={year} onChange={(e) => setYear(e.target.valueAsNumber)} />
        </div>

        <Field
          label="Target grand total (after tax, ₹)"
          type="number"
          min={0}
          value={targetGrandTotal}
          onChange={(e) => setTargetGrandTotal(e.target.valueAsNumber)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="GST %"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={gstRatePercent}
            onChange={(e) => setGstRatePercent(e.target.valueAsNumber)}
            hint="Split evenly CGST/SGST"
          />
          <Field
            label="Starting bill number"
            type="number"
            min={1}
            value={startingBillNumber}
            onChange={(e) => setStartingBillNumber(e.target.valueAsNumber)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Working days"
            type="number"
            min={1}
            max={monthDayCount}
            value={workingDays}
            onChange={(e) => setWorkingDays(e.target.valueAsNumber)}
            hint={`${monthDayCount} days in month`}
          />
          <Field
            label="Bills per day"
            type="number"
            min={1}
            value={billsPerDay}
            onChange={(e) => setBillsPerDay(e.target.valueAsNumber)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Min bill amount (₹)"
            type="number"
            min={0}
            value={minBillAmount}
            onChange={(e) => setMinBillAmount(e.target.valueAsNumber)}
          />
          <Field
            label="Max bill amount (₹)"
            type="number"
            min={0}
            value={maxBillAmount}
            onChange={(e) => setMaxBillAmount(e.target.valueAsNumber)}
          />
        </div>

        {errors.length > 0 && (
          <ul className="list-inside list-disc rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={handlePreview}
          disabled={errors.length > 0}
          className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {previewBills ? 'Regenerate preview' : 'Generate preview'}
        </button>
      </div>

      {overviewPreview && previewBills && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Preview — {previewBills.length} bills</p>
              <p className="text-lg font-semibold">{formatINR(overviewPreview.grandTotal)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target was {formatINR(targetGrandTotal)} (bill numbers {previewBills[0].billNumber}–
                {previewBills[previewBills.length - 1].billNumber})
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {saving ? 'Saving…' : 'Save report'}
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="px-2 py-1.5 text-left">Date</th>
                  <th className="px-2 py-1.5 text-left">Bills</th>
                  <th className="px-2 py-1.5 text-right">Amount</th>
                  <th className="px-2 py-1.5 text-right">CGST</th>
                  <th className="px-2 py-1.5 text-right">SGST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {overviewPreview.rows.map((r) => (
                  <tr key={r.date}>
                    <td className="px-2 py-1.5">{formatDisplayDate(r.date)}</td>
                    <td className="px-2 py-1.5">
                      {r.billFrom}–{r.billTo}
                    </td>
                    <td className="px-2 py-1.5 text-right">{formatINR(r.amountBeforeTax)}</td>
                    <td className="px-2 py-1.5 text-right">{formatINR(r.cgst)}</td>
                    <td className="px-2 py-1.5 text-right">{formatINR(r.sgst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
