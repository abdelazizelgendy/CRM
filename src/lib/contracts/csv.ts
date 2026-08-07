const safe=(value:unknown)=>{let text=String(value??"").replaceAll('"','""');if(/^[=+\-@\t\r]/.test(text))text=`'${text}`;return`"${text}"`};
export function toSafeCsv(headers:string[],rows:unknown[][]){return"\ufeff"+[headers,...rows].map(row=>row.map(safe).join(",")).join("\r\n")}
