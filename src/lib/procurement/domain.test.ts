import { describe, expect, it } from "vitest";
import { expenseStateMachine, purchaseOrderStateMachine, requisitionStateMachine, supplierBillStateMachine, supplierStateMachine } from "./domain";

describe("procurement state machines", () => {
  it("allows only explicit supplier transitions", () => { expect(supplierStateMachine.can("draft", "pending_review")).toBe(true); expect(supplierStateMachine.can("draft", "approved")).toBe(false); });
  it("locks converted requisitions", () => { expect(requisitionStateMachine.can("converted", "draft")).toBe(false); });
  it("requires purchase order approval before internal issue", () => { expect(purchaseOrderStateMachine.can("approved", "issued_internal")).toBe(true); expect(purchaseOrderStateMachine.can("draft", "issued_internal")).toBe(false); });
  it("models matching and operational recognition separately", () => { expect(supplierBillStateMachine.can("submitted", "matching")).toBe(true); expect(supplierBillStateMachine.can("approved_internal", "recognized_operationally")).toBe(true); expect(expenseStateMachine.can("approved", "recognized_operationally")).toBe(true); });
});
