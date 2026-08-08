import { getDataProvider } from "../data-provider";
import { getHrDemoRepository, LocalHrRepository, SupabaseHrRepository, type HrRepository } from "./repository";
export function createHrRepository(kind=getDataProvider()):HrRepository{return kind==="supabase"?new SupabaseHrRepository():new LocalHrRepository();}
export function getHrRepository(kind=getDataProvider()):HrRepository{return kind==="supabase"?new SupabaseHrRepository():getHrDemoRepository();}
