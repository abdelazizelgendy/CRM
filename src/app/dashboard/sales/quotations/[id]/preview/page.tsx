import { SalesWorkspace } from "@/components/sales-workspace";

export default async function Page({params}:{params:Promise<{id:string}>}) {
  const { id } = await params;
  return <SalesWorkspace mode="preview" id={id}/>;
}
