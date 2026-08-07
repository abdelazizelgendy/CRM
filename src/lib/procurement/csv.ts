export function csvCell(value: string) { const safe = /^[=+\-@]/.test(value) ? `'${value}` : value; return `"${safe.replaceAll('"', '""')}"`; }
export function toSafeCsv(headers: string[], rows: string[][]) { return "\uFEFF" + [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n"); }
