import { describe, expect, it } from "vitest";
import { createInboxSeed } from "./seed";
import { InboxError, LocalInboxRepository, renderSafeTemplate } from "./repository";

const org="org-madar-demo";
describe("LocalInboxRepository",()=>{
  it("isolates tenant snapshots",()=>{const repo=new LocalInboxRepository();expect(repo.snapshot(org).conversations.some((c)=>c.organizationId!==org)).toBe(false);expect(repo.snapshot("org-other-demo").conversations).toHaveLength(1);});
  it("blocks cross-tenant conversation access",()=>{const repo=new LocalInboxRepository();expect(()=>repo.updateConversation({organizationId:org,actorId:"u-owner",conversationId:"c-other",status:"closed"})).toThrowError(InboxError);});
  it("enforces viewer read-only permissions",()=>{const repo=new LocalInboxRepository();expect(()=>repo.sendReply({organizationId:org,actorId:"u-viewer",conversationId:"c1",body:"رد",idempotencyKey:"viewer-attempt"})).toThrowError(/Missing permission/);});
  it("sends an outbound reply",()=>{const repo=new LocalInboxRepository();const message=repo.sendReply({organizationId:org,actorId:"u-service",conversationId:"c1",body:"تم الاستلام",idempotencyKey:"reply-1"});expect(message.direction).toBe("outbound");expect(message.deliveryStatus).toBe("sent");});
  it("uses idempotency keys to prevent duplicate sends",()=>{const repo=new LocalInboxRepository();const input={organizationId:org,actorId:"u-owner",conversationId:"c1",body:"مرة واحدة",idempotencyKey:"same-key"};const first=repo.sendReply(input);const second=repo.sendReply(input);expect(second.id).toBe(first.id);expect(repo.snapshot(org).messages.filter((m)=>m.idempotencyKey==="same-key")).toHaveLength(1);});
  it("keeps internal notes separate",()=>{const repo=new LocalInboxRepository();const note=repo.addInternalNote({organizationId:org,actorId:"u-service",conversationId:"c1",body:"للفريق فقط"});expect(note.direction).toBe("internal");});
  it("records status priority and assignment changes",()=>{const repo=new LocalInboxRepository();repo.updateConversation({organizationId:org,actorId:"u-owner",conversationId:"c1",status:"resolved",priority:"low",assigneeId:"u-sales"});const snapshot=repo.snapshot(org);expect(snapshot.conversations.find((c)=>c.id==="c1")).toMatchObject({status:"resolved",priority:"low",assigneeId:"u-sales"});expect(snapshot.audit.at(-1)?.action).toBe("conversation.updated");});
  it("creates a CRM lead from an unknown participant",()=>{const repo=new LocalInboxRepository();const participant=repo.createLeadFromConversation(org,"u-owner","c3");expect(participant.type).toBe("lead");expect(participant.crmId).toMatch(/^lead-/);});
  it("searches messages and filters SLA",()=>{const repo=new LocalInboxRepository();expect(repo.listConversations(org,{query:"التصميم الداخلي",slaState:"breached"}).map((c)=>c.id)).toEqual(["c3"]);});
  it("calculates metrics from records",()=>{const metrics=new LocalInboxRepository().metrics(org);expect(metrics.openCount).toBe(3);expect(metrics.slaCompliance).toBe(67);expect(metrics.averageFirstResponseMinutes).toBeGreaterThan(0);});
  it("marks only the current user's notifications",()=>{const repo=new LocalInboxRepository();repo.markNotificationRead(org,"u-owner");expect(repo.snapshot(org).notifications.every((n)=>n.read)).toBe(true);});
  it("sanitizes message content",()=>{const repo=new LocalInboxRepository();const message=repo.sendReply({organizationId:org,actorId:"u-owner",conversationId:"c1",body:"<script>alert(1)</script>",idempotencyKey:"safe"});expect(message.body).not.toContain("<");});
  it("renders only approved template variables",()=>{expect(renderSafeTemplate("Hi {{customer_name}} {{secret}} <b>",{customer_name:"Ahmed",secret:"x"})).toBe("Hi Ahmed  b");});
  it("detects a duplicate before creating a lead",()=>{const seed=createInboxSeed();const unknown=seed.participants.find((p)=>p.id==="p3")!;unknown.email="ahmed@example.test";const repo=new LocalInboxRepository(seed);expect(()=>repo.createLeadFromConversation(org,"u-owner","c3")).toThrowError(/matching CRM record/);});
});
