import { csvSafe } from "@/lib/crm";
import { getWorkspacePermissions } from "@/lib/workspace";
export async function GET(request: Request) {
  const { supabase, membership, permissions } = await getWorkspacePermissions();
  if (!permissions.has("leads.export"))
    return new Response("Forbidden", { status: 403 });
  const url = new URL(request.url);
  let query = supabase
    .from("leads")
    .select(
      "full_name,customer_type,company_name,job_title,email,mobile,whatsapp,country,city,address,priority,requested_service,request_description,status,created_at,lead_stages(name_ar),lead_sources(name_ar)",
    )
    .eq("organization_id", membership.organization_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10000);
  for (const [key, column] of [
    ["stage", "stage_id"],
    ["source", "source_id"],
    ["priority", "priority"],
    ["assignee", "assigned_to"],
  ] as const) {
    const value = url.searchParams.get(key);
    if (value) query = query.eq(column, value);
  }
  const { data, error } = await query;
  if (error) return new Response("Export failed", { status: 500 });
  await supabase.rpc("record_crm_activity", {
    event_name: "leads.exported",
    event_description: "تم تصدير العملاء المحتملين",
    event_summary: { count: data?.length ?? 0 },
  });
  const headers = [
    "full_name",
    "customer_type",
    "company_name",
    "job_title",
    "email",
    "mobile",
    "whatsapp",
    "country",
    "city",
    "address",
    "priority",
    "requested_service",
    "request_description",
    "status",
    "stage",
    "source",
    "created_at",
  ];
  const lines = [
    headers.join(","),
    ...(data ?? []).map((x) =>
      [
        x.full_name,
        x.customer_type,
        x.company_name,
        x.job_title,
        x.email,
        x.mobile,
        x.whatsapp,
        x.country,
        x.city,
        x.address,
        x.priority,
        x.requested_service,
        x.request_description,
        x.status,
        (x.lead_stages as unknown as { name_ar?: string })?.name_ar,
        (x.lead_sources as unknown as { name_ar?: string })?.name_ar,
        x.created_at,
      ]
        .map(csvSafe)
        .join(","),
    ),
  ];
  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
