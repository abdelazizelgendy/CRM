import type { Bom, BomLine, MrpRequirement, ProductionCost, ProductionOrder, WorkCenter } from "./types";

export const PRODUCTION_QTY_SCALE = 1000n;
export const ceilDiv = (value: bigint, divisor: bigint) => { if (divisor <= 0n) throw new Error("Divisor must be positive"); return (value + divisor - 1n) / divisor; };
export const scaleQuantity = (perMills: bigint, outputMills: bigint, outputBaseMills: bigint, scrapBps = 0) => {
  if (perMills < 0n || outputMills <= 0n || outputBaseMills <= 0n || scrapBps < 0) throw new Error("Invalid production quantity");
  const net = ceilDiv(perMills * outputMills, outputBaseMills);
  return ceilDiv(net * BigInt(10_000 + scrapBps), 10_000n);
};
export function assertNoBomCycles(boms: Bom[], outputItemId: string, lines: BomLine[], depthLimit = 20) {
  const graph = new Map<string, string[]>();
  for (const bom of boms.filter(x => ["approved", "released"].includes(x.status))) graph.set(bom.outputItemId, bom.lines.filter(x => x.procurementMode === "make").map(x => x.itemId));
  graph.set(outputItemId, lines.filter(x => x.procurementMode === "make").map(x => x.itemId));
  const walk = (item: string, path: string[], depth: number) => { if (depth > depthLimit) throw new Error("BOM depth limit exceeded"); if (path.includes(item)) throw new Error("BOM cycle detected"); for (const child of graph.get(item) ?? []) walk(child, [...path, item], depth + 1); };
  walk(outputItemId, [], 0);
}
export function explodeBom(root: Bom, all: Bom[], quantityMills: bigint, depthLimit = 20) {
  const result = new Map<string, bigint>();
  const walk = (bom: Bom, demand: bigint, depth: number) => { if (depth > depthLimit) throw new Error("BOM depth limit exceeded"); for (const line of bom.lines) { const gross = scaleQuantity(line.quantityMills, demand, bom.outputQuantityMills, line.scrapBps) + line.fixedQuantityMills; const child = all.find(x => x.outputItemId === line.itemId && ["approved", "released"].includes(x.status)); if (child && line.procurementMode === "make") walk(child, gross, depth + 1); else result.set(line.itemId, (result.get(line.itemId) ?? 0n) + gross); } };
  assertNoBomCycles(all, root.outputItemId, root.lines, depthLimit); walk(root, quantityMills, 0); return result;
}
export function calculateNetRequirement(input: Omit<MrpRequirement, "id" | "netMills" | "shortageMills" | "suggestion"> & { procurementMode: "make" | "buy" | "subcontract" }) {
  const supply = input.onHandUsableMills + input.openSupplyMills;
  const net = input.grossMills + input.safetyMills + input.reservedMills > supply ? input.grossMills + input.safetyMills + input.reservedMills - supply : 0n;
  return { ...input, id: crypto.randomUUID(), netMills: net, shortageMills: net, suggestion: net === 0n ? "none" as const : input.procurementMode === "make" ? "production_order" as const : "purchase_requisition" as const };
}
export function capacityLoad(center: WorkCenter, cards: Array<{ setupMinutes: number; runMinutes: number }>, workingDays: number) { const nominal = center.shiftMinutes * center.parallelResources * workingDays; const adjusted = Math.floor(nominal * center.efficiencyBps / 10_000); const required = cards.reduce((sum, x) => sum + x.setupMinutes + x.runMinutes, 0); return { nominalMinutes: nominal, availableMinutes: adjusted, requiredMinutes: required, overloadMinutes: Math.max(0, required - adjusted), loadBps: adjusted === 0 ? null : Math.round(required * 10_000 / adjusted), planningMode: "infinite_capacity" as const }; }
export function productionCost(order: ProductionOrder, input: { plannedMaterialMinor?: bigint; actualMaterialMinor?: bigint; plannedResourceMinor?: bigint; actualResourceMinor?: bigint; subcontractMinor?: bigint; reworkMinor?: bigint }): ProductionCost { const required = [input.plannedMaterialMinor,input.actualMaterialMinor,input.plannedResourceMinor,input.actualResourceMinor]; if (required.some(x => x === undefined)) return { orderId: order.id, currency: order.currency, ...input, unavailableReason: "Missing approved material or operational-rate source" }; const planned = input.plannedMaterialMinor! + input.plannedResourceMinor!; const actual = input.actualMaterialMinor! + input.actualResourceMinor! + (input.subcontractMinor ?? 0n) + (input.reworkMinor ?? 0n); return { orderId: order.id, currency: order.currency, ...input, totalPlannedMinor: planned, totalActualMinor: actual, varianceMinor: actual - planned, costPerGoodUnitMinor: order.completedGoodMills > 0n ? actual * PRODUCTION_QTY_SCALE / order.completedGoodMills : undefined, unavailableReason: order.completedGoodMills > 0n ? undefined : "No approved good output" }; }
