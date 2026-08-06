import Link from "next/link";
import { KeyRound, Plus } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { PageTitle } from "@/components/page-title";
import { getWorkspace } from "@/lib/workspace";
import { getLocale } from "@/lib/i18n/server";
import { localizedName } from "@/lib/i18n/config";
export default async function RolesPage({searchParams}:{searchParams:Promise<{error?:string;success?:string}>}){const params=await searchParams;const locale=await getLocale();const{supabase,membership}=await getWorkspace();const{data:roles}=await supabase.from("roles").select("id,name_ar,name_en,description,is_system,user_roles(count)").eq("organization_id",membership.organization_id).order("is_system",{ascending:false});return <><PageTitle title="الأدوار والصلاحيات" description="صلاحيات دقيقة على مستوى الواجهة والخادم وقاعدة البيانات" action={<Link href="/dashboard/roles/new" className="primary-button small"><Plus/> دور مخصص</Link>}/><FormMessage {...params}/><div className="roles-grid">{roles?.map(role=><article className="role-card" key={role.id}><div><span className="icon-box purple"><KeyRound/></span>{role.is_system&&<small className="system-badge">افتراضي</small>}</div><h3>{localizedName(locale,role)}</h3><p>{role.description??"دور قابل للتوسع وفق احتياج الشركة"}</p><footer><span>{(role.user_roles as unknown as Array<{count:number}>)?.[0]?.count??0} مستخدم</span></footer></article>)}</div></>}
