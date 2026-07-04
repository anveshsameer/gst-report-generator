import dayjs from 'dayjs'

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function formatDisplayDate(iso: string): string {
  return dayjs(iso).format('DD/MM/YY')
}

export function daysInMonth(year: number, month: number): number {
  return dayjs(new Date(year, month - 1, 1)).daysInMonth()
}
