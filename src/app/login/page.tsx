import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { FormMessage } from "@/components/form-message";
import { signIn } from "@/lib/auth/actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  return <AuthShell title="مرحبًا بعودتك" subtitle="سجّل الدخول إلى مساحة عمل شركتك" footer={<>ليس لديك حساب؟ <Link href="/register">أنشئ شركة جديدة</Link></>}>
    <FormMessage {...params}/><form action={signIn} className="form-stack">
      <label>البريد الإلكتروني<input name="email" type="email" autoComplete="email" required placeholder="name@company.com"/></label>
      <label>كلمة المرور<input name="password" type="password" autoComplete="current-password" minLength={8} required placeholder="••••••••"/></label>
      <div className="form-row"><label className="check"><input type="checkbox" name="remember"/> تذكرني</label><Link href="/forgot-password">نسيت كلمة المرور؟</Link></div>
      <button className="primary-button" type="submit">تسجيل الدخول</button>
    </form>
  </AuthShell>;
}
