import { describe,expect,it } from "vitest";
import { createProductionRepository,resetProductionDemoRepository } from "./provider";
import { LocalProductionRepository, SupabaseProductionRepository } from "./repository";
describe("production provider",()=>{it("selects local provider",()=>expect(createProductionRepository("local")).toBeInstanceOf(LocalProductionRepository));it("selects explicit Supabase stub",()=>expect(createProductionRepository("supabase")).toBeInstanceOf(SupabaseProductionRepository));it("resets demo state",()=>expect(resetProductionDemoRepository().snapshot("org-madar-demo","u-owner").orders.length).toBeGreaterThan(0));});
