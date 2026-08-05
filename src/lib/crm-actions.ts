"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWorkspace } from "@/lib/workspace";
import { interactionSchema, leadSchema } from "@/lib/crm";

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();
const messageUrl = (path: string, type: "success" | "error", message: string) =>
  `${path}${path.includes("?") ? "&" : "?"}${type}=${encodeURIComponent(message)}`;

async function getAuthorizedWorkspace(permission: string) {
  const workspace = await getWorkspace();
  const { data, error } = await workspace.supabase.rpc("has_permission", {
    target_org: workspace.membership.organization_id,
    permission_code: permission,
  });
  if (error || !data) throw new Error("Forbidden");
  return workspace;
}

export async function createLead(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success)
    redirect(
      messageUrl(
        "/dashboard/crm/leads/new",
        "error",
        parsed.error.issues[0]?.message ?? "تحقق من البيانات",
      ),
    );
  const { supabase } = await getAuthorizedWorkspace("leads.create");
  const d = parsed.data;
  const { data: duplicates, error: duplicateError } = await supabase.rpc(
    "find_lead_duplicates",
    {
      candidate_email: d.email,
      candidate_mobile: d.mobile || "",
      candidate_whatsapp: d.whatsapp || "",
      candidate_company: d.companyName || "",
    },
  );
  if (duplicateError)
    redirect(
      messageUrl("/dashboard/crm/leads/new", "error", "تعذر تنفيذ فحص التكرار"),
    );
  if (
    (duplicates?.length ?? 0) > 0 &&
    clean(formData.get("confirmDuplicate")) !== "yes"
  ) {
    const ids = (duplicates as { id: string }[])
      .map((item) => item.id)
      .join(",");
    redirect(
      `/dashboard/crm/leads/new?duplicates=${encodeURIComponent(ids)}&error=${encodeURIComponent("توجد سجلات مشابهة. راجعها قبل التأكيد")}`,
    );
  }
  const { data: id, error } = await supabase.rpc("create_lead", {
    payload: {
      customer_type: d.customerType,
      full_name: d.fullName,
      company_name: d.companyName,
      job_title: d.jobTitle,
      email: d.email,
      mobile: d.mobile,
      whatsapp: d.whatsapp,
      country: d.country,
      city: d.city,
      address: d.address,
      source_id: d.sourceId,
      stage_id: d.stageId,
      priority: d.priority,
      requested_service: d.requestedService,
      request_description: d.requestDescription,
      assigned_to: d.assignedTo,
      next_follow_up_at: d.nextFollowUpAt,
    },
  });
  if (error)
    redirect(
      messageUrl(
        "/dashboard/crm/leads/new",
        "error",
        "تعذر إنشاء السجل أو ليست لديك الصلاحية",
      ),
    );
  redirect(
    `/dashboard/crm/leads/${id}?success=${encodeURIComponent("تم إنشاء العميل المحتمل")}`,
  );
}

export async function updateLead(formData: FormData) {
  const id = clean(formData.get("id"));
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!z.string().uuid().safeParse(id).success || !parsed.success)
    redirect(
      messageUrl(
        `/dashboard/crm/leads/${id}/edit`,
        "error",
        "تحقق من البيانات",
      ),
    );
  const { supabase, membership } = await getAuthorizedWorkspace("leads.update");
  const d = parsed.data;
  const { error } = await supabase
    .from("leads")
    .update({
      customer_type: d.customerType,
      full_name: d.fullName,
      company_name: d.companyName || null,
      job_title: d.jobTitle || null,
      email: d.email || null,
      mobile: d.mobile || null,
      whatsapp: d.whatsapp || null,
      country: d.country || null,
      city: d.city || null,
      address: d.address || null,
      source_id: d.sourceId || null,
      stage_id: d.stageId,
      priority: d.priority,
      requested_service: d.requestedService || null,
      request_description: d.requestDescription || null,
      assigned_to: d.assignedTo || null,
      next_follow_up_at: d.nextFollowUpAt || null,
    })
    .eq("id", id)
    .eq("organization_id", membership.organization_id);
  if (error)
    redirect(
      messageUrl(
        `/dashboard/crm/leads/${id}/edit`,
        "error",
        "تعذر حفظ التعديل أو ليست لديك الصلاحية",
      ),
    );
  redirect(
    messageUrl(`/dashboard/crm/leads/${id}`, "success", "تم حفظ التعديلات"),
  );
}

