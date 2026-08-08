import { describe,expect,it } from "vitest";
import { assertNoBomCycles, capacityLoad, calculateNetRequirement, ceilDiv, explodeBom, productionCost, scaleQuantity } from "./calculations";
import { createProductionSeed } from "./seed";
describe("production calculations",()=>{
 it("rounds scaled quantities without floating point",()=>expect(scaleQuantity(1500n,3333n,1000n,500)).toBe(5250n));
 it("supports fixed quantities in BOM explosion",()=>{const seed=createProductionSeed(),result=explodeBom(seed.boms[0],seed.boms,2000n);expect(result.get("item-paint-a")).toBe(1120n);});
 it("prevents division by zero",()=>expect(()=>ceilDiv(1n,0n)).toThrow());
 it("detects direct BOM cycles",()=>{const seed=createProductionSeed();expect(()=>assertNoBomCycles(seed.boms,"item-finished-a",[{...seed.boms[0].lines[0],itemId:"item-finished-a",procurementMode:"make"}])).toThrow("cycle");});
 it("detects indirect BOM cycles",()=>{const seed=createProductionSeed();seed.boms[0].lines[0].procurementMode="make";seed.boms.push({...seed.boms[0],id:"child",outputItemId:"item-ply-a",lines:[{...seed.boms[0].lines[0],itemId:"item-finished-a",procurementMode:"make"}]});expect(()=>explodeBom(seed.boms[0],seed.boms,1000n)).toThrow("cycle");});
 it("nets usable stock and supply exactly once",()=>{const x=calculateNetRequirement({itemId:"i",grossMills:10000n,onHandUsableMills:3000n,reservedMills:1000n,openSupplyMills:2000n,safetyMills:500n,requiredDate:"2026-08-10",pegging:{orderId:"o",projectId:"p",wbsId:"w",taskId:"t"},firm:false,procurementMode:"buy"});expect(x.netMills).toBe(6500n);expect(x.suggestion).toBe("purchase_requisition");});
 it("does not create suggestions when net is zero",()=>expect(calculateNetRequirement({itemId:"i",grossMills:1000n,onHandUsableMills:2000n,reservedMills:0n,openSupplyMills:0n,safetyMills:0n,requiredDate:"x",pegging:{orderId:"o",projectId:"p",wbsId:"w",taskId:"t"},firm:false,procurementMode:"buy"}).suggestion).toBe("none"));
 it("calculates infinite capacity overload",()=>{const center=createProductionSeed().workCenters[0],x=capacityLoad(center,[{setupMinutes:100,runMinutes:1000}],1);expect(x.planningMode).toBe("infinite_capacity");expect(x.overloadMinutes).toBeGreaterThan(0);});
 it("returns null load with zero capacity",()=>{const center={...createProductionSeed().workCenters[0],shiftMinutes:0};expect(capacityLoad(center,[],1).loadBps).toBeNull();});
 it("calculates operational cost with bigint",()=>{const order=createProductionSeed().orders[0],x=productionCost({...order,completedGoodMills:2000n},{plannedMaterialMinor:10000n,actualMaterialMinor:11000n,plannedResourceMinor:5000n,actualResourceMinor:6000n,subcontractMinor:1000n,reworkMinor:500n});expect(x.totalActualMinor).toBe(18500n);expect(x.costPerGoodUnitMinor).toBe(9250n);});
 it("does not divide cost by zero good output",()=>{const order={...createProductionSeed().orders[0],completedGoodMills:0n};expect(productionCost(order,{plannedMaterialMinor:1n,actualMaterialMinor:1n,plannedResourceMinor:1n,actualResourceMinor:1n}).costPerGoodUnitMinor).toBeUndefined();});
 it("marks missing cost sources unavailable",()=>expect(productionCost(createProductionSeed().orders[0],{}).unavailableReason).toMatch(/Missing/));
});
