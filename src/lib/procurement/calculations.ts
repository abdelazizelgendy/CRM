import type { DirectExpense, DocumentTotals, MoneyLine, OperationalCostEvent, ProcurementReceipt, ProfitabilityView, ProjectBudget, PurchaseOrder, SupplierBill, TolerancePolicy, CostSummary } from "./types";

export const CURRENCY_DECIMALS: Record<string, number> = { JPY: 0, KRW: 0, SAR: 2, AED: 2, USD: 2, EUR: 2, KWD: 3, BHD: 3, OMR: 3 };
export function roundHalfUp(value: bigint, numerator: bigint, denominator: bigint) { if (denominator <= 0n) throw new Error("Invalid denominator"); const product = value * numerator; return (product + denominator / 2n) / denominator; }
export function calculateDocument(lines: MoneyLine[], shippingMinor = 0n): DocumentTotals {
  if (shippingMinor < 0n) throw new Error("Shipping cannot be negative");
  let subtotalMinor = 0n, discountMinor = 0n, taxMinor = 0n, feesMinor = 0n;
  for (const line of lines) {
    if (line.quantityMills <= 0n || line.unitPriceMinor < 0n || line.feesMinor < 0n || line.discountBps < 0 || line.discountBps > 10_000 || line.taxBps < 0 || line.taxBps > 10_000) throw new Error("Invalid financial line");
    const base = roundHalfUp(line.unitPriceMinor, line.quantityMills, 1000n);
    const discount = roundHalfUp(base, BigInt(line.discountBps), 10_000n);
    subtotalMinor += base; discountMinor += discount; taxMinor += roundHalfUp(base - discount, BigInt(line.taxBps), 10_000n); feesMinor += line.feesMinor;
  }
  const taxableMinor = subtotalMinor - discountMinor;
  return { subtotalMinor, discountMinor, taxableMinor, taxMinor, feesMinor, shippingMinor, totalMinor: taxableMinor + taxMinor + feesMinor + shippingMinor };
}
export function formatMoney(minor: bigint, currency: string) { const decimals = CURRENCY_DECIMALS[currency] ?? 2, factor = 10n ** BigInt(decimals), negative = minor < 0n, absolute = negative ? -minor : minor, whole = absolute / factor, fraction = absolute % factor; return `${negative ? "-" : ""}${whole}${decimals ? `.${fraction.toString().padStart(decimals, "0")}` : ""} ${currency}`; }
export function withinTolerance(reference: bigint, actual: bigint, bps: number, roundingMinor: bigint) { const difference = actual >= reference ? actual - reference : reference - actual; return difference <= roundingMinor || (reference > 0n && difference * 10_000n <= reference * BigInt(bps)); }
export function matchSupplierBill(po: PurchaseOrder, receivedValueMinor: bigint, bill: SupplierBill, policy: TolerancePolicy) {
  if (po.organizationId !== bill.organizationId || po.supplierId !== bill.supplierId || po.currency !== bill.currency) return { status: "mismatch" as const, reason: "Organization, supplier, or currency mismatch" };
  const reference = bill.matchType === "three_way" || policy.requireThreeWayMatch ? receivedValueMinor : po.totals.totalMinor;
  if ((bill.matchType === "three_way" || policy.requireThreeWayMatch) && bill.totals.totalMinor > receivedValueMinor && !withinTolerance(receivedValueMinor, bill.totals.totalMinor, policy.quantityBps, policy.roundingMinor)) return { status: "mismatch" as const, reason: "Bill exceeds received value" };
  if (bill.totals.totalMinor === reference) return { status: "matched" as const, reason: "Exact match" };
  if (withinTolerance(reference, bill.totals.totalMinor, policy.priceBps, policy.roundingMinor)) return { status: "within_tolerance" as const, reason: "Within central tolerance" };
  return { status: "mismatch" as const, reason: "Value exceeds tolerance" };
}
export function summarizeCosts(input: { currency: CostSummary["currency"]; budget: ProjectBudget; purchaseOrders: PurchaseOrder[]; receipts: ProcurementReceipt[]; bills: SupplierBill[]; expenses: DirectExpense[]; events: OperationalCostEvent[]; forecastEtcMinor?: bigint }): CostSummary {
  const { currency, budget } = input; const pos = input.purchaseOrders.filter(x => x.currency === currency && !["cancelled"].includes(x.status)); const bills = input.bills.filter(x => x.currency === currency && x.status !== "voided");
  const recognizedMinor = input.events.filter(x => x.currency === currency && x.kind === "recognized").reduce((s, x) => s + x.amountMinor, 0n); const reversedMinor = input.events.filter(x => x.currency === currency && x.kind === "reversed").reduce((s, x) => s + x.amountMinor, 0n);
  const committedMinor = pos.reduce((s, x) => s + x.totals.totalMinor, 0n); const recognizedFromPos = pos.reduce((s, x) => s + x.recognizedValueMinor, 0n); const received = input.receipts.filter(x => x.status === "approved").reduce((s, x) => s + x.receivedValueMinor, 0n); const billedAgainstReceipts = bills.filter(x => x.receiptIds.length > 0).reduce((s, x) => s + x.totals.totalMinor, 0n); const receivedNotBilledMinor = received > billedAgainstReceipts ? received - billedAgainstReceipts : 0n; const billsUnderReviewMinor = bills.filter(x => ["submitted", "matching", "pending_approval", "approved_internal"].includes(x.status)).reduce((s, x) => s + x.totals.totalMinor, 0n); const actual = recognizedMinor - reversedMinor; const remainingCommitmentMinor = committedMinor > recognizedFromPos ? committedMinor - recognizedFromPos : 0n; const forecastEtcMinor = input.forecastEtcMinor ?? remainingCommitmentMinor; const forecastEacMinor = actual + forecastEtcMinor;
  return { currency, budgetMinor: budget.totalMinor, committedMinor, receivedNotBilledMinor, billsUnderReviewMinor, recognizedMinor, reversedMinor, remainingCommitmentMinor, remainingBudgetMinor: budget.totalMinor - actual - remainingCommitmentMinor, forecastEtcMinor, forecastEacMinor, varianceMinor: budget.totalMinor - forecastEacMinor };
}
export function profitability(input: { currency: ProfitabilityView["currency"]; currentContractValueMinor: bigint; customerInvoicesMinor: bigint; budget: ProjectBudget; summary: CostSummary }): ProfitabilityView {
  if (input.budget.currency !== input.currency || input.summary.currency !== input.currency) return { currency: input.currency, currentContractValueMinor: input.currentContractValueMinor, currentCostBudgetMinor: 0n, recognizedCostMinor: 0n, openCommitmentsMinor: 0n, forecastEtcMinor: 0n, forecastEacMinor: 0n, budgetedGrossMarginMinor: 0n, operationalGrossMarginMinor: 0n, forecastMarginMinor: 0n, marginBps: null, warning: "Cross-currency margin is not calculated" };
  const actual = input.summary.recognizedMinor - input.summary.reversedMinor, forecast = input.currentContractValueMinor - input.summary.forecastEacMinor; return { currency: input.currency, currentContractValueMinor: input.currentContractValueMinor, currentCostBudgetMinor: input.budget.totalMinor, recognizedCostMinor: actual, openCommitmentsMinor: input.summary.remainingCommitmentMinor, forecastEtcMinor: input.summary.forecastEtcMinor, forecastEacMinor: input.summary.forecastEacMinor, budgetedGrossMarginMinor: input.currentContractValueMinor - input.budget.totalMinor, operationalGrossMarginMinor: input.customerInvoicesMinor - actual, forecastMarginMinor: forecast, marginBps: input.currentContractValueMinor > 0n ? Number((forecast * 10_000n) / input.currentContractValueMinor) : null };
}
