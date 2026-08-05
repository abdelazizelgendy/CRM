import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { FormMessage } from "@/components/form-message";
import { requestPasswordReset } from "@/lib/auth/actions";

export default async function Forgot({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  return <AuthShell title="استعادة كلمة المرور" subtitle="سنرسل رابطًا آمنًا ومحدود الصلاحية" footer={<Link href="/login">العودة لتسجيل الدخول</Link>}>
    <FormMessage {...params}/><form action={requestPasswordReset} className="form-stack"><label>البريد الإلكتروني<input name="email" type="email" required/></label><button className="primary-button">إرسال رابط الاستعادة</button></form>
  </AuthShell>;
}
