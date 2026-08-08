import type { InventoryMovement, ReorderSuggestion, StockBalance, StockBucket } from "./types";

export const QTY_SCALE = 1000n;
export function assertPositive(value: bigint, label = "quantity") { if (value <= 0n) throw new Error(`${label} must be positive`); }
export function multiplyQuantityCost(quantityMills: bigint, unitCostMinor: bigint) { return (quantityMills * unitCostMinor + QTY_SCALE / 2n) / QTY_SCALE; }
export function convertQuantity(valueMills: bigint, numerator: bigint, denominator: bigint, rounding: "half_up" | "down" = "half_up") { if (denominator <= 0n || numerator <= 0n) throw new Error("Conversion ratio must be positive"); const raw = valueMills * numerator; return rounding === "down" ? raw / denominator : (raw + denominator / 2n) / denominator; }
export function movingWeightedAverage(currentQty: bigint, currentCost: bigint, receiptQty: bigint, receiptCost: bigint) { assertPositive(receiptQty, "receipt quantity"); if (currentQty < 0n) throw new Error("Current quantity cannot be negative"); if (currentCost < 0n || receiptCost < 0n) throw new Error("Cost cannot be negative"); if (currentQty === 0n) return receiptCost; const denominator = currentQty + receiptQty; if (denominator === 0n) return 0n; return (currentQty * currentCost + receiptQty * receiptCost + denominator / 2n) / denominator; }

const key = (itemId: string, warehouseId: string, binId: string, bucket: StockBucket) => `${itemId}|${warehouseId}|${binId}|${bucket}`;
export function deriveBalances(organizationId: string, movements: InventoryMovement[]): StockBalance[] {
  const map = new Map<string, StockBalance>();
  for (const movement of movements) {
    if (movement.organizationId !== organizationId || movement.status === "reversed") continue;
    for (const line of movement.lines) {
      const balanceKey = key(line.itemId, line.warehouseId, line.binId, line.bucket), existing = map.get(balanceKey) ?? { organizationId, itemId: line.itemId, warehouseId: line.warehouseId, binId: line.binId, bucket: line.bucket, onHandMills: 0n, reservedMills: 0n, availableMills: 0n, averageUnitCostMinor: 0n, currency: line.currency };
      if (existing.currency !== line.currency) throw new Error("Mixed currencies are not allowed for one stock balance");
      const signed = line.quantityMills * BigInt(line.direction);
      if (line.direction === 1 && ["opening", "receipt", "return", "transfer_in", "adjustment_in"].includes(movement.type)) existing.averageUnitCostMinor = movingWeightedAverage(existing.onHandMills, existing.averageUnitCostMinor, line.quantityMills, line.unitCostMinorSnapshot);
      existing.onHandMills += signed;
      if (existing.onHandMills < 0n) throw new Error("Negative stock detected in posted ledger");
      map.set(balanceKey, existing);
    }
  }
  return [...map.values()].map(row => ({ ...row, reservedMills: 0n, availableMills: row.bucket === "available" ? row.onHandMills : 0n }));
}
export function applyReservations(balances: StockBalance[], reservations: Array<{ itemId: string; warehouseId: string; binId: string; quantityMills: bigint }>) { return balances.map(row => { const reserved = row.bucket === "available" ? reservations.filter(r => r.itemId === row.itemId && r.warehouseId === row.warehouseId && r.binId === row.binId).reduce((s, r) => s + r.quantityMills, 0n) : 0n; if (reserved > row.onHandMills) throw new Error("Over-reservation detected"); return { ...row, reservedMills: reserved, availableMills: row.bucket === "available" ? row.onHandMills - reserved : 0n }; }); }
export function calculateReorder(input: Omit<ReorderSuggestion, "suggestedMills" | "explanation">): ReorderSuggestion { const projected = input.availableMills + input.openPurchaseMills + input.acceptedNotPostedMills + input.inTransitMills - input.openRequestMills; const target = input.maximumMills > 0n ? input.maximumMills : input.minimumMills + input.safetyMills; const suggestedMills = projected < input.minimumMills ? (target > projected ? target - projected : 0n) : 0n; return { ...input, suggestedMills, explanation: suggestedMills > 0n ? "Projected availability is below minimum; replenish toward maximum." : "Projected availability meets the minimum policy." }; }
export function formatQuantity(mills: bigint, precision = 3) { const sign = mills < 0n ? "-" : "", absolute = mills < 0n ? -mills : mills, whole = absolute / QTY_SCALE, fraction = String(absolute % QTY_SCALE).padStart(3, "0").slice(0, Math.max(0, Math.min(3, precision))); return `${sign}${whole}${fraction ? `.${fraction}` : ""}`; }
