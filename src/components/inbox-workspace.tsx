"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCheck, Clock3, FilePlus2, MessageCircle, Paperclip, Search, Send, StickyNote, UserRoundPlus } from "lucide-react";
import { LocalInboxRepository, InboxError } from "@/lib/inbox/repository";
import { createInboxSeed } from "@/lib/inbox/seed";
import type { ConversationStatus, InboxFilters, Priority } from "@/lib/inbox/types";

const org = "org-madar-demo";
const statusLabels: Record<ConversationStatus,string> = {new:"جديدة",open:"مفتوحة",pending_customer:"بانتظار العميل",pending_internal:"بانتظار داخلي",resolved:"محلولة",closed:"مغلقة",spam:"مزعجة"};
const priorityLabels: Record<Priority,string> = {low:"منخفضة",medium:"متوسطة",high:"مرتفعة",urgent:"عاجلة"};

export function InboxWorkspace() {
  const [repository] = useState(() => new LocalInboxRepository(createInboxSeed()));
  const [version,setVersion]=useState(0);
  const [actorId,setActorId]=useState("u-owner");
  const [selectedId,setSelectedId]=useState("c1");
  const [filters,setFilters]=useState<InboxFilters>({sort:"newest"});
  const [drafts,setDrafts]=useState<Record<string,string>>({});
  const [mode,setMode]=useState<"reply"|"note">("reply");
  const [notice,setNotice]=useState("");
  void version;
  const data=repository.snapshot(org);
  const metrics=repository.metrics(org);
  const conversations=repository.listConversations(org,filters);
  const selected=data.conversations.find((c)=>c.id===selectedId)??conversations[0];
  const participant=data.participants.find((p)=>p.id===selected?.participantId);
  const channel=data.channels.find((c)=>c.id===selected?.channelId);
  const actor=data.users.find((u)=>u.id===actorId)!;
  const assignee=data.users.find((u)=>u.id===selected?.assigneeId);
  const messages=data.messages.filter((m)=>m.conversationId===selected?.id).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  const can=(permission:string)=>actor.permissions.includes(permission);
  const mutate=(operation:()=>unknown, success:string)=>{try{operation();setNotice(success);setVersion((v)=>v+1);}catch(error){setNotice(error instanceof InboxError?error.message:"تعذر تنفيذ العملية");}};
  const send=()=>{if(!selected)return;const body=drafts[selected.id]??"";if(!body.trim())return;mutate(()=>mode==="note"?repository.addInternalNote({organizationId:org,actorId,conversationId:selected.id,body}):repository.sendReply({organizationId:org,actorId,conversationId:selected.id,body,idempotencyKey:`${selected.id}-${Date.now()}`}),mode==="note"?"تمت إضافة الملاحظة الداخلية":"تم إرسال الرد التجريبي");setDrafts((current)=>({...current,[selected.id]:""}));};
  const update=(change:{status?:ConversationStatus;priority?:Priority;assigneeId?:string})=>selected&&mutate(()=>repository.updateConversation({organizationId:org,actorId,conversationId:selected.id,...change}),"تم تحديث المحادثة وتسجيل العملية");

  return <div className="inbox-page">
    <section className="inbox-kpis">
      <Kpi label="محادثات جديدة" value={metrics.newCount}/><Kpi label="مفتوحة" value={metrics.openCount}/><Kpi label="غير مقروءة" value={metrics.unreadCount}/><Kpi label="متجاوزة SLA" value={metrics.breachedCount} danger/><Kpi label="الالتزام بـ SLA" value={`${metrics.slaCompliance}%`}/>
    </section>
    <div className="demo-toolbar panel"><span className="demo-badge">وضع تجريبي — القنوات غير متصلة</span><label>اختبار الدور<select value={actorId} onChange={(e)=>setActorId(e.target.value)}>{data.users.map((u)=><option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}</select></label></div>
    {notice&&<div className="inbox-notice" role="status">{notice}</div>}
    <section className="inbox-layout panel">
      <aside className="conversation-list">
        <div className="inbox-search"><Search/><input aria-label="البحث في المحادثات" placeholder="بحث بالاسم أو الرسالة" value={filters.query??""} onChange={(e)=>setFilters((f)=>({...f,query:e.target.value}))}/></div>
        <div className="inbox-filters"><select aria-label="فلتر الحالة" value={filters.status??""} onChange={(e)=>setFilters((f)=>({...f,status:(e.target.value||undefined) as ConversationStatus|undefined}))}><option value="">كل الحالات</option>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><select aria-label="فلتر القناة" value={filters.channel??""} onChange={(e)=>setFilters((f)=>({...f,channel:(e.target.value||undefined) as never}))}><option value="">كل القنوات</option>{data.channels.map((c)=><option key={c.id} value={c.code}>{c.nameAr}</option>)}</select></div>
        <div className="conversation-scroll">{conversations.length===0?<div className="inbox-empty">لا توجد محادثات مطابقة</div>:conversations.map((conversation)=>{const person=data.participants.find((p)=>p.id===conversation.participantId);const ch=data.channels.find((c)=>c.id===conversation.channelId);const last=data.messages.filter((m)=>m.conversationId===conversation.id&&m.direction!=="internal").at(-1);return <button className={`conversation-row ${conversation.id===selected?.id?"active":""}`} key={conversation.id} onClick={()=>setSelectedId(conversation.id)}><span className="channel-avatar">{person?.name.slice(0,1)}</span><span className="conversation-summary"><strong>{person?.name}</strong><small>{ch?.nameAr} · {last?.body}</small><span>{priorityLabels[conversation.priority]} · {statusLabels[conversation.status]}</span></span><span className="conversation-meta"><time>{new Date(conversation.updatedAt).toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit",timeZone:"Asia/Riyadh"})}</time>{conversation.unreadCount>0&&<b>{conversation.unreadCount}</b>}{conversation.slaState==="breached"&&<AlertTriangle/>}</span></button>})}</div>
      </aside>
      <article className="chat-panel">{selected?<><header className="chat-head"><div><strong>{participant?.name}</strong><small>{channel?.nameAr} · {channel?.state.toUpperCase()}</small></div><div className="conversation-controls"><select aria-label="الأولوية" value={selected.priority} disabled={!can("conversations.change_priority")} onChange={(e)=>update({priority:e.target.value as Priority})}>{Object.entries(priorityLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select aria-label="الحالة" value={selected.status} disabled={!can("conversations.change_status")} onChange={(e)=>update({status:e.target.value as ConversationStatus})}>{Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div></header>
        <div className="message-scroll">{messages.map((message)=><div className={`message-bubble ${message.direction}`} key={message.id}><strong>{message.senderName}</strong><p>{message.body}</p><footer><time>{new Date(message.createdAt).toLocaleString("ar-SA",{timeZone:"Asia/Riyadh"})}</time>{message.direction==="outbound"&&<><span>{message.deliveryStatus}</span><CheckCheck/></>}</footer></div>)}</div>
        <div className="composer"><div className="composer-tabs"><button className={mode==="reply"?"active":""} disabled={!can("conversations.reply")} onClick={()=>setMode("reply")}><MessageCircle/> رد للعميل</button><button className={mode==="note"?"active note":""} disabled={!can("internal_notes.create")} onClick={()=>setMode("note")}><StickyNote/> ملاحظة داخلية</button></div><textarea aria-label={mode==="note"?"الملاحظة الداخلية":"نص الرد"} placeholder={mode==="note"?"هذه الملاحظة لن تُرسل للعميل":"اكتب ردك هنا..."} value={drafts[selected.id]??""} onChange={(e)=>setDrafts((d)=>({...d,[selected.id]:e.target.value}))}/><div className="composer-actions"><div><button title="مرفق تجريبي"><Paperclip/></button><select aria-label="إدراج رد جاهز" defaultValue="" onChange={(e)=>{const template=data.templates.find((t)=>t.id===e.target.value);if(template)setDrafts((d)=>({...d,[selected.id]:template.contentAr.replace("{{customer_name}}",participant?.name??"").replace("{{company_name}}","مدار").replace("{{agent_name}}",actor.name)}));e.currentTarget.value="";}}><option value="">الردود الجاهزة</option>{data.templates.filter((t)=>t.active).map((t)=><option key={t.id} value={t.id}>{t.nameAr}</option>)}</select></div><button className="primary-button small" disabled={mode==="reply"?!can("conversations.reply"):!can("internal_notes.create")} onClick={send}>{mode==="note"?<StickyNote/>:<Send/>}{mode==="note"?"إضافة ملاحظة":"إرسال تجريبي"}</button></div></div>
      </>:<div className="inbox-empty">اختر محادثة</div>}</article>
      <aside className="customer-panel">{participant&&selected?<><div className="customer-identity"><span className="large-avatar">{participant.name.slice(0,1)}</span><h2>{participant.name}</h2><span className="crm-type">{participant.type}</span></div><dl><div><dt>الهاتف</dt><dd>{participant.phone??"—"}</dd></div><div><dt>البريد</dt><dd>{participant.email??"—"}</dd></div><div><dt>الشركة</dt><dd>{participant.company??"—"}</dd></div><div><dt>المدينة</dt><dd>{participant.city??"—"}</dd></div><div><dt>المصدر</dt><dd>{participant.source??"—"}</dd></div><div><dt>المسؤول</dt><dd>{assignee?.name??"غير مسند"}</dd></div></dl><label className="assign-field"><UserRoundPlus/> إسناد إلى<select disabled={!can("conversations.assign")} value={selected.assigneeId??""} onChange={(e)=>update({assigneeId:e.target.value})}><option value="">غير مسند</option>{data.users.filter((u)=>u.role!=="viewer").map((u)=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>{can("sales_requests.create")&&<Link className="primary-button small" href={{pathname:"/dashboard/sales/requests/new",query:{conversationId:selected.id,customerId:participant.crmId??participant.id,customerName:participant.name,email:participant.email??"",mobile:participant.phone??"",source:"Inbox"}}}><FilePlus2/> إنشاء طلب مبيعات</Link>}{participant.type==="unknown"?<button className="secondary-button" disabled={!can("conversations.link_crm")} onClick={()=>mutate(()=>repository.createLeadFromConversation(org,actorId,selected.id),"تم إنشاء Lead وربط المحادثة دون تكرار")}><FilePlus2/> إنشاء Lead من المحادثة</button>:<a className="secondary-button" href={participant.type==="lead"?`/dashboard/crm/leads/${participant.crmId}`:"/dashboard/crm/customers"}>فتح السجل في CRM</a>}<div className={`sla-card ${selected.slaState}`}><Clock3/><div><strong>SLA: {selected.slaState}</strong><small>الرد الأول: {metrics.averageFirstResponseMinutes} دقيقة</small></div></div></>:null}</aside>
    </section>
  </div>;
}

function Kpi({label,value,danger}:{label:string;value:string|number;danger?:boolean}){return <div className={`panel inbox-kpi ${danger?"danger":""}`}><span>{label}</span><strong>{value}</strong></div>}
