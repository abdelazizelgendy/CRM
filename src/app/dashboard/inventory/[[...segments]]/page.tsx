import { PageTitle } from "@/components/page-title";
import { InventoryWorkspace } from "@/components/inventory-workspace";
export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) { const { segments = [] } = await params; return <><PageTitle title="إدارة المخزون والمستودعات والمواد" description="سجل أصناف وحركات مشتقة وحجز وصرف وتحويل وجرد وتقييم تشغيلي قابل للتتبع"/><InventoryWorkspace segments={segments}/></>; }
