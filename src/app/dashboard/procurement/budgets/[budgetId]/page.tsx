import { PageTitle } from "@/components/page-title"; import { ProcurementWorkspace } from "@/components/procurement-workspace";
export default async function Page({params}:{params:Promise<{budgetId:string}>}){const{budgetId}=await params;return <><PageTitle title="تفاصيل الميزانية" description="البنود والإصدار والعملة والمصدر"/><ProcurementWorkspace mode="budget-detail" id={budgetId}/></>}
