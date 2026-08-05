import { Search } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { getWorkspace } from "@/lib/workspace";

export default async function AuditPage() {
  const { supabase, membership } = await getWorkspace();
  const { data: logs } = await supabase.from("audit_logs").select("id,event_type,module,description,result,ip_address,created_at,profiles(full_name)").eq("organization_id", membership.organization_id).order("created_at", { ascending: false }).limit(100);
  return <><PageTitle title="سجل النشاط" description="سجل غير قابل للتعديل للعمليات الأمنية والإدارية"/><div className="panel table-panel"><div className="table-tools"><div className="search"><Search/><input placeholder="ابحث في وصف العملية"/></div><select defaultValue="all"><option value="all">كل النتائج</option><option value="success">ناجحة</option><option value="failure">فاشلة</option></select></div><div className="responsive-table"><table><thead><tr><th>العملية</th><th>المستخدم</th><th>الوحدة</th><th>النتيجة</th><th>التاريخ</th></tr></thead><tbody>{logs?.map(log => <tr key={log.id}><td><strong>{log.description}</strong><small>{log.event_type}</small></td><td>{(log.profiles as unknown as { full_name: string } | null)?.full_name ?? "النظام"}</td><td>{log.module}</td><td><span className={`status ${log.result}`}>{log.result === "success" ? "نجحت" : "فشلت"}</span></td><td>{new Date(log.created_at).toLocaleString("ar-SA")}</td></tr>)}</tbody></table></div></div></>;
}
