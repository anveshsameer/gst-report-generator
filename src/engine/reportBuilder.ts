import type { Bill, DetailedReportRow, OverviewReport, OverviewReportRow } from '../types'

function sumBy<T>(list: T[], fn: (item: T) => number): number {
  return list.reduce((acc, item) => acc + fn(item), 0)
}

export function buildDetailedReport(bills: Bill[]): DetailedReportRow[] {
  return [...bills]
    .sort((a, b) => a.billNumber - b.billNumber)
    .map((b) => ({
      billNumber: b.billNumber,
      date: b.date,
      itemName: b.itemName,
      costPerKg: b.costPerKg,
      weight: b.weight,
      amountBeforeTax: b.amountBeforeTax,
      cgst: b.cgst,
      sgst: b.sgst,
      totalGst: b.cgst + b.sgst,
      grandTotal: b.amountAfterTax,
    }))
}

export function buildOverviewReport(bills: Bill[]): OverviewReport {
  const byDate = new Map<string, Bill[]>()
  for (const bill of bills) {
    const list = byDate.get(bill.date) ?? []
    list.push(bill)
    byDate.set(bill.date, list)
  }

  const rows: OverviewReportRow[] = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayBills]) => {
      const sorted = [...dayBills].sort((a, b) => a.billNumber - b.billNumber)
      return {
        date,
        billFrom: sorted[0].billNumber,
        billTo: sorted[sorted.length - 1].billNumber,
        amountBeforeTax: sumBy(sorted, (b) => b.amountBeforeTax),
        cgst: sumBy(sorted, (b) => b.cgst),
        sgst: sumBy(sorted, (b) => b.sgst),
      }
    })

  const totalBeforeTax = sumBy(rows, (r) => r.amountBeforeTax)
  const totalCgst = sumBy(rows, (r) => r.cgst)
  const totalSgst = sumBy(rows, (r) => r.sgst)

  return {
    rows,
    totalBeforeTax,
    totalCgst,
    totalSgst,
    grandTotal: totalBeforeTax + totalCgst + totalSgst,
  }
}
