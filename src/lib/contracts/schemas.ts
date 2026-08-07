import { z } from "zod";
const id = z.string().trim().min(1).max(100),
  text = z.string().trim().min(1).max(5000),
  date = z.iso.date();
export const contractConversionSchema = z
  .object({
    organizationId: id,
    actorId: id,
    quotationVersionId: id,
    ownerId: id,
    department: text.max(120),
    type: text.max(120),
    startDate: date,
    endDate: date,
    language: z.enum(["ar", "en", "bilingual"]),
    idempotencyKey: id.max(200),
  })
  .strict()
  .refine((x) => x.endDate >= x.startDate, {
    message: "End date must follow start date",
  });
export const changeOrderCreateSchema = z
  .object({
    organizationId: id,
    actorId: id,
    contractId: id,
    type: text.max(120),
    reason: text.max(1000),
    description: text,
    valueImpactMinor: z.bigint(),
    durationImpactDays: z.number().int().min(-3650).max(3650),
  })
  .strict();
export const workOrderCreateSchema = z
  .object({
    organizationId: id,
    actorId: id,
    contractId: id,
    deliverableId: id.optional(),
    title: text.max(300),
    description: text,
    type: text.max(120),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    department: text.max(120),
    ownerId: id,
    participantIds: z.array(id).max(50).optional(),
    startDate: date,
    dueDate: date,
    checklist: z
      .array(
        z.object({ title: text.max(300), mandatory: z.boolean() }).strict(),
      )
      .max(100),
    overrideReason: text.max(1000).optional(),
  })
  .strict()
  .refine((x) => x.dueDate >= x.startDate, {
    message: "Due date must follow start date",
  });
