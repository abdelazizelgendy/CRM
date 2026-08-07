import { z } from "zod";

const safeText = z.string().trim().min(1).max(500).refine(v => !/[<>]/.test(v), "HTML is not allowed");
const id = z.string().trim().min(1).max(100);
const currency = z.enum(["SAR", "USD", "EUR", "EGP", "KWD", "JPY"]);
export const supplierCreateSchema = z.object({ organizationId: id, actorId: id, legalName: safeText, displayName: safeText, country: safeText, city: safeText, contactName: safeText, phone: z.string().trim().max(40), email: z.email(), categories: z.array(safeText).min(1), taxNumber: z.string().trim().max(40).optional() }).strict();
export const requisitionCreateSchema = z.object({ organizationId: id, actorId: id, projectId: id, contractId: id, workOrderId: id.optional(), costCenterId: id, budgetId: id, currency, needByDate: z.iso.date(), justification: safeText, description: safeText, quantityMills: z.bigint().positive(), unitPriceMinor: z.bigint().nonnegative(), costCodeId: id, overrideReason: safeText.optional(), idempotencyKey: id }).strict();
export const supplierBillCreateSchema = z.object({ organizationId: id, actorId: id, supplierId: id, purchaseOrderId: id, receiptIds: z.array(id), supplierInvoiceNumber: safeText, invoiceDate: z.iso.date(), dueDate: z.iso.date(), matchType: z.enum(["two_way", "three_way"]), idempotencyKey: id }).strict();
export const expenseCreateSchema = z.object({ organizationId: id, actorId: id, projectId: id, contractId: id, costCenterId: id, costCodeId: id, expenseType: safeText, party: safeText, date: z.iso.date(), currency, description: safeText, amountMinor: z.bigint().positive(), directPurchaseReason: safeText, paymentMethodLabel: safeText, reference: safeText, idempotencyKey: id }).strict();
