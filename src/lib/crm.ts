import { z } from "zod";

export const leadSchema = z.object({
  customerType: z.enum(["individual", "company"]),
  fullName: z.string().trim().min(2, "الاسم مطلوب").max(160),
  companyName: z.string().trim().max(180).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  email: z
    .string()
    .trim()
    .email("البريد الإلكتروني غير صحيح")
    .or(z.literal("")),
  mobile: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  country: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  address: z.string().trim().max(500).optional(),
  sourceId: z.string().uuid().or(z.literal("")),
  stageId: z.string().uuid().or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  requestedService: z.string().trim().max(250).optional(),
  requestDescription: z.string().trim().max(5000).optional(),
  assignedTo: z.string().uuid().or(z.literal("")),
  nextFollowUpAt: z.string().optional(),
});

export const interactionSchema = z.object({
  targetType: z.enum(["lead", "customer", "contact"]),
  targetId: z.string().uuid(),
  kind: z.enum(["note", "call", "meeting", "message", "email", "follow_up"]),
  body: z.string().trim().min(1, "اكتب وصف التفاعل").max(5000),
  outcome: z.string().trim().max(1000).optional(),
  followUp: z.string().optional(),
});

export function normalizePhone(value: string | null | undefined) {
  return (value ?? "").replace(/[^0-9]/g, "");
}
export function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}
export function csvSafe(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export const priorityLabels: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};
export const statusLabels: Record<string, string> = {
  active: "نشط",
  qualified: "مؤهل",
  unqualified: "غير مؤهل",
  converted: "محوّل",
  lost: "مفقود",
  archived: "مؤرشف",
  prospect: "محتمل",
  inactive: "غير نشط",
  suspended: "موقوف",
};
