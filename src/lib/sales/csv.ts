import { formatMoney } from "./calculations";
import type { Paged, Quotation, QuotationVersion, SalesRequest, SalesUser } from "./types";

export function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(rows: unknown[][]) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function requestsCsv(page: Paged<SalesRequest>) {
  return csv([
    ["request_number","title","customer","mobile","email","status","owner","source","priority","currency","expected_value","created_at"],
    ...page.rows.map((row) => [row.number,row.title,row.customerName,row.customerMobile,row.customerEmail,row.status,row.ownerId,row.source,row.priority,row.currency,row.expectedValueMinor === undefined ? "" : formatMoney(row.expectedValueMinor,row.currency,"en-US"),row.createdAt]),
  ]);
}

export function quotationsCsv(page: Paged<{quotation:Quotation;version:QuotationVersion}>, user: SalesUser) {
  const canCost = user.permissions.includes("quotations.view_cost");
  const canMargin = user.permissions.includes("quotations.view_margin");
  const headers = ["quotation_number","version","title","customer","status","currency","subtotal","tax","grand_total","expiry_date"];
  if (canCost) headers.push("internal_cost");
  if (canMargin) headers.push("margin","margin_percent");
  return csv([headers,...page.rows.map(({quotation,version}) => {
    const row: unknown[] = [quotation.number,version.versionNumber,version.title,version.snapshot.customerName,version.status,version.currency,formatMoney(version.totals.subtotalMinor,version.currency,"en-US"),formatMoney(version.totals.taxMinor,version.currency,"en-US"),formatMoney(version.totals.grandTotalMinor,version.currency,"en-US"),version.expiryDate];
    if (canCost) row.push(formatMoney(version.totals.costMinor,version.currency,"en-US"));
    if (canMargin) row.push(formatMoney(version.totals.marginMinor,version.currency,"en-US"),`${version.totals.marginBps / 100}%`);
    return row;
  })]);
}
