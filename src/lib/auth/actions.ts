"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const password = z.string().min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف");

function message(path: string, type: "error" | "success", text: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(text)}`);
}

export async function signIn(formData: FormData) {
  const parsed = z.object({ email: z.string().email(), password }).safeParse({
    email: formData.get("email"), password: formData.get("password"),
  });
  if (!parsed.success) message("/login", "error", "تحقق من البريد الإلكتروني وكلمة المرور");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) message("/login", "error", "بيانات الدخول غير صحيحة أو الحساب غير متاح");
  await supabase.rpc("record_self_auth_event", { event_name: "auth.login" });
  redirect("/dashboard");
}

export async function registerOrganization(formData: FormData) {
  const parsed = z.object({
    organizationName: z.string().trim().min(2), fullName: z.string().trim().min(2),
    phone: z.string().trim().min(8), email: z.string().email(), password,
    confirmPassword: z.string(), terms: z.literal("on"),
  }).refine((value) => value.password === value.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين", path: ["confirmPassword"],
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) message("/register", "error", parsed.error.issues[0]?.message ?? "تحقق من البيانات");
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email, password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { full_name: parsed.data.fullName, phone: parsed.data.phone, organization_name: parsed.data.organizationName },
    },
  });
  if (error) message("/register", "error", "تعذر إنشاء الحساب. قد يكون البريد مستخدمًا بالفعل");
  message("/login", "success", "تم إنشاء الحساب. تحقق من بريدك لتأكيده ثم سجّل الدخول");
}

export async function requestPasswordReset(formData: FormData) {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) message("/forgot-password", "error", "أدخل بريدًا إلكترونيًا صحيحًا");
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${origin}/update-password` });
  message("/forgot-password", "success", "إن كان البريد مسجلًا فستصلك تعليمات الاستعادة");
}

export async function updatePassword(formData: FormData) {
  const parsed = z.object({ password, confirmPassword: z.string() })
    .refine((v) => v.password === v.confirmPassword, { message: "كلمتا المرور غير متطابقتين" })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) message("/update-password", "error", parsed.error.issues[0]?.message ?? "تحقق من البيانات");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) message("/update-password", "error", "انتهت صلاحية الرابط أو تعذر تحديث كلمة المرور");
  await supabase.rpc("record_self_auth_event", { event_name: "auth.password_changed" });
  await supabase.auth.signOut();
  message("/login", "success", "تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.rpc("record_self_auth_event", { event_name: "auth.logout" });
  await supabase.auth.signOut();
  redirect("/login");
}