export async function archiveLeads(formData: FormData) {
  const ids = formData
    .getAll("leadIds")
    .map(String)
    .filter((id) => z.string().uuid().safeParse(id).success);
  if (!ids.length)
    redirect(
      messageUrl("/dashboard/crm/leads", "error", "حدد سجلًا واحدًا على الأقل"),
    );
  const { supabase } = await getAuthorizedWorkspace("leads.delete");
  const { error } = await supabase.rpc("archive_leads", { lead_ids: ids });
  redirect(
    messageUrl(
      "/dashboard/crm/leads",
      error ? "error" : "success",
      error ? "تعذر أرشفة السجلات" : "تمت أرشفة السجلات المحددة",
    ),
  );
}

export async function changeLeadStage(formData: FormData) {
  const leadId = clean(formData.get("leadId")),
    stageId = clean(formData.get("stageId"));
  if (
    !z.string().uuid().safeParse(leadId).success ||
    !z.string().uuid().safeParse(stageId).success
  )
    redirect(messageUrl("/dashboard/crm/leads", "error", "بيانات غير صالحة"));
  const { supabase } = await getAuthorizedWorkspace("leads.update");
  const { error } = await supabase.rpc("change_lead_stage", {
    target_lead: leadId,
    target_stage: stageId,
  });
  revalidatePath("/dashboard/crm/leads");
  if (error)
    redirect(messageUrl("/dashboard/crm/leads", "error", "تعذر تغيير المرحلة"));
}

export async function addInteraction(formData: FormData) {
  const parsed = interactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(
      messageUrl(
        clean(formData.get("returnTo")) || "/dashboard/crm",
        "error",
        parsed.error.issues[0]?.message ?? "تحقق من البيانات",
      ),
    );
  const d = parsed.data;
  const permission = d.targetType === "lead" ? "leads.update" : d.targetType === "customer" ? "customers.update" : "contacts.update";
  const { supabase } = await getAuthorizedWorkspace(permission);
  const { error } = await supabase.rpc("add_crm_interaction", {
    target_type: d.targetType,
    target_id: d.targetId,
    kind: d.kind,
    body: d.body,
    outcome_text: d.outcome || null,
    follow_up: d.followUp || null,
  });
  redirect(
    messageUrl(
      clean(formData.get("returnTo")) || "/dashboard/crm",
      error ? "error" : "success",
      error ? "تعذر تسجيل التفاعل" : "تم تسجيل التفاعل",
    ),
  );
}

export async function convertLead(formData: FormData) {
  const id = clean(formData.get("leadId"));
  if (!z.string().uuid().safeParse(id).success)
    redirect(messageUrl("/dashboard/crm/leads", "error", "سجل غير صالح"));
  const { supabase } = await getAuthorizedWorkspace("leads.convert");
  const { data, error } = await supabase.rpc("convert_lead", {
    target_lead: id,
  });
  if (error)
    redirect(
      messageUrl(
        `/dashboard/crm/leads/${id}`,
        "error",
        error.message.includes("duplicate")
          ? "يوجد عميل مشابه؛ راجعه قبل التحويل"
          : "تعذر التحويل أو تم تحويل السجل سابقًا",
      ),
    );
  const customerId = (data as { customer_id?: string })?.customer_id;
  redirect(
    messageUrl(
      `/dashboard/crm/customers/${customerId}`,
      "success",
      "تم تحويل العميل المحتمل بنجاح",
    ),
  );
}

export async function mergeLeads(formData: FormData) {
  const masterId = clean(formData.get("masterId")),
    duplicateId = clean(formData.get("duplicateId"));
  if (
    !z.string().uuid().safeParse(masterId).success ||
    !z.string().uuid().safeParse(duplicateId).success
  )
    redirect(
      messageUrl(
        `/dashboard/crm/leads/${masterId}`,
        "error",
        "اختر سجلًا صالحًا للدمج",
      ),
    );
  const { supabase } = await getAuthorizedWorkspace("leads.merge");
  const { error } = await supabase.rpc("merge_leads", {
    master_id: masterId,
    duplicate_id: duplicateId,
    resolutions: {},
  });
  redirect(
    messageUrl(
      `/dashboard/crm/leads/${masterId}`,
      error ? "error" : "success",
      error
        ? "تعذر الدمج أو ليست لديك الصلاحية"
        : "تم الدمج وأرشفة السجل المكرر",
    ),
  );
}

