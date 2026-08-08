import { notFound } from "next/navigation";
import { PageTitle } from "@/components/page-title";
import { HrWorkspace } from "@/components/hr-workspace";
import { getLocale } from "@/lib/i18n/server";
const allowed=new Set(["workers","organization","positions","locations","shifts","attendance","leave","overtime","workforce","skills","training","onboarding","performance","payroll-readiness","reports"]);
export default async function Page({params}:{params:Promise<{segments?:string[]}>}){const {segments=[]}=await params;if(segments[0]&&!allowed.has(segments[0]))notFound();if(segments[0]==="attendance"&&segments[1]&&segments[1]!=="corrections")notFound();if(segments[0]==="leave"&&segments[1]&&segments[1]!=="balances")notFound();const locale=await getLocale();return <><PageTitle title={locale==="ar"?"الموارد البشرية والقوى العاملة":"HR & Workforce"} description={locale==="ar"?"الحضور والإجازات وتسوية الوقت وجاهزية الرواتب دون Payroll Engine":"Attendance, leave, time reconciliation and payroll readiness without a payroll engine"}/><HrWorkspace segments={segments} locale={locale}/></>}
