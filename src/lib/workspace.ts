import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getWorkspace() {
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
