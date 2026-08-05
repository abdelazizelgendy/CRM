"use server";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWorkspace } from "@/lib/workspace";
import { hashInvitationToken, normalizeEmail } from "@/lib/security";

export async function createInvitation(formData: FormData) {
  const parsed = z.object({ fullName:z.string().trim().min(2),email:z.string().email(),phone:z.string().trim().optional(),jobTitle:z.string().trim().optional(),departmentId:z.string().uuid().optional().or(z.literal("")),roleId:z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/dashboard/users/invite?error="+encodeURIComponent("تحقق من بيانات الدعوة"));
  const { supabase,user,membership }=await getWorkspace();
  const { data:permitted }=await supabase.rpc("has_permission",{target_org:membership.organization_id,permission_code:"users.invite"});
  if (!permitted) redirect("/dashboard/users?error="+encodeURIComponent("ليس لديك صلاحية دعوة المستخدمين"));
  const token=randomBytes(32).toString("base64url"); const tokenHash=hashInvitationToken(token);
  const { error }=await supabase.from("invitations").insert({organization_id:membership.organization_id,full_name:parsed.data.fullName,email:normalizeEmail(parsed.data.email),phone:parsed.data.phone||null,job_title:parsed.data.jobTitle||null,department_id:parsed.data.departmentId||null,role_id:parsed.data.roleId,token_hash:tokenHash,invited_by:user.id});
  if(error) redirect("/dashboard/users/invite?error="+encodeURIComponent("تعذر إنشاء الدعوة أو توجد دعوة معلقة للبريد نفسه"));
  const inviteUrl=`${process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000"}/accept-invitation?token=${token}`;
  if(process.env.NODE_ENV==="production") redirect("/dashboard/users?success="+encodeURIComponent("تم إنشاء الدعوة. اربط مزود البريد لإرسالها تلقائيًا"));
  redirect("/dashboard/users/invite?success="+encodeURIComponent(inviteUrl));
}

export async function registerFromInvitation(formData: FormData) {
  const parsed=z.object({token:z.string().min(20),fullName:z.string().trim().min(2),email:z.string().email(),password:z.string().min(8),confirmPassword:z.string()}).refine(v=>v.password===v.confirmPassword,{message:"كلمتا المرور غير متطابقتين"}).safeParse(Object.fromEntries(formData));
  if(!parsed.success) redirect(`/accept-invitation?token=${encodeURIComponent(String(formData.get("token")??""))}&error=${encodeURIComponent(parsed.error.issues[0]?.message??"تحقق من البيانات")}`);
  const { createClient }=await import("@/lib/supabase/server"); const supabase=await createClient();
  const { error }=await supabase.auth.signUp({email:parsed.data.email,password:parsed.data.password,options:{data:{full_name:parsed.data.fullName,invitation_token:parsed.data.token}}});
  if(error) redirect(`/accept-invitation?token=${encodeURIComponent(parsed.data.token)}&error=${encodeURIComponent("الدعوة غير صالحة أو البريد مستخدم بالفعل")}`);
  redirect("/login?success="+encodeURIComponent("تم قبول الدعوة. تحقق من بريدك ثم سجّل الدخول"));
}

export async function updateOrganization(formData: FormData) {
  const parsed=z.object({nameAr:z.string().trim().min(2),nameEn:z.string().trim().optional(),email:z.string().email().optional().or(z.literal("")),phone:z.string().trim().optional(),country:z.string().trim().optional(),city:z.string().trim().optional(),taxNumber:z.string().trim().optional(),commercialRegistration:z.string().trim().optional()}).safeParse(Object.fromEntries(formData));
  if(!parsed.success) redirect("/dashboard/settings?error="+encodeURIComponent("تحقق من بيانات الشركة"));
  const{supabase,membership}=await getWorkspace(); const d=parsed.data;
  const{error}=await supabase.from("organizations").update({name_ar:d.nameAr,name_en:d.nameEn||null,email:d.email||null,phone:d.phone||null,country:d.country||null,city:d.city||null,tax_number:d.taxNumber||null,commercial_registration:d.commercialRegistration||null}).eq("id",membership.organization_id);
  redirect(`/dashboard/settings?${error?"error":"success"}=${encodeURIComponent(error?"تعذر الحفظ أو ليست لديك الصلاحية":"تم حفظ بيانات الشركة")}`);
}

export async function updateProfile(formData: FormData) {
  const parsed=z.object({fullName:z.string().trim().min(2),phone:z.string().trim().optional(),jobTitle:z.string().trim().optional()}).safeParse(Object.fromEntries(formData));
  if(!parsed.success) redirect("/dashboard/profile?error="+encodeURIComponent("تحقق من البيانات"));
  const{supabase,user}=await getWorkspace(); const{error}=await supabase.from("profiles").update({full_name:parsed.data.fullName,phone:parsed.data.phone||null,job_title:parsed.data.jobTitle||null}).eq("id",user.id);
  redirect(`/dashboard/profile?${error?"error":"success"}=${encodeURIComponent(error?"تعذر حفظ الملف الشخصي":"تم حفظ الملف الشخصي")}`);
}

export async function createCustomRole(formData: FormData) {
  const permissionIds=formData.getAll("permissionIds").map(String);
  const parsed=z.object({nameAr:z.string().trim().min(2),nameEn:z.string().trim().min(2),description:z.string().trim().optional(),permissionIds:z.array(z.string().uuid()).min(1)}).safeParse({...Object.fromEntries(formData),permissionIds});
  if(!parsed.success) redirect("/dashboard/roles/new?error="+encodeURIComponent("أدخل اسم الدور واختر صلاحية واحدة على الأقل"));
  const{supabase,membership}=await getWorkspace(); const{error}=await supabase.rpc("create_custom_role",{target_org:membership.organization_id,role_name_ar:parsed.data.nameAr,role_name_en:parsed.data.nameEn,role_description:parsed.data.description||null,permission_ids:parsed.data.permissionIds});
  redirect(`/dashboard/roles${error?"?error="+encodeURIComponent("تعذر إنشاء الدور أو الاسم مستخدم"):"?success="+encodeURIComponent("تم إنشاء الدور")}`);
}
