import dayjs, { type Dayjs } from 'dayjs'
import type { Item, Bill, MonthlyReportParams } from '../types'
import { splitGst, weightForAmount } from './gstMath'

/**
 * Spreads `workingDays` dates evenly across the month instead of clumping them
 * at the start, so a lower working-day count still covers the whole month.
 */
export function resolveWorkingDates(year: number, month: number, workingDays: number): Dayjs[] {
  const start = dayjs(new Date(year, month - 1, 1))
  const daysInMonth = start.daysInMonth()
  const count = Math.min(Math.max(Math.round(workingDays), 1), daysInMonth)

  const dates: Dayjs[] = []
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor((i * daysInMonth) / count)
    dates.push(start.add(dayOffset, 'day'))
  }
  return dates
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function pickRandomItem(items: Item[]): Item {
  return items[Math.floor(Math.random() * items.length)]
}

export function generateMonthlyBills(
  params: MonthlyReportParams,
  items: Item[],
  monthlyReportId: number,
): Bill[] {
  if (items.length === 0) {
    throw new Error('Item master is empty — add items before generating a report.')
  }

  const dates = resolveWorkingDates(params.year, params.month, params.workingDays)
  const billsPerDay = Math.max(1, Math.round(params.billsPerDay))
  const perBillAverage = params.targetGrandTotal / (dates.length * billsPerDay)
  const [lo, hi] =
    params.minBillAmount <= params.maxBillAmount
      ? [params.minBillAmount, params.maxBillAmount]
      : [params.maxBillAmount, params.minBillAmount]

  const bills: Bill[] = []
  let billNumber = Math.round(params.startingBillNumber)

  for (const date of dates) {
    for (let i = 0; i < billsPerDay; i++) {
      const item = pickRandomItem(items)
      // Randomize +/-40% around the average bill, clamped to the min/max bounds.
      const raw = perBillAverage * randomBetween(0.6, 1.4)
      const amountAfterTax = Math.max(1, Math.round(Math.min(hi, Math.max(lo, raw))))
      const { amountBeforeTax, cgst, sgst } = splitGst(amountAfterTax, params.gstRatePercent)

      bills.push({
        monthlyReportId,
        billNumber,
        date: date.format('YYYY-MM-DD'),
        itemId: item.id!,
        itemName: item.name,
        costPerKg: item.pricePerKg,
        weight: weightForAmount(amountAfterTax, item.pricePerKg),
        amountBeforeTax,
        cgst,
        sgst,
        amountAfterTax,
      })
      billNumber++
    }
  }

  return bills
}
