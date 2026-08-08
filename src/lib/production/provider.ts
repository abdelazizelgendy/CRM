import { getDataProvider } from "../data-provider";
import { LocalProductionRepository, SupabaseProductionRepository, type ProductionRepository } from "./repository";
export function createProductionRepository(kind=getDataProvider()):ProductionRepository{return kind==="supabase"?new SupabaseProductionRepository():new LocalProductionRepository();}
let demo:LocalProductionRepository|undefined;
export function getProductionDemoRepository(){demo??=new LocalProductionRepository();return demo;}
export function resetProductionDemoRepository(){demo=new LocalProductionRepository();return demo;}
