import { describe, expect, it } from "vitest";
import { quotationsCsv, requestsCsv } from "./csv";
import { LocalSalesRepository } from "./repository";

describe("safe sales CSV",()=>{
  it("adds UTF-8 BOM and blocks spreadsheet formula injection",()=>{const repo=new LocalSalesRepository(),request=repo.createRequest({organizationId:"org-madar-demo",actorId:"u-owner",title:"=HYPERLINK test",description:"CSV safety test",customerId:"csv-customer",customerName:"+formula",source:"Manual",priority:"low",currency:"SAR"}),csv=requestsCsv(repo.listRequests("org-madar-demo","u-owner",{query:request.number}));expect(csv.startsWith("\uFEFF")).toBe(true);expect(csv).toContain("'=HYPERLINK");expect(csv).toContain("'+formula")});
  it("exports only scoped rows",()=>{const repo=new LocalSalesRepository(),csv=requestsCsv(repo.listRequests("org-madar-demo","u-owner",{pageSize:100}));expect(csv).not.toContain("عميل شركة أخرى")});
  it("omits cost and margin columns for unauthorized viewers",()=>{const repo=new LocalSalesRepository(),viewer=repo.snapshot("org-madar-demo","u-viewer").users.find((x)=>x.id==="u-viewer")!,owner=repo.snapshot("org-madar-demo","u-owner").users.find((x)=>x.id==="u-owner")!;expect(quotationsCsv(repo.listQuotations("org-madar-demo","u-viewer"),viewer).split("\r\n")[0]).not.toContain("internal_cost");expect(quotationsCsv(repo.listQuotations("org-madar-demo","u-owner"),owner).split("\r\n")[0]).toContain("margin_percent")});
  it("enforces export permission in the repository",()=>{const repo=new LocalSalesRepository();expect(()=>repo.exportRequests("org-madar-demo","u-viewer")).toThrow(/sales_requests.export/);expect(()=>repo.exportQuotations("org-madar-demo","u-viewer")).toThrow(/quotations.export/);expect(repo.exportQuotations("org-madar-demo","u-owner")).toContain("margin_percent")});
});
