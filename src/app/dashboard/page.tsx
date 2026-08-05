import Link from "next/link";
import { Activity, ArrowLeft, KeyRound, Settings, UserPlus, Users, UserRoundCheck } from "lucide-react";
import { getWorkspace } from "@/lib/workspace";

export default async function Dashboard() {
  const { supabase, membership } = await getWorkspace();
  const organizationId = membership.organization_id;
  const [{ count: users }, { count: active }, { count: invites }, { count: roles }, { data: logs }] = await Promise.all([
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active"),
    supabase.from("invitations").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "pending"),
    supabase.from("roles").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("audit_logs").select("id,event_type,description,created_at,result").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(5),
  ]);
  const stats = [["إجمالي المستخدمين", users ?? 0, Users, "blue"], ["المستخدمون النشطون", active ?? 0, UserRoundCheck, "green"], ["الدعوات المعلقة", invites ?? 0, UserPlus, "amber"], ["الأدوار", roles ?? 0, KeyRound, "purple"]] as const;
  return <><div className="welcome"><div><span>لوحة التحكم</span><h1>نظرة سريعة على مساحة عملك</h1><p>تابع المستخدمين والصلاحيات والأنشطة الإدارية من مكان واحد.</p></div><div className="shield-art">✓</div></div>
    <section className="stats-grid">{stats.map(([label,value,Icon,color]) => <article className="stat-card" key={label}><div className={`icon-box ${color}`}><Icon/></div><div><span>{label}</span><strong>{value}</strong><small>محدّث الآن</small></div></article>)}</section>
    <section className="dashboard-grid"><article className="panel"><div className="panel-head"><div><h2>آخر الأنشطة</h2><p>أحدث العمليات داخل مساحة العمل</p></div><Link href="/dashboard/audit">عرض الكل <ArrowLeft size={16}/></Link></div><div className="activity-list">{logs?.length ? logs.map(log => <div key={log.id}><span className={`activity-dot ${log.result === "success" ? "ok" : "bad"}`}><Activity/></span><div><strong>{log.description}</strong><small>{new Date(log.created_at).toLocaleString("ar-SA")}</small></div></div>) : <div className="empty">لا توجد أنشطة مسجلة بعد</div>}</div></article>
    <article className="panel"><div className="panel-head"><div><h2>إجراءات سريعة</h2><p>الوصول لأكثر المهام استخدامًا</p></div></div><div className="quick-links"><Link href="/dashboard/users"><UserPlus/>دعوة مستخدم جديد<ArrowLeft/></Link><Link href="/dashboard/roles"><KeyRound/>إدارة الصلاحيات<ArrowLeft/></Link><Link href="/dashboard/settings"><Settings/>إعدادات الشركة<ArrowLeft/></Link></div></article></section>
  </>;
}
