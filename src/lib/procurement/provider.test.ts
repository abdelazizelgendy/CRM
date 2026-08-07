import { describe, expect, it } from "vitest";
import { createProcurementRepository } from "./provider";
import { LocalProcurementRepository, SupabaseProcurementRepository } from "./repository";

describe("procurement provider selection", () => { it("switches adapters explicitly", () => { expect(createProcurementRepository("local")).toBeInstanceOf(LocalProcurementRepository); expect(createProcurementRepository("supabase")).toBeInstanceOf(SupabaseProcurementRepository); }); });
