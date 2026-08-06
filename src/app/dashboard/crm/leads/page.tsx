import Link from "next/link";
import {
  Archive,
  Download,
  LayoutGrid,
  List,
  Plus,
  Search,
} from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { FormMessage } from "@/components/form-message";
import { archiveLeads, changeLeadStage } from "@/lib/crm-actions";
import { getCrmContext, memberName } from "@/lib/crm-data";
import { priorityLabels } from "@/lib/crm";
import { getLocale } from "@/lib/i18n/server";
import { localizedName, localeTag } from "@/lib/i18n/config";

type Query = Promise<Record<string, string | string[] | undefined>>;
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Query;
}) {
  const q = await searchParams;
  const locale = await getLocale();
  const {
    supabase,
    organizationId,
    stages,
    sources,
    members,
    tags,
    permissions,
  } = await getCrmContext();
  const page = Math.max(1, Number(q.page) || 1),
    size = 20,
    from = (page - 1) * size;
  const view = q.view === "kanban" ? "kanban" : "table";
  const search = String(q.search ?? "").trim();
  let query = supabase
    .from("leads")
    .select(
      "id,full_name,company_name,email,mobile,city,priority,status,stage_id,source_id,assigned_to,next_follow_up_at,created_at,requested_service,lead_stages(name_ar,name_en,color),lead_sources(name_ar,name_en),profiles!leads_assigned_to_fkey(full_name)",
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order(String(q.sort ?? "created_at"), { ascending: q.order === "asc" });
  if (search)
    query = query.or(
      `full_name.ilike.%${search.replaceAll(",", "")}%,company_name.ilike.%${search.replaceAll(",", "")}%,email.ilike.%${search.replaceAll(",", "")}%,mobile.ilike.%${search.replaceAll(",", "")}%`,
    );
  if (q.stage) query = query.eq("stage_id", String(q.stage));
  if (q.source) query = query.eq("source_id", String(q.source));
  if (q.priority) query = query.eq("priority", String(q.priority));
  if (q.city) query = query.ilike("city", `%${String(q.city)}%`);
  if (q.assignee) query = query.eq("assigned_to", String(q.assignee));
  if (q.tag) {
    const { data: links } = await supabase
      .from("lead_tags")
      .select("lead_id")
      .eq("organization_id", organizationId)
      .eq("tag_id", String(q.tag));
    query = query.in("id", links?.map((x) => x.lead_id) ?? []);
  }
  const { data, count, error } = await query.range(
    view === "table" ? from : 0,
    view === "table" ? from + size - 1 : 199,
  );
  const leads = data ?? [];
  const pages = Math.max(1, Math.ceil((count ?? 0) / size));
  const build = (extra: Record<string, string | number>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q))
      if (typeof v === "string") params.set(k, v);
    for (const [k, v] of Object.entries(extra)) params.set(k, String(v));
    return `?${params}`;
  };
  return (
    <>
      <PageTitle
        title="العملاء المحتملون"
        description="إدارة دورة العميل المحتمل من الاكتشاف حتى التحويل"
        action={
          <div className="page-actions">
            {permissions.has("leads.import") && (
              <Link
                className="secondary-button"
                href="/dashboard/crm/leads/import"
              >
                استيراد CSV
              </Link>
            )}
            {permissions.has("leads.export") && (
              <Link
                className="secondary-button"
                href={`/dashboard/crm/leads/export?${new URLSearchParams(Object.entries(q).filter((x): x is [string, string] => typeof x[1] === "string"))}`}
              >
                <Download size={16} />
                تصدير
              </Link>
            )}
            {permissions.has("leads.create") && (
              <Link
                className="primary-button small"
                href="/dashboard/crm/leads/new"
              >
                <Plus size={17} />
                إضافة
              </Link>
            )}
          </div>
        }
      />
      <FormMessage
        error={String(q.error ?? error?.message ?? "") || undefined}
        success={String(q.success ?? "") || undefined}
      />
      <form className="panel filter-panel">
        <div className="search">
          <Search />
          <input
            name="search"
            defaultValue={search}
            placeholder="بحث بالاسم أو الشركة أو وسيلة التواصل"
          />
        </div>
        <select name="stage" defaultValue={String(q.stage ?? "")}>
          <option value="">كل المراحل</option>
          {stages.map((x) => (
            <option value={x.id} key={x.id}>
              {localizedName(locale, x)}
            </option>
          ))}
        </select>
        <select name="source" defaultValue={String(q.source ?? "")}>
          <option value="">كل المصادر</option>
          {sources.map((x) => (
            <option value={x.id} key={x.id}>
              {localizedName(locale, x)}
            </option>
          ))}
        </select>
        <select name="priority" defaultValue={String(q.priority ?? "")}>
          <option value="">كل الأولويات</option>
          {Object.entries(priorityLabels).map(([k, v]) => (
            <option value={k} key={k}>
              {v}
            </option>
          ))}
        </select>
        <select name="assignee" defaultValue={String(q.assignee ?? "")}>
          <option value="">كل المسؤولين</option>
          {members.map((x) => (
            <option value={x.user_id} key={x.user_id}>
              {memberName(x)}
            </option>
          ))}
        </select>
        <select name="tag" defaultValue={String(q.tag ?? "")}>
          <option value="">كل الوسوم</option>
          {tags.map((x) => (
            <option value={x.id} key={x.id}>
              {localizedName(locale, x)}
            </option>
          ))}
        </select>
        <input
          name="city"
          defaultValue={String(q.city ?? "")}
          placeholder="المدينة"
        />
        <button className="secondary-button">تطبيق</button>
      </form>
      <div className="view-switch">
        <Link
          className={view === "table" ? "active" : ""}
          href={build({ view: "table" })}
        >
          <List />
          جدول
        </Link>
        <Link
          className={view === "kanban" ? "active" : ""}
          href={build({ view: "kanban" })}
        >
          <LayoutGrid />
          Kanban
        </Link>
      </div>
      {view === "table" ? (
        <form action={archiveLeads} className="panel table-panel">
          <div className="table-tools">
            <span>{count ?? 0} سجل</span>
            {permissions.has("leads.delete") && (
              <button className="danger-button" type="submit">
                <Archive size={16} />
                أرشفة المحدد
              </button>
            )}
          </div>
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>تحديد</th>
                  <th>العميل</th>
                  <th>التواصل</th>
                  <th>المرحلة</th>
                  <th>الأولوية</th>
                  <th>المسؤول</th>
                  <th>المتابعة</th>
                </tr>
              </thead>
              <tbody>
                {leads.length ? (
                  leads.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <input
                          type="checkbox"
                          name="leadIds"
                          value={lead.id}
                          aria-label={`تحديد ${lead.full_name}`}
                        />
                      </td>
                      <td>
                        <Link
                          className="record-link"
                          href={`/dashboard/crm/leads/${lead.id}`}
                        >
                          <strong>{lead.full_name}</strong>
                          <small>{lead.company_name || lead.city || "—"}</small>
                        </Link>
                      </td>
                      <td>{lead.mobile || lead.email || "—"}</td>
                      <td>
                        <span
                          className="stage-pill"
                          style={{
                            borderColor: (
                              lead.lead_stages as unknown as { color?: string }
                            )?.color,
                          }}
                        >
                          {localizedName(locale, (lead.lead_stages ?? {}) as { name_ar?: string; name_en?: string })}
                        </span>
                      </td>
                      <td>
                        <span className={`priority ${lead.priority}`}>
                          {priorityLabels[lead.priority]}
                        </span>
                      </td>
                      <td>
                        {(lead.profiles as unknown as { full_name?: string })
                          ?.full_name || "غير مسند"}
                      </td>
                      <td>
                        {lead.next_follow_up_at
                          ? new Date(lead.next_follow_up_at).toLocaleDateString(
                              localeTag(locale),
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="empty-row">
                    <td colSpan={7}>لا توجد نتائج مطابقة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="pagination">
              <Link
                aria-disabled={page === 1}
                href={build({ page: Math.max(1, page - 1) })}
              >
                السابق
              </Link>
              <span>
                {page} من {pages}
              </span>
              <Link
                aria-disabled={page === pages}
                href={build({ page: Math.min(pages, page + 1) })}
              >
                التالي
              </Link>
            </div>
          )}
        </form>
      ) : (
        <div className="kanban-board">
          {stages
            .filter((s) => s.is_active)
            .map((stage) => (
              <section className="kanban-column" key={stage.id}>
                <header style={{ borderColor: stage.color }}>
                  <span>{localizedName(locale, stage)}</span>
                  <b>{leads.filter((x) => x.stage_id === stage.id).length}</b>
                </header>
                {leads
                  .filter((x) => x.stage_id === stage.id)
                  .map((lead) => (
                    <article className="kanban-card" key={lead.id}>
                      <Link href={`/dashboard/crm/leads/${lead.id}`}>
                        <strong>{lead.full_name}</strong>
                        <span>
                          {lead.company_name ||
                            lead.requested_service ||
                            "بدون وصف"}
                        </span>
                      </Link>
                      {permissions.has("leads.update") && (
                        <form action={changeLeadStage}>
                          <input type="hidden" name="leadId" value={lead.id} />
                          <select
                            name="stageId"
                            defaultValue={stage.id}
                            aria-label="نقل المرحلة"
                          >
                            {stages
                              .filter((s) => s.is_active)
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {localizedName(locale, s)}
                                </option>
                              ))}
                          </select>
                          <button>نقل</button>
                        </form>
                      )}
                    </article>
                  ))}
              </section>
            ))}
        </div>
      )}
    </>
  );
}
