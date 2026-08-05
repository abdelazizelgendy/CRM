import Link from "next/link";
import { FormMessage } from "@/components/form-message";
import { LeadForm } from "@/components/lead-form";
import { PageTitle } from "@/components/page-title";
import { getCrmContext } from "@/lib/crm-data";
export default async function NewLead({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const { stages, sources, members, supabase, organizationId } =
    await getCrmContext();
  const ids = (q.duplicates ?? "").split(",").filter(Boolean);
  const { data: duplicates } = ids.length
    ? await supabase
        .from("leads")
        .select("id,full_name,company_name,email,mobile")
        .eq("organization_id", organizationId)
        .in("id", ids)
    : { data: [] };
  return (
    <>
      <PageTitle
        title="إضافة عميل محتمل"
        description="يتم فحص البريد والجوال وواتساب قبل الحفظ"
      />
      <FormMessage error={q.error} />
      {duplicates?.length ? (
        <div className="duplicate-warning">
          <h2>سجلات مشابهة</h2>
          {duplicates.map((x) => (
            <Link
              key={x.id}
              href={`/dashboard/crm/leads/${x.id}`}
              target="_blank"
            >
              <strong>{x.full_name}</strong>
              <span>{x.company_name || x.email || x.mobile}</span>
            </Link>
          ))}
          <p>إذا تأكدت أنها ليست مكررة يمكنك متابعة الإنشاء.</p>
        </div>
      ) : null}
      <article className="panel settings-panel">
        <LeadForm
          stages={stages}
          sources={sources}
          members={members}
          confirmDuplicate={Boolean(duplicates?.length)}
        />
      </article>
    </>
  );
}
