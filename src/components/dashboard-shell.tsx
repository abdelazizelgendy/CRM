import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, Bell, Building2, ChevronDown, Gauge, KeyRound, Settings, ShieldCheck, UserRound, Users } from "lucide-react";
import { signOut } from "@/lib/auth/actions";

const items = [
  ["/dashboard", "الرئيسية", Gauge], ["/dashboard/users", "المستخدمون", Users],
  ["/dashboard/roles", "الأدوار والصلاحيات", KeyRound], ["/dashboard/audit", "سجل النشاط", Activity],
  ["/dashboard/settings", "إعدادات الشركة", Settings], ["/dashboard/profile", "الملف الشخصي", UserRound],
] as const;

export function DashboardShell({ children, company, name, email }: { children: ReactNode; company: string; name: string; email: string }) {
  return <div className="dashboard-shell">
    <aside className="sidebar"><div className="brand sidebar-brand"><span><ShieldCheck size={22}/></span> مدار CRM</div><div className="company-chip"><Building2/><div><small>مساحة العمل</small><strong>{company}</strong></div><ChevronDown size={16}/></div><nav>{items.map(([href,label,Icon]) => <Link href={href} key={href}><Icon size={19}/>{label}</Link>)}</nav><div className="soon"><span>قريبًا</span><p>العملاء والمحادثات وعروض الأسعار</p></div></aside>
    <div className="dashboard-main"><header className="topbar"><div><p>مساء الخير، {name.split(" ")[0]} 👋</p><span>{company}</span></div><div className="top-actions"><button aria-label="الإشعارات"><Bell size={20}/><i/></button><div className="avatar">{name.slice(0,1)}</div><div className="user-meta"><strong>{name}</strong><span>{email}</span></div><form action={signOut}><button className="logout">خروج</button></form></div></header><main className="content">{children}</main></div>
  </div>;
}
