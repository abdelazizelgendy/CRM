import { DashboardShell } from "@/components/dashboard-shell";
import { getWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, membership } = await getWorkspace();
  const org = membership.organizations as unknown as { name_ar: string };
  const profile = membership.profiles as unknown as { full_name: string };
  return <DashboardShell company={org.name_ar} name={profile.full_name} email={user.email ?? ""}>{children}</DashboardShell>;
}
