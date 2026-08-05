import { describe,expect,it } from "vitest";
import { csvSafe, normalizeEmail, normalizePhone, parseCsv } from "./crm";

describe("CRM data safety",()=>{
  it("normalizes email and phone for duplicate detection",()=>{ expect(normalizeEmail(" Test@Example.COM ")).toBe("test@example.com"); expect(normalizePhone("+966 50-123,4567")).toBe("966501234567"); });
  it("neutralizes spreadsheet formulas",()=>{ expect(csvSafe("=HYPERLINK(\"bad\")")).toBe("\"'=HYPERLINK(\"\"bad\"\")\""); expect(csvSafe("+1+1")).toBe("'+1+1"); });
  it("parses quoted CSV values",()=>{ expect(parseCsv('full_name,description\n"أحمد","تصميم، وإشراف"')).toEqual([["full_name","description"],["أحمد","تصميم، وإشراف"]]); });
});

