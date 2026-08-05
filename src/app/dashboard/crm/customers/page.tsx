import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { PageTitle } from "@/components/page-title";
import { getCrmContext } from "@/lib/crm-data";
import { statusLabels } from "@/lib/crm";
export default async function Customers({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const { supabase, organizationId, permissions } = await getCrmContext();
  const page = Math.max(1, Number(q.page) || 1),
    from = (page - 1) * 20;
  let query = supabase
    .from("customer_accounts")
    .select(
      "id,customer_type,name_ar,name_en,sector,general_email,phone,city,status,created_at,profiles!customer_accounts_account_manager_id_fkey(full_name)",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (q.search)
    query = query.or(
      `name_ar.ilike.%${q.search.replaceAll(",", "")}%,name_en.ilike.%${q.search.replaceAll(",", "")}%,general_email.ilike.%${q.search.replaceAll(",", "")}%,phone.ilike.%${q.search.replaceAll(",", "")}%`,
    );
  if (q.status) query = query.eq("status", q.status);
  const { data, count, error } = await query.range(from, from + 19);
  return (
    <>
      <PageTitle
        title="العملاء"
        description="حسابات العملاء من الأفراد والشركات"
        action={
          permissions.has("customers.create") ? (
            <Link
              className="primary-button small"
              href="/dashboard/crm/customers/new"
            >
              <Plus />
              إضافة عميل
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
            placeholder="بحث بالاسم أو البريد أو الهاتف"
          />
        </div>
        <select name="status" defaultValue={q.status || ""}>
          <option value="">كل الحالات</option>
          <option value="prospect">محتمل</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="suspended">موقوف</option>
        </select>
        <button className="secondary-button">بحث</button>
      </form>
      <article className="panel table-panel">
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>العميل</th>
                <th>النوع</th>
                <th>القطاع</th>
                <th>التواصل</th>
                <th>المدينة</th>
                <th>الحالة</th>
                <th>مسؤول الحساب</th>
              </tr>
            </thead>
            <tbody>
              {data?.length ? (
                data.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link
                        className="record-link"
                        href={`/dashboard/crm/customers/${x.id}`}
                      >
                        <strong>{x.name_ar}</strong>
                        <small>{x.name_en}</small>
                      </Link>
                    </td>
                    <td>{x.customer_type === "company" ? "شركة" : "فرد"}</td>
                    <td>{x.sector || "—"}</td>
                    <td>{x.phone || x.general_email || "—"}</td>
                    <td>{x.city || "—"}</td>
                    <td>{statusLabels[x.status]}</td>
                    <td>
                      {(x.profiles as unknown as { full_name?: string })
                        ?.full_name || "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="empty-row">
                  <td colSpan={7}>لا توجد عملاء</td>
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
