import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { DetailedReportRow, OverviewReport, Settings } from '../types'
import { formatNumberINR } from './currency'
import { formatDisplayDate, MONTH_NAMES } from './dateUtils'

const GREEN: [number, number, number] = [21, 94, 63]
const PURPLE: [number, number, number] = [107, 33, 168]
const SLATE: [number, number, number] = [71, 85, 105]
const HEAD_FILL: [number, number, number] = [241, 245, 249]
const HEAD_TEXT: [number, number, number] = [15, 23, 42]

/** Draws the shared report header (business name / branch / month) and returns the Y to start the table at. */
function drawHeader(
  doc: jsPDF,
  settings: Settings,
  month: number,
  year: number,
  reportTitle?: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 40

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GREEN)
  doc.setFontSize(18)
  doc.text((settings.businessName || 'My Shop').toUpperCase(), pageWidth / 2, y, { align: 'center' })

  if (settings.branchLabel.trim()) {
    y += 20
    doc.setFontSize(12)
    doc.text(`(${settings.branchLabel})`, pageWidth / 2, y, { align: 'center' })
  }

  y += 22
  doc.setTextColor(...PURPLE)
  doc.setFontSize(15)
  doc.text(`${MONTH_NAMES[month - 1].toUpperCase()} ${year}`, pageWidth / 2, y, { align: 'center' })

  if (reportTitle) {
    y += 18
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...SLATE)
    doc.setFontSize(10)
    doc.text(reportTitle, pageWidth / 2, y, { align: 'center' })
  }

  doc.setTextColor(0, 0, 0)
  return y + 20
}

function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

function fileSafe(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, '-')
}

export function exportOverviewPdf(overview: OverviewReport, settings: Settings, month: number, year: number) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const startY = drawHeader(doc, settings, month, year)

  const body = overview.rows.map((r) => [
    formatDisplayDate(r.date),
    String(r.billFrom),
    'to',
    String(r.billTo),
    formatNumberINR(r.amountBeforeTax),
    formatNumberINR(r.cgst),
    formatNumberINR(r.sgst),
  ])

  const totalRowIndex = body.length
  body.push([
    'TOTAL',
    '',
    '',
    '',
    formatNumberINR(overview.totalBeforeTax),
    formatNumberINR(overview.totalCgst),
    formatNumberINR(overview.totalSgst),
  ])

  autoTable(doc, {
    startY,
    head: [['Date', 'Bill number', '', '', 'Amount', 'CGST', 'SGST']],
    body,
    styles: { fontSize: 9, halign: 'center', cellPadding: 5 },
    headStyles: { fillColor: HEAD_FILL, textColor: HEAD_TEXT, fontStyle: 'bold' },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === totalRowIndex) {
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  const y = finalY(doc) + 28
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Grand total', 60, y)
  doc.text(formatNumberINR(overview.grandTotal), doc.internal.pageSize.getWidth() - 60, y, { align: 'right' })

  doc.save(`Overview-${fileSafe(MONTH_NAMES[month - 1])}-${year}.pdf`)
}

export function exportDetailedPdf(rows: DetailedReportRow[], settings: Settings, month: number, year: number) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const startY = drawHeader(doc, settings, month, year, 'Detailed Bill Report')

  const body = rows.map((r) => [
    String(r.billNumber),
    formatDisplayDate(r.date),
    r.itemName,
    formatNumberINR(r.costPerKg),
    r.weight.toFixed(3),
    formatNumberINR(r.amountBeforeTax),
    formatNumberINR(r.cgst),
    formatNumberINR(r.sgst),
    formatNumberINR(r.totalGst),
    formatNumberINR(r.grandTotal),
  ])

  autoTable(doc, {
    startY,
    margin: { top: startY },
    head: [
      [
        'Bill No',
        'Date',
        'Item',
        'Cost/Kg',
        'Weight (Kg)',
        'Amount Before Tax',
        'CGST',
        'SGST',
        'Total GST',
        'Grand Total',
      ],
    ],
    body,
    styles: { fontSize: 8, halign: 'center', cellPadding: 4 },
    headStyles: { fillColor: HEAD_FILL, textColor: HEAD_TEXT, fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'left' } },
    didDrawPage: () => {
      drawHeader(doc, settings, month, year, 'Detailed Bill Report')
    },
  })

  doc.save(`Detailed-${fileSafe(MONTH_NAMES[month - 1])}-${year}.pdf`)
}
