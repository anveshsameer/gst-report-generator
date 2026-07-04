/** Splits a tax-inclusive (after-tax) amount into before-tax + CGST + SGST. */
export function splitGst(amountAfterTax: number, gstRatePercent: number) {
  const rate = gstRatePercent / 100
  const amountBeforeTax = amountAfterTax / (1 + rate)
  const halfGst = amountBeforeTax * (rate / 2)
  return {
    amountBeforeTax,
    cgst: halfGst,
    sgst: halfGst,
  }
}

export function weightForAmount(amountAfterTax: number, costPerKg: number) {
  return costPerKg > 0 ? amountAfterTax / costPerKg : 0
}
