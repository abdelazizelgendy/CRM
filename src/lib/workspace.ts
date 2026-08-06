import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocalProvider } from "@/lib/data-provider";
import { createLocalSupabaseClient } from "@/lib/local-supabase";
import { demoPermissions } from "@/lib/inbox/seed";

export async function getWorkspace() {
  if (isLocalProvider()) {
    const supabase = createLocalSupabaseClient() as Awaited<ReturnType<typeof createClient>>;
    return { supabase, user:{id:"u-owner",email:"owner@madar.demo"}, membership:{id:"member-owner",status:"active",organization_id:"org-madar-demo",organizations:{id:"org-madar-demo",name_ar:"شركة مدار التجريبية",name_en:"Madar Demo Company",status:"active"},profiles:{full_name:"عبدالعزيز الجندي",job_title:"مالك الشركة",department_id:null,phone:"+966500000000"}} };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id,status,organization_id,organizations(id,name_ar,name_en,status),profiles(full_name,job_title,department_id)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) redirect("/login?error=" + encodeURIComponent("الحساب غير مرتبط بشركة نشطة"));
  return { supabase, user, membership };
}

export async function getWorkspacePermissions() {
  const workspace = await getWorkspace();
  if (isLocalProvider()) return { ...workspace, permissions:new Set(demoPermissions) };
  const { data } = await workspace.supabase.from("user_roles")
    .select("roles(role_permissions(permissions(code)))")
    .eq("organization_id", workspace.membership.organization_id)
    .eq("user_id", workspace.user.id);
  const permissions = new Set<string>();
  for (const assignment of data ?? []) {
    const role = assignment.roles as unknown as { role_permissions?: { permissions?: { code?: string } | { code?: string }[] }[] } | null;
    for (const link of role?.role_permissions ?? []) {
      const values = Array.isArray(link.permissions) ? link.permissions : [link.permissions];
      for (const permission of values) if (permission?.code) permissions.add(permission.code);
    }
  }
  return { ...workspace, permissions };
}
