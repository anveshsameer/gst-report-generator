export interface Item {
  id?: number
  code: string
  name: string
  pricePerKg: number
}

export interface Bill {
  id?: number
  monthlyReportId: number
  billNumber: number
  date: string // ISO date, YYYY-MM-DD
  itemId: number
  itemName: string
  costPerKg: number
  weight: number
  amountBeforeTax: number
  cgst: number
  sgst: number
  amountAfterTax: number
}

export interface MonthlyReportParams {
  month: number // 1-12
  year: number
  targetGrandTotal: number
  gstRatePercent: number
  startingBillNumber: number
  workingDays: number
  billsPerDay: number
  minBillAmount: number
  maxBillAmount: number
}

export interface MonthlyReportRecord extends MonthlyReportParams {
  id?: number
  endingBillNumber: number
  generatedOn: string // ISO datetime
  actualBeforeTaxTotal: number
  actualCgstTotal: number
  actualSgstTotal: number
  actualGrandTotal: number
}

export interface Settings {
  id?: number
  businessName: string
  branchLabel: string
  defaultGstRatePercent: number
}

export interface DetailedReportRow {
  billNumber: number
  date: string
  itemName: string
  costPerKg: number
  weight: number
  amountBeforeTax: number
  cgst: number
  sgst: number
  totalGst: number
  grandTotal: number
}

export interface OverviewReportRow {
  date: string
  billFrom: number
  billTo: number
  amountBeforeTax: number
  cgst: number
  sgst: number
}

export interface OverviewReport {
  rows: OverviewReportRow[]
  totalBeforeTax: number
  totalCgst: number
  totalSgst: number
  grandTotal: number
}
