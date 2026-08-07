"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  Download,
  FilePlus2,
  History,
  Printer,
  ReceiptText,
  RefreshCw,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useLocale } from "@/components/locale-runtime";
import { calculateInvoice, formatMoney } from "@/lib/billing/calculations";
import { getBillingDemoRepository } from "@/lib/billing/provider";
import { BillingError } from "@/lib/billing/repository";
import type { InvoiceFilters } from "@/lib/billing/types";
type Mode =
  | "dashboard"
  | "readiness"
  | "invoices"
  | "new"
  | "detail"
  | "approvals"
  | "receipts"
  | "allocations"
  | "adjustments"
  | "aging"
  | "statement"
  | "collections"
  | "settings"
  | "preview";
const org = "org-madar-demo",
  labels: Record<string, string> = {
    draft: "مسودة",
    under_review: "قيد المراجعة",
    changes_requested: "تعديلات مطلوبة",
    approved: "معتمدة",
    issued: "صادرة داخليًا",
    voided: "ملغاة",
    unpaid: "غير مسددة",
    partially_paid: "مسددة جزئيًا",
    paid: "مسددة",
    overpaid_adjustment: "رصيد دائن بتعديل",
    pending_confirmation: "بانتظار التأكيد",
    confirmed_internal: "مؤكد داخليًا",
    reversed: "معكوس",
    not_due: "غير مستحق",
    "1_30": "1–30 يومًا",
    "31_60": "31–60 يومًا",
    "61_90": "61–90 يومًا",
    over_90: "أكثر من 90 يومًا",
    promise_to_pay: "وعد بالسداد",
    contacted: "تم التواصل",
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
export function BillingWorkspace({ mode, id }: { mode: Mode; id?: string }) {
  const locale = useLocale(),
    router = useRouter(),
    params = useSearchParams(),
    repo = getBillingDemoRepository(),
    [actorId, setActor] = useState("u-owner"),
    [, redraw] = useState(0),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const data = repo.snapshot(org, "u-owner"),
    actor = data.users.find((x) => x.id === actorId)!,
    can = (p: string) => actor.permissions.includes(p),
    t = (a: string, e: string) => (locale === "ar" ? a : e),
    status = (s: string) => (
      <span className={`billing-status ${s}`}>
        {locale === "ar" ? (labels[s] ?? s) : s.replaceAll("_", " ")}
      </span>
    );
  const act = (fn: () => unknown, ok: string) => {
    try {
      fn();
      redraw((x) => x + 1);
      setMessage(ok);
      setError("");
    } catch (e) {
      setMessage("");
      setError(
        e instanceof BillingError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Unknown error",
      );
    }
  };
  const toolbar = (
    <div className="billing-toolbar panel">
      <span className="demo-badge">
        {t(
          "وضع محلي تجريبي — لا ZATCA ولا بنك ولا إرسال خارجي",
          "Local demo — no ZATCA, bank, or external delivery",
        )}
      </span>
      <label>
        {t("اختبار الدور", "Test role")}
        <select value={actorId} onChange={(e) => setActor(e.target.value)}>
          {data.users
            .filter((u) => u.organizationId === org)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.role}
              </option>
            ))}
        </select>
      </label>
    </div>
  );
  const notices = (
    <>
      {message && <div className="sales-notice">{message}</div>}
      {error && <div className="sales-error">{error}</div>}
      {!can("billing.dashboard.view") && (
        <div className="sales-error">
          {t(
            "هذا الدور لا يملك صلاحية لوحة الفوترة.",
            "This role cannot access billing.",
          )}
        </div>
      )}
    </>
  );
  const subnav = (
    <nav className="billing-subnav panel">
      <Link href="/dashboard/billing">لوحة الفوترة</Link>
      <Link href="/dashboard/billing/readiness">الجاهزية</Link>
      <Link href="/dashboard/billing/invoices">الفواتير</Link>
      <Link href="/dashboard/billing/approvals">الموافقات</Link>
      <Link href="/dashboard/billing/receipts">سندات القبض</Link>
      <Link href="/dashboard/billing/allocations">التوزيع</Link>
      <Link href="/dashboard/billing/adjustments">الخصم والإضافة</Link>
      <Link href="/dashboard/billing/aging">أعمار الديون</Link>
      <Link href="/dashboard/billing/statements">كشف العميل</Link>
      <Link href="/dashboard/billing/collections">المتابعة</Link>
      <Link href="/dashboard/billing/settings">الإعدادات</Link>
    </nav>
  );
  const wrap = (body: React.ReactNode) => (
    <div className="billing-page">
      {toolbar}
      {subnav}
      {notices}
      {body}
    </div>
  );
  if (mode === "dashboard") {
    const issued = data.invoices.filter((i) => i.workflowStatus === "issued"),
      currencies = [...new Set(issued.map((i) => i.currency))];
    return wrap(
      <>
        {currencies.map((currency) => {
          const rows = issued.filter((i) => i.currency === currency),
            billed = rows.reduce(
              (s, i) => s + i.snapshot.totals.totalMinor,
              0n,
            ),
            collected = rows.reduce((s, i) => s + i.allocatedMinor, 0n),
            outstanding = rows.reduce((s, i) => s + i.openBalanceMinor, 0n);
          return (
            <section key={currency} className="billing-currency">
              <header>
                <h2>{currency}</h2>
                <small>
                  {t(
                    "الفترة حتى 7 أغسطس 2026 — بيانات فعلية من Local Adapter",
                    "Through 7 Aug 2026 — Local Adapter data",
                  )}
                </small>
              </header>
              <div className="billing-kpis">
                <article>
                  <ReceiptText />
                  <span>{t("إجمالي المفوتر", "Total billed")}</span>
                  <strong>{formatMoney(billed, currency)}</strong>
                  <small>Σ issued invoice totals</small>
                </article>
                <article>
                  <WalletCards />
                  <span>
                    {t("المحصل المؤكد والموزع", "Confirmed allocated")}
                  </span>
                  <strong>{formatMoney(collected, currency)}</strong>
                  <small>Σ active allocations</small>
                </article>
                <article>
                  <BadgeDollarSign />
                  <span>{t("الرصيد المستحق", "Outstanding")}</span>
                  <strong>{formatMoney(outstanding, currency)}</strong>
                  <small>invoice + debit − credit − allocations</small>
                </article>
                <article>
                  <CalendarClock />
                  <span>{t("المتأخر", "Overdue")}</span>
                  <strong>
                    {formatMoney(
                      rows
                        .filter((i) => i.snapshot.dueDate < "2026-08-07")
                        .reduce((s, i) => s + i.openBalanceMinor, 0n),
                      currency,
                    )}
                  </strong>
                  <small>open balance after due date</small>
                </article>
              </div>
            </section>
          );
        })}
        <div className="billing-grid">
          <section className="panel billing-card">
            <h2>{t("المفوتر مقابل المحصل", "Billed vs collected")}</h2>
            {issued.map((i) => (
              <div className="billing-bar" key={i.id}>
                <span>
                  {i.number}
                  <small>{i.snapshot.customerName}</small>
                </span>
                <i>
                  <b
                    style={{
                      width: `${Number((i.allocatedMinor * 100n) / i.snapshot.totals.totalMinor)}%`,
                    }}
                  />
                </i>
                <strong>{formatMoney(i.allocatedMinor, i.currency)}</strong>
              </div>
            ))}
          </section>
          <section className="panel billing-card">
            <h2>{t("تنبيهات تشغيلية", "Operational alerts")}</h2>
            <div className="metric-row">
              <span>{t("دفعات جاهزة للفوترة", "Ready to bill")}</span>
              <strong>{data.sources.filter((s) => s.eligible).length}</strong>
            </div>
            <div className="metric-row">
              <span>{t("تحصيلات غير موزعة", "Unallocated receipts")}</span>
              <strong>
                {
                  data.receipts.filter(
                    (r) =>
                      r.status === "confirmed_internal" &&
                      r.unallocatedMinor > 0n,
                  ).length
                }
              </strong>
            </div>
            <div className="metric-row">
              <span>{t("وعود سداد مفتوحة", "Open promises")}</span>
              <strong>
                {
                  data.followups.filter((f) => f.status === "promise_to_pay")
                    .length
                }
              </strong>
            </div>
          </section>
        </div>
      </>,
    );
  }
  if (mode === "readiness")
    return wrap(
      <section className="panel billing-card">
        <div className="detail-head">
          <div>
            <small>Contract → Invoice handover</small>
            <h2>{t("جاهزية الفوترة", "Billing readiness")}</h2>
          </div>
          <Link
            className="primary-button small"
            href="/dashboard/billing/invoices/new"
          >
            <FilePlus2 /> {t("إنشاء فاتورة", "Create invoice")}
          </Link>
        </div>
        <div className="table-wrap">
          <table className="billing-table">
            <thead>
              <tr>
                <th>{t("العقد/الدفعة", "Contract/payment")}</th>
                <th>{t("العميل", "Customer")}</th>
                <th>{t("المبلغ", "Amount")}</th>
                <th>{t("الاستحقاق", "Due")}</th>
                <th>{t("القرار", "Decision")}</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.contractNumber}</b>
                    <small>{s.label}</small>
                  </td>
                  <td>{s.customerName}</td>
                  <td>{formatMoney(s.amountMinor, s.currency)}</td>
                  <td>{s.dueDate}</td>
                  <td>
                    {s.eligible ? (
                      <span className="eligibility yes">
                        <CheckCircle2 /> {t("مؤهل", "Eligible")}
                      </span>
                    ) : (
                      <span className="eligibility no">
                        <AlertTriangle /> {s.reason}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>,
    );
  if (mode === "new")
    return wrap(
      <section className="panel billing-form">
        <h2>
          {t(
            "إنشاء فاتورة من دفعة عقد مؤهلة",
            "Create invoice from eligible contract payment",
          )}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            act(
              () => {
                const inv = repo.createInvoice({
                  organizationId: org,
                  actorId,
                  sourceId: String(fd.get("source")),
                  issueDate: String(fd.get("issueDate")),
                  dueDate: String(fd.get("dueDate")),
                  language: "bilingual",
                  idempotencyKey: crypto.randomUUID(),
                });
                router.push(`/dashboard/billing/invoices/${inv.id}`);
              },
              t(
                "تم إنشاء المسودة من Snapshot العقد",
                "Draft created from contract snapshot",
              ),
            );
          }}
        >
          <label>
            {t("الدفعة المؤهلة", "Eligible payment")}
            <select name="source" required>
              {data.sources
                .filter((s) => s.eligible)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.contractNumber} — {s.label} —{" "}
                    {formatMoney(s.amountMinor, s.currency)}
                  </option>
                ))}
            </select>
          </label>
          <div className="field-grid">
            <label>
              {t("تاريخ الإصدار المقترح", "Proposed issue date")}
              <input
                name="issueDate"
                type="date"
                defaultValue="2026-08-07"
                required
              />
            </label>
            <label>
              {t("تاريخ الاستحقاق", "Due date")}
              <input
                name="dueDate"
                type="date"
                defaultValue="2026-09-06"
                required
              />
            </label>
          </div>
          {can("invoices.create") ? (
            <button className="primary-button">
              <FilePlus2 /> {t("إنشاء مسودة", "Create draft")}
            </button>
          ) : (
            <p className="sales-error">Missing invoices.create</p>
          )}
        </form>
      </section>,
    );
  if (mode === "invoices") {
    const filters: InvoiceFilters = {
        query: params.get("q") ?? "",
        workflowStatus: (params.get("workflow") ||
          undefined) as InvoiceFilters["workflowStatus"],
        settlementStatus: (params.get("settlement") ||
          undefined) as InvoiceFilters["settlementStatus"],
      },
      result = repo.listInvoices(org, actorId, filters);
    return wrap(
      <>
        <form className="panel billing-filters">
          <input
            name="q"
            placeholder={t(
              "رقم، عميل، عقد، عرض...",
              "Number, customer, contract...",
            )}
            defaultValue={filters.query}
          />
          <select name="workflow" defaultValue={filters.workflowStatus ?? ""}>
            <option value="">Workflow</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
          </select>
          <select
            name="settlement"
            defaultValue={filters.settlementStatus ?? ""}
          >
            <option value="">Settlement</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partial</option>
            <option value="paid">Paid</option>
          </select>
          <button>Apply</button>
          <Link href="/dashboard/billing/invoices">
            <RefreshCw /> Reset
          </Link>
          {can("invoices.export") && (
            <button
              type="button"
              onClick={() =>
                download(
                  "invoices.csv",
                  repo.exportInvoices(org, actorId, filters),
                )
              }
            >
              <Download /> CSV
            </button>
          )}
        </form>
        <section className="panel billing-card">
          <div className="table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>{t("الفاتورة", "Invoice")}</th>
                  <th>{t("العميل/العقد", "Customer/contract")}</th>
                  <th>{t("الإجمالي", "Total")}</th>
                  <th>{t("الرصيد", "Balance")}</th>
                  <th>Workflow</th>
                  <th>Settlement</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link href={`/dashboard/billing/invoices/${i.id}`}>
                        <b>{i.number}</b>
                      </Link>
                      <small>
                        {i.snapshot.issueDate} → {i.snapshot.dueDate}
                      </small>
                    </td>
                    <td>
                      {i.snapshot.customerName}
                      <small>{i.snapshot.contractNumber}</small>
                    </td>
                    <td>
                      {formatMoney(i.snapshot.totals.totalMinor, i.currency)}
                    </td>
                    <td>{formatMoney(i.openBalanceMinor, i.currency)}</td>
                    <td>{status(i.workflowStatus)}</td>
                    <td>{status(i.settlementStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.total === 0 && (
            <div className="sales-empty">
              {t("لا توجد نتائج مطابقة", "No matching results")}
            </div>
          )}
        </section>
      </>,
    );
  }
  if (mode === "detail") {
    const i = data.invoices.find((x) => x.id === id);
    if (!i) return wrap(<div className="sales-error">Invoice not found</div>);
    const pending = data.approvals.find(
      (a) => a.entityId === i.id && a.status === "pending",
    );
    return wrap(
      <>
        <section className="panel billing-hero">
          <div>
            <small>
              {i.snapshot.contractNumber} · {i.snapshot.quotationNumber}
            </small>
            <h2>{i.number}</h2>
            <p>{i.snapshot.customerName}</p>
          </div>
          <div>
            {status(i.workflowStatus)}
            {status(i.settlementStatus)}
          </div>
        </section>
        <div className="billing-actions">
          {can("invoices.submit") &&
            ["draft", "changes_requested"].includes(i.workflowStatus) && (
              <button
                onClick={() =>
                  act(() => repo.submitInvoice(org, actorId, i.id), "Submitted")
                }
              >
                إرسال للمراجعة
              </button>
            )}
          {can("invoices.approve") && pending && (
            <button
              onClick={() =>
                act(
                  () =>
                    repo.decideInvoice({
                      organizationId: org,
                      actorId,
                      approvalId: pending.id,
                      decision: "approved",
                      comment: "Approved in local demo",
                    }),
                  "Approved",
                )
              }
            >
              اعتماد
            </button>
          )}
          {can("invoices.issue") && i.workflowStatus === "approved" && (
            <button
              onClick={() =>
                act(
                  () => repo.issueInvoice(org, actorId, i.id),
                  "Issued internally",
                )
              }
            >
              إصدار داخلي
            </button>
          )}
          {can("invoices.print") && (
            <Link href={`/dashboard/billing/invoices/${i.id}/preview`}>
              <Printer /> معاينة وطباعة
            </Link>
          )}
        </div>
        <div className="billing-grid">
          <section className="panel billing-card">
            <h2>{t("البنود", "Lines")}</h2>
            {i.snapshot.lines.map((l) => (
              <div className="metric-row" key={l.id}>
                <span>
                  {l.description}
                  <small>
                    {l.quantityMills.toString()} / 1000 ×{" "}
                    {formatMoney(l.unitPriceMinor, i.currency)}
                  </small>
                </span>
                <strong>{formatMoney(l.unitPriceMinor, i.currency)}</strong>
              </div>
            ))}
          </section>
          <section className="panel billing-card">
            <h2>{t("الإجماليات", "Totals")}</h2>
            {[
              ["Subtotal", i.snapshot.totals.subtotalMinor],
              ["Discount", i.snapshot.totals.discountMinor],
              ["Tax", i.snapshot.totals.taxMinor],
              ["Total", i.snapshot.totals.totalMinor],
              ["Allocated", i.allocatedMinor],
              ["Open balance", i.openBalanceMinor],
            ].map(([k, v]) => (
              <div className="metric-row" key={String(k)}>
                <span>{String(k)}</span>
                <strong>{formatMoney(v as bigint, i.currency)}</strong>
              </div>
            ))}
          </section>
        </div>
        <section className="panel billing-card">
          <h2>Snapshot & Timeline</h2>
          <p>{i.snapshot.notice}</p>
          {data.timeline
            .filter((e) => e.invoiceId === i.id)
            .map((e) => (
              <div className="timeline-row" key={e.id}>
                <History />
                <span>
                  {e.action}
                  <small>{e.summary}</small>
                </span>
                <time>{e.createdAt.slice(0, 16)}</time>
              </div>
            ))}
        </section>
      </>,
    );
  }
  if (mode === "approvals")
    return wrap(
      <section className="panel billing-card">
        <h2>{t("مركز موافقات الفوترة", "Billing approvals")}</h2>
        {data.approvals.length ? (
          data.approvals.map((a) => (
            <div className="receipt-row" key={a.id}>
              <span>
                <b>{data.invoices.find((i) => i.id === a.entityId)?.number}</b>
                <small>{a.requestedBy} · {a.requestedAt.slice(0, 10)}</small>
              </span>
              {status(a.status)}
              {a.status === "pending" && can("invoices.approve") && (
                <button onClick={() => act(() => repo.decideInvoice({ organizationId: org, actorId, approvalId: a.id, decision: "approved", comment: "Approved in local demo" }), "Approved")}>اعتماد</button>
              )}
            </div>
          ))
        ) : <div className="sales-empty">{t("لا توجد موافقات معلقة", "No pending approvals")}</div>}
      </section>,
    );
  if (mode === "receipts")
    return wrap(
      <div className="billing-grid">
        <section className="panel billing-form">
          <h2>{t("تسجيل سند قبض", "Record receipt")}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              act(
                () =>
                  repo.createReceipt({
                    organizationId: org,
                    actorId,
                    customerId: "customer-demo-2",
                    currency: "SAR",
                    date: String(fd.get("date")),
                    amountMinor: BigInt(String(fd.get("amount"))) * 100n,
                    method: "bank_transfer",
                    reference: String(fd.get("reference")),
                    accountLabel: "حساب تجريبي",
                    notes: "تأكيد داخلي فقط",
                  }),
                "Receipt draft created",
              );
            }}
          >
            <label>
              {t("التاريخ", "Date")}
              <input name="date" type="date" defaultValue="2026-08-07" />
            </label>
            <label>
              {t("القيمة SAR", "Amount SAR")}
              <input name="amount" type="number" min="1" defaultValue="10000" />
            </label>
            <label>
              {t("المرجع", "Reference")}
              <input name="reference" maxLength={120} />
            </label>
            {can("receipts.create") && (
              <button className="primary-button">إنشاء مسودة</button>
            )}
          </form>
        </section>
        <section className="panel billing-card">
          <h2>{t("سندات القبض", "Receipts")}</h2>
          {data.receipts.map((r) => (
            <div className="receipt-row" key={r.id}>
              <div>
                <b>{r.number}</b>
                <small>
                  {r.customerName} · {r.date}
                </small>
              </div>
              <div>
                {status(r.status)}
                <strong>{formatMoney(r.amountMinor, r.currency)}</strong>
                <small>
                  Unallocated {formatMoney(r.unallocatedMinor, r.currency)}
                </small>
              </div>
              {r.status === "draft" && (
                <button
                  onClick={() =>
                    act(
                      () =>
                        repo.transitionReceipt(
                          org,
                          actorId,
                          r.id,
                          "pending_confirmation",
                        ),
                      "Pending confirmation",
                    )
                  }
                >
                  إرسال للتأكيد
                </button>
              )}
              {r.status === "pending_confirmation" &&
                can("receipts.confirm") && (
                  <button
                    onClick={() =>
                      act(
                        () =>
                          repo.transitionReceipt(
                            org,
                            actorId,
                            r.id,
                            "confirmed_internal",
                          ),
                        "Confirmed internally",
                      )
                    }
                  >
                    تأكيد داخلي
                  </button>
                )}
              {r.status === "confirmed_internal" && can("receipts.reverse") && (
                <button
                  onClick={() =>
                    act(
                      () =>
                        repo.transitionReceipt(
                          org,
                          actorId,
                          r.id,
                          "reversed",
                          "عكس تجريبي مصرح",
                        ),
                      "Reversed atomically",
                    )
                  }
                >
                  عكس
                </button>
              )}
            </div>
          ))}
        </section>
      </div>,
    );
  if (mode === "allocations") {
    const receipts = data.receipts.filter((r) => r.status === "confirmed_internal" && r.unallocatedMinor > 0n), invoices = data.invoices.filter((i) => i.workflowStatus === "issued" && i.openBalanceMinor > 0n);
    return wrap(
      <div className="billing-grid">
        <section className="panel billing-form">
          <h2>{t("توزيع تحصيل مؤكد", "Allocate confirmed receipt")}</h2>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget), r = receipts.find((x) => x.id === String(fd.get("receipt")))!, i = invoices.find((x) => x.id === String(fd.get("invoice")))!; act(() => repo.allocate({ organizationId: org, actorId, receiptId: r.id, invoiceId: i.id, amountMinor: BigInt(String(fd.get("amount"))) * 100n, idempotencyKey: crypto.randomUUID(), expectedReceiptVersion: r.recordVersion, expectedInvoiceVersion: i.recordVersion }), "Allocated atomically"); }}>
            <label>{t("السند", "Receipt")}<select name="receipt" required>{receipts.map((r) => <option key={r.id} value={r.id}>{r.number} — {formatMoney(r.unallocatedMinor, r.currency)} available</option>)}</select></label>
            <label>{t("الفاتورة", "Invoice")}<select name="invoice" required>{invoices.map((i) => <option key={i.id} value={i.id}>{i.number} — {formatMoney(i.openBalanceMinor, i.currency)} open</option>)}</select></label>
            <label>{t("المبلغ SAR", "Amount SAR")}<input name="amount" type="number" min="1" defaultValue="1000" required /></label>
            {can("receipts.allocate") && <button className="primary-button">{t("تأكيد التوزيع", "Confirm allocation")}</button>}
          </form>
          <p className="scope-warning">{t("يُقترح الأقدم فالأحدث فقط؛ لا يطبق النظام توزيعًا تلقائيًا.", "Oldest-first is suggestion-only; no automatic allocation is applied.")}</p>
        </section>
        <section className="panel billing-card"><h2>{t("سجل التوزيعات", "Allocation history")}</h2>{data.allocations.map((a) => <div className="metric-row" key={a.id}><span>{a.snapshot.receiptNumber} → {a.snapshot.invoiceNumber}<small>{a.status} · {a.createdAt.slice(0, 10)}</small></span><strong>{formatMoney(a.amountMinor, a.snapshot.currency)}</strong></div>)}</section>
      </div>,
    );
  }
  if (mode === "adjustments")
    return wrap(
      <section className="panel billing-card">
        <h2>Credit / Debit Notes</h2>
        <p className="scope-warning">
          {t(
            "مستندات داخلية مرتبطة بفاتورة أصلية؛ ليست إشعارات ضريبية إلكترونية معتمدة.",
            "Internal documents linked to an original invoice; not approved electronic tax notes.",
          )}
        </p>
        {data.adjustments.length ? (
          data.adjustments.map((a) => (
            <div className="metric-row" key={a.id}>
              <span>
                {a.number}
                <small>{a.reason}</small>
              </span>
              {status(a.status)}
            </div>
          ))
        ) : (
          <div className="sales-empty">
            {t("لا توجد إشعارات بعد", "No adjustments yet")}
          </div>
        )}
        {can("credit_notes.create") && (
          <button
            onClick={() =>
              act(
                () =>
                  repo.createAdjustment({
                    organizationId: org,
                    actorId,
                    invoiceId: "inv-1",
                    type: "credit_note",
                    reason: "خصم تجريبي معتمد داخليًا",
                    amountMinor: 100000n,
                  }),
                "Credit note created",
              )
            }
          >
            إنشاء Credit Note تجريبي
          </button>
        )}
      </section>,
    );
  if (mode === "aging") {
    const asOf = params.get("asOf") ?? "2026-08-07",
      rows = repo.aging(org, actorId, asOf);
    return wrap(
      <section className="panel billing-card">
        <form className="billing-filters">
          <label>
            As Of
            <input name="asOf" type="date" defaultValue={asOf} />
          </label>
          <button>Apply</button>
        </form>
        <h2>{t("أعمار الديون حسب العملة", "Aging by currency")}</h2>
        {rows.map((r) => (
          <div className="aging-row" key={r.invoiceId}>
            <span>
              {r.invoiceNumber}
              <small>
                {r.customerName} · due {r.dueDate}
              </small>
            </span>
            {status(r.bucket)}
            <strong>{formatMoney(r.openBalanceMinor, r.currency)}</strong>
          </div>
        ))}
        <p className="scope-warning">
          {t(
            "تقرير تشغيلي محدود بالحركات المتاحة في Local Mode، وليس دفتر أستاذ تاريخيًا.",
            "Operational Local Mode report; not a historical general ledger.",
          )}
        </p>
      </section>,
    );
  }
  if (mode === "statement") {
    const rows = repo.statement(
      org,
      actorId,
      "customer-demo-2",
      "SAR",
      "2026-01-01",
      "2026-12-31",
    );
    return wrap(
      <section className="panel billing-card">
        <div className="detail-head">
          <div>
            <small>
              {t("شركة رؤية الفعاليات · SAR", "Vision Events · SAR")}
            </small>
            <h2>{t("كشف حركة تشغيلي", "Operational activity statement")}</h2>
          </div>
          <button onClick={() => window.print()}>
            <Printer /> Print
          </button>
        </div>
        <div className="table-wrap">
          <table className="billing-table">
            <thead>
              <tr>
                <th>{t("التاريخ", "Date")}</th>
                <th>{t("المرجع", "Reference")}</th>
                <th>{t("البيان", "Description")}</th>
                <th>{t("مدين", "Debit")}</th>
                <th>{t("دائن", "Credit")}</th>
                <th>{t("الرصيد", "Balance")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, n) => (
                <tr key={`${r.reference}-${n}`}>
                  <td>{r.date}</td>
                  <td>{r.reference}</td>
                  <td>{r.description}</td>
                  <td>{formatMoney(r.debitMinor, "SAR")}</td>
                  <td>{formatMoney(r.creditMinor, "SAR")}</td>
                  <td>{formatMoney(r.balanceMinor, "SAR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="scope-warning">
          {t(
            "لا يوجد رصيد افتتاحي أو General Ledger؛ يبدأ الكشف من أول حركة متاحة في المرحلة السادسة.",
            "No opening balance or general ledger; statement starts at the first phase-six activity.",
          )}
        </p>
      </section>,
    );
  }
  if (mode === "collections")
    return wrap(
      <section className="panel billing-card">
        <h2>{t("متابعة التحصيل", "Collection follow-up")}</h2>
        {data.followups.map((f) => (
          <div className="followup-row" key={f.id}>
            <UsersRound />
            <span>
              <b>{data.invoices.find((i) => i.id === f.invoiceId)?.number}</b>
              <small>
                {f.outcome} · {f.channel}
              </small>
            </span>
            {status(f.status)}
            <time>{f.nextActionDate}</time>
            <p>{f.nextAction}</p>
          </div>
        ))}
      </section>,
    );
  if (mode === "settings") {
    const s = data.settings[0];
    return wrap(<section className="panel billing-card"><h2>{t("إعدادات الفوترة", "Billing settings")}</h2><div className="sales-dl"><div><dt>Invoice prefix</dt><dd>{s.invoicePrefix}</dd></div><div><dt>Receipt prefix</dt><dd>{s.receiptPrefix}</dd></div><div><dt>Default due days</dt><dd>{s.defaultDueDays}</dd></div><div><dt>Default tax</dt><dd>{s.defaultTaxBps / 100}%</dd></div><div><dt>Language</dt><dd>{s.defaultLanguage}</dd></div><div><dt>Record version</dt><dd>{s.recordVersion}</dd></div></div><p className="scope-warning">{s.internalDocumentNotice}</p>{!can("billing.settings.manage") && <p className="sales-error">Read-only: missing billing.settings.manage</p>}</section>);
  }
  if (mode === "preview") {
    const i = data.invoices.find((x) => x.id === id);
    if (!i) return <div>Invoice not found</div>;
    return (
      <div className="billing-preview">
        <div className="preview-toolbar">
          <Link href={`/dashboard/billing/invoices/${i.id}`}>رجوع</Link>
          <button onClick={() => window.print()}>
            <Printer />
            طباعة A4
          </button>
        </div>
        <article
          className={`invoice-paper ${i.snapshot.language === "en" ? "ltr" : "rtl"}`}
        >
          <div className="draft-watermark">INTERNAL DEMO</div>
          <header>
            <div className="invoice-logo">M</div>
            <div>
              <strong>مدار CRM</strong>
              <span>Internal Billing Document</span>
            </div>
            <div>
              <h1>{i.number}</h1>
              <small>{i.snapshot.issueDate}</small>
            </div>
          </header>
          <section className="invoice-parties">
            <div>
              <small>Bill to / العميل</small>
              <h2>{i.snapshot.customerName}</h2>
              <p>{i.snapshot.city}</p>
            </div>
            <div>
              <small>References / المراجع</small>
              <p>{i.snapshot.contractNumber}</p>
              <p>{i.snapshot.quotationNumber}</p>
            </div>
          </section>
          <div className="paper-meta">
            <div>
              <small>Issue</small>
              <strong>{i.snapshot.issueDate}</strong>
            </div>
            <div>
              <small>Due</small>
              <strong>{i.snapshot.dueDate}</strong>
            </div>
            <div>
              <small>Currency</small>
              <strong>{i.currency}</strong>
            </div>
            <div>
              <small>Status</small>
              <strong>{labels[i.workflowStatus]}</strong>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الوصف / Description</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Tax</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {i.snapshot.lines.map((l, n) => (
                <tr key={l.id}>
                  <td>{n + 1}</td>
                  <td>{l.description}</td>
                  <td>{l.quantityMills.toString()}/1000</td>
                  <td>{formatMoney(l.unitPriceMinor, i.currency)}</td>
                  <td>{l.taxBps / 100}%</td>
                  <td>
                    {formatMoney(calculateInvoice([l]).totalMinor, i.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="invoice-totals">
            <div>
              <span>Subtotal</span>
              <b>{formatMoney(i.snapshot.totals.subtotalMinor, i.currency)}</b>
            </div>
            <div>
              <span>Tax</span>
              <b>{formatMoney(i.snapshot.totals.taxMinor, i.currency)}</b>
            </div>
            <div className="grand">
              <span>Total</span>
              <b>{formatMoney(i.snapshot.totals.totalMinor, i.currency)}</b>
            </div>
          </div>
          <section className="payment-note">
            <h3>Payment information / بيانات الدفع</h3>
            <p>{i.snapshot.paymentInstructions}</p>
          </section>
          <footer>
            <p>{i.snapshot.notice}</p>
            <span>Snapshot v{i.recordVersion} · Page 1</span>
          </footer>
        </article>
      </div>
    );
  }
  return wrap(<div>Unknown billing view</div>);
}
