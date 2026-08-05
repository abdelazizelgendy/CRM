import Link from "next/link";
import { CsvImporter } from "@/components/csv-importer";
import { FormMessage } from "@/components/form-message";
import { PageTitle } from "@/components/page-title";
import { getCrmContext } from "@/lib/crm-data";
export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [q, { stages, sources }] = await Promise.all([
    searchParams,
    getCrmContext(),
  ]);
  return (
    <>
      <PageTitle
        title="استيراد العملاء المحتملين"
        description="معاينة وفحص التكرار قبل الحفظ"
        action={
          <Link
            className="secondary-button"
            href="/templates/leads-import-template.csv"
            download
          >
            تحميل القالب
          </Link>
        }
      />
      <FormMessage error={q.error} success={q.success} />
      {q.created && (
        <section className="import-result">
          <div>
            <span>تم الإنشاء</span>
            <strong>{q.created}</strong>
          </div>
          <div>
            <span>مكرر</span>
            <strong>{q.duplicates}</strong>
          </div>
          <div>
            <span>مرفوض</span>
            <strong>{q.rejected}</strong>
          </div>
        </section>
      )}
      <article className="panel settings-panel">
        <CsvImporter stages={stages} sources={sources} />
      </article>
    </>
  );
}
