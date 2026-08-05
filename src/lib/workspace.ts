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
