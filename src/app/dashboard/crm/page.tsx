import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CalendarClock,
  CircleCheckBig,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { getCrmContext, memberName } from "@/lib/crm-data";
import { currentTime } from "@/lib/time";

export default async function CrmDashboard() {
  const { supabase, organizationId, stages, sources, members, permissions } =
    await getCrmContext();
  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id,status,stage_id,source_id,assigned_to,created_at,next_follow_up_at",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);
  const now = await currentTime(),
    all = leads ?? [],
    converted = all.filter((x) => x.status === "converted").length,
    qualified = all.filter(
      (x) =>
        x.status === "qualified" ||
        stages.find((s) => s.id === x.stage_id)?.code === "qualified",
    ).length;
  const overdue = all.filter(
    (x) =>
      x.next_follow_up_at &&
      new Date(x.next_follow_up_at).getTime() < now &&
      !["converted", "lost", "archived"].includes(x.status),
  ).length;
  const newCount = all.filter(
    (x) => new Date(x.created_at).getTime() > now - 7 * 86400000,
  ).length;
  const stats = [
    ["إجمالي العملاء المحتملين", all.length, UsersRound, "blue"],
    ["الجدد خلال 7 أيام", newCount, UserRoundPlus, "purple"],
    ["المؤهلون", qualified, CircleCheckBig, "green"],
    ["متابعات متأخرة", overdue, CalendarClock, "amber"],
  ] as const;
  const sourceCounts = sources
    .map((s) => ({
      ...s,
      count: all.filter((l) => l.source_id === s.id).length,
    }))
    .filter((x) => x.count)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const stageCounts = stages.map((s) => ({
    ...s,
    count: all.filter((l) => l.stage_id === s.id).length,
  }));
  const assigneeCounts = members
    .map((m) => ({
      id: m.user_id,
      name: memberName(m),
      count: all.filter((l) => l.assigned_to === m.user_id).length,
    }))
    .filter((x) => x.count)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const { data: activities } = await supabase
    .from("audit_logs")
    .select("id,description,created_at,result")
    .eq("organization_id", organizationId)
    .eq("module", "crm")
    .order("created_at", { ascending: false })
    .limit(8);
  return (
    <>
      <PageTitle
        title="لوحة CRM"
        description="مؤشرات حقيقية تحترم الشركة والصلاحيات"
        action={
          permissions.has("leads.create") ? (
            <Link
              className="primary-button small"
              href="/dashboard/crm/leads/new"
            >
              عميل محتمل جديد
            </Link>
          ) : undefined
        }
      />
      <section className="stats-grid">
        {stats.map(([label, value, Icon, color]) => (
          <article className="stat-card" key={label}>
            <div className={`icon-box ${color}`}>
              <Icon />
            </div>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>محدّث الآن</small>
            </div>
          </article>
        ))}
      </section>
      <section className="crm-kpi-strip">
        <div>
          <span>تم التحويل</span>
          <strong>{converted}</strong>
        </div>
        <div>
          <span>معدل التحويل</span>
          <strong>
            {all.length ? Math.round((converted / all.length) * 100) : 0}%
          </strong>
        </div>
        <div>
          <span>مراحل نشطة</span>
          <strong>{stages.filter((x) => x.is_active).length}</strong>
        </div>
      </section>
      <section className="crm-dashboard-grid">
        <article className="panel chart-panel">
          <h2>التوزيع حسب المرحلة</h2>
          {stageCounts.map((x) => (
            <div className="bar-row" key={x.id}>
              <span>
                <i style={{ background: x.color }} />
                {x.name_ar}
              </span>
              <div>
                <b
                  style={{
                    width: `${all.length ? Math.max(4, (x.count / all.length) * 100) : 0}%`,
                    background: x.color,
                  }}
                />
              </div>
              <strong>{x.count}</strong>
            </div>
          ))}
        </article>
        <article className="panel chart-panel">
          <h2>أهم المصادر</h2>
          {sourceCounts.length ? (
            sourceCounts.map((x) => (
              <div className="rank-row" key={x.id}>
                <span>{x.name_ar}</span>
                <strong>{x.count}</strong>
              </div>
            ))
          ) : (
            <p className="empty">لا توجد بيانات مصادر بعد</p>
          )}
          <h2 className="section-gap">التوزيع حسب المسؤول</h2>
          {assigneeCounts.map((x) => (
            <div className="rank-row" key={x.id}>
              <span>{x.name}</span>
              <strong>{x.count}</strong>
            </div>
          ))}
        </article>
      </section>
      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>أحدث الأنشطة</h2>
            <p>العمليات المسجلة داخل CRM</p>
          </div>
          <Link href="/dashboard/audit">
            سجل النشاط <ArrowLeft size={16} />
          </Link>
        </div>
        <div className="activity-list">
          {activities?.length ? (
            activities.map((x) => (
              <div key={x.id}>
                <span
                  className={`activity-dot ${x.result === "success" ? "ok" : "bad"}`}
                >
                  <Activity />
                </span>
                <div>
                  <strong>{x.description}</strong>
                  <small>
                    {new Date(x.created_at).toLocaleString("ar-SA")}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">لا توجد أنشطة بعد</div>
          )}
        </div>
      </article>
    </>
  );
}
