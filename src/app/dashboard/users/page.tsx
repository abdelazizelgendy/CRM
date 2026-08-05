import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { getWorkspace } from "@/lib/workspace";

export default async function UsersPage() {
  const { supabase, membership } = await getWorkspace();
  const { data: members } = await supabase.from("organization_members")
    .select("id,status,created_at,last_login_at,profiles(full_name,phone,job_title),user_roles(roles(name_ar))")
    .eq("organization_id", membership.organization_id).order("created_at", { ascending: false });
  return <><PageTitle title="المستخدمون" description="إدارة أعضاء الفريق وحالات حساباتهم" action={<Link href="/dashboard/users/invite" className="primary-button small"><UserPlus size={18}/> دعوة مستخدم</Link>}/><div className="panel table-panel"><div className="table-tools"><div className="search"><Search/><input placeholder="البحث بالاسم أو البريد"/></div><select defaultValue="all"><option value="all">كل الحالات</option><option value="active">نشط</option><option value="invited">مدعو</option><option value="suspended">موقوف</option></select></div><div className="responsive-table"><table><thead><tr><th>المستخدم</th><th>المسمى الوظيفي</th><th>الدور</th><th>الحالة</th><th>آخر دخول</th></tr></thead><tbody>{members?.map(member => { const p = member.profiles as unknown as { full_name: string; phone: string | null; job_title: string | null }; const ur = member.user_roles as unknown as Array<{ roles: { name_ar: string } }>; return <tr key={member.id}><td><strong>{p?.full_name}</strong><small>{p?.phone ?? "—"}</small></td><td>{p?.job_title ?? "غير محدد"}</td><td>{ur?.[0]?.roles?.name_ar ?? "—"}</td><td><span className={`status ${member.status}`}>{member.status === "active" ? "نشط" : member.status}</span></td><td>{member.last_login_at ? new Date(member.last_login_at).toLocaleDateString("ar-SA") : "لم يسجل بعد"}</td></tr>})}<tr className="empty-row"><td colSpan={5}>{members?.length ? "" : "لا يوجد مستخدمون"}</td></tr></tbody></table></div></div></>;
}
