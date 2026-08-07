import { ProjectWorkspace } from "@/components/project-workspace";
export default async function Page({params}:{params:Promise<{id:string;section:string}>}){ const {id,section}=await params; return <ProjectWorkspace mode={section} projectId={id}/>; }
