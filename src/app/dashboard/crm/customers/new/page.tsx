import { FormMessage } from "@/components/form-message";
import { PageTitle } from "@/components/page-title";
import { createCustomer } from "@/lib/crm-actions";
import { getCrmContext, memberName } from "@/lib/crm-data";
export default async function NewCustomer({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [q, { members }] = await Promise.all([searchParams, getCrmContext()]);
  return (
    <>
      <PageTitle title="إضافة عميل" description="إنشاء حساب عميل فرد أو شركة" />
      <FormMessage error={q.error} />
      <article className="panel settings-panel">
        <form action={createCustomer} className="settings-form crm-form">
          <div className="field-grid">
            <label>
              النوع
              <select name="customerType">
                <option value="company">شركة</option>
                <option value="individual">فرد</option>
              </select>
            </label>
            <label>
              الاسم العربي *<input name="nameAr" required minLength={2} />
            </label>
          </div>
          <div className="field-grid">
            <label>
              الاسم الإنجليزي
              <input name="nameEn" />
            </label>
            <label>
              القطاع أو النشاط
              <input name="sector" />
            </label>
          </div>
          <div className="field-grid">
            <label>
              البريد العام
              <input type="email" name="email" />
            </label>
            <label>
              الهاتف
              <input name="phone" inputMode="tel" />
            </label>
          </div>
          <div className="field-grid">
            <label>
              واتساب
              <input name="whatsapp" />
            </label>
            <label>
              مسؤول الحساب
              <select name="accountManagerId">
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
              الدولة
              <input name="country" defaultValue="السعودية" />
            </label>
            <label>
              المدينة
              <input name="city" />
            </label>
          </div>
          <label>
            العنوان
            <input name="address" />
          </label>
          <div className="field-grid">
            <label>
              الرقم الضريبي
              <input name="taxNumber" />
            </label>
            <label>
              السجل التجاري
              <input name="commercialRegistration" />
            </label>
          </div>
          <label>
            ملاحظات
            <textarea name="notes" rows={4} />
          </label>
          <button className="primary-button">إنشاء العميل</button>
        </form>
      </article>
    </>
  );
}
