"use client";
import { useState } from "react";
import { importLeads } from "@/lib/crm-actions";
import { parseCsv } from "@/lib/crm";
type Option = { id: string; name_ar: string };
export function CsvImporter({
  stages,
  sources,
}: {
  stages: Option[];
  sources: Option[];
}) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState("");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [sourceId, setSourceId] = useState("");
  async function load(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.size > 2_000_000) {
      setError("حجم الملف يتجاوز 2MB");
      return;
    }
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) {
      setError("الملف فارغ أو غير صالح");
      return;
    }
    const headers = parsed[0].map((x) => x.trim());
    if (!headers.includes("full_name")) {
      setError("عمود full_name مطلوب");
      return;
    }
    setRows(
      parsed
        .slice(1, 501)
        .map((values) =>
          Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])),
        ),
    );
  }
  const payload = rows.map((x) => ({
    customerType: x.customer_type === "company" ? "company" : "individual",
    fullName: x.full_name ?? "",
    companyName: x.company_name ?? "",
    jobTitle: x.job_title ?? "",
    email: x.email ?? "",
    mobile: x.mobile ?? "",
    whatsapp: x.whatsapp ?? "",
    country: x.country || "السعودية",
    city: x.city ?? "",
    address: x.address ?? "",
    sourceId,
    stageId,
    priority: ["low", "medium", "high", "urgent"].includes(x.priority)
      ? x.priority
      : "medium",
    requestedService: x.requested_service ?? "",
    requestDescription: x.request_description ?? "",
    assignedTo: "",
    nextFollowUpAt: "",
  }));
  return (
    <div className="csv-importer">
      <div className="upload-zone">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => load(e.target.files?.[0])}
        />
        <strong>اختر ملف CSV</strong>
        <span>حد أقصى 500 صف و2MB</span>
      </div>
      {error && <p className="form-message error">{error}</p>}
      {rows.length > 0 && (
        <>
          <div className="mapping-grid">
            <label>
              المرحلة لكل الصفوف
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
              >
                {stages.map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name_ar}
                  </option>
                ))}
              </select>
            </label>
            <label>
              المصدر لكل الصفوف
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                <option value="">بدون مصدر</option>
                {sources.map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name_ar}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>النوع</th>
                  <th>الشركة</th>
                  <th>البريد</th>
                  <th>الجوال</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((x, i) => (
                  <tr key={i}>
                    <td>{x.full_name}</td>
                    <td>{x.customer_type}</td>
                    <td>{x.company_name}</td>
                    <td>{x.email}</td>
                    <td>{x.mobile}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">معاينة أول 10 صفوف من أصل {rows.length}.</p>
          <form action={importLeads}>
            <input type="hidden" name="rows" value={JSON.stringify(payload)} />
            <label>
              عند وجود سجل مكرر
              <select name="duplicateStrategy" defaultValue="skip">
            <option value="skip">تخطي المكرر (موصى به)</option>
            <option value="update">تحديث السجل المكرر</option>
            <option value="create">إنشاؤه بعد التأكيد</option>
              </select>
            </label>
            <button className="primary-button">تأكيد الاستيراد</button>
          </form>
        </>
      )}
    </div>
  );
}
