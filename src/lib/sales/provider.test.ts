import { afterEach, describe, expect, it, vi } from "vitest";
import { createSalesRepository } from "./provider";
import { LocalSalesRepository, SupabaseSalesRepository } from "./repository";

describe("sales provider contract",()=>{
  afterEach(()=>vi.unstubAllEnvs());
  it("runs locally without Supabase",()=>{expect(createSalesRepository("local")).toBeInstanceOf(LocalSalesRepository)});
  it("switches adapters without changing repository consumers",()=>{expect(createSalesRepository("supabase")).toBeInstanceOf(SupabaseSalesRepository)});
});
