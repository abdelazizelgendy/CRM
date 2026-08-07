import { z } from "zod";
const id=z.string().min(1).max(120);const date=z.iso.date();
export const invoiceCreateSchema=z.object({organizationId:id,actorId:id,sourceId:id,issueDate:date,dueDate:date,language:z.enum(["ar","en","bilingual"]),idempotencyKey:id}).strict().refine(x=>x.dueDate>=x.issueDate,"Due date precedes issue date");
export const receiptCreateSchema=z.object({organizationId:id,actorId:id,customerId:id,currency:z.string().min(3).max(3),date,amountMinor:z.bigint().positive(),method:z.enum(["bank_transfer","cash","card","cheque","other"]),reference:z.string().max(120),accountLabel:z.string().max(120),notes:z.string().max(1000)}).strict();
export const allocationSchema=z.object({organizationId:id,actorId:id,receiptId:id,invoiceId:id,amountMinor:z.bigint().positive(),idempotencyKey:id,expectedReceiptVersion:z.number().int().positive(),expectedInvoiceVersion:z.number().int().positive()}).strict();
