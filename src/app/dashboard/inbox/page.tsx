import Link from "next/link";
import { Plus, Settings2, TextQuote } from "lucide-react";
import { InboxWorkspace } from "@/components/inbox-workspace";
import { PageTitle } from "@/components/page-title";

export default function InboxPage(){return <><PageTitle title="صندوق المحادثات الموحد" description="إدارة رسائل العملاء والإسناد والمتابعة وSLA من مكان واحد" action={<div className="page-actions"><Link className="primary-button small" href="/dashboard/sales/requests/new?source=inbox"><Plus/> طلب مبيعات</Link><Link className="secondary-button" href="/dashboard/inbox/templates"><TextQuote/> الردود الجاهزة</Link><Link className="secondary-button" href="/dashboard/inbox/settings"><Settings2/> إعدادات القنوات</Link></div>}/><InboxWorkspace/></>}
