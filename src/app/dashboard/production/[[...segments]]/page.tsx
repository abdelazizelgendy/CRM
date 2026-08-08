import { PageTitle } from "@/components/page-title";
import { ProductionWorkspace } from "@/components/production-workspace";
export default async function Page({params}:{params:Promise<{segments?:string[]}>}){const {segments=[]}=await params;return <><PageTitle title="إدارة الإنتاج والتصنيع" description="BOM ومسارات وأوامر إنتاج وMRP محدود وجودة وطاقة وتكلفة تشغيلية مرتبطة بالمشروع والمخزون"/><ProductionWorkspace segments={segments}/></>}
