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
import { CheckIcon, GenerateIcon, PlusIcon, TrashIcon } from '../components/icons'
import type { Bill, FestivalDay, MonthlyReportParams } from '../types'

const today = dayjs()
let festivalKeySeq = 0

interface FestivalDayDraft extends FestivalDay {
  key: number
}

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
  const [billsPerDay, setBillsPerDay] = useState(10)
  const [minBillAmount, setMinBillAmount] = useState(100)
  const [maxBillAmount, setMaxBillAmount] = useState(5000)
  const [festivalDays, setFestivalDays] = useState<FestivalDayDraft[]>([])

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
  const monthMinDate = dayjs(new Date(year, month - 1, 1)).format('YYYY-MM-DD')
  const monthMaxDate = dayjs(new Date(year, month - 1, monthDayCount)).format('YYYY-MM-DD')
  const overviewPreview = useMemo(() => (previewBills ? buildOverviewReport(previewBills) : null), [previewBills])
  const festivalDateSet = useMemo(() => new Set(festivalDays.map((f) => f.date).filter(Boolean)), [festivalDays])

  function addFestivalDay() {
    festivalKeySeq += 1
    setFestivalDays((list) => [...list, { key: festivalKeySeq, date: '', label: '', targetAmount: 0 }])
  }

  function updateFestivalDay(key: number, patch: Partial<FestivalDay>) {
    setFestivalDays((list) => list.map((f) => (f.key === key ? { ...f, ...patch } : f)))
  }

  function removeFestivalDay(key: number) {
    setFestivalDays((list) => list.filter((f) => f.key !== key))
  }

  const errors: string[] = []
  if (!(targetGrandTotal > 0)) errors.push('Target grand total must be greater than 0.')
  if (!(gstRatePercent > 0 && gstRatePercent < 100)) errors.push('GST % must be between 0 and 100.')
  if (!Number.isFinite(startingBillNumber) || startingBillNumber < 1) {
    errors.push('Starting bill number must be at least 1.')
  }
  if (!(billsPerDay >= 1)) errors.push('Bills per day must be at least 1.')
  if (!(minBillAmount >= 0) || !(maxBillAmount > 0)) errors.push('Min/Max bill amount must be positive.')
  if (minBillAmount > maxBillAmount) errors.push('Min bill amount cannot exceed max bill amount.')
  if (!items || items.length === 0) errors.push('Add at least one item in the Item Master first.')

  const seenFestivalDates = new Set<string>()
  for (const fd of festivalDays) {
    if (!fd.date) {
      errors.push('Every festival day needs a date.')
    } else if (fd.date < monthMinDate || fd.date > monthMaxDate) {
      errors.push(`Festival date ${fd.date} falls outside ${MONTH_NAMES[month - 1]} ${year}.`)
    } else if (seenFestivalDates.has(fd.date)) {
      errors.push(`Festival date ${fd.date} is listed twice.`)
    }
    seenFestivalDates.add(fd.date)
    if (!(fd.targetAmount > 0)) {
      errors.push(`Festival day ${fd.date || '(no date)'} needs a target amount greater than 0.`)
    }
  }
  const festivalTotal = festivalDays.reduce((sum, fd) => sum + (fd.targetAmount || 0), 0)
  if (festivalTotal > targetGrandTotal) {
    errors.push(
      `Festival day targets (${formatINR(festivalTotal)}) exceed the monthly target (${formatINR(targetGrandTotal)}) — increase the monthly target or lower festival amounts.`,
    )
  }

  function buildParams(): MonthlyReportParams {
    return {
      month,
      year,
      targetGrandTotal,
      gstRatePercent,
      startingBillNumber,
      billsPerDay,
      minBillAmount,
      maxBillAmount,
      festivalDays: festivalDays.map((fd) => ({ date: fd.date, label: fd.label, targetAmount: fd.targetAmount })),
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
      <h2 className="flex items-center gap-2 text-base font-semibold text-rose-900 dark:text-amber-400">
        <GenerateIcon className="h-5 w-5" />
        Monthly generator
      </h2>

      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
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

        <Field
          label="Bills per day"
          type="number"
          min={1}
          value={billsPerDay}
          onChange={(e) => setBillsPerDay(e.target.valueAsNumber)}
          hint={`Bills are generated for all ${monthDayCount} days in ${MONTH_NAMES[month - 1]} ${year} — no holidays.`}
        />

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

        <div className="space-y-2 border-t border-stone-200 pt-3 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                Festival days (optional)
              </span>
              <span className="block text-xs text-stone-500 dark:text-stone-400">
                Bills for that date target your amount within ±₹1,500. This is carved out of the monthly target
                above, so the month's total still lands close to it.
              </span>
            </div>
            <button
              type="button"
              onClick={addFestivalDay}
              className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-amber-700 dark:text-amber-400"
            >
              <PlusIcon className="h-4 w-4" />
              Add
            </button>
          </div>

          {festivalDays.map((fd) => (
            <div key={fd.key} className="space-y-2 rounded-lg border border-stone-200 p-3 dark:border-stone-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                  {fd.label || 'Festival day'}
                </span>
                <button
                  type="button"
                  onClick={() => removeFestivalDay(fd.key)}
                  className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label="Date"
                  type="date"
                  min={monthMinDate}
                  max={monthMaxDate}
                  value={fd.date}
                  onChange={(e) => updateFestivalDay(fd.key, { date: e.target.value })}
                />
                <Field
                  label="Target (₹)"
                  type="number"
                  min={0}
                  value={fd.targetAmount}
                  onChange={(e) => updateFestivalDay(fd.key, { targetAmount: e.target.valueAsNumber })}
                />
              </div>
              <Field
                label="Label (optional)"
                value={fd.label}
                onChange={(e) => updateFestivalDay(fd.key, { label: e.target.value })}
                placeholder="Ganesh Chaturthi"
              />
            </div>
          ))}
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
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GenerateIcon className="h-4 w-4" />
          {previewBills ? 'Regenerate preview' : 'Generate preview'}
        </button>
      </div>

      {overviewPreview && previewBills && (
        <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-stone-500 dark:text-stone-400">Preview — {previewBills.length} bills</p>
              <p className="text-lg font-semibold">{formatINR(overviewPreview.grandTotal)}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Target was {formatINR(targetGrandTotal)} (bill numbers {previewBills[0].billNumber}–
                {previewBills[previewBills.length - 1].billNumber})
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-rose-900 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
            >
              <CheckIcon className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save report'}
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-stone-200 dark:border-stone-700">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-stone-100 dark:bg-stone-800">
                <tr>
                  <th className="px-2 py-1.5 text-left">Date</th>
                  <th className="px-2 py-1.5 text-left">Bills</th>
                  <th className="px-2 py-1.5 text-right">Amount</th>
                  <th className="px-2 py-1.5 text-right">CGST</th>
                  <th className="px-2 py-1.5 text-right">SGST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                {overviewPreview.rows.map((r) => (
                  <tr key={r.date}>
                    <td className="px-2 py-1.5">
                      {formatDisplayDate(r.date)}
                      {festivalDateSet.has(r.date) && (
                        <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                          Festival
                        </span>
                      )}
                    </td>
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
