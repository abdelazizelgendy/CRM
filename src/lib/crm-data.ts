import { getWorkspacePermissions } from "@/lib/workspace";

export async function getCrmContext() {
  const workspace = await getWorkspacePermissions();
  const org = workspace.membership.organization_id;
  const [
    { data: stages },
    { data: sources },
    { data: members },
    { data: tags },
  ] = await Promise.all([
    workspace.supabase
      .from("lead_stages")
      .select("id,name_ar,name_en,code,color,sort_order,is_active,is_sensitive")
      .eq("organization_id", org)
      .order("sort_order"),
    workspace.supabase
      .from("lead_sources")
      .select("id,name_ar,name_en,code,is_active,sort_order")
      .eq("organization_id", org)
      .order("sort_order"),
    workspace.supabase
      .from("organization_members")
      .select("user_id,profiles(full_name)")
      .eq("organization_id", org)
      .eq("status", "active"),
    workspace.supabase
      .from("crm_tags")
      .select("id,name,name_ar,name_en,color,is_active")
      .eq("organization_id", org)
      .order("name"),
  ]);
  return {
    ...workspace,
    organizationId: org,
    stages: stages ?? [],
    sources: sources ?? [],
    members: members ?? [],
    tags: tags ?? [],
  };
}

export function memberName(member: { profiles: unknown }) {
  return (
    (member.profiles as { full_name?: string } | null)?.full_name ?? "مستخدم"
  );
}
