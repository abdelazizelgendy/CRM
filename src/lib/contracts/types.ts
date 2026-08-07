import type { CurrencyCode, SalesRole } from "@/lib/sales/types";

export type ContractStatus =
  | "draft"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "active"
  | "suspended"
  | "completed"
  | "cancelled"
  | "terminated"
  | "expired"
  | "superseded";
export type WorkOrderStatus =
  | "draft"
  | "planned"
  | "ready"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled"
  | "reopened";
export type ChangeOrderStatus =
  | "draft"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "applied"
  | "cancelled";
export type ContractLanguage = "ar" | "en" | "bilingual";
export type ContractRole = SalesRole;
export interface ContractUser {
  id: string;
  organizationId: string;
  name: string;
  role: ContractRole;
  permissions: string[];
}
export interface ContractSourceQuotation {
  id: string;
  organizationId: string;
  quotationId: string;
  salesRequestId: string;
  quotationNumber: string;
  versionNumber: number;
  status: "accepted_demo";
  requestStatus: "won";
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerMobile?: string;
  currency: CurrencyCode;
  title: string;
  valueMinor: bigint;
  acceptedOptionalItemIds: string[];
  lineItems: {
    id: string;
    description: string;
    quantityMills: bigint;
    unit: string;
    unitPriceMinor: bigint;
    optional: boolean;
    selected: boolean;
  }[];
  scope: string;
  terms: string;
  paymentTerms: string;
  duration: string;
}
export interface ContractSection {
  id: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  sortOrder: number;
}
export interface ContractDeliverable {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  ownerId: string;
  status: "pending" | "in_progress" | "completed" | "waived";
  mandatory: boolean;
  completedAt?: string;
}
export interface ContractMilestone {
  id: string;
  title: string;
  dueDate: string;
  status: "pending" | "completed";
  amountMinor?: bigint;
}
export interface PaymentScheduleItem {
  id: string;
  label: string;
  percentageBps: number;
  amountMinor: bigint;
  dueRule: string;
  milestoneId?: string;
  status: "planned" | "due" | "paid_demo" | "cancelled";
}
export interface ContractObligation {
  id: string;
  party: "company" | "customer";
  title: string;
  dueDate: string;
  ownerId: string;
  status: "open" | "completed" | "waived";
  mandatory: boolean;
}
export interface ContractAttachment {
  id: string;
  organizationId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  version: number;
  createdAt: string;
  confidentiality: "internal" | "confidential" | "public";
  storageMetadata: string;
}
export interface ContractSnapshot {
  quotationVersionId: string;
  quotationNumber: string;
  salesRequestId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerMobile?: string;
  acceptedOptionalItemIds: string[];
  title: string;
  scope: string;
  terms: string;
  duration: string;
  currency: CurrencyCode;
  valueMinor: bigint;
  lineItems: ContractSourceQuotation["lineItems"];
  sections: ContractSection[];
  deliverables: ContractDeliverable[];
  milestones: ContractMilestone[];
  paymentSchedule: PaymentScheduleItem[];
  obligations: ContractObligation[];
}
export interface ContractVersion {
  id: string;
  organizationId: string;
  contractId: string;
  versionNumber: number;
  displayNumber: string;
  status: ContractStatus;
  language: ContractLanguage;
  snapshot: ContractSnapshot;
  recordVersion: number;
  reason?: string;
  comparison?: string;
  approvedAt?: string;
  createdAt: string;
  createdBy: string;
}
export interface Contract {
  id: string;
  organizationId: string;
  number: string;
  currentVersionId: string;
  quotationId: string;
  quotationVersionId: string;
  salesRequestId: string;
  customerId: string;
  ownerId: string;
  department: string;
  type: string;
  startDate: string;
  endDate: string;
  currency: CurrencyCode;
  valueMinor: bigint;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  archivedAt?: string;
}
export interface ContractApproval {
  id: string;
  organizationId: string;
  contractVersionId: string;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  comment?: string;
}
export interface ChangeOrder {
  id: string;
  organizationId: string;
  contractId: string;
  number: string;
  type: string;
  reason: string;
  description: string;
  valueImpactMinor: bigint;
  durationImpactDays: number;
  currency: CurrencyCode;
  requestedAt: string;
  requestedBy: string;
  status: ChangeOrderStatus;
  recordVersion: number;
  beforeSnapshot: ContractSnapshot;
  afterSnapshot?: ContractSnapshot;
  appliedAt?: string;
  createdAt: string;
}
export interface WorkOrderChecklistItem {
  id: string;
  title: string;
  mandatory: boolean;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}
export interface WorkOrder {
  id: string;
  organizationId: string;
  contractId: string;
  deliverableId?: string;
  milestoneId?: string;
  number: string;
  title: string;
  description: string;
  type: string;
  priority: "low" | "medium" | "high" | "urgent";
  department: string;
  ownerId: string;
  participantIds: string[];
  startDate: string;
  dueDate: string;
  status: WorkOrderStatus;
  progress: number;
  checklist: WorkOrderChecklistItem[];
  notes: string;
  holdReason?: string;
  cancelReason?: string;
  completedAt?: string;
  closureApprovedAt?: string;
  closureApprovedBy?: string;
  recordVersion: number;
  createdAt: string;
  createdBy: string;
  archivedAt?: string;
}
export interface ContractEvent {
  id: string;
  organizationId: string;
  customerId: string;
  contractId?: string;
  quotationId?: string;
  salesRequestId?: string;
  changeOrderId?: string;
  workOrderId?: string;
  deliverableId?: string;
  action: string;
  summary: string;
  createdAt: string;
  createdBy: string;
}
export interface ContractNotification {
  id: string;
  organizationId: string;
  userId: string;
  type: string;
  entityType: "contract" | "approval" | "change_order" | "work_order";
  entityId: string;
  title: string;
  dedupeKey: string;
  read: boolean;
  createdAt: string;
}
export interface ContractAuditEntry {
  id: string;
  organizationId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  details: string;
  createdAt: string;
}
export interface ContractSnapshotData {
  users: ContractUser[];
  sourceQuotations: ContractSourceQuotation[];
  contracts: Contract[];
  versions: ContractVersion[];
  approvals: ContractApproval[];
  changeOrders: ChangeOrder[];
  workOrders: WorkOrder[];
  attachments: ContractAttachment[];
  timeline: ContractEvent[];
  notifications: ContractNotification[];
  audit: ContractAuditEntry[];
  sequences: Record<string, number>;
  idempotencyKeys: string[];
}
export interface ContractFilters {
  query?: string;
  status?: ContractStatus;
  ownerId?: string;
  department?: string;
  type?: string;
  currency?: CurrencyCode;
  startFrom?: string;
  endTo?: string;
  expiringWithinDays?: number;
  hasOverdueObligations?: boolean;
  hasOverdueWorkOrders?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "newest" | "value" | "end_date";
}
export interface WorkOrderFilters {
  query?: string;
  contractId?: string;
  ownerId?: string;
  department?: string;
  priority?: WorkOrder["priority"];
  status?: WorkOrderStatus;
  overdue?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "newest" | "due_date" | "priority";
}
export interface Paged<T> {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}
