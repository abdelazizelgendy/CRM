export type ChannelCode = "whatsapp" | "facebook_messenger" | "facebook_comments" | "instagram_direct" | "instagram_comments" | "email" | "telegram" | "website_chat" | "website_form" | "google_business" | "linkedin" | "manual" | "phone";
export type ConversationStatus = "new" | "open" | "pending_customer" | "pending_internal" | "resolved" | "closed" | "spam";
export type Priority = "low" | "medium" | "high" | "urgent";
export type DeliveryStatus = "draft" | "queued" | "sent" | "delivered" | "read" | "failed";
export type SlaState = "within" | "at_risk" | "breached";
export type ParticipantType = "lead" | "customer" | "contact" | "unknown";

export interface Channel { id: string; organizationId: string; code: ChannelCode; nameAr: string; nameEn: string; state: "demo" | "disconnected" | "connected"; inboundEnabled: boolean; replyEnabled: boolean; defaultAssigneeId?: string; slaMinutes: number; }
export interface InboxUser { id: string; organizationId: string; name: string; role: string; permissions: string[]; }
export interface Participant { id: string; organizationId: string; type: ParticipantType; name: string; phone?: string; email?: string; city?: string; company?: string; source?: string; crmId?: string; externalId?: string; }
export interface Message { id: string; organizationId: string; conversationId: string; direction: "inbound" | "outbound" | "internal"; body: string; senderName: string; createdAt: string; deliveryStatus: DeliveryStatus; idempotencyKey?: string; attachmentName?: string; }
export interface Conversation { id: string; organizationId: string; channelId: string; participantId: string; subject?: string; status: ConversationStatus; priority: Priority; assigneeId?: string; tags: string[]; unreadCount: number; createdAt: string; updatedAt: string; firstResponseAt?: string; resolvedAt?: string; slaState: SlaState; archivedAt?: string; }
export interface CannedResponse { id: string; organizationId: string; nameAr: string; nameEn: string; contentAr: string; contentEn: string; category: string; shortcut: string; channelCodes: ChannelCode[]; active: boolean; }
export interface Notification { id: string; organizationId: string; userId: string; conversationId?: string; type: "new_message" | "assignment" | "mention" | "sla_breach" | "send_failed" | "reopened"; title: string; read: boolean; createdAt: string; }
export interface AuditEntry { id: string; organizationId: string; actorId: string; conversationId: string; action: string; details: string; createdAt: string; }
export interface InboxSnapshot { channels: Channel[]; users: InboxUser[]; participants: Participant[]; conversations: Conversation[]; messages: Message[]; templates: CannedResponse[]; notifications: Notification[]; audit: AuditEntry[]; }
export interface InboxFilters { query?: string; channel?: ChannelCode; status?: ConversationStatus; priority?: Priority; assigneeId?: string; unread?: boolean; slaState?: SlaState; sort?: "newest" | "oldest" | "priority"; }
export interface InboxMetrics { newCount: number; openCount: number; unreadCount: number; breachedCount: number; averageFirstResponseMinutes: number; averageResolutionMinutes: number; slaCompliance: number; byChannel: Record<string, number>; byAgent: Record<string, number>; }
