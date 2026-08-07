import { getDataProvider } from "../data-provider";import { LocalBillingRepository,SupabaseBillingRepository,type BillingRepository } from "./repository";
export function createBillingRepository(kind=getDataProvider()):BillingRepository{return kind==="supabase"?new SupabaseBillingRepository():new LocalBillingRepository()}
let demo:LocalBillingRepository|undefined;export function getBillingDemoRepository(){demo??=new LocalBillingRepository();return demo}export function resetBillingDemoRepository(){demo=new LocalBillingRepository();return demo}
