import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { PageTitle } from "@/components/page-title";
import { getCrmContext } from "@/lib/crm-data";
export default async function Contacts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const { supabase, organizationId, permissions } = await getCrmContext();
  let query = supabase
    .from("contacts")
    .select(
      "id,full_name,job_title,department,email,mobile,whatsapp,preferred_channel,is_primary,status,customer_accounts(name_ar)",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (q.search)
    query = query.or(
      `full_name.ilike.%${q.search.replaceAll(",", "")}%,email.ilike.%${q.search.replaceAll(",", "")}%,mobile.ilike.%${q.search.replaceAll(",", "")}%`,
    );
  const { data, count, error } = await query.range(0, 49);
  return (
    <>
      <PageTitle
        title="جهات الاتصال"
        description="دليل مستقل لجهات اتصال العملاء"
        action={
          permissions.has("contacts.create") ? (
            <Link
              href="/dashboard/crm/contacts/new"
              className="primary-button small"
            >
              <Plus />
              إضافة جهة
            </Link>
          ) : undefined
        }
      />
      <FormMessage error={q.error || error?.message} success={q.success} />
      <form className="panel filter-panel">
        <div className="search">
          <Search />
          <input
            name="search"
            defaultValue={q.search}
            placeholder="الاسم أو الهاتف أو البريد"
          />
        </div>
        <button className="secondary-button">بحث</button>
      </form>
      <article className="panel table-panel">
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>العميل</th>
                <th>المسمى</th>
                <th>التواصل</th>
                <th>التفضيل</th>
                <th>رئيسية</th>
              </tr>
            </thead>
            <tbody>
              {data?.length ? (
                data.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link
                        className="record-link"
                        href={`/dashboard/crm/contacts/${x.id}`}
                      >
                        <strong>{x.full_name}</strong>
                        <small>{x.department}</small>
                      </Link>
                    </td>
                    <td>
                      {(x.customer_accounts as unknown as { name_ar?: string })
                        ?.name_ar || "فرد مستقل"}
                    </td>
                    <td>{x.job_title || "—"}</td>
                    <td>{x.mobile || x.email || x.whatsapp || "—"}</td>
                    <td>{x.preferred_channel || "—"}</td>
                    <td>{x.is_primary ? "نعم" : "لا"}</td>
                  </tr>
                ))
              ) : (
                <tr className="empty-row">
                  <td colSpan={6}>لا توجد جهات اتصال</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-count">{count ?? 0} سجل</div>
      </article>
    </>
  );
}
