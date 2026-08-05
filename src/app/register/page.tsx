import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { FormMessage } from "@/components/form-message";
import { registerOrganization } from "@/lib/auth/actions";

export default async function Register({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AuthShell title="أنشئ مساحة عملك" subtitle="ابدأ بإعداد الشركة وحساب المالك" footer={<>لديك حساب؟ <Link href="/login">سجّل الدخول</Link></>}>
    <FormMessage {...params}/><form action={registerOrganization} className="form-stack compact">
      <div className="field-grid"><label>اسم الشركة<input name="organizationName" required minLength={2}/></label><label>اسم المسؤول<input name="fullName" required minLength={2}/></label></div>
      <div className="field-grid"><label>البريد الإلكتروني<input name="email" type="email" required/></label><label>رقم الجوال<input name="phone" type="tel" required/></label></div>
      <div className="field-grid"><label>كلمة المرور<input name="password" type="password" minLength={8} required/></label><label>تأكيد كلمة المرور<input name="confirmPassword" type="password" minLength={8} required/></label></div>
      <label className="check"><input name="terms" type="checkbox" required/> أوافق على الشروط وسياسة الخصوصية</label>
      <button className="primary-button" type="submit">إنشاء الشركة والحساب</button>
    </form>
  </AuthShell>;
}
