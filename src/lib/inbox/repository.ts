import { z } from "zod";
import { createInboxSeed } from "./seed";
import type { AuditEntry, Conversation, ConversationStatus, InboxFilters, InboxMetrics, InboxSnapshot, Message, Participant, Priority } from "./types";

export class InboxError extends Error { constructor(public code: "UNAUTHORIZED"|"FORBIDDEN"|"NOT_FOUND"|"DUPLICATE"|"CROSS_TENANT"|"INVALID", message: string) { super(message); } }

export interface InboxRepository {
  snapshot(organizationId: string): InboxSnapshot;
  listConversations(organizationId: string, filters?: InboxFilters): Conversation[];
  sendReply(input: { organizationId: string; actorId: string; conversationId: string; body: string; idempotencyKey: string }): Message;
  addInternalNote(input: { organizationId: string; actorId: string; conversationId: string; body: string }): Message;
  updateConversation(input: { organizationId: string; actorId: string; conversationId: string; status?: ConversationStatus; priority?: Priority; assigneeId?: string }): Conversation;
  markNotificationRead(organizationId: string, actorId: string, notificationId?: string): void;
  createLeadFromConversation(organizationId: string, actorId: string, conversationId: string): Participant;
  metrics(organizationId: string): InboxMetrics;
}

const bodySchema = z.string().trim().min(1).max(5000).transform((value) => value.replace(/[<>]/g, ""));
const idSchema = z.string().min(2).max(100);
const priorityRank: Record<Priority, number> = { low:1, medium:2, high:3, urgent:4 };

