import { describe,expect,it } from "vitest";
import { CONTRACT_TRANSITIONS, WORK_ORDER_TRANSITIONS, assertTransition } from "./domain";
describe("central state machines",()=>{
 it("permits documented contract transitions",()=>expect(()=>assertTransition(CONTRACT_TRANSITIONS,"approved","active")).not.toThrow());
 it("rejects random browser transitions",()=>expect(()=>assertTransition(CONTRACT_TRANSITIONS,"draft","active")).toThrow(/Invalid transition/));
 it("requires the work order lifecycle",()=>expect(()=>assertTransition(WORK_ORDER_TRANSITIONS,"draft","completed")).toThrow());
});
