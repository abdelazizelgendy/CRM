import { createLead, updateLead } from "@/lib/crm-actions";
import { memberName } from "@/lib/crm-data";

type Option = { id: string; name_ar: string };
type Member = { user_id: string; profiles: unknown };
type Lead = Record<string, unknown>;
export function LeadForm({
  stages,
  sources,
  members,
  lead,
  confirmDuplicate = false,
}: {
  stages: Option[];
  sources: Option[];
  members: Member[];
  lead?: Lead;
  confirmDuplicate?: boolean;
}) {
  const field = (key: string) => (lead?.[key] as string | null) ?? "";
  const editing = Boolean(lead);
  return (
    <form
      action={editing ? updateLead : createLead}
      className="settings-form crm-form"
    >
      {editing && <input type="hidden" name="id" value={String(lead?.id)} />}{" "}
      {confirmDuplicate && (
        <input type="hidden" name="confirmDuplicate" value="yes" />
      )}
      <div className="field-grid">
        <label>
          نوع العميل
          <select
            name="customerType"
            defaultValue={field("customer_type") || "individual"}
          >
            <option value="individual">فرد</option>
            <option value="company">شركة</option>
          </select>
        </label>
        <label>
          الاسم الكامل *
          <input
            name="fullName"
            required
            minLength={2}
            defaultValue={field("full_name")}
          />
        </label>
      </div>
      <div className="field-grid">
        <label>
          اسم الشركة
          <input name="companyName" defaultValue={field("company_name")} />
        </label>
        <label>
          المسمى الوظيفي
          <input name="jobTitle" defaultValue={field("job_title")} />
        </label>
      </div>
      <div className="field-grid">
        <label>
          البريد الإلكتروني
          <input type="email" name="email" defaultValue={field("email")} />
        </label>
        <label>
          رقم الجوال
          <input name="mobile" inputMode="tel" defaultValue={field("mobile")} />
        </label>
      </div>
      <div className="field-grid">
        <label>
          رقم واتساب
          <input
            name="whatsapp"
            inputMode="tel"
            defaultValue={field("whatsapp")}
          />
        </label>
        <label>
          الدولة
          <input name="country" defaultValue={field("country") || "السعودية"} />
        </label>
      </div>
      <div className="field-grid">
        <label>
          المدينة
          <input name="city" defaultValue={field("city")} />
        </label>
        <label>
          العنوان
          <input name="address" defaultValue={field("address")} />
        </label>
      </div>
      <div className="field-grid">
        <label>
          المصدر
          <select name="sourceId" defaultValue={field("source_id")}>
            <option value="">بدون مصدر</option>
            {sources.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name_ar}
              </option>
            ))}
          </select>
        </label>
        <label>
          المرحلة *
          <select
            name="stageId"
            required
            defaultValue={field("stage_id") || stages[0]?.id}
          >
            {stages.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name_ar}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="field-grid">
        <label>
          الأولوية
          <select name="priority" defaultValue={field("priority") || "medium"}>
            <option value="low">منخفضة</option>
            <option value="medium">متوسطة</option>
            <option value="high">عالية</option>
            <option value="urgent">عاجلة</option>
          </select>
        </label>
        <label>
          مسؤول المتابعة
          <select name="assignedTo" defaultValue={field("assigned_to")}>
            <option value="">غير مسند</option>
            {members.map((x) => (
              <option key={x.user_id} value={x.user_id}>
                {memberName(x)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="field-grid">
        <label>
          الخدمة المطلوبة
          <input
            name="requestedService"
            defaultValue={field("requested_service")}
          />
        </label>
        <label>
          المتابعة القادمة
          <input
            name="nextFollowUpAt"
            type="datetime-local"
            defaultValue={field("next_follow_up_at")?.slice(0, 16)}
          />
        </label>
      </div>
      <label>
        وصف الطلب
        <textarea
          name="requestDescription"
          rows={5}
          defaultValue={field("request_description")}
        />
      </label>
      <button className="primary-button" type="submit">
        {editing
          ? "حفظ التعديلات"
          : confirmDuplicate
            ? "تأكيد الإنشاء رغم التشابه"
            : "إنشاء العميل المحتمل"}
      </button>
    </form>
  );
}
