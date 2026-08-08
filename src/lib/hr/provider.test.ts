import { describe,expect,it } from "vitest";
import { createHrRepository } from "./provider";
import { LocalHrRepository, SupabaseHrRepository } from "./repository";
describe("HR provider",()=>{it("selects adapters explicitly",()=>{expect(createHrRepository("local")).toBeInstanceOf(LocalHrRepository);expect(createHrRepository("supabase")).toBeInstanceOf(SupabaseHrRepository);});it("does not claim Supabase readiness",()=>expect(()=>createHrRepository("supabase").snapshot("o","u")).toThrow(/not applied or integration-tested/));});
