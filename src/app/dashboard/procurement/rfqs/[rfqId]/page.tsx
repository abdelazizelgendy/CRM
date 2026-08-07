import { PageTitle } from "@/components/page-title"; import { ProcurementWorkspace } from "@/components/procurement-workspace";
export default async function Page({params}:{params:Promise<{rfqId:string}>}){const{rfqId}=await params;return <><PageTitle title="تفاصيل RFQ" description="الموردون المدعوون والبنود والموعد والشروط"/><ProcurementWorkspace mode="rfq-detail" id={rfqId}/></>}
