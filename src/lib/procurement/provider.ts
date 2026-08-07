import { getDataProvider } from "../data-provider";
import { LocalProcurementRepository, SupabaseProcurementRepository, type ProcurementRepository } from "./repository";
export function createProcurementRepository(kind = getDataProvider()): ProcurementRepository { return kind === "supabase" ? new SupabaseProcurementRepository() : new LocalProcurementRepository(); }
let demo: LocalProcurementRepository | undefined;
export function getProcurementDemoRepository() { demo ??= new LocalProcurementRepository(); return demo; }
export function resetProcurementDemoRepository() { demo = new LocalProcurementRepository(); return demo; }