export async function createCustomer(formData: FormData) {
  const schema = z.object({
    customerType: z.enum(["individual", "company"]),
    nameAr: z.string().trim().min(2),
    nameEn: z.string().trim().optional(),
    sector: z.string().trim().optional(),
    email: z.string().email().or(z.literal("")),
    phone: z.string().trim().optional(),
    whatsapp: z.string().trim().optional(),
    country: z.string().trim().optional(),
    city: z.string().trim().optional(),
    address: z.string().trim().optional(),
    taxNumber: z.string().trim().optional(),
    commercialRegistration: z.string().trim().optional(),
    accountManagerId: z.string().uuid().or(z.literal("")),
    notes: z.string().trim().max(5000).optional(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(
      messageUrl(
        "/dashboard/crm/customers/new",
        "error",
        "تحقق من بيانات العميل",
      ),
    );
  const { supabase, user, membership } = await getAuthorizedWorkspace("customers.create");
  const d = parsed.data;
  const { data, error } = await supabase
    .from("customer_accounts")
    .insert({
      organization_id: membership.organization_id,
      customer_type: d.customerType,
      name_ar: d.nameAr,
      name_en: d.nameEn || null,
      sector: d.sector || null,
      general_email: d.email || null,
      phone: d.phone || null,
      whatsapp: d.whatsapp || null,
      country: d.country || null,
      city: d.city || null,
      address: d.address || null,
      tax_number: d.taxNumber || null,
      commercial_registration: d.commercialRegistration || null,
      account_manager_id: d.accountManagerId || null,
      notes: d.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error)
    redirect(
      messageUrl(
        "/dashboard/crm/customers/new",
        "error",
        "تعذر إنشاء العميل أو توجد بيانات مكررة",
      ),
    );
  redirect(
    messageUrl(
      `/dashboard/crm/customers/${data.id}`,
      "success",
      "تم إنشاء العميل",
    ),
  );
}

export async function createContact(formData: FormData) {
  const schema = z.object({
    customerAccountId: z.string().uuid().or(z.literal("")),
    fullName: z.string().trim().min(2),
    jobTitle: z.string().trim().optional(),
    department: z.string().trim().optional(),
    email: z.string().email().or(z.literal("")),
    mobile: z.string().trim().optional(),
    whatsapp: z.string().trim().optional(),
    preferredChannel: z.enum(["phone", "whatsapp", "email", "message"]),
    assignedTo: z.string().uuid().or(z.literal("")),
    notes: z.string().trim().max(5000).optional(),
    isPrimary: z.string().optional(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    redirect(
      messageUrl(
        "/dashboard/crm/contacts/new",
        "error",
        "تحقق من بيانات جهة الاتصال",
      ),
    );
  const { supabase, user, membership } = await getAuthorizedWorkspace("contacts.create");
  const d = parsed.data;
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      organization_id: membership.organization_id,
      customer_account_id: d.customerAccountId || null,
      full_name: d.fullName,
      job_title: d.jobTitle || null,
      department: d.department || null,
      email: d.email || null,
      mobile: d.mobile || null,
      whatsapp: d.whatsapp || null,
      preferred_channel: d.preferredChannel,
      is_primary: d.isPrimary === "on",
      assigned_to: d.assignedTo || null,
      notes: d.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error)
    redirect(
      messageUrl(
        "/dashboard/crm/contacts/new",
        "error",
        "تعذر إنشاء جهة الاتصال؛ تحقق من الجهة الرئيسية",
      ),
    );
  redirect(
    messageUrl(
      `/dashboard/crm/contacts/${data.id}`,
      "success",
      "تم إنشاء جهة الاتصال",
    ),
  );
}

export async function createCrmSetting(formData: FormData) {
  const kind = clean(formData.get("kind"));
  const name = clean(formData.get("name"));
  const color = clean(formData.get("color")) || "#0f766e";
  if (!["source", "stage", "tag"].includes(kind) || name.length < 2)
    redirect(
      messageUrl("/dashboard/crm/settings", "error", "أدخل اسمًا صحيحًا"),
    );
  const { supabase, user, membership } = await getAuthorizedWorkspace("crm.settings.manage");
  const code = `custom_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const table =
    kind === "source"
      ? "lead_sources"
      : kind === "stage"
        ? "lead_stages"
        : "crm_tags";
  const payload =
    kind === "tag"
      ? {
          organization_id: membership.organization_id,
          name,
          color,
          created_by: user.id,
        }
      : kind === "stage"
        ? {
            organization_id: membership.organization_id,
            name_ar: name,
            code,
            color,
            sort_order: Number(formData.get("sortOrder") || 1000),
            created_by: user.id,
          }
        : {
            organization_id: membership.organization_id,
            name_ar: name,
            code,
            sort_order: Number(formData.get("sortOrder") || 1000),
            created_by: user.id,
          };
  const { error } = await supabase.from(table).insert(payload as never);
  redirect(
    messageUrl(
      "/dashboard/crm/settings",
      error ? "error" : "success",
      error ? "تعذر الحفظ؛ تحقق من الترتيب أو الصلاحية" : "تمت إضافة الإعداد",
    ),
  );
}

export async function updateCrmSetting(formData: FormData) {
  const kind = clean(formData.get("kind")),
    id = clean(formData.get("id")),
    name = clean(formData.get("name")),
    color = clean(formData.get("color"));
  if (
    !["source", "stage", "tag"].includes(kind) ||
    !z.string().uuid().safeParse(id).success ||
    name.length < 2
  )
    redirect(
      messageUrl(
        "/dashboard/crm/settings",
        "error",
        "بيانات الإعداد غير صالحة",
      ),
    );
  const { supabase, membership } = await getAuthorizedWorkspace("crm.settings.manage");
  const table =
    kind === "source"
      ? "lead_sources"
      : kind === "stage"
        ? "lead_stages"
        : "crm_tags";
  const payload =
    kind === "tag"
      ? { name, color, is_active: formData.get("isActive") === "on" }
      : kind === "stage"
        ? {
            name_ar: name,
            color,
            sort_order: Number(formData.get("sortOrder") || 0),
            is_active: formData.get("isActive") === "on",
          }
        : {
            name_ar: name,
            sort_order: Number(formData.get("sortOrder") || 0),
            is_active: formData.get("isActive") === "on",
          };
  const { error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .eq("organization_id", membership.organization_id);
  redirect(
    messageUrl(
      "/dashboard/crm/settings",
      error ? "error" : "success",
      error ? "تعذر التعديل؛ قد يكون الترتيب مستخدمًا" : "تم تحديث الإعداد",
    ),
  );
}

export async function importLeads(formData: FormData) {
  const strategy = clean(formData.get("duplicateStrategy"));
  let rows: unknown;
  try {
    rows = JSON.parse(clean(formData.get("rows")));
  } catch {
    redirect(
      messageUrl(
        "/dashboard/crm/leads/import",
        "error",
        "ملف المعاينة غير صالح",
      ),
    );
  }
  const parsed = z.array(leadSchema).max(500).safeParse(rows);
  if (!parsed.success)
    redirect(
      messageUrl(
        "/dashboard/crm/leads/import",
        "error",
        "بعض الصفوف لا تطابق الحقول المطلوبة",
      ),
    );
  const { supabase } = await getAuthorizedWorkspace("leads.import");
  const { data, error } = await supabase.rpc("import_leads", {
    rows_payload: parsed.data,
    duplicate_action: strategy,
  });
  if (error)
    redirect(
      messageUrl(
        "/dashboard/crm/leads/import",
        "error",
        "تعذر الاستيراد أو ليست لديك الصلاحية",
      ),
    );
  const result = data as { created: number; duplicates: number; rejected: number };
  redirect(
    `/dashboard/crm/leads/import?success=${encodeURIComponent("اكتمل الاستيراد")}&created=${result.created}&duplicates=${result.duplicates}&rejected=${result.rejected}`,
  );
}
