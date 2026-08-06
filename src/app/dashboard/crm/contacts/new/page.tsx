import { FormMessage } from "@/components/form-message";
import { PageTitle } from "@/components/page-title";
import { createContact } from "@/lib/crm-actions";
import { getCrmContext, memberName } from "@/lib/crm-data";
import { getLocale } from "@/lib/i18n/server";
import { localizedName } from "@/lib/i18n/config";
export default async function NewContact({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; customer?: string }>;
}) {
  const [q, ctx] = await Promise.all([searchParams, getCrmContext()]);
  const locale = await getLocale();
  const { data: customers } = await ctx.supabase
    .from("customer_accounts")
    .select("id,name_ar,name_en")
    .eq("organization_id", ctx.organizationId)
    .is("deleted_at", null)
    .order("name_ar");
  return (
    <>
      <PageTitle
        title="إضافة جهة اتصال"
        description="يمكن إنشاء جهة مستقلة إذا كان العميل فردًا"
      />
      <FormMessage error={q.error} />
      <article className="panel settings-panel">
        <form action={createContact} className="settings-form crm-form">
          <label>
            العميل المرتبط
            <select name="customerAccountId" defaultValue={q.customer || ""}>
              <option value="">بدون حساب عميل</option>
              {customers?.map((x) => (
                <option key={x.id} value={x.id}>
                  {localizedName(locale, x)}
                </option>
              ))}
            </select>
          </label>
          <div className="field-grid">
            <label>
              الاسم *<input name="fullName" required />
            </label>
            <label>
              المسمى الوظيفي
              <input name="jobTitle" />
            </label>
          </div>
          <div className="field-grid">
            <label>
              القسم
              <input name="department" />
            </label>
            <label>
              البريد
              <input type="email" name="email" />
            </label>
          </div>
          <div className="field-grid">
            <label>
              الجوال
              <input name="mobile" />
            </label>
            <label>
              واتساب
              <input name="whatsapp" />
            </label>
          </div>
          <div className="field-grid">
            <label>
              وسيلة التواصل المفضلة
              <select name="preferredChannel">
                <option value="phone">هاتف</option>
                <option value="whatsapp">واتساب</option>
                <option value="email">بريد</option>
                <option value="message">رسالة</option>
              </select>
            </label>
            <label>
              مسؤول المتابعة
              <select name="assignedTo">
                <option value="">غير مسند</option>
                {ctx.members.map((x) => (
                  <option key={x.user_id} value={x.user_id}>
                    {memberName(x)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="check">
            <input type="checkbox" name="isPrimary" />
            جهة الاتصال الرئيسية
          </label>
          <label>
            ملاحظات
            <textarea name="notes" rows={4} />
          </label>
          <button className="primary-button">إنشاء جهة الاتصال</button>
        </form>
      </article>
    </>
  );
}
