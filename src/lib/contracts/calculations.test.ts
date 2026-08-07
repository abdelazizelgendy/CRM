import { describe,expect,it } from "vitest";
import { applyChangeOrder, calculatePaymentSchedule } from "./calculations";

describe("contract financial calculations",()=>{
 it("allocates exact minor-unit total without floating point drift",()=>{const rows=calculatePaymentSchedule(10001n,[{id:"1",label:"A",percentageBps:3333,dueRule:"x",status:"planned"},{id:"2",label:"B",percentageBps:3333,dueRule:"x",status:"planned"},{id:"3",label:"C",percentageBps:3334,dueRule:"x",status:"planned"}]);expect(rows.reduce((sum,row)=>sum+row.amountMinor,0n)).toBe(10001n)});
 it("rejects schedules that do not equal 100 percent",()=>expect(()=>calculatePaymentSchedule(100n,[{id:"1",label:"A",percentageBps:9999,dueRule:"x",status:"planned"}])).toThrow(/100%/));
 it("supports positive and negative approved impacts",()=>{expect(applyChangeOrder(1000n,250n)).toBe(1250n);expect(applyChangeOrder(1000n,-250n)).toBe(750n);expect(()=>applyChangeOrder(100n,-101n)).toThrow()});
});
