import type { InboxSnapshot } from "./types";
import { SALES_PERMISSIONS } from "../sales/seed";
import { CONTRACT_PERMISSIONS } from "../contracts/seed";
import { BILLING_PERMISSIONS } from "../billing/seed";

const org = "org-madar-demo";
const otherOrg = "org-other-demo";
const now = new Date("2026-08-06T13:00:00.000Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

export const demoPermissions = ["dashboard.view","leads.view","customers.view","contacts.view","inbox.view","conversations.view","conversations.reply","conversations.assign","conversations.change_status","conversations.change_priority","conversations.link_crm","conversations.merge","conversations.close","internal_notes.create","canned_responses.view","canned_responses.manage","inbox_settings.manage","inbox_reports.view","notifications.view","profile.view",...SALES_PERMISSIONS,...CONTRACT_PERMISSIONS,...BILLING_PERMISSIONS];

export function createInboxSeed(): InboxSnapshot {
  return {
    channels: [
      ["ch-wa","whatsapp","واتساب","WhatsApp",30], ["ch-email","email","البريد الإلكتروني","Email",60], ["ch-ig","instagram_direct","رسائل إنستجرام","Instagram Direct",30], ["ch-fb","facebook_comments","تعليقات فيسبوك","Facebook Comments",45], ["ch-tg","telegram","تيليجرام","Telegram",30], ["ch-web","website_chat","محادثة الموقع","Website Chat",20], ["ch-form","website_form","نماذج الموقع","Website Forms",120], ["ch-gb","google_business","Google Business","Google Business",60], ["ch-li","linkedin","لينكدإن","LinkedIn",120], ["ch-manual","manual","إدخال يدوي","Manual Entry",240], ["ch-phone","phone","مكالمة هاتفية","Phone Call",15]
    ].map(([id,code,nameAr,nameEn,slaMinutes]) => ({ id: String(id), organizationId: org, code: code as never, nameAr: String(nameAr), nameEn: String(nameEn), state: "demo" as const, inboundEnabled: true, replyEnabled: true, defaultAssigneeId: "u-service", slaMinutes: Number(slaMinutes) })),
    users: [
      { id:"u-owner", organizationId:org, name:"عبدالعزيز الجندي", role:"owner", permissions:demoPermissions },
      { id:"u-service", organizationId:org, name:"سارة أحمد", role:"customer_service", permissions:["dashboard.view","inbox.view","conversations.view","conversations.reply","conversations.change_status","conversations.change_priority","internal_notes.create","canned_responses.view","notifications.view"] },
      { id:"u-sales", organizationId:org, name:"محمد علي", role:"sales_manager", permissions:demoPermissions.filter((p)=>p!=="inbox_settings.manage") },
      { id:"u-viewer", organizationId:org, name:"مشاهد تجريبي", role:"viewer", permissions:["dashboard.view","inbox.view","conversations.view","canned_responses.view","notifications.view"] },
      { id:"u-other", organizationId:otherOrg, name:"مستخدم شركة أخرى", role:"owner", permissions:demoPermissions },
    ],
    participants: [
      {id:"p1",organizationId:org,type:"lead",name:"أحمد السالم",phone:"+966501234567",email:"ahmed@example.test",city:"جدة",company:"السالم للمقاولات",source:"WhatsApp",crmId:"lead-demo-1",externalId:"wa-966501234567"},
      {id:"p2",organizationId:org,type:"customer",name:"نورة الحربي",phone:"+966551112233",email:"noura@example.test",city:"الرياض",company:"رؤية الفعاليات",source:"Instagram",crmId:"customer-demo-1",externalId:"ig-noura"},
      {id:"p3",organizationId:org,type:"unknown",name:"مستخدم الموقع",email:"visitor@example.test",source:"Website Chat",externalId:"web-visitor-901"},
      {id:"p-other",organizationId:otherOrg,type:"unknown",name:"عميل شركة أخرى",externalId:"secret-other"},
    ],
    conversations: [
      {id:"c1",organizationId:org,channelId:"ch-wa",participantId:"p1",status:"open",priority:"urgent",assigneeId:"u-service",tags:["عرض سعر","عاجل"],unreadCount:2,createdAt:ago(95),updatedAt:ago(8),firstResponseAt:ago(80),slaState:"within"},
      {id:"c2",organizationId:org,channelId:"ch-ig",participantId:"p2",status:"pending_customer",priority:"medium",assigneeId:"u-sales",tags:["فعالية"],unreadCount:0,createdAt:ago(320),updatedAt:ago(70),firstResponseAt:ago(290),slaState:"at_risk"},
      {id:"c3",organizationId:org,channelId:"ch-web",participantId:"p3",status:"new",priority:"high",tags:["عميل جديد"],unreadCount:1,createdAt:ago(55),updatedAt:ago(55),slaState:"breached"},
      {id:"c-other",organizationId:otherOrg,channelId:"ch-wa",participantId:"p-other",status:"open",priority:"low",tags:[],unreadCount:1,createdAt:ago(10),updatedAt:ago(10),slaState:"within"},
    ],
    messages: [
      {id:"m1",organizationId:org,conversationId:"c1",direction:"inbound",body:"السلام عليكم، أحتاج عرض سعر لتصميم مخططات تنفيذية.",senderName:"أحمد السالم",createdAt:ago(95),deliveryStatus:"read"},
      {id:"m2",organizationId:org,conversationId:"c1",direction:"outbound",body:"وعليكم السلام، يسعدنا خدمتك. هل يمكن تزويدنا بمساحة المشروع؟",senderName:"سارة أحمد",createdAt:ago(80),deliveryStatus:"read",idempotencyKey:"seed-2"},
      {id:"m3",organizationId:org,conversationId:"c1",direction:"inbound",body:"المساحة 1,200 م² والمشروع في جدة.",senderName:"أحمد السالم",createdAt:ago(8),deliveryStatus:"delivered"},
      {id:"m4",organizationId:org,conversationId:"c2",direction:"inbound",body:"هل تقدمون تجهيز جناح معرض كامل؟",senderName:"نورة الحربي",createdAt:ago(320),deliveryStatus:"read"},
      {id:"m5",organizationId:org,conversationId:"c2",direction:"outbound",body:"نعم، من التصميم حتى التنفيذ والتسليم.",senderName:"محمد علي",createdAt:ago(290),deliveryStatus:"read",idempotencyKey:"seed-5"},
      {id:"m6",organizationId:org,conversationId:"c3",direction:"inbound",body:"أرغب في معرفة خدمات التصميم الداخلي المتاحة.",senderName:"مستخدم الموقع",createdAt:ago(55),deliveryStatus:"delivered"},
    ],
    templates: [
      {id:"t1",organizationId:org,nameAr:"ترحيب أولي",nameEn:"Welcome",contentAr:"مرحبًا {{customer_name}}، شكرًا لتواصلك مع {{company_name}}. أنا {{agent_name}} وسأساعدك.",contentEn:"Hello {{customer_name}}, thank you for contacting {{company_name}}. I’m {{agent_name}} and I’ll help you.",category:"general",shortcut:"welcome",channelCodes:["whatsapp","email","website_chat"],active:true},
      {id:"t2",organizationId:org,nameAr:"طلب تفاصيل",nameEn:"Request details",contentAr:"فضلاً أرسل نطاق العمل والموقع والموعد المطلوب لنعد العرض المناسب.",contentEn:"Please share the scope, location, and required date so we can prepare the right proposal.",category:"sales",shortcut:"details",channelCodes:["whatsapp","instagram_direct","email"],active:true},
    ],
    notifications: [
      {id:"n1",organizationId:org,userId:"u-owner",conversationId:"c3",type:"sla_breach",title:"تجاوز محادثة جديدة وقت الرد الأول",read:false,createdAt:ago(5)},
      {id:"n2",organizationId:org,userId:"u-owner",conversationId:"c1",type:"new_message",title:"رسالة جديدة من أحمد السالم",read:false,createdAt:ago(8)},
    ],
    audit: [],
  };
}
