import dayjs, { type Dayjs } from 'dayjs'
import type { Item, Bill, MonthlyReportParams } from '../types'
import { splitGst, weightForAmount } from './gstMath'

/** Max amount a festival day's actual total may drift from the target the user set for it. */
const FESTIVAL_TOLERANCE = 1500
// Leave rounding headroom so the final (post-rounding) delta never exceeds FESTIVAL_TOLERANCE.
const FESTIVAL_RANDOM_BAND = FESTIVAL_TOLERANCE - 100

/** Every calendar date in the given month — the shop is assumed open every day, no holidays. */
export function resolveWorkingDates(year: number, month: number): Dayjs[] {
  const start = dayjs(new Date(year, month - 1, 1))
  const daysInMonth = start.daysInMonth()
  return Array.from({ length: daysInMonth }, (_, i) => start.add(i, 'day'))
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function pickRandomItem(items: Item[]): Item {
  return items[Math.floor(Math.random() * items.length)]
}

/** Normal day: independently random bill amounts around perBillAverage, clamped to [lo, hi]. */
function normalDayAmounts(count: number, perBillAverage: number, lo: number, hi: number): number[] {
  return Array.from({ length: count }, () => {
    const raw = perBillAverage * randomBetween(0.6, 1.4)
    return Math.max(1, Math.round(Math.min(hi, Math.max(lo, raw))))
  })
}

/**
 * Festival day: picks a random point within targetAmount +/- FESTIVAL_TOLERANCE, then rescales
 * randomly-varied bill amounts to sum to that point. Bills run "fatter" than a normal day
 * (no min/max clamp) but the day's total still lands near the target, not exactly on it.
 */
function festivalDayAmounts(count: number, targetAmount: number): number[] {
  const dayTarget = Math.max(count, targetAmount + randomBetween(-FESTIVAL_RANDOM_BAND, FESTIVAL_RANDOM_BAND))
  const perBillAverage = dayTarget / count
  const raw = Array.from({ length: count }, () => perBillAverage * randomBetween(0.7, 1.3))
  const rawSum = raw.reduce((sum, amount) => sum + amount, 0)
  const scale = dayTarget / rawSum
  return raw.map((amount) => Math.max(1, Math.round(amount * scale)))
}

export function generateMonthlyBills(
  params: MonthlyReportParams,
  items: Item[],
  monthlyReportId: number,
): Bill[] {
  if (items.length === 0) {
    throw new Error('Item master is empty — add items before generating a report.')
  }

  const dates = resolveWorkingDates(params.year, params.month)
  const billsPerDay = Math.max(1, Math.round(params.billsPerDay))
  const [lo, hi] =
    params.minBillAmount <= params.maxBillAmount
      ? [params.minBillAmount, params.maxBillAmount]
      : [params.maxBillAmount, params.minBillAmount]

  const festivalByDate = new Map(params.festivalDays.map((f) => [f.date, f]))
  const festivalTotal = params.festivalDays.reduce((sum, f) => sum + f.targetAmount, 0)
  const normalDayCount = Math.max(1, dates.length - festivalByDate.size)
  // Festival days are carved out of the monthly target, not piled on top of it, so the
  // month's actual total still lands close to what the user typed in overall.
  const remainingTarget = Math.max(0, params.targetGrandTotal - festivalTotal)
  const perBillAverage = remainingTarget / (normalDayCount * billsPerDay)

  const bills: Bill[] = []
  let billNumber = Math.round(params.startingBillNumber)

  for (const date of dates) {
    const dateKey = date.format('YYYY-MM-DD')
    const festival = festivalByDate.get(dateKey)
    const amounts = festival
      ? festivalDayAmounts(billsPerDay, festival.targetAmount)
      : normalDayAmounts(billsPerDay, perBillAverage, lo, hi)

    for (const amountAfterTax of amounts) {
      const item = pickRandomItem(items)
      const { amountBeforeTax, cgst, sgst } = splitGst(amountAfterTax, params.gstRatePercent)

      bills.push({
        monthlyReportId,
        billNumber,
        date: dateKey,
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
