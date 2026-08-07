"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  Download,
  FilePenLine,
  FilePlus2,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  WalletCards,
} from "lucide-react";
import { useLocale } from "@/components/locale-runtime";
import { formatContractMoney } from "@/lib/contracts/calculations";
import { getContractDemoRepository } from "@/lib/contracts/provider";
import { ContractError } from "@/lib/contracts/repository";
import type {
  Contract,
  ContractFilters,
  ContractStatus,
  ContractVersion,
  WorkOrderFilters,
  WorkOrderStatus,
} from "@/lib/contracts/types";
type Mode =
  | "dashboard"
  | "list"
  | "new"
  | "detail"
  | "edit"
  | "approvals"
  | "change-orders"
  | "work-orders"
  | "new-work-order"
  | "work-order-detail"
  | "calendar"
  | "preview";
const org = "org-madar-demo";
const ar: Record<string, string> = {
  draft: "مسودة",
  under_review: "قيد المراجعة",
  changes_requested: "تعديلات مطلوبة",
  approved: "معتمد",
  active: "نشط",
  suspended: "معلق",
  completed: "مكتمل",
  cancelled: "ملغي",
  terminated: "منهى",
  expired: "منتهي الصلاحية",
  superseded: "مستبدل",
  planned: "مخطط",
  ready: "جاهز",
  in_progress: "قيد التنفيذ",
  on_hold: "متوقف",
  reopened: "أعيد فتحه",
  applied: "مطبق",
  rejected: "مرفوض",
  low: "منخفض",
  medium: "متوسط",
  high: "عالٍ",
  urgent: "عاجل",
};
function download(name: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export function ContractsWorkspace({ mode, id }: { mode: Mode; id?: string }) {
  const locale = useLocale(),
    router = useRouter(),
    search = useSearchParams(),
    t = (a: string, e: string) => (locale === "ar" ? a : e),
    repo = getContractDemoRepository(),
    [actorId, setActor] = useState("u-owner"),
    [, redraw] = useState(0),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const data = repo.snapshot(org, actorId),
    actor = data.users.find((x) => x.id === actorId)!,
    can = (p: string) => actor.permissions.includes(p),
    status = (s: string) => (
      <span className={`contract-status ${s}`}>
        {locale === "ar" ? (ar[s] ?? s) : s.replaceAll("_", " ")}
      </span>
    ),
    act = (fn: () => void, ok: string) => {
      try {
        fn();
        redraw((x) => x + 1);
        setMessage(ok);
        setError("");
      } catch (e) {
        setMessage("");
        setError(
          e instanceof ContractError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Unknown error",
        );
      }
    };
  const toolbar = (
      <div className="contract-toolbar panel">
        <span className="demo-badge">
          {t(
            "بيانات محلية تجريبية — لا توقيع ولا تحصيل",
            "Local demo data — no signing or collection",
          )}
        </span>
        <label>
          {t("اختبار الدور", "Test role")}
          <select value={actorId} onChange={(e) => setActor(e.target.value)}>
            {data.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.role}
              </option>
            ))}
          </select>
        </label>
      </div>
    ),
    notices = (
      <>
        {message && <div className="sales-notice">{message}</div>}
        {error && <div className="sales-error">{error}</div>}
      </>
    );
  if (mode === "dashboard") {
    const rows = repo.listContracts(org, actorId, { pageSize: 100 }).rows,
      wos = repo.listWorkOrders(org, actorId, { pageSize: 100 }).rows,
      total = rows.reduce((s, x) => s + x.contract.valueMinor, 0n);
    return (
      <div className="contract-page">
        {toolbar}
        {notices}
        <div className="contract-kpis">
          <article>
            <FilePenLine />
            <span>{t("إجمالي العقود", "Total contracts")}</span>
            <strong>{rows.length}</strong>
          </article>
          <article>
            <WalletCards />
            <span>{t("قيمة العقود النشطة", "Active contract value")}</span>
            <strong>
              {formatContractMoney(
                total,
                "SAR",
                locale === "ar" ? "ar-SA" : "en-US",
              )}
            </strong>
          </article>
          <article>
            <ShieldCheck />
            <span>{t("قيد المراجعة", "Under review")}</span>
            <strong>
              {rows.filter((x) => x.version.status === "under_review").length}
            </strong>
          </article>
          <article>
            <TimerReset />
            <span>{t("أوامر العمل المفتوحة", "Open work orders")}</span>
            <strong>
              {
                wos.filter(
                  (x) => !["completed", "cancelled"].includes(x.status),
                ).length
              }
            </strong>
          </article>
        </div>
        <div className="contract-grid">
          <section className="panel contract-card">
            <h2>{t("حالة العقود", "Contract status")}</h2>
            {[
              "draft",
              "under_review",
              "approved",
              "active",
              "suspended",
              "completed",
            ].map((s) => (
              <div className="metric-row" key={s}>
                {status(s)}
                <b>{rows.filter((x) => x.version.status === s).length}</b>
              </div>
            ))}
          </section>
          <section className="panel contract-card">
            <h2>{t("إجراءات سريعة", "Quick actions")}</h2>
            <div className="contract-actions">
              <Link
                className="primary-button small"
                href="/dashboard/contracts/new"
              >
                <Plus />
                {t("عقد من عرض مؤهل", "Contract from eligible quote")}
              </Link>
              <Link
                className="secondary-button"
                href="/dashboard/work-orders/new"
              >
                <ClipboardCheck />
                {t("أمر عمل", "Work order")}
              </Link>
              <Link
                className="secondary-button"
                href="/dashboard/contracts/calendar"
              >
                <CalendarDays />
                {t("التقويم", "Calendar")}
              </Link>
            </div>
          </section>
        </div>
        <ContractTable rows={rows} status={status} locale={locale} />
      </div>
    );
  }
  if (mode === "list") {
    const f: ContractFilters = {
        query: search.get("q") || undefined,
        status: (search.get("status") || undefined) as
          | ContractStatus
          | undefined,
        page: Number(search.get("page") || 1),
        pageSize: 10,
        sort: (search.get("sort") || "newest") as ContractFilters["sort"],
      },
      page = repo.listContracts(org, actorId, f);
    return (
      <div className="contract-page">
        {toolbar}
        {notices}
        <form
          className="contract-filters"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget),
              p = new URLSearchParams();
            for (const k of ["q", "status", "sort"]) {
              const v = String(fd.get(k) || "");
              if (v) p.set(k, v);
            }
            router.push(`/dashboard/contracts/list?${p}`);
          }}
        >
          <input
            name="q"
            defaultValue={f.query}
            placeholder={t(
              "رقم العقد، العميل، العرض، الجوال...",
              "Contract, customer, quote, mobile...",
            )}
          />
          <select name="status" defaultValue={f.status || ""}>
            <option value="">{t("كل الحالات", "All statuses")}</option>
            {[
              "draft",
              "under_review",
              "approved",
              "active",
              "suspended",
              "completed",
              "terminated",
              "expired",
            ].map((s) => (
              <option key={s} value={s}>
                {ar[s] ?? s}
              </option>
            ))}
          </select>
          <select name="sort" defaultValue={f.sort}>
            <option value="newest">{t("الأحدث", "Newest")}</option>
            <option value="value">{t("القيمة", "Value")}</option>
            <option value="end_date">{t("تاريخ النهاية", "End date")}</option>
          </select>
          <button className="secondary-button">{t("تطبيق", "Apply")}</button>
          <Link className="secondary-button" href="/dashboard/contracts/list">
            {t("إعادة ضبط", "Reset")}
          </Link>
        </form>
        <div className="table-tools">
          <span>
            {page.total} {t("نتيجة", "results")}
          </span>
          {can("contracts.export") && (
            <button
              className="secondary-button"
              onClick={() =>
                download("contracts.csv", repo.exportContracts(org, actorId, f))
              }
            >
              <Download />
              {t("CSV آمن", "Safe CSV")}
            </button>
          )}
        </div>
        {page.rows.length ? (
          <ContractTable rows={page.rows} status={status} locale={locale} />
        ) : (
          <Empty text={t("لا توجد عقود مطابقة", "No matching contracts")} />
        )}
        <Pagination page={page.page} pages={page.pages} />
      </div>
    );
  }
  if (mode === "new") {
    const eligible = data.sourceQuotations.filter(
      (q) => !data.contracts.some((c) => c.quotationVersionId === q.id),
    );
    return (
      <div className="contract-page">
        {toolbar}
        {notices}
        <section className="panel contract-form">
          <h2>
            {t("إنشاء عقد من عرض مؤهل", "Create from eligible quotation")}
          </h2>
          {eligible.length ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                act(
                  () => {
                    const v = repo.createFromQuotation({
                      organizationId: org,
                      actorId,
                      quotationVersionId: String(f.get("quote")),
                      ownerId: String(f.get("owner")),
                      department: String(f.get("department")),
                      type: String(f.get("type")),
                      startDate: String(f.get("start")),
                      endDate: String(f.get("end")),
                      language: String(f.get("language")) as
                        | "ar"
                        | "en"
                        | "bilingual",
                      idempotencyKey: `ui:${String(f.get("quote"))}`,
                    });
                    router.push(`/dashboard/contracts/${v.contractId}`);
                  },
                  t(
                    "تم إنشاء المسودة من Snapshot العرض",
                    "Draft created from quotation snapshot",
                  ),
                );
              }}
            >
              <label>
                {t("عرض السعر", "Quotation")}
                <select name="quote">
                  {eligible.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quotationNumber} — {q.customerName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field-grid">
                <label>
                  {t("المسؤول", "Owner")}
                  <select name="owner">
                    {data.users
                      .filter((u) => u.role !== "marketing")
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  {t("القسم", "Department")}
                  <input name="department" defaultValue="التنفيذ" required />
                </label>
                <label>
                  {t("نوع العقد", "Contract type")}
                  <input name="type" defaultValue="خدمات هندسية" required />
                </label>
                <label>
                  {t("اللغة", "Language")}
                  <select name="language">
                    <option value="bilingual">عربي / English</option>
                    <option value="ar">العربية</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label>
                  {t("البداية", "Start")}
                  <input
                    type="date"
                    name="start"
                    defaultValue="2026-08-15"
                    required
                  />
                </label>
                <label>
                  {t("النهاية", "End")}
                  <input
                    type="date"
                    name="end"
                    defaultValue="2026-10-15"
                    required
                  />
                </label>
              </div>
              <button className="primary-button small">
                <FilePlus2 />
                {t("إنشاء مسودة", "Create draft")}
              </button>
            </form>
          ) : (
            <Empty
              text={t(
                "لا توجد عروض مؤهلة غير محولة",
                "No unconverted eligible quotations",
              )}
            />
          )}
        </section>
      </div>
    );
  }
  const contract = data.contracts.find((x) => x.id === id),
    version = contract
      ? data.versions.find((x) => x.id === contract.currentVersionId)
      : undefined;
  if (
    mode === "detail" ||
    mode === "edit" ||
    mode === "change-orders" ||
    mode === "preview"
  ) {
    if (!contract || !version)
      return (
        <Empty
          text={t(
            "العقد غير موجود أو غير مصرح به",
            "Contract not found or inaccessible",
          )}
        />
      );
    if (mode === "preview")
      return (
        <ContractPaper contract={contract} version={version} locale={locale} />
      );
    if (mode === "edit")
      return (
        <div className="contract-page">
          {toolbar}
          {notices}
          <section className="panel contract-form">
            <h2>
              {t("محرر العقد", "Contract editor")} — {version.displayNumber}
            </h2>
            <p>
              {t(
                "الحفظ محمي بـ Version Check. العقد المعتمد أو النشط للقراءة فقط.",
                "Saving uses version checks. Approved or active contracts are read-only.",
              )}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                act(
                  () =>
                    repo.updateDraft({
                      organizationId: org,
                      actorId,
                      versionId: version.id,
                      expectedVersion: version.recordVersion,
                      title: String(f.get("title")),
                      scope: String(f.get("scope")),
                      terms: String(f.get("terms")),
                    }),
                  t("تم حفظ الإصدار", "Version saved"),
                );
              }}
            >
              <label>
                {t("العنوان", "Title")}
                <input name="title" defaultValue={version.snapshot.title} />
              </label>
              <label>
                {t("النطاق", "Scope")}
                <textarea name="scope" defaultValue={version.snapshot.scope} />
              </label>
              <label>
                {t("الشروط", "Terms")}
                <textarea name="terms" defaultValue={version.snapshot.terms} />
              </label>
              <button
                disabled={
                  !["draft", "changes_requested"].includes(version.status)
                }
                className="primary-button small"
              >
                {t("حفظ صريح", "Save")}
              </button>
            </form>
          </section>
        </div>
      );
    if (mode === "change-orders") {
      const rows = data.changeOrders.filter(
        (x) => x.contractId === contract.id,
      );
      return (
        <div className="contract-page">
          {toolbar}
          {notices}
          {can("change_orders.create") && (
            <section className="panel contract-form">
              <h2>{t("أمر تغييري جديد", "New change order")}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  act(
                    () =>
                      repo.createChangeOrder({
                        organizationId: org,
                        actorId,
                        contractId: contract.id,
                        type: String(f.get("type")),
                        reason: String(f.get("reason")),
                        description: String(f.get("description")),
                        valueImpactMinor: BigInt(String(f.get("value") || 0)),
                        durationImpactDays: Number(f.get("days") || 0),
                      }),
                    t("تم إنشاء الأمر التغييري", "Change order created"),
                  );
                }}
              >
                <div className="field-grid">
                  <label>
                    {t("النوع", "Type")}
                    <input name="type" defaultValue="نطاق" />
                  </label>
                  <label>
                    {t(
                      "أثر القيمة بالوحدة الصغرى",
                      "Value impact in minor units",
                    )}
                    <input type="number" name="value" defaultValue="0" />
                  </label>
                  <label>
                    {t("أثر المدة بالأيام", "Duration impact days")}
                    <input type="number" name="days" defaultValue="0" />
                  </label>
                </div>
                <label>
                  {t("السبب", "Reason")}
                  <input name="reason" required />
                </label>
                <label>
                  {t("الوصف", "Description")}
                  <textarea name="description" required />
                </label>
                <button className="primary-button small">
                  {t("إنشاء مسودة", "Create draft")}
                </button>
              </form>
            </section>
          )}
          <section className="panel contract-card">
            <h2>{t("أوامر التغيير", "Change orders")}</h2>
            {rows.length ? (
              rows.map((co) => (
                <div className="change-row" key={co.id}>
                  <div>
                    <strong>{co.number}</strong>
                    <small>{co.reason}</small>
                  </div>
                  {status(co.status)}
                  <span>
                    {formatContractMoney(co.valueImpactMinor, co.currency)}
                  </span>
                  <div className="row-actions">
                    {co.status === "draft" && (
                      <button
                        onClick={() =>
                          act(
                            () =>
                              repo.transitionChangeOrder({
                                organizationId: org,
                                actorId,
                                changeOrderId: co.id,
                                to: "under_review",
                              }),
                            "Submitted",
                          )
                        }
                      >
                        {t("إرسال", "Submit")}
                      </button>
                    )}
                    {co.status === "under_review" &&
                      can("change_orders.approve") && (
                        <button
                          onClick={() =>
                            act(
                              () =>
                                repo.transitionChangeOrder({
                                  organizationId: org,
                                  actorId,
                                  changeOrderId: co.id,
                                  to: "approved",
                                }),
                              "Approved",
                            )
                          }
                        >
                          {t("اعتماد", "Approve")}
                        </button>
                      )}
                    {co.status === "approved" &&
                      can("change_orders.approve") && (
                        <button
                          onClick={() =>
                            act(
                              () =>
                                repo.transitionChangeOrder({
                                  organizationId: org,
                                  actorId,
                                  changeOrderId: co.id,
                                  to: "applied",
                                }),
                              "Applied",
                            )
                          }
                        >
                          {t("تطبيق مرة واحدة", "Apply once")}
                        </button>
                      )}
                  </div>
                </div>
              ))
            ) : (
              <Empty text={t("لا توجد أوامر تغيير", "No change orders")} />
            )}
          </section>
        </div>
      );
    }
    const versions = data.versions
        .filter((x) => x.contractId === contract.id)
        .sort((a, b) => b.versionNumber - a.versionNumber),
      wos = data.workOrders.filter((x) => x.contractId === contract.id),
      events = data.timeline.filter((x) => x.contractId === contract.id);
    return (
      <div className="contract-page">
        {toolbar}
        {notices}
        <section className="panel contract-hero">
          <div>
            <small>{contract.number}</small>
            <h2>{version.snapshot.title}</h2>
            <p>
              {version.snapshot.customerName} ·{" "}
              {version.snapshot.quotationNumber}
            </p>
          </div>
          <div>
            {status(version.status)}
            <strong>
              {formatContractMoney(contract.valueMinor, contract.currency)}
            </strong>
          </div>
        </section>
        <nav className="contract-tabs">
          <a href="#scope">{t("النطاق", "Scope")}</a>
          <a href="#deliverables">{t("المخرجات", "Deliverables")}</a>
          <a href="#payments">{t("الدفعات", "Payments")}</a>
          <a href="#versions">{t("الإصدارات", "Versions")}</a>
          <a href="#timeline">Timeline</a>
        </nav>
        <div className="contract-actions">
          {can("contracts.update_draft") && (
            <Link
              className="secondary-button"
              href={`/dashboard/contracts/${contract.id}/edit`}
            >
              <FilePenLine />
              {t("تحرير", "Edit")}
            </Link>
          )}
          <Link
            className="secondary-button"
            href={`/dashboard/contracts/${contract.id}/preview`}
          >
            <Printer />
            {t("معاينة وطباعة", "Preview & print")}
          </Link>
          <Link
            className="secondary-button"
            href={`/dashboard/contracts/${contract.id}/change-orders`}
          >
            {t("أوامر التغيير", "Change orders")}
          </Link>
          {["draft", "changes_requested"].includes(version.status) &&
            can("contracts.submit_for_approval") && (
              <button
                className="primary-button small"
                onClick={() =>
                  act(
                    () => repo.submitForApproval(org, actorId, version.id),
                    t("أرسل للمراجعة", "Submitted for review"),
                  )
                }
              >
                {t("إرسال للمراجعة", "Submit")}
              </button>
            )}
          {version.status === "approved" && can("contracts.activate") && (
            <button
              className="primary-button small"
              onClick={() =>
                act(
                  () =>
                    repo.transitionContract({
                      organizationId: org,
                      actorId,
                      versionId: version.id,
                      to: "active",
                    }),
                  t("تم التفعيل", "Activated"),
                )
              }
            >
              {t("تفعيل", "Activate")}
            </button>
          )}
          {version.status === "active" && can("contracts.suspend") && (
            <button
              className="secondary-button"
              onClick={() =>
                act(
                  () =>
                    repo.transitionContract({
                      organizationId: org,
                      actorId,
                      versionId: version.id,
                      to: "suspended",
                      reason: "تعليق تشغيلي موثق",
                    }),
                  t("تم التعليق", "Suspended"),
                )
              }
            >
              {t("تعليق", "Suspend")}
            </button>
          )}
          {["approved", "active", "suspended"].includes(version.status) &&
            can("contracts.create_revision") && (
              <button
                className="secondary-button"
                onClick={() =>
                  act(
                    () =>
                      repo.createRevision({
                        organizationId: org,
                        actorId,
                        contractId: contract.id,
                        reason: "تحديث بنود العقد",
                        comparison:
                          "إصدار جديد للمراجعة؛ السابق لا يتغير حتى الاعتماد",
                      }),
                    t("تم إنشاء إصدار مسودة", "Draft revision created"),
                  )
                }
              >
                <RefreshCw />
                {t("إصدار جديد", "New revision")}
              </button>
            )}
        </div>
        <section id="scope" className="panel contract-card">
          <h2>{t("النطاق والبنود", "Scope and terms")}</h2>
          <p>{version.snapshot.scope}</p>
          <div className="line-items">
            {version.snapshot.lineItems.map((x) => (
              <div key={x.id}>
                <span>{x.description}</span>
                <b>
                  {x.quantityMills.toString()} {x.unit}
                </b>
              </div>
            ))}
          </div>
        </section>
        <section id="deliverables" className="panel contract-card">
          <h2>{t("المخرجات وأوامر العمل", "Deliverables and work orders")}</h2>
          {version.snapshot.deliverables.map((x) => (
            <div className="metric-row" key={x.id}>
              <span>
                {x.title}
                <small>{x.dueDate}</small>
              </span>
              {status(x.status)}
            </div>
          ))}
          {wos.map((x) => (
            <Link
              className="metric-row"
              key={x.id}
              href={`/dashboard/work-orders/${x.id}`}
            >
              <span>
                {x.number} — {x.title}
              </span>
              {status(x.status)}
            </Link>
          ))}
        </section>
        <section id="payments" className="panel contract-card">
          <h2>
            {t(
              "جدول الدفعات — لا توجد فواتير أو تحصيل",
              "Payment schedule — no invoicing or collection",
            )}
          </h2>
          {version.snapshot.paymentSchedule.map((x) => (
            <div className="payment-row" key={x.id}>
              <span>{x.label}</span>
              <b>{x.percentageBps / 100}%</b>
              <strong>
                {formatContractMoney(x.amountMinor, version.snapshot.currency)}
              </strong>
              {status(x.status)}
            </div>
          ))}
        </section>
        <section id="versions" className="panel contract-card">
          <h2>{t("الإصدارات والموافقات", "Versions and approvals")}</h2>
          {versions.map((x) => (
            <div className="metric-row" key={x.id}>
              <span>
                {x.displayNumber}
                <small>{x.reason}</small>
              </span>
              {status(x.status)}
            </div>
          ))}
        </section>
        <section id="timeline" className="panel contract-card">
          <h2>Timeline & Audit Summary</h2>
          {events.map((x) => (
            <div className="timeline-row" key={x.id}>
              <span>{x.summary}</span>
              <time>{x.createdAt.slice(0, 16).replace("T", " ")}</time>
            </div>
          ))}
        </section>
      </div>
    );
  }
  if (mode === "approvals") {
    const rows = data.approvals.filter((x) => x.status === "pending");
    return (
      <div className="contract-page">
        {toolbar}
        {notices}
        <section className="panel contract-card">
          <h2>{t("قائمة انتظار الموافقات", "Approval queue")}</h2>
          {rows.length ? (
            rows.map((a) => {
              const v = data.versions.find((x) => x.id === a.contractVersionId);
              return (
                <div className="approval-row" key={a.id}>
                  <div>
                    <strong>{v?.displayNumber}</strong>
                    <small>{v?.snapshot.title}</small>
                  </div>
                  {status(a.status)}
                  {can("contracts.approve") && (
                    <div>
                      <button
                        onClick={() =>
                          act(
                            () =>
                              repo.decideApproval({
                                organizationId: org,
                                actorId,
                                approvalId: a.id,
                                decision: "approved",
                                comment: "Reviewed and approved",
                              }),
                            "Approved",
                          )
                        }
                      >
                        {t("اعتماد", "Approve")}
                      </button>
                      <button
                        onClick={() =>
                          act(
                            () =>
                              repo.decideApproval({
                                organizationId: org,
                                actorId,
                                approvalId: a.id,
                                decision: "changes_requested",
                                comment: "يرجى مراجعة البنود",
                              }),
                            "Changes requested",
                          )
                        }
                      >
                        {t("طلب تعديل", "Request changes")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <Empty text={t("لا توجد موافقات معلقة", "No pending approvals")} />
          )}
        </section>
      </div>
    );
  }
  if (mode === "work-orders") {
    const f: WorkOrderFilters = {
        query: search.get("q") || undefined,
        status: (search.get("status") || undefined) as
          | WorkOrderStatus
          | undefined,
        page: 1,
        pageSize: 20,
      },
      page = repo.listWorkOrders(org, actorId, f);
    return (
      <div className="contract-page">
        {toolbar}
        {notices}
        <form
          className="contract-filters"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget),
              p = new URLSearchParams();
            for (const k of ["q", "status"]) {
              const v = String(fd.get(k) || "");
              if (v) p.set(k, v);
            }
            router.push(`/dashboard/work-orders?${p}`);
          }}
        >
          <input
            name="q"
            defaultValue={f.query}
            placeholder={t("بحث في أوامر العمل", "Search work orders")}
          />
          <select name="status" defaultValue={f.status || ""}>
            <option value="">{t("كل الحالات", "All statuses")}</option>
            {[
              "draft",
              "planned",
              "ready",
              "in_progress",
              "on_hold",
              "completed",
              "reopened",
            ].map((s) => (
              <option key={s} value={s}>
                {ar[s]}
              </option>
            ))}
          </select>
          <button className="secondary-button">{t("تطبيق", "Apply")}</button>
        </form>
        <div className="table-tools">
          <span>{page.total}</span>
          {can("work_orders.export") && (
            <button
              className="secondary-button"
              onClick={() =>
                download(
                  "work-orders.csv",
                  repo.exportWorkOrders(org, actorId, f),
                )
              }
            >
              <Download />
              CSV
            </button>
          )}
        </div>
        <WorkOrderTable rows={page.rows} status={status} />
      </div>
    );
  }
  if (mode === "new-work-order")
    return (
      <div className="contract-page">
        {toolbar}
        {notices}
        <section className="panel contract-form">
          <h2>{t("إنشاء أمر عمل", "Create work order")}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              act(
                () => {
                  const wo = repo.createWorkOrder({
                    organizationId: org,
                    actorId,
                    contractId: String(f.get("contract")),
                    title: String(f.get("title")),
                    description: String(f.get("description")),
                    type: String(f.get("type")),
                    priority: String(f.get("priority")) as
                      | "low"
                      | "medium"
                      | "high"
                      | "urgent",
                    department: String(f.get("department")),
                    ownerId: String(f.get("owner")),
                    startDate: String(f.get("start")),
                    dueDate: String(f.get("due")),
                    checklist: [
                      { title: "مراجعة المدخلات", mandatory: true },
                      { title: "اعتماد الجودة", mandatory: true },
                    ],
                  });
                  router.push(`/dashboard/work-orders/${wo.id}`);
                },
                t("تم إنشاء أمر العمل", "Work order created"),
              );
            }}
          >
            <label>
              {t("العقد النشط", "Active contract")}
              <select name="contract">
                {data.contracts
                  .filter(
                    (c) =>
                      data.versions.find((v) => v.id === c.currentVersionId)
                        ?.status === "active",
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.number}
                    </option>
                  ))}
              </select>
            </label>
            <div className="field-grid">
              <label>
                {t("العنوان", "Title")}
                <input name="title" required />
              </label>
              <label>
                {t("النوع", "Type")}
                <input name="type" defaultValue="تنفيذ" />
              </label>
              <label>
                {t("الأولوية", "Priority")}
                <select name="priority">
                  <option value="medium">{ar.medium}</option>
                  <option value="high">{ar.high}</option>
                  <option value="urgent">{ar.urgent}</option>
                </select>
              </label>
              <label>
                {t("القسم", "Department")}
                <input name="department" defaultValue="التنفيذ" />
              </label>
              <label>
                {t("المسؤول", "Owner")}
                <select name="owner">
                  {data.users
                    .filter((u) => u.permissions.includes("work_orders.view"))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                {t("البداية", "Start")}
                <input name="start" type="date" defaultValue="2026-08-10" />
              </label>
              <label>
                {t("الاستحقاق", "Due")}
                <input name="due" type="date" defaultValue="2026-08-30" />
              </label>
            </div>
            <label>
              {t("الوصف", "Description")}
              <textarea name="description" required />
            </label>
            <button className="primary-button small">
              {t("إنشاء", "Create")}
            </button>
          </form>
        </section>
      </div>
    );
  if (mode === "work-order-detail") {
    const wo = data.workOrders.find((x) => x.id === id);
    if (!wo)
      return <Empty text={t("أمر العمل غير موجود", "Work order not found")} />;
    return (
      <div className="contract-page">
        {toolbar}
        {notices}
        <section className="panel contract-hero">
          <div>
            <small>{wo.number}</small>
            <h2>{wo.title}</h2>
            <p>{wo.description}</p>
          </div>
          <div>
            {status(wo.status)}
            <strong>{wo.progress}%</strong>
          </div>
        </section>
        <section className="panel contract-card">
          <h2>{t("قائمة التحقق", "Checklist")}</h2>
          {wo.checklist.map((item) => (
            <label className="check-row" key={item.id}>
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() =>
                  act(
                    () =>
                      repo.updateWorkOrder({
                        organizationId: org,
                        actorId,
                        workOrderId: wo.id,
                        expectedVersion: wo.recordVersion,
                        checklist: wo.checklist.map((x) =>
                          x.id === item.id
                            ? { ...x, completed: !x.completed }
                            : x,
                        ),
                      }),
                    t("تم تحديث القائمة", "Checklist updated"),
                  )
                }
              />
              <span>
                {item.title}
                {item.mandatory && <small>{t("إلزامي", "Required")}</small>}
              </span>
            </label>
          ))}
        </section>
        <div className="contract-actions">
          {wo.status === "draft" && (
            <button
              onClick={() =>
                act(
                  () =>
                    repo.transitionWorkOrder({
                      organizationId: org,
                      actorId,
                      workOrderId: wo.id,
                      to: "planned",
                    }),
                  "Planned",
                )
              }
            >
              {t("تخطيط", "Plan")}
            </button>
          )}
          {wo.status === "planned" && (
            <button
              onClick={() =>
                act(
                  () =>
                    repo.transitionWorkOrder({
                      organizationId: org,
                      actorId,
                      workOrderId: wo.id,
                      to: "ready",
                    }),
                  "Ready",
                )
              }
            >
              {t("جاهز", "Ready")}
            </button>
          )}
          {["ready", "reopened"].includes(wo.status) && (
            <button
              onClick={() =>
                act(
                  () =>
                    repo.transitionWorkOrder({
                      organizationId: org,
                      actorId,
                      workOrderId: wo.id,
                      to: "in_progress",
                    }),
                  "Started",
                )
              }
            >
              {t("بدء", "Start")}
            </button>
          )}
          {["in_progress", "reopened"].includes(wo.status) && (
            <button
              onClick={() =>
                act(
                  () =>
                    repo.transitionWorkOrder({
                      organizationId: org,
                      actorId,
                      workOrderId: wo.id,
                      to: "completed",
                    }),
                  "Completed",
                )
              }
            >
              {t("إكمال", "Complete")}
            </button>
          )}
          {wo.status === "completed" &&
            can("work_orders.approve_closure") &&
            !wo.closureApprovedAt && (
              <button
                onClick={() =>
                  act(
                    () => repo.approveClosure(org, actorId, wo.id),
                    "Closure approved",
                  )
                }
              >
                {t("اعتماد الإغلاق", "Approve closure")}
              </button>
            )}
          {wo.status === "completed" && can("work_orders.reopen") && (
            <button
              onClick={() =>
                act(
                  () =>
                    repo.transitionWorkOrder({
                      organizationId: org,
                      actorId,
                      workOrderId: wo.id,
                      to: "reopened",
                      reason: "إعادة فتح موثقة",
                    }),
                  "Reopened",
                )
              }
            >
              {t("إعادة فتح", "Reopen")}
            </button>
          )}
        </div>
      </div>
    );
  }
  if (mode === "calendar") {
    const dates = [
      ...data.contracts.map((c) => ({
        date: c.endDate,
        title: `${c.number} — ${t("نهاية العقد", "Contract end")}`,
      })),
      ...data.workOrders.map((w) => ({
        date: w.dueDate,
        title: `${w.number} — ${w.title}`,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    return (
      <div className="contract-page">
        {toolbar}
        <section className="panel calendar-list">
          <h2>{t("الاستحقاقات القادمة", "Upcoming due dates")}</h2>
          {dates.map((x, i) => (
            <div key={`${x.title}-${i}`}>
              <time>{x.date}</time>
              <span>{x.title}</span>
            </div>
          ))}
        </section>
      </div>
    );
  }
  return null;
}
function ContractTable({
  rows,
  status,
  locale,
}: {
  rows: ReturnType<
    ReturnType<typeof getContractDemoRepository>["listContracts"]
  >["rows"];
  status: (s: string) => React.ReactNode;
  locale: string;
}) {
  return (
    <section className="panel responsive-table">
      <table>
        <thead>
          <tr>
            <th>{locale === "ar" ? "العقد" : "Contract"}</th>
            <th>{locale === "ar" ? "العميل" : "Customer"}</th>
            <th>{locale === "ar" ? "الحالة" : "Status"}</th>
            <th>{locale === "ar" ? "القيمة" : "Value"}</th>
            <th>{locale === "ar" ? "النهاية" : "End"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ contract, version }) => (
            <tr key={contract.id}>
              <td>
                <Link href={`/dashboard/contracts/${contract.id}`}>
                  <strong>{contract.number}</strong>
                  <small>{version.snapshot.title}</small>
                </Link>
              </td>
              <td>{version.snapshot.customerName}</td>
              <td>{status(version.status)}</td>
              <td>
                {formatContractMoney(contract.valueMinor, contract.currency)}
              </td>
              <td>{contract.endDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
function WorkOrderTable({
  rows,
  status,
}: {
  rows: ReturnType<
    ReturnType<typeof getContractDemoRepository>["listWorkOrders"]
  >["rows"];
  status: (s: string) => React.ReactNode;
}) {
  return (
    <section className="panel responsive-table">
      <table>
        <thead>
          <tr>
            <th>Work Order</th>
            <th>Contract</th>
            <th>Owner</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Due</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => (
            <tr key={w.id}>
              <td>
                <Link href={`/dashboard/work-orders/${w.id}`}>
                  <strong>{w.number}</strong>
                  <small>{w.title}</small>
                </Link>
              </td>
              <td>{w.contractId}</td>
              <td>{w.ownerId}</td>
              <td>{status(w.priority)}</td>
              <td>{status(w.status)}</td>
              <td>{w.dueDate}</td>
              <td>{w.progress}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
function Pagination({ page, pages }: { page: number; pages: number }) {
  return (
    <div className="pagination">
      <span>
        {page} / {pages}
      </span>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="panel sales-empty">
      <ClipboardCheck />
      <p>{text}</p>
    </div>
  );
}
function ContractPaper({
  contract,
  version,
  locale,
}: {
  contract: Contract;
  version: ContractVersion;
  locale: string;
}) {
  return (
    <div className="contract-preview">
      <div className="preview-toolbar">
        <Link href={`/dashboard/contracts/${contract.id}`}>Back</Link>
        <button onClick={() => window.print()}>
          <Printer />
          Print / Save PDF
        </button>
      </div>
      <article className={`contract-paper ${locale === "ar" ? "rtl" : "ltr"}`}>
        <div className="draft-watermark">
          {version.status === "draft" ? "DRAFT" : `V${version.versionNumber}`}
        </div>
        <header>
          <div className="contract-logo">M</div>
          <div>
            <strong>شركة مدار التجريبية</strong>
            <small>Madar Demo Company</small>
          </div>
          <div>
            <h1>{locale === "ar" ? "عقد خدمات" : "Service Contract"}</h1>
            <b>{version.displayNumber}</b>
          </div>
        </header>
        <section className="paper-meta">
          <div>
            <small>{locale === "ar" ? "العميل" : "Customer"}</small>
            <strong>{version.snapshot.customerName}</strong>
          </div>
          <div>
            <small>{locale === "ar" ? "مرجع العرض" : "Quotation"}</small>
            <strong>{version.snapshot.quotationNumber}</strong>
          </div>
          <div>
            <small>{locale === "ar" ? "المدة" : "Duration"}</small>
            <strong>{version.snapshot.duration}</strong>
          </div>
          <div>
            <small>{locale === "ar" ? "القيمة" : "Value"}</small>
            <strong>
              {formatContractMoney(
                version.snapshot.valueMinor,
                version.snapshot.currency,
              )}
            </strong>
          </div>
        </section>
        <h2>{version.snapshot.title}</h2>
        <section>
          <h3>{locale === "ar" ? "نطاق العمل" : "Scope of Work"}</h3>
          <p>{version.snapshot.scope}</p>
        </section>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{locale === "ar" ? "البند" : "Item"}</th>
              <th>{locale === "ar" ? "الكمية" : "Qty"}</th>
            </tr>
          </thead>
          <tbody>
            {version.snapshot.lineItems.map((x, i) => (
              <tr key={x.id}>
                <td>{i + 1}</td>
                <td>{x.description}</td>
                <td>
                  {x.quantityMills.toString()} {x.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <section>
          <h3>{locale === "ar" ? "جدول الدفعات" : "Payment Schedule"}</h3>
          {version.snapshot.paymentSchedule.map((p) => (
            <div className="paper-payment" key={p.id}>
              <span>{p.label}</span>
              <b>{p.percentageBps / 100}%</b>
              <strong>
                {formatContractMoney(p.amountMinor, version.snapshot.currency)}
              </strong>
            </div>
          ))}
        </section>
        <section>
          <h3>{locale === "ar" ? "الشروط" : "Terms"}</h3>
          <p>{version.snapshot.terms}</p>
        </section>
        <footer>
          <div>
            {locale === "ar"
              ? "توقيع الشركة (مكان مخصص)"
              : "Company signature placeholder"}
          </div>
          <div>
            {locale === "ar"
              ? "توقيع العميل (مكان مخصص)"
              : "Customer signature placeholder"}
          </div>
          <p>
            {locale === "ar"
              ? "هذه معاينة تجريبية وليست توقيعًا إلكترونيًا أو عقدًا موقعًا قانونيًا."
              : "Demo preview; not an electronic signature or legally signed contract."}
          </p>
        </footer>
      </article>
    </div>
  );
}
