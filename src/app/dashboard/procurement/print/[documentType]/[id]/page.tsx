import { ProcurementWorkspace } from "@/components/procurement-workspace";
export default async function Page({params}:{params:Promise<{documentType:string;id:string}>}){const{documentType,id}=await params;return <ProcurementWorkspace mode="print" id={id} documentType={documentType}/>}
