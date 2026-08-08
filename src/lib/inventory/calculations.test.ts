import { describe, expect, it } from "vitest";
import { applyReservations, calculateReorder, convertQuantity, deriveBalances, formatQuantity, movingWeightedAverage, multiplyQuantityCost } from "./calculations";
import type { InventoryMovement } from "./types";

const movement = (overrides: Partial<InventoryMovement> = {}): InventoryMovement => ({ id: "m1", organizationId: "org", number: "MOV-1", type: "opening", status: "posted", occurredAt: "2026-08-08T00:00:00Z", sourceType: "test", sourceId: "source", idempotencyKey: "key", recordVersion: 1, createdBy: "u", lines: [{ id: "l1", itemId: "item", warehouseId: "wh", binId: "bin", quantityMills: 10_000n, direction: 1, bucket: "available", unitCostMinorSnapshot: 250n, currency: "SAR", serialIds: [] }], ...overrides });
describe("inventory calculations", () => {
  it("uses integer quantity-cost arithmetic", () => expect(multiplyQuantityCost(1_500n, 250n)).toBe(375n));
  it("rounds quantity-cost half up", () => expect(multiplyQuantityCost(1n, 500n)).toBe(1n));
  it("converts rational quantities without floating point", () => expect(convertQuantity(3_000n, 5n, 2n)).toBe(7_500n));
  it("rejects a zero conversion denominator", () => expect(() => convertQuantity(1_000n, 1n, 0n)).toThrow());
  it("uses first receipt cost when balance is zero", () => expect(movingWeightedAverage(0n, 0n, 10_000n, 1250n)).toBe(1250n));
  it("calculates moving weighted average", () => expect(movingWeightedAverage(10_000n, 100n, 10_000n, 200n)).toBe(150n));
  it("prevents negative current stock in valuation", () => expect(() => movingWeightedAverage(-1n, 0n, 1n, 1n)).toThrow());
  it("derives balance only from posted movements", () => expect(deriveBalances("org", [movement(), movement({ id: "m2", status: "reversed" })])[0].onHandMills).toBe(10_000n));
  it("isolates organizations in balance derivation", () => expect(deriveBalances("other", [movement()])).toEqual([]));
  it("rejects negative ledger stock", () => expect(() => deriveBalances("org", [movement({ type: "issue", lines: [{ ...movement().lines[0], direction: -1 }] })])).toThrow("Negative stock"));
  it("preserves currencies per balance", () => expect(() => deriveBalances("org", [movement(), movement({ id: "m2", type: "receipt", lines: [{ ...movement().lines[0], id: "l2", currency: "USD" }] })])).toThrow("Mixed currencies"));
  it("deducts reservations from available", () => expect(applyReservations(deriveBalances("org", [movement()]), [{ itemId: "item", warehouseId: "wh", binId: "bin", quantityMills: 2_000n }])[0].availableMills).toBe(8_000n));
  it("prevents over-reservation", () => expect(() => applyReservations(deriveBalances("org", [movement()]), [{ itemId: "item", warehouseId: "wh", binId: "bin", quantityMills: 11_000n }])).toThrow("Over-reservation"));
  it("suggests replenishment toward maximum", () => expect(calculateReorder({ itemId: "i", warehouseId: "w", availableMills: 10n, reservedMills: 0n, openRequestMills: 20n, openPurchaseMills: 0n, acceptedNotPostedMills: 0n, inTransitMills: 0n, safetyMills: 10n, minimumMills: 30n, maximumMills: 100n }).suggestedMills).toBe(110n));
  it("does not reorder above minimum", () => expect(calculateReorder({ itemId: "i", warehouseId: "w", availableMills: 50n, reservedMills: 0n, openRequestMills: 0n, openPurchaseMills: 0n, acceptedNotPostedMills: 0n, inTransitMills: 0n, safetyMills: 10n, minimumMills: 30n, maximumMills: 100n }).suggestedMills).toBe(0n));
  it("formats scaled quantities", () => expect(formatQuantity(12_345n)).toBe("12.345"));
});
