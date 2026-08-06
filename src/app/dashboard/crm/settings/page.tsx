import { FormMessage } from "@/components/form-message";
import { PageTitle } from "@/components/page-title";
import { createCrmSetting, updateCrmSetting } from "@/lib/crm-actions";
import { getCrmContext } from "@/lib/crm-data";
export default async function CrmSettings({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [q, { stages, sources, tags }] = await Promise.all([
    searchParams,
    getCrmContext(),
  ]);
  const groups = [
    { title: "مصادر العملاء", kind: "source", rows: sources },
    { title: "مراحل العميل المحتمل", kind: "stage", rows: stages },
    { title: "الوسوم", kind: "tag", rows: tags },
  ] as const;
  return (
    <>
      <PageTitle
        title="إعدادات CRM"
        description="إدارة المصادر والمراحل والوسوم داخل شركتك"
      />
      <FormMessage error={q.error} success={q.success} />
      <div className="settings-groups">
        {groups.map((group) => (
          <article className="panel settings-list" key={group.kind}>
            <h2>{group.title}</h2>
            {group.rows.map((row) => (
              <form
                action={updateCrmSetting}
                key={row.id}
                className="setting-row"
              >
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="kind" value={group.kind} />
                <input
                  name="nameAr"
                  defaultValue={row.name_ar || ("name" in row ? row.name : "")}
                  placeholder="الاسم بالعربية"
                  aria-label="الاسم بالعربية"
                />
                <input
                  name="nameEn"
                  dir="ltr"
                  defaultValue={("name_en" in row && row.name_en) || ""}
                  placeholder="الاسم بالإنجليزية"
                  aria-label="الاسم بالإنجليزية"
                />
                {group.kind !== "source" && (
                  <input
                    name="color"
                    type="color"
                    defaultValue={"color" in row ? row.color : "#0f766e"}
                    aria-label="اللون"
                  />
                )}
                {group.kind !== "tag" && (
                  <input
                    name="sortOrder"
                    type="number"
                    defaultValue={"sort_order" in row ? row.sort_order : 0}
                    aria-label="الترتيب"
                  />
                )}
                <label className="check">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={row.is_active}
                  />
                  نشط
                </label>
                <button className="secondary-button">حفظ</button>
              </form>
            ))}
            <form action={createCrmSetting} className="setting-row add">
              <input type="hidden" name="kind" value={group.kind} />
              <input
                name="nameAr"
                required
                placeholder={`إضافة ${group.title} بالعربية`}
              />
              <input
                name="nameEn"
                dir="ltr"
                placeholder={`Add ${group.kind} in English`}
              />
              {group.kind !== "source" && (
                <input
                  name="color"
                  type="color"
                  defaultValue="#0f766e"
                  aria-label="اللون"
                />
              )}
              {group.kind !== "tag" && (
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={1000}
                  aria-label="الترتيب"
                />
              )}
              <button className="primary-button small">إضافة</button>
            </form>
          </article>
        ))}
      </div>
    </>
  );
}
