import Link from "next/link";
import { notFound } from "next/navigation";
import { FormMessage } from "@/components/form-message";
import { InteractionForm } from "@/components/interaction-form";
import { PageTitle } from "@/components/page-title";
import { getCrmContext } from "@/lib/crm-data";
import { statusLabels } from "@/lib/crm";
import { getLocale } from "@/lib/i18n/server";
import { localizedName, localeTag } from "@/lib/i18n/config";
export default async function CustomerDetails({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const locale = await getLocale();
  const { supabase, organizationId, permissions } = await getCrmContext();
  const [{ data: customer }, { data: contacts }, { data: interactions }] =
    await Promise.all([
      supabase
        .from("customer_accounts")
        .select(
          "*,profiles!customer_accounts_account_manager_id_fkey(full_name),leads!customer_accounts_original_lead_id_fkey(id,full_name)",
        )
        .eq("id", id)
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .single(),
      supabase
        .from("contacts")
        .select("id,full_name,job_title,email,mobile,is_primary,status")
        .eq("organization_id", organizationId)
        .eq("customer_account_id", id)
        .is("deleted_at", null),
      supabase
        .from("crm_interactions")
        .select(
          "id,description,outcome,occurred_at,profiles!crm_interactions_performed_by_fkey(full_name)",
        )
        .eq("organization_id", organizationId)
        .eq("customer_account_id", id)
        .order("occurred_at", { ascending: false }),
    ]);
  if (!customer) notFound();
  const manager = (customer.profiles as unknown as { full_name?: string })
    ?.full_name;
  const lead = customer.leads as unknown as { id?: string; full_name?: string };
  return (
    <>
      <PageTitle
        title={localizedName(locale, customer)}
        description={`${customer.customer_type === "company" ? "شركة" : "فرد"} · ${statusLabels[customer.status]}`}
        action={permissions.has("sales_requests.create") ? <Link className="primary-button small" href={{pathname:"/dashboard/sales/requests/new",query:{customerId:id,customerName:localizedName(locale,customer),email:customer.general_email??"",mobile:customer.phone??"",source:"CRM"}}}>إنشاء طلب مبيعات</Link> : undefined}
      />
      <FormMessage error={q.error} success={q.success} />
      <section className="details-grid">
        <article className="panel detail-card">
          <h2>بيانات الحساب</h2>
          <dl>
            <div>
              <dt>القطاع</dt>
              <dd>{customer.sector || "—"}</dd>
            </div>
            <div>
              <dt>البريد</dt>
              <dd>{customer.general_email || "—"}</dd>
            </div>
            <div>
              <dt>الهاتف</dt>
              <dd>{customer.phone || "—"}</dd>
            </div>
            <div>
              <dt>واتساب</dt>
              <dd>{customer.whatsapp || "—"}</dd>
            </div>
            <div>
              <dt>الموقع</dt>
              <dd>{customer.website || "—"}</dd>
            </div>
            <div>
              <dt>المدينة</dt>
              <dd>{customer.city || "—"}</dd>
            </div>
            <div>
              <dt>الرقم الضريبي</dt>
              <dd>{customer.tax_number || "—"}</dd>
            </div>
            <div>
              <dt>مسؤول الحساب</dt>
              <dd>{manager || "—"}</dd>
            </div>
          </dl>
          {lead?.id && (
            <Link
              className="converted-link"
              href={`/dashboard/crm/leads/${lead.id}`}
            >
              العميل المحتمل الأصلي: {lead.full_name}
            </Link>
          )}
          <h2>جهات الاتصال</h2>
          {contacts?.length ? (
            contacts.map((x) => (
              <Link
                className="contact-row"
                href={`/dashboard/crm/contacts/${x.id}`}
                key={x.id}
              >
                <strong>
                  {x.full_name}
                  {x.is_primary ? " · رئيسية" : ""}
                </strong>
                <span>{x.job_title || x.mobile || x.email}</span>
              </Link>
            ))
          ) : (
            <p className="empty">لا توجد جهات اتصال</p>
          )}
          {permissions.has("contacts.create") && (
            <Link
              className="secondary-button"
              href={`/dashboard/crm/contacts/new?customer=${id}`}
            >
              إضافة جهة اتصال
            </Link>
          )}
        </article>
        <article className="panel timeline-panel">
          <h2>الخط الزمني</h2>
          {permissions.has("customers.update") && (
            <InteractionForm
              targetType="customer"
              targetId={id}
              returnTo={`/dashboard/crm/customers/${id}`}
            />
          )}
          <div className="timeline">
            {interactions?.length ? (
              interactions.map((x) => (
                <div key={x.id}>
                  <i />
                  <div>
                    <strong>{x.description}</strong>
                    <span>
                      {new Date(x.occurred_at).toLocaleString(localeTag(locale))}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty">لا توجد تفاعلات</p>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
