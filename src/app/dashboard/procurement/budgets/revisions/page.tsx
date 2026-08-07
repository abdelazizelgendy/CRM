import { PageTitle } from "@/components/page-title"; import { ProcurementWorkspace } from "@/components/procurement-workspace";
export default function Page(){return <><PageTitle title="إصدارات الميزانية" description="سجل الإصدارات مع الحفاظ على Snapshot خط الأساس"/><ProcurementWorkspace mode="budget-revisions"/></>}
