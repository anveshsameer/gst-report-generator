const numberFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Indian digit grouping, no currency symbol, e.g. 8,14,603.29 */
export function formatNumberINR(amount: number): string {
  return numberFormatter.format(amount)
}

/** Indian digit grouping with a rupee prefix, e.g. ₹ 8,14,603.29 */
export function formatINR(amount: number): string {
  return `₹ ${numberFormatter.format(amount)}`
}
