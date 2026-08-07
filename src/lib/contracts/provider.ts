import { getDataProvider } from "../data-provider";
import { LocalContractRepository, SupabaseContractRepository, type ContractRepository } from "./repository";
export function createContractRepository(kind=getDataProvider()):ContractRepository{return kind==="supabase"?new SupabaseContractRepository():new LocalContractRepository()}
let demo:LocalContractRepository|undefined;
export function getContractDemoRepository(){demo??=new LocalContractRepository();return demo}
export function resetContractDemoRepository(){demo=new LocalContractRepository();return demo}
