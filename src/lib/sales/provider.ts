import { getDataProvider } from "../data-provider";
import { LocalSalesRepository, SupabaseSalesRepository, type SalesRepository } from "./repository";

export function createSalesRepository(kind = getDataProvider()): SalesRepository {
  return kind === "supabase" ? new SupabaseSalesRepository() : new LocalSalesRepository();
}

let demoRepository: LocalSalesRepository | undefined;
export function getSalesDemoRepository() {
  demoRepository ??= new LocalSalesRepository();
  return demoRepository;
}

export function resetSalesDemoRepository() {
  demoRepository = new LocalSalesRepository();
  return demoRepository;
}
