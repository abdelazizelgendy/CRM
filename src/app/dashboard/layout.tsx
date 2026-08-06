import { DashboardShell } from "@/components/dashboard-shell";
import { getWorkspacePermissions } from "@/lib/workspace";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, membership, permissions } = await getWorkspacePermissions();
  const locale = await getLocale();
  const org = membership.organizations as unknown as { name_ar: string; name_en?: string | null };
  const profile = membership.profiles as unknown as { full_name: string };
  return <DashboardShell company={locale === "en" ? org.name_en || org.name_ar : org.name_ar} name={profile.full_name} email={user.email ?? ""} permissions={[...permissions]}>{children}</DashboardShell>;
}
