import { PageTitle } from "@/components/page-title"; import { ProcurementWorkspace } from "@/components/procurement-workspace";
export default function Page(){return <><PageTitle title="المصروفات المباشرة" description="مصروفات خارج أمر الشراء مع مبرر وموافقات"/><ProcurementWorkspace mode="expenses"/></>}
