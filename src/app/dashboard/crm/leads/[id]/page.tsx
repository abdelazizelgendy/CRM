import Link from "next/link";
import { notFound } from "next/navigation";
import { FormMessage } from "@/components/form-message";
import { InteractionForm } from "@/components/interaction-form";
import { PageTitle } from "@/components/page-title";
import { convertLead, mergeLeads } from "@/lib/crm-actions";
import { getCrmContext } from "@/lib/crm-data";
import { priorityLabels, statusLabels } from "@/lib/crm";
import { getLocale } from "@/lib/i18n/server";
import { localizedName, localeTag } from "@/lib/i18n/config";
export default async function LeadDetails({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const locale = await getLocale();
  const { supabase, organizationId, permissions } = await getCrmContext();
  const [
    { data: lead },
    { data: interactions },
    { data: tagLinks },
    { data: similar },
    { data: audit },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "*,lead_stages(name_ar,name_en,color),lead_sources(name_ar,name_en),profiles!leads_assigned_to_fkey(full_name),customer_accounts!leads_converted_customer_fk(id,name_ar,name_en)",
      )
      .eq("id", id)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("crm_interactions")
      .select(
        "id,interaction_type,description,outcome,next_follow_up_at,occurred_at,profiles!crm_interactions_performed_by_fkey(full_name)",
      )
      .eq("organization_id", organizationId)
      .eq("lead_id", id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("lead_tags")
      .select("crm_tags(id,name,name_ar,name_en,color)")
      .eq("organization_id", organizationId)
      .eq("lead_id", id),
    supabase
      .from("leads")
      .select("id,full_name,company_name,email,mobile")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .neq("id", id)
      .limit(20),
    supabase
      .from("audit_logs")
      .select("id,event_type,description,created_at,old_values,new_values")
      .eq("organization_id", organizationId)
      .eq("record_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (!lead) notFound();
  const assignee = (lead.profiles as unknown as { full_name?: string })
    ?.full_name;
  const stage = lead.lead_stages as unknown as {
    name_ar?: string;
    name_en?: string;
    color?: string;
  };
  const source = lead.lead_sources as unknown as { name_ar?: string; name_en?: string };
  return (
    <>
      <PageTitle
        title={lead.full_name}
        description={
          lead.company_name || lead.requested_service || "تفاصيل العميل المحتمل"
        }
        action={
          <div className="page-actions">
            {permissions.has("sales_requests.create") && (
              <Link className="primary-button small" href={{pathname:"/dashboard/sales/requests/new",query:{leadId:id,customerId:id,customerName:lead.full_name,email:lead.email??"",mobile:lead.mobile??"",source:"CRM",title:lead.requested_service??""}}}>
                إنشاء طلب مبيعات
              </Link>
            )}
            {permissions.has("leads.update") && (
              <Link
                className="secondary-button"
                href={`/dashboard/crm/leads/${id}/edit`}
              >
                تعديل
              </Link>
            )}
            {permissions.has("leads.convert") &&
              lead.status !== "converted" && (
                <form action={convertLead}>
                  <input type="hidden" name="leadId" value={id} />
                  <button className="primary-button small">
                    تحويل إلى عميل
                  </button>
                </form>
              )}
          </div>
        }
      />
      <FormMessage error={q.error} success={q.success} />
      <section className="details-grid">
        <article className="panel detail-card">
          <h2>البيانات الأساسية</h2>
          <dl>
            <div>
              <dt>المرحلة</dt>
              <dd>
                <span
                  className="stage-pill"
                  style={{ borderColor: stage?.color }}
                >
                  {stage ? localizedName(locale, stage) : "—"}
                </span>
              </dd>
            </div>
            <div>
              <dt>الحالة</dt>
              <dd>{statusLabels[lead.status] || lead.status}</dd>
            </div>
            <div>
              <dt>الأولوية</dt>
              <dd>{priorityLabels[lead.priority]}</dd>
            </div>
            <div>
              <dt>المصدر</dt>
              <dd>{source ? localizedName(locale, source) : "—"}</dd>
            </div>
            <div>
              <dt>المسؤول</dt>
              <dd>{assignee || "غير مسند"}</dd>
            </div>
            <div>
              <dt>البريد</dt>
              <dd>{lead.email || "—"}</dd>
            </div>
            <div>
              <dt>الجوال</dt>
              <dd>{lead.mobile || "—"}</dd>
            </div>
            <div>
              <dt>واتساب</dt>
              <dd>{lead.whatsapp || "—"}</dd>
            </div>
            <div>
              <dt>المدينة</dt>
              <dd>{lead.city || "—"}</dd>
            </div>
            <div>
              <dt>المتابعة القادمة</dt>
              <dd>
                {lead.next_follow_up_at
                  ? new Date(lead.next_follow_up_at).toLocaleString(localeTag(locale))
                  : "—"}
              </dd>
            </div>
          </dl>
          {lead.request_description && (
            <p className="record-description">{lead.request_description}</p>
          )}
          <div className="tag-row">
            {tagLinks?.map((x) => {
              const t = x.crm_tags as unknown as {
                id: string;
                name: string;
                name_ar?: string;
                name_en?: string;
                color: string;
              };
              return (
                <span key={t.id} style={{ borderColor: t.color }}>
                  {localizedName(locale, t)}
                </span>
              );
            })}
          </div>
          {lead.converted_customer_id && (
            <Link
              className="converted-link"
              href={`/dashboard/crm/customers/${lead.converted_customer_id}`}
            >
              عرض العميل الناتج من التحويل
            </Link>
          )}
        </article>
        <article className="panel timeline-panel">
          <h2>الخط الزمني</h2>
          {permissions.has("leads.update") && (
            <InteractionForm
              targetType="lead"
              targetId={id}
              returnTo={`/dashboard/crm/leads/${id}`}
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
                      {
                        (x.profiles as unknown as { full_name?: string })
                          ?.full_name
                      }{" "}
                      · {new Date(x.occurred_at).toLocaleString("ar-SA")}
                    </span>
                    {x.outcome && <p>النتيجة: {x.outcome}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="empty">لا توجد تفاعلات مسجلة</p>
            )}
          </div>
        </article>
      </section>
      {permissions.has("leads.merge") && (
        <article className="panel merge-panel">
          <h2>دمج سجل مكرر</h2>
          <p>سيتم نقل التفاعلات والوسوم إلى هذا السجل وأرشفة السجل الآخر.</p>
          <form action={mergeLeads}>
            <input type="hidden" name="masterId" value={id} />
            <select name="duplicateId" required defaultValue="">
              <option value="" disabled>
                اختر السجل المكرر
              </option>
              {similar?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.full_name} —{" "}
                  {x.company_name || x.email || x.mobile || "بدون وسيلة"}
                </option>
              ))}
            </select>
            <button className="danger-button">دمج وأرشفة المكرر</button>
          </form>
        </article>
      )}
      <article className="panel audit-mini">
        <h2>سجل التغييرات</h2>
        {audit?.length ? (
          audit.map((x) => (
            <div key={x.id}>
              <strong>{x.description}</strong>
              <span>{new Date(x.created_at).toLocaleString("ar-SA")}</span>
            </div>
          ))
        ) : (
          <p className="empty">لا توجد تغييرات مسجلة</p>
        )}
      </article>
    </>
  );
}