export class LocalInboxRepository implements InboxRepository {
  private data: InboxSnapshot;
  constructor(seed: InboxSnapshot = createInboxSeed()) { this.data = structuredClone(seed); }
  private user(org: string, actor: string, permission?: string) {
    const user = this.data.users.find((item) => item.id === actor && item.organizationId === org);
    if (!user) throw new InboxError("UNAUTHORIZED", "Unknown local user");
    if (permission && !user.permissions.includes(permission)) throw new InboxError("FORBIDDEN", `Missing permission: ${permission}`);
    return user;
  }
  private conversation(org: string, id: string) {
    const found = this.data.conversations.find((item) => item.id === id);
    if (!found) throw new InboxError("NOT_FOUND", "Conversation not found");
    if (found.organizationId !== org) throw new InboxError("CROSS_TENANT", "Cross-tenant access denied");
    return found;
  }
  snapshot(organizationId: string): InboxSnapshot {
    const belongs = <T extends { organizationId: string }>(rows: T[]) => rows.filter((row) => row.organizationId === organizationId);
    return structuredClone({ channels:belongs(this.data.channels), users:belongs(this.data.users), participants:belongs(this.data.participants), conversations:belongs(this.data.conversations), messages:belongs(this.data.messages), templates:belongs(this.data.templates), notifications:belongs(this.data.notifications), audit:belongs(this.data.audit) });
  }
  listConversations(org: string, f: InboxFilters = {}) {
    const snapshot = this.snapshot(org); let rows = snapshot.conversations;
    if (f.channel) { const ids=snapshot.channels.filter((c)=>c.code===f.channel).map((c)=>c.id); rows=rows.filter((c)=>ids.includes(c.channelId)); }
    if (f.status) rows=rows.filter((c)=>c.status===f.status);
    if (f.priority) rows=rows.filter((c)=>c.priority===f.priority);
    if (f.assigneeId) rows=rows.filter((c)=>c.assigneeId===f.assigneeId);
    if (f.unread) rows=rows.filter((c)=>c.unreadCount>0);
    if (f.slaState) rows=rows.filter((c)=>c.slaState===f.slaState);
    if (f.query) { const q=f.query.toLowerCase(); const participantIds=snapshot.participants.filter((p)=>[p.name,p.phone,p.email,p.company].some((v)=>v?.toLowerCase().includes(q))).map((p)=>p.id); const conversationIds=snapshot.messages.filter((m)=>m.body.toLowerCase().includes(q)).map((m)=>m.conversationId); rows=rows.filter((c)=>participantIds.includes(c.participantId)||conversationIds.includes(c.id)); }
    return rows.sort((a,b)=>f.sort==="oldest"?a.updatedAt.localeCompare(b.updatedAt):f.sort==="priority"?priorityRank[b.priority]-priorityRank[a.priority]:b.updatedAt.localeCompare(a.updatedAt));
  }
  sendReply(input: { organizationId:string; actorId:string; conversationId:string; body:string; idempotencyKey:string }) {
    const user=this.user(input.organizationId,input.actorId,"conversations.reply"); const conversation=this.conversation(input.organizationId,idSchema.parse(input.conversationId)); const key=idSchema.parse(input.idempotencyKey);
    const duplicate=this.data.messages.find((m)=>m.organizationId===input.organizationId&&m.idempotencyKey===key); if(duplicate) return structuredClone(duplicate);
    const message:Message={id:`m-${crypto.randomUUID()}`,organizationId:input.organizationId,conversationId:conversation.id,direction:"outbound",body:bodySchema.parse(input.body),senderName:user.name,createdAt:new Date().toISOString(),deliveryStatus:"sent",idempotencyKey:key};
    this.data.messages.push(message); conversation.updatedAt=message.createdAt; if(!conversation.firstResponseAt) conversation.firstResponseAt=message.createdAt; conversation.status="open"; this.audit(input.organizationId,input.actorId,conversation.id,"reply.sent","Demo reply sent"); return structuredClone(message);
  }
  addInternalNote(input:{organizationId:string;actorId:string;conversationId:string;body:string}) { const user=this.user(input.organizationId,input.actorId,"internal_notes.create"); const conversation=this.conversation(input.organizationId,input.conversationId); const note:Message={id:`note-${crypto.randomUUID()}`,organizationId:input.organizationId,conversationId:conversation.id,direction:"internal",body:bodySchema.parse(input.body),senderName:user.name,createdAt:new Date().toISOString(),deliveryStatus:"read"}; this.data.messages.push(note); this.audit(input.organizationId,input.actorId,conversation.id,"internal_note.created","Internal note created"); return structuredClone(note); }
  updateConversation(input:{organizationId:string;actorId:string;conversationId:string;status?:ConversationStatus;priority?:Priority;assigneeId?:string}) { const conversation=this.conversation(input.organizationId,input.conversationId); if(input.status){this.user(input.organizationId,input.actorId,input.status==="closed"?"conversations.close":"conversations.change_status");conversation.status=input.status;if(input.status==="resolved")conversation.resolvedAt=new Date().toISOString();} if(input.priority){this.user(input.organizationId,input.actorId,"conversations.change_priority");conversation.priority=input.priority;} if(input.assigneeId){this.user(input.organizationId,input.actorId,"conversations.assign");const assignee=this.data.users.find((u)=>u.id===input.assigneeId&&u.organizationId===input.organizationId);if(!assignee)throw new InboxError("CROSS_TENANT","Invalid assignee");conversation.assigneeId=assignee.id;} conversation.updatedAt=new Date().toISOString();this.audit(input.organizationId,input.actorId,conversation.id,"conversation.updated",JSON.stringify({status:input.status,priority:input.priority,assigneeId:input.assigneeId}));return structuredClone(conversation); }
  markNotificationRead(org:string,actor:string,id?:string){this.user(org,actor,"notifications.view");for(const n of this.data.notifications)if(n.organizationId===org&&n.userId===actor&&(!id||n.id===id))n.read=true;}
  createLeadFromConversation(org:string,actor:string,conversationId:string){this.user(org,actor,"conversations.link_crm");const conversation=this.conversation(org,conversationId);const participant=this.data.participants.find((p)=>p.id===conversation.participantId&&p.organizationId===org);if(!participant)throw new InboxError("NOT_FOUND","Participant not found");if(participant.type!=="unknown")return structuredClone(participant);const duplicate=this.data.participants.find((p)=>p.organizationId===org&&p.id!==participant.id&&p.type!=="unknown"&&((participant.email&&p.email?.toLowerCase()===participant.email.toLowerCase())||(participant.phone&&p.phone===participant.phone)));if(duplicate)throw new InboxError("DUPLICATE","A matching CRM record already exists");participant.type="lead";participant.crmId=`lead-${crypto.randomUUID()}`;this.audit(org,actor,conversation.id,"conversation.linked_to_lead",participant.crmId);return structuredClone(participant);}
  metrics(org:string):InboxMetrics { const rows=this.snapshot(org); const active=rows.conversations.filter((c)=>!c.archivedAt); const responded=active.filter((c)=>c.firstResponseAt); const resolved=active.filter((c)=>c.resolvedAt); const avg=(values:number[])=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):0; return {newCount:active.filter((c)=>c.status==="new").length,openCount:active.filter((c)=>["new","open","pending_customer","pending_internal"].includes(c.status)).length,unreadCount:active.reduce((n,c)=>n+c.unreadCount,0),breachedCount:active.filter((c)=>c.slaState==="breached").length,averageFirstResponseMinutes:avg(responded.map((c)=>(Date.parse(c.firstResponseAt!)-Date.parse(c.createdAt))/60000)),averageResolutionMinutes:avg(resolved.map((c)=>(Date.parse(c.resolvedAt!)-Date.parse(c.createdAt))/60000)),slaCompliance:active.length?Math.round(active.filter((c)=>c.slaState!=="breached").length/active.length*100):100,byChannel:Object.fromEntries(rows.channels.map((ch)=>[ch.code,active.filter((c)=>c.channelId===ch.id).length])),byAgent:Object.fromEntries(rows.users.map((u)=>[u.name,active.filter((c)=>c.assigneeId===u.id).length]))}; }
  private audit(org:string,actor:string,conversationId:string,action:string,details:string){const entry:AuditEntry={id:`audit-${crypto.randomUUID()}`,organizationId:org,actorId:actor,conversationId,action,details,createdAt:new Date().toISOString()};this.data.audit.push(entry);}
}

export class SupabaseInboxRepository implements InboxRepository {
  private unavailable(): never { throw new InboxError("INVALID","Supabase inbox adapter is a contract stub until the integration phase"); }
  snapshot():InboxSnapshot{return this.unavailable();} listConversations():Conversation[]{return this.unavailable();} sendReply():Message{return this.unavailable();} addInternalNote():Message{return this.unavailable();} updateConversation():Conversation{return this.unavailable();} markNotificationRead():void{return this.unavailable();} createLeadFromConversation():Participant{return this.unavailable();} metrics():InboxMetrics{return this.unavailable();}
}

export function renderSafeTemplate(template:string, values:Record<string,string>){const allowed=new Set(["customer_name","company_name","agent_name","ticket_number"]);return template.replace(/\{\{([a-z_]+)\}\}/g,(_match,key:string)=>allowed.has(key)?(values[key]??""):"").replace(/[<>]/g,"");}
