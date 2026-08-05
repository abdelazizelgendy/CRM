import { notFound } from "next/navigation";
import { FormMessage } from "@/components/form-message";
import { LeadForm } from "@/components/lead-form";
import { PageTitle } from "@/components/page-title";
import { getCrmContext } from "@/lib/crm-data";
export default async function EditLead({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const { stages, sources, members, supabase, organizationId } =
    await getCrmContext();
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .single();
  if (!lead) notFound();
  return (
    <>
      <PageTitle
        title="تعديل العميل المحتمل"
        description="تُسجل التغييرات في سجل النشاط"
      />
      <FormMessage error={q.error} />
      <article className="panel settings-panel">
        <LeadForm
          stages={stages}
          sources={sources}
          members={members}
          lead={lead}
        />
      </article>
    </>
  );
}
