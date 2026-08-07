import { PageTitle } from "@/components/page-title"; import { ProjectWorkspace } from "@/components/project-workspace";
export default function Page(){ return <><PageTitle title="موافقات عمليات المشاريع" description="قائمة داخلية لميثاق المشروع وخط الأساس والوقت والتقدم والإغلاق"/><ProjectWorkspace mode="approvals"/></>; }
