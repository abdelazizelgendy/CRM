import Link from "next/link";
import { notFound } from "next/navigation";
import { FormMessage } from "@/components/form-message";
import { InteractionForm } from "@/components/interaction-form";
import { PageTitle } from "@/components/page-title";
import { getCrmContext } from "@/lib/crm-data";
import { getLocale } from "@/lib/i18n/server";
import { localizedName, localeTag } from "@/lib/i18n/config";
export default async function ContactDetails({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const locale = await getLocale();
  const { supabase, organizationId, permissions } = await getCrmContext();
  const [{ data: x }, { data: interactions }] = await Promise.all([
    supabase
      .from("contacts")
      .select(
        "*,customer_accounts(id,name_ar,name_en),profiles!contacts_assigned_to_fkey(full_name)",
      )
      .eq("organization_id", organizationId)
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("crm_interactions")
      .select("id,description,outcome,occurred_at")
      .eq("organization_id", organizationId)
      .eq("contact_id", id)
      .order("occurred_at", { ascending: false }),
  ]);
  if (!x) notFound();
  const customer = x.customer_accounts as unknown as {
    id?: string;
    name_ar?: string;
    name_en?: string;
  };
  return (
    <>
      <PageTitle title={x.full_name} description={x.job_title || "جهة اتصال"} />
      <FormMessage error={q.error} success={q.success} />
      <section className="details-grid">
        <article className="panel detail-card">
          <h2>بيانات جهة الاتصال</h2>
          <dl>
            <div>
              <dt>العميل</dt>
              <dd>
                {customer?.id ? (
                  <Link href={`/dashboard/crm/customers/${customer.id}`}>
                    {localizedName(locale, customer)}
                  </Link>
                ) : (
                  "فرد مستقل"
                )}
              </dd>
            </div>
            <div>
              <dt>القسم</dt>
              <dd>{x.department || "—"}</dd>
            </div>
            <div>
              <dt>البريد</dt>
              <dd>{x.email || "—"}</dd>
            </div>
            <div>
              <dt>الجوال</dt>
              <dd>{x.mobile || "—"}</dd>
            </div>
            <div>
              <dt>واتساب</dt>
              <dd>{x.whatsapp || "—"}</dd>
            </div>
            <div>
              <dt>التواصل المفضل</dt>
              <dd>{x.preferred_channel || "—"}</dd>
            </div>
            <div>
              <dt>جهة رئيسية</dt>
              <dd>{x.is_primary ? "نعم" : "لا"}</dd>
            </div>
          </dl>
        </article>
        <article className="panel timeline-panel">
          <h2>التفاعلات</h2>
          {permissions.has("contacts.update") && (
            <InteractionForm
              targetType="contact"
              targetId={id}
              returnTo={`/dashboard/crm/contacts/${id}`}
            />
          )}
          <div className="timeline">
            {interactions?.length ? (
              interactions.map((i) => (
                <div key={i.id}>
                  <i />
                  <div>
                    <strong>{i.description}</strong>
                    <span>
                      {new Date(i.occurred_at).toLocaleString(localeTag(locale))}
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
