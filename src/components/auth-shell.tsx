import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return <main className="auth-page">
    <section className="brand-panel">
      <Link href="/" className="brand"><span><ShieldCheck size={24}/></span> مدار CRM</Link>
      <div><p className="eyebrow">منصة أعمال عربية آمنة</p><h1>فريقك وصلاحياته<br/>تحت سيطرتك.</h1><p>أساس تقني متعدد الشركات يعزل البيانات ويجعل كل إجراء مهم قابلًا للتتبع.</p></div>
      <div className="trust-row"><span>عزل كامل للبيانات</span><span>صلاحيات دقيقة</span><span>سجل تدقيق</span></div>
    </section>
    <section className="form-panel"><div className="auth-card"><div className="mobile-brand"><ShieldCheck/> مدار CRM</div><h2>{title}</h2><p className="muted">{subtitle}</p>{children}<div className="auth-footer">{footer}</div></div></section>
  </main>;
}
