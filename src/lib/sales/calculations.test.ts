import { describe,expect,it } from "vitest";
import { calculateLine,calculateQuotation,formatMoney,parseMoney,parseQuantity,roundDivide } from "./calculations";
import type { QuotationLineItem } from "./types";
const line=(overrides:Partial<QuotationLineItem>={}):QuotationLineItem=>({id:"l1",organizationId:"org-madar-demo",code:"A",description:"Service",quantityMills:1000n,unit:"unit",unitPriceMinor:10000n,costMinor:6000n,discountBps:0,taxBps:1500,optional:false,selected:true,sortOrder:1,...overrides});
describe("financial calculations",()=>{
 it("parses currencies with 0, 2 and 3 decimal places",()=>{expect(parseMoney("12.34","SAR")).toBe(1234n);expect(parseMoney("12.345","KWD")).toBe(12345n);expect(parseMoney("12","JPY")).toBe(12n)});
 it("rejects excessive currency precision and negatives",()=>{expect(()=>parseMoney("1.234","SAR")).toThrow();expect(()=>parseMoney("-1","SAR")).toThrow()});
 it("parses decimal quantities safely",()=>{expect(parseQuantity("1.250")).toBe(1250n);expect(()=>parseQuantity("1.2345")).toThrow()});
 it("uses deterministic half-up rounding",()=>{expect(roundDivide(5n,2n)).toBe(3n);expect(roundDivide(-5n,2n)).toBe(-3n)});
 it("calculates quantity, item discount and tax in order",()=>{expect(calculateLine(line({quantityMills:1500n,discountBps:1000}))).toEqual({gross:15000n,discount:1500n,tax:2025n,total:15525n,cost:9000n})});
 it("supports zero and 100% discounts",()=>{expect(calculateLine(line()).total).toBe(11500n);expect(calculateLine(line({discountBps:10000})).total).toBe(0n)});
 it("excludes unselected optional items",()=>{const totals=calculateQuotation([line(),line({id:"l2",optional:true,selected:false,unitPriceMinor:50000n})],[],0);expect(totals.grandTotalMinor).toBe(11500n);expect(totals.selectedOptionalMinor).toBe(0n)});
 it("includes selected optional items and named charges",()=>{const totals=calculateQuotation([line({optional:true,selected:true})],[{id:"c",label:"Delivery",amountMinor:1000n,taxBps:1500}],0);expect(totals.grandTotalMinor).toBe(12650n);expect(totals.selectedOptionalMinor).toBe(11500n)});
 it("applies quotation discount consistently",()=>{const totals=calculateQuotation([line()],[],1000);expect(totals.subtotalMinor).toBe(10000n);expect(totals.quoteDiscountMinor).toBe(1000n);expect(totals.taxMinor).toBe(1350n);expect(totals.grandTotalMinor).toBe(10350n)});
 it("rejects invalid tax and discount ranges",()=>{expect(()=>calculateLine(line({taxBps:10001}))).toThrow();expect(()=>calculateQuotation([line()],[],10001)).toThrow()});
 it("formats amounts using currency metadata",()=>{expect(formatMoney(1234n,"SAR","en-US")).toContain("12.34")});
 it("formats values beyond Number safe integer without precision loss",()=>{expect(formatMoney(900719925474099312345n,"SAR","en-US")).toBe("9,007,199,254,740,993,123.45 SAR")});
 it("calculates margin against net revenue after overall discount and charges",()=>{const totals=calculateQuotation([line()],[{id:"c",label:"Fee",amountMinor:1000n,taxBps:0}],1000);expect(totals.marginMinor).toBe(4000n);expect(totals.marginBps).toBe(4000)});
});
