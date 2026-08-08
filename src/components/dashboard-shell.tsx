import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
  ContactRound,
  FileSignature,
  Gauge,
  KeyRound,
  MessagesSquare,
  Settings,
  ShieldCheck,
  ShoppingCart,
  ClipboardCheck,
  Banknote,
  WalletCards,
  ReceiptText,
  Tags,
  UserRound,
  UserRoundSearch,
  Users,
  BriefcaseBusiness,
  Warehouse,
  Factory,
} from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { LanguageSwitcher } from "@/components/language-switcher";

const items = [
  ["/dashboard", "الرئيسية", Gauge, "dashboard.view"],
  ["/dashboard/crm", "لوحة CRM", UserRoundSearch, "leads.view"],
  ["/dashboard/crm/leads", "العملاء المحتملون", UserRoundSearch, "leads.view"],
  ["/dashboard/crm/customers", "العملاء", Building2, "customers.view"],
  ["/dashboard/crm/contacts", "جهات الاتصال", ContactRound, "contacts.view"],
  ["/dashboard/inbox", "صندوق المحادثات", MessagesSquare, "inbox.view"],
  ["/dashboard/sales", "المبيعات", ShoppingCart, "sales.dashboard.view"],
  ["/dashboard/sales/requests", "طلبات المبيعات", ReceiptText, "sales_requests.view"],
  ["/dashboard/sales/quotations", "عروض الأسعار", ReceiptText, "quotations.view"],
  ["/dashboard/contracts", "العقود والتنفيذ", FileSignature, "contracts.view"],
  ["/dashboard/contracts/list", "قائمة العقود", FileSignature, "contracts.view"],
  ["/dashboard/contracts/approvals", "موافقات العقود", ShieldCheck, "contracts.approve"],
  ["/dashboard/work-orders", "أوامر العمل", ClipboardCheck, "work_orders.view"],
  ["/dashboard/billing", "الفوترة والتحصيل", Banknote, "billing.dashboard.view"],
  ["/dashboard/billing/invoices", "الفواتير", ReceiptText, "invoices.view"],
  ["/dashboard/billing/receipts", "سندات القبض", WalletCards, "receipts.view"],
  ["/dashboard/procurement", "المشتريات والتكاليف", ShoppingCart, "procurement.dashboard.view"],
  ["/dashboard/procurement/suppliers", "الموردون", Building2, "suppliers.view"],
  ["/dashboard/procurement/requisitions", "طلبات الشراء", ClipboardCheck, "purchase_requests.view"],
  ["/dashboard/procurement/purchase-orders", "أوامر الشراء", ReceiptText, "purchase_orders.view"],
  ["/dashboard/procurement/reports/project-cost", "تقارير التكلفة", Banknote, "cost_reports.view"],
  ["/dashboard/projects", "إدارة المشاريع", BriefcaseBusiness, "projects.view"],
  ["/dashboard/inventory", "المخزون والمستودعات", Warehouse, "inventory.view"],
  ["/dashboard/production", "الإنتاج والتصنيع", Factory, "production.view"],
  ["/dashboard/crm/settings", "إعدادات CRM", Tags, "crm.settings.manage"],
  ["/dashboard/users", "المستخدمون", Users, "users.view"],
  ["/dashboard/roles", "الأدوار والصلاحيات", KeyRound, "roles.view"],
  ["/dashboard/audit", "سجل النشاط", Activity, "audit.view"],
  [
    "/dashboard/settings",
    "إعدادات الشركة",
    Settings,
    "organization.settings.manage",
  ],
  ["/dashboard/profile", "الملف الشخصي", UserRound, "profile.view"],
] as const;

export function DashboardShell({
  children,
  company,
  name,
  email,
  permissions,
}: {
  children: ReactNode;
  company: string;
  name: string;
  email: string;
  permissions: string[];
}) {
  const allowed = new Set(permissions);
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand sidebar-brand">
          <span>
            <ShieldCheck size={22} />
          </span>{" "}
          مدار CRM
        </div>
        <div className="company-chip">
          <Building2 />
          <div>
            <small>مساحة العمل</small>
            <strong>{company}</strong>
          </div>
          <ChevronDown size={16} />
        </div>
        <nav>
          {items
            .filter(([, , , permission]) => allowed.has(permission))
            .map(([href, label, Icon]) => (
              <Link href={href} key={href}>
                <Icon size={19} />
                {label}
              </Link>
            ))}
        </nav>
      </aside>
      <nav className="mobile-nav" aria-label="التنقل الرئيسي">
        {items
          .filter(([, , , permission]) => allowed.has(permission))
          .map(([href, label, Icon]) => (
            <Link href={href} key={href}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
      </nav>
      <div className="dashboard-main">
        <header className="topbar">
          <div>
            <p>مساء الخير، {name.split(" ")[0]} 👋</p>
            <span>{company}</span>
          </div>
          <div className="top-actions">
            <LanguageSwitcher />
            <Link className="notification-button" href="/dashboard/inbox" aria-label="الإشعارات">
              <Bell size={20} />
              <i />
            </Link>
            <div className="avatar">{name.slice(0, 1)}</div>
            <div className="user-meta">
              <strong>{name}</strong>
              <span>{email}</span>
            </div>
            <form action={signOut}>
              <button className="logout">خروج</button>
            </form>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
