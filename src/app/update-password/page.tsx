import { AuthShell } from "@/components/auth-shell";
import { FormMessage } from "@/components/form-message";
import { updatePassword } from "@/lib/auth/actions";

export default async function UpdatePassword({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AuthShell title="كلمة مرور جديدة" subtitle="استخدم 8 أحرف على الأقل" footer={null}>
    <FormMessage {...params}/><form action={updatePassword} className="form-stack"><label>كلمة المرور الجديدة<input name="password" type="password" minLength={8} required/></label><label>تأكيد كلمة المرور<input name="confirmPassword" type="password" minLength={8} required/></label><button className="primary-button">حفظ كلمة المرور</button></form>
  </AuthShell>;
}
