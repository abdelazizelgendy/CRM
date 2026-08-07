import { applyChangeOrder, calculatePaymentSchedule } from "./calculations";
import { toSafeCsv } from "./csv";
import {
  CHANGE_ORDER_TRANSITIONS,
  CONTRACT_TRANSITIONS,
  WORK_ORDER_TRANSITIONS,
  assertTransition,
  isOverdue,
} from "./domain";
import { createContractSeed } from "./seed";
import { changeOrderCreateSchema, contractConversionSchema, workOrderCreateSchema } from "./schemas";
import type {
  ChangeOrder,
  ChangeOrderStatus,
  Contract,
  ContractApproval,
  ContractFilters,
  ContractSnapshot,
  ContractSnapshotData,
  ContractStatus,
  ContractVersion,
  Paged,
  WorkOrder,
  WorkOrderFilters,
  WorkOrderStatus,
} from "./types";

export class ContractError extends Error {
  constructor(
    public code:
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "CROSS_TENANT"
      | "INVALID"
      | "CONFLICT"
      | "DUPLICATE",
    message: string,
  ) {
    super(message);
  }
}
const clean = (value: string) => value.replace(/[<>]/g, "").trim();
export interface ContractRepository {
  snapshot(org: string, actor: string): ContractSnapshotData;
  listContracts(
    org: string,
    actor: string,
    filters?: ContractFilters,
  ): Paged<{ contract: Contract; version: ContractVersion }>;
  listWorkOrders(
    org: string,
    actor: string,
    filters?: WorkOrderFilters,
  ): Paged<WorkOrder>;
  exportContracts(
    org: string,
    actor: string,
    filters?: ContractFilters,
  ): string;
  exportWorkOrders(
    org: string,
    actor: string,
    filters?: WorkOrderFilters,
  ): string;
  createFromQuotation(input: {
    organizationId: string;
    actorId: string;
    quotationVersionId: string;
    ownerId: string;
    department: string;
    type: string;
    startDate: string;
    endDate: string;
    language: "ar" | "en" | "bilingual";
    idempotencyKey: string;
  }): ContractVersion;
  updateDraft(input: {
    organizationId: string;
    actorId: string;
    versionId: string;
    expectedVersion: number;
    title?: string;
    scope?: string;
    terms?: string;
    sections?: ContractSnapshot["sections"];
    deliverables?: ContractSnapshot["deliverables"];
    milestones?: ContractSnapshot["milestones"];
    obligations?: ContractSnapshot["obligations"];
    paymentSchedule?: {
      id: string;
      label: string;
      percentageBps: number;
      dueRule: string;
      milestoneId?: string;
      status: "planned" | "due" | "paid_demo" | "cancelled";
    }[];
  }): ContractVersion;
  submitForApproval(
    org: string,
    actor: string,
    versionId: string,
  ): ContractApproval;
  decideApproval(input: {
    organizationId: string;
    actorId: string;
    approvalId: string;
    decision: "approved" | "rejected" | "changes_requested";
    comment: string;
  }): ContractApproval;
  transitionContract(input: {
    organizationId: string;
    actorId: string;
    versionId: string;
    to: ContractStatus;
    reason?: string;
  }): ContractVersion;
  createRevision(input: {
    organizationId: string;
    actorId: string;
    contractId: string;
    reason: string;
    comparison: string;
  }): ContractVersion;
  createChangeOrder(input: {
    organizationId: string;
    actorId: string;
    contractId: string;
    type: string;
    reason: string;
    description: string;
    valueImpactMinor: bigint;
    durationImpactDays: number;
  }): ChangeOrder;
  transitionChangeOrder(input: {
    organizationId: string;
    actorId: string;
    changeOrderId: string;
    to: ChangeOrderStatus;
    reason?: string;
  }): ChangeOrder;
  createWorkOrder(input: {
    organizationId: string;
    actorId: string;
    contractId: string;
    deliverableId?: string;
    title: string;
    description: string;
    type: string;
    priority: WorkOrder["priority"];
    department: string;
    ownerId: string;
    participantIds?: string[];
    startDate: string;
    dueDate: string;
    checklist: { title: string; mandatory: boolean }[];
    overrideReason?: string;
  }): WorkOrder;
  updateWorkOrder(input: {
    organizationId: string;
    actorId: string;
    workOrderId: string;
    expectedVersion: number;
    progress?: number;
    notes?: string;
    checklist?: WorkOrder["checklist"];
  }): WorkOrder;
  transitionWorkOrder(input: {
    organizationId: string;
    actorId: string;
    workOrderId: string;
    to: WorkOrderStatus;
    reason?: string;
  }): WorkOrder;
  approveClosure(org: string, actor: string, workOrderId: string): WorkOrder;
}

export class LocalContractRepository implements ContractRepository {
  private data: ContractSnapshotData;
  constructor(seed: ContractSnapshotData = createContractSeed()) {
    this.data = structuredClone(seed);
  }
  private user(org: string, actor: string, permission?: string) {
    const user = this.data.users.find((x) => x.id === actor);
    if (!user) throw new ContractError("UNAUTHORIZED", "Unknown user");
    if (user.organizationId !== org)
      throw new ContractError("CROSS_TENANT", "Cross-tenant actor denied");
    if (permission && !user.permissions.includes(permission))
      throw new ContractError("FORBIDDEN", `Missing permission: ${permission}`);
    return user;
  }
  private owned<T extends { id: string; organizationId: string }>(
    rows: T[],
    org: string,
    id: string,
  ) {
    const row = rows.find((x) => x.id === id);
    if (!row) throw new ContractError("NOT_FOUND", "Record not found");
    if (row.organizationId !== org)
      throw new ContractError("CROSS_TENANT", "Cross-tenant access denied");
    return row;
  }
  private page<T>(rows: T[], page = 1, pageSize = 20): Paged<T> {
    const size = Math.min(100, Math.max(1, pageSize)),
      total = rows.length,
      pages = Math.max(1, Math.ceil(total / size)),
      safe = Math.min(Math.max(1, page), pages);
    return {
      rows: rows.slice((safe - 1) * size, safe * size),
      page: safe,
      pageSize: size,
      total,
      pages,
    };
  }
  private next(org: string, type: "contract" | "work_order" | "change_order") {
    const year = new Date().getUTCFullYear(),
      key = `${org}:${year}:${type}`,
      n = (this.data.sequences[key] ?? 0) + 1;
    this.data.sequences[key] = n;
    return `${type === "contract" ? "CTR" : type === "work_order" ? "WO" : "CO"}-${year}-${String(n).padStart(5, "0")}`;
  }
  private audit(
    org: string,
    actor: string,
    type: string,
    id: string,
    action: string,
    details = "",
  ) {
    this.data.audit.push({
      id: `ca-${crypto.randomUUID()}`,
      organizationId: org,
      actorId: actor,
      entityType: type,
      entityId: id,
      action,
      details: clean(details).slice(0, 500),
      createdAt: new Date().toISOString(),
    });
  }
  private event(
    org: string,
    actor: string,
    contract: Contract,
    action: string,
    summary: string,
    extra: Partial<{
      changeOrderId: string;
      workOrderId: string;
      deliverableId: string;
    }> = {},
  ) {
    this.data.timeline.push({
      id: `ct-${crypto.randomUUID()}`,
      organizationId: org,
      customerId: contract.customerId,
      contractId: contract.id,
      quotationId: contract.quotationId,
      salesRequestId: contract.salesRequestId,
      action,
      summary: clean(summary),
      createdAt: new Date().toISOString(),
      createdBy: actor,
      ...extra,
    });
  }
  private notify(
    org: string,
    userId: string,
    type: string,
    entityType: "contract" | "approval" | "change_order" | "work_order",
    entityId: string,
    title: string,
    key: string,
  ) {
    if (
      !this.data.notifications.some(
        (x) => x.organizationId === org && x.dedupeKey === key,
      )
    )
      this.data.notifications.push({
        id: `cn-${crypto.randomUUID()}`,
        organizationId: org,
        userId,
        type,
        entityType,
        entityId,
        title,
        read: false,
        dedupeKey: key,
        createdAt: new Date().toISOString(),
      });
  }
  snapshot(org: string, actor: string) {
    const user = this.user(org, actor, "contracts.view"),
      own = <T extends { organizationId: string }>(rows: T[]) =>
        rows.filter((x) => x.organizationId === org),
      out = {
        ...structuredClone(this.data),
        users: own(this.data.users),
        sourceQuotations: own(this.data.sourceQuotations),
        contracts: own(this.data.contracts),
        versions: own(this.data.versions),
        approvals: own(this.data.approvals),
        changeOrders: own(this.data.changeOrders),
        workOrders: own(this.data.workOrders),
        attachments: own(this.data.attachments),
        timeline: own(this.data.timeline),
        notifications: own(this.data.notifications),
        audit: ["owner", "admin"].includes(user.role)
          ? own(this.data.audit)
          : [],
        sequences: {},
        idempotencyKeys: [],
      };
    if (!user.permissions.includes("contracts.view_financials")) {
      out.contracts = out.contracts.map((x) => ({ ...x, valueMinor: 0n }));
      out.versions = out.versions.map((x) => ({
        ...x,
        snapshot: {
          ...x.snapshot,
          valueMinor: 0n,
          paymentSchedule: x.snapshot.paymentSchedule.map((p) => ({
            ...p,
            amountMinor: 0n,
          })),
        },
      }));
      out.changeOrders = out.changeOrders.map((x) => ({
        ...x,
        valueImpactMinor: 0n,
        beforeSnapshot: {
          ...x.beforeSnapshot,
          valueMinor: 0n,
          paymentSchedule: x.beforeSnapshot.paymentSchedule.map((p) => ({
            ...p,
            amountMinor: 0n,
          })),
        },
        afterSnapshot: x.afterSnapshot
          ? {
              ...x.afterSnapshot,
              valueMinor: 0n,
              paymentSchedule: x.afterSnapshot.paymentSchedule.map((p) => ({
                ...p,
                amountMinor: 0n,
              })),
            }
          : undefined,
      }));
    }
    return out;
  }
  listContracts(org: string, actor: string, f: ContractFilters = {}) {
    const user = this.user(org, actor, "contracts.view");
    let rows = this.data.contracts
      .filter((x) => x.organizationId === org && !x.archivedAt)
      .map((contract) => ({
        contract,
        version: this.owned(this.data.versions, org, contract.currentVersionId),
      }));
    if (user.role === "sales_agent")
      rows = rows.filter(
        (x) => x.contract.ownerId === actor || x.contract.createdBy === actor,
      );
    if (f.query) {
      const q = f.query.toLowerCase();
      rows = rows.filter((x) =>
        [
          x.contract.number,
          x.version.displayNumber,
          x.version.snapshot.title,
          x.version.snapshot.customerName,
          x.version.snapshot.customerEmail,
          x.version.snapshot.customerMobile,
          x.version.snapshot.quotationNumber,
          x.version.snapshot.salesRequestId,
          x.contract.ownerId,
          x.contract.department,
          x.contract.type,
        ].some((v) => v?.toLowerCase().includes(q)),
      );
    }
    if (f.status) rows = rows.filter((x) => x.version.status === f.status);
    if (f.ownerId) rows = rows.filter((x) => x.contract.ownerId === f.ownerId);
    if (f.department)
      rows = rows.filter((x) => x.contract.department === f.department);
    if (f.type) rows = rows.filter((x) => x.contract.type === f.type);
    if (f.currency)
      rows = rows.filter((x) => x.contract.currency === f.currency);
    if (f.startFrom)
      rows = rows.filter((x) => x.contract.startDate >= f.startFrom!);
    if (f.endTo) rows = rows.filter((x) => x.contract.endDate <= f.endTo!);
    if (f.expiringWithinDays !== undefined) {
      const limit = new Date(Date.now() + f.expiringWithinDays * 86400000)
          .toISOString()
          .slice(0, 10),
        today = new Date().toISOString().slice(0, 10);
      rows = rows.filter(
        (x) => x.contract.endDate >= today && x.contract.endDate <= limit,
      );
    }
    if (f.hasOverdueObligations)
      rows = rows.filter((x) =>
        x.version.snapshot.obligations.some((o) =>
          isOverdue(o.dueDate, o.status),
        ),
      );
    if (f.hasOverdueWorkOrders)
      rows = rows.filter((x) =>
        this.data.workOrders.some(
          (w) =>
            w.contractId === x.contract.id && isOverdue(w.dueDate, w.status),
        ),
      );
    rows.sort((a, b) =>
      f.sort === "value"
        ? b.contract.valueMinor > a.contract.valueMinor
          ? 1
          : -1
        : f.sort === "end_date"
          ? a.contract.endDate.localeCompare(b.contract.endDate)
          : b.contract.createdAt.localeCompare(a.contract.createdAt),
    );
    const result = this.page(rows, f.page, f.pageSize);
    if (!user.permissions.includes("contracts.view_financials"))
      result.rows = result.rows.map((x) => ({
        contract: { ...x.contract, valueMinor: 0n },
        version: {
          ...x.version,
          snapshot: {
            ...x.version.snapshot,
            valueMinor: 0n,
            paymentSchedule: x.version.snapshot.paymentSchedule.map((p) => ({
              ...p,
              amountMinor: 0n,
            })),
          },
        },
      }));
    return structuredClone(result);
  }
  listWorkOrders(org: string, actor: string, f: WorkOrderFilters = {}) {
    this.user(org, actor, "work_orders.view");
    let rows = this.data.workOrders.filter(
      (x) => x.organizationId === org && !x.archivedAt,
    );
    if (f.query) {
      const q = f.query.toLowerCase();
      rows = rows.filter((x) =>
        [x.number, x.title, x.description, x.department, x.ownerId].some((v) =>
          v.toLowerCase().includes(q),
        ),
      );
    }
    if (f.contractId) rows = rows.filter((x) => x.contractId === f.contractId);
    if (f.ownerId) rows = rows.filter((x) => x.ownerId === f.ownerId);
    if (f.department) rows = rows.filter((x) => x.department === f.department);
    if (f.priority) rows = rows.filter((x) => x.priority === f.priority);
    if (f.status) rows = rows.filter((x) => x.status === f.status);
    if (f.overdue) rows = rows.filter((x) => isOverdue(x.dueDate, x.status));
    const priority = { urgent: 4, high: 3, medium: 2, low: 1 };
    rows.sort((a, b) =>
      f.sort === "due_date"
        ? a.dueDate.localeCompare(b.dueDate)
        : f.sort === "priority"
          ? priority[b.priority] - priority[a.priority]
          : b.createdAt.localeCompare(a.createdAt),
    );
    return this.page(structuredClone(rows), f.page, f.pageSize);
  }
  exportContracts(org: string, actor: string, f: ContractFilters = {}) {
    this.user(org, actor, "contracts.export");
    const rows = this.listContracts(org, actor, {
      ...f,
      page: 1,
      pageSize: 100,
    }).rows;
    return toSafeCsv(
      [
        "Contract",
        "Title",
        "Customer",
        "Status",
        "Currency",
        "Value minor",
        "Start",
        "End",
      ],
      rows.map((x) => [
        x.contract.number,
        x.version.snapshot.title,
        x.version.snapshot.customerName,
        x.version.status,
        x.contract.currency,
        x.contract.valueMinor,
        x.contract.startDate,
        x.contract.endDate,
      ]),
    );
  }
  exportWorkOrders(org: string, actor: string, f: WorkOrderFilters = {}) {
    this.user(org, actor, "work_orders.export");
    return toSafeCsv(
      [
        "Work order",
        "Title",
        "Contract",
        "Owner",
        "Priority",
        "Status",
        "Due",
        "Progress",
      ],
      this.listWorkOrders(org, actor, {
        ...f,
        page: 1,
        pageSize: 100,
      }).rows.map((x) => [
        x.number,
        x.title,
        x.contractId,
        x.ownerId,
        x.priority,
        x.status,
        x.dueDate,
        x.progress,
      ]),
    );
  }
  createFromQuotation(
    raw: Parameters<ContractRepository["createFromQuotation"]>[0],
  ) {
    const input = contractConversionSchema.parse(raw);
    this.user(input.organizationId, input.actorId, "contracts.create");
    if (!input.idempotencyKey.trim())
      throw new ContractError("INVALID", "Idempotency key is required");
    const duplicateKey = this.data.idempotencyKeys.includes(
        `${input.organizationId}:${input.idempotencyKey}`,
      ),
      existing = this.data.contracts.find(
        (x) =>
          x.organizationId === input.organizationId &&
          x.quotationVersionId === input.quotationVersionId &&
          !x.archivedAt,
      );
    if (duplicateKey && existing)
      return structuredClone(
        this.owned(
          this.data.versions,
          input.organizationId,
          existing.currentVersionId,
        ),
      );
    if (existing)
      throw new ContractError(
        "DUPLICATE",
        "An original contract already exists for this quotation version",
      );
    const quote = this.owned(
      this.data.sourceQuotations,
      input.organizationId,
      input.quotationVersionId,
    );
    if (quote.status !== "accepted_demo" || quote.requestStatus !== "won")
      throw new ContractError(
        "CONFLICT",
        "Quotation is not eligible for contract conversion",
      );
    if (input.endDate < input.startDate)
      throw new ContractError("INVALID", "End date must follow start date");
    const number = this.next(input.organizationId, "contract"),
      now = new Date().toISOString(),
      contractId = `ctr-${crypto.randomUUID()}`,
      versionId = `cv-${crypto.randomUUID()}`,
      milestones = [
        {
          id: `mil-${crypto.randomUUID()}`,
          title: "البدء",
          dueDate: input.startDate,
          status: "pending" as const,
        },
        {
          id: `mil-${crypto.randomUUID()}`,
          title: "التسليم",
          dueDate: input.endDate,
          status: "pending" as const,
        },
      ],
      snapshot: ContractSnapshot = {
        quotationVersionId: quote.id,
        quotationNumber: quote.quotationNumber,
        salesRequestId: quote.salesRequestId,
        customerId: quote.customerId,
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        customerMobile: quote.customerMobile,
        acceptedOptionalItemIds: quote.acceptedOptionalItemIds,
        title: quote.title,
        scope: quote.scope,
        terms: quote.terms,
        duration: quote.duration,
        currency: quote.currency,
        valueMinor: quote.valueMinor,
        lineItems: quote.lineItems
          .filter(
            (x) => !x.optional || quote.acceptedOptionalItemIds.includes(x.id),
          )
          .map((x) => ({ ...x, selected: true })),
        sections: [
          {
            id: `sec-${crypto.randomUUID()}`,
            titleAr: "نطاق العمل",
            titleEn: "Scope",
            bodyAr: quote.scope,
            bodyEn: "[Please add reviewed English scope]",
            sortOrder: 1,
          },
          {
            id: `sec-${crypto.randomUUID()}`,
            titleAr: "الشروط",
            titleEn: "Terms",
            bodyAr: quote.terms,
            bodyEn: "[Please add reviewed English terms]",
            sortOrder: 2,
          },
        ],
        deliverables: [],
        milestones,
        paymentSchedule: calculatePaymentSchedule(quote.valueMinor, [
          {
            id: `pay-${crypto.randomUUID()}`,
            label: "دفعة مقدمة",
            percentageBps: 5000,
            dueRule: "عند التفعيل",
            milestoneId: milestones[0].id,
            status: "planned",
          },
          {
            id: `pay-${crypto.randomUUID()}`,
            label: "دفعة نهائية",
            percentageBps: 5000,
            dueRule: "عند التسليم",
            milestoneId: milestones[1].id,
            status: "planned",
          },
        ]),
        obligations: [],
      },
      contract: Contract = {
        id: contractId,
        organizationId: input.organizationId,
        number,
        currentVersionId: versionId,
        quotationId: quote.quotationId,
        quotationVersionId: quote.id,
        salesRequestId: quote.salesRequestId,
        customerId: quote.customerId,
        ownerId: input.ownerId,
        department: clean(input.department),
        type: clean(input.type),
        startDate: input.startDate,
        endDate: input.endDate,
        currency: quote.currency,
        valueMinor: quote.valueMinor,
        createdAt: now,
        updatedAt: now,
        createdBy: input.actorId,
      },
      version: ContractVersion = {
        id: versionId,
        organizationId: input.organizationId,
        contractId,
        versionNumber: 1,
        displayNumber: `${number}-V1`,
        status: "draft",
        language: input.language,
        snapshot,
        recordVersion: 1,
        createdAt: now,
        createdBy: input.actorId,
      };
    this.data.contracts.push(contract);
    this.data.versions.push(version);
    this.data.idempotencyKeys.push(
      `${input.organizationId}:${input.idempotencyKey}`,
    );
    this.event(
      input.organizationId,
      input.actorId,
      contract,
      "contract.created",
      `إنشاء ${number}`,
    );
    this.audit(
      input.organizationId,
      input.actorId,
      "contract",
      contract.id,
      "contract.created",
      quote.quotationNumber,
    );
    return structuredClone(version);
  }
  updateDraft(input: Parameters<ContractRepository["updateDraft"]>[0]) {
    this.user(input.organizationId, input.actorId, "contracts.update_draft");
    const version = this.owned(
      this.data.versions,
      input.organizationId,
      input.versionId,
    );
    if (!["draft", "changes_requested"].includes(version.status))
      throw new ContractError(
        "CONFLICT",
        "Only draft or changes-requested versions are editable",
      );
    if (version.recordVersion !== input.expectedVersion)
      throw new ContractError("CONFLICT", "Contract version conflict");
    if (input.title !== undefined) version.snapshot.title = clean(input.title);
    if (input.scope !== undefined) version.snapshot.scope = clean(input.scope);
    if (input.terms !== undefined) version.snapshot.terms = clean(input.terms);
    if (input.sections)
      version.snapshot.sections = input.sections.map((x, i) => ({
        ...x,
        titleAr: clean(x.titleAr),
        titleEn: clean(x.titleEn),
        bodyAr: clean(x.bodyAr),
        bodyEn: clean(x.bodyEn),
        sortOrder: i + 1,
      }));
    if (input.deliverables)
      version.snapshot.deliverables = structuredClone(input.deliverables);
    if (input.milestones)
      version.snapshot.milestones = structuredClone(input.milestones);
    if (input.obligations)
      version.snapshot.obligations = structuredClone(input.obligations);
    if (input.paymentSchedule)
      version.snapshot.paymentSchedule = calculatePaymentSchedule(
        version.snapshot.valueMinor,
        input.paymentSchedule,
      );
    version.recordVersion++;
    this.audit(
      input.organizationId,
      input.actorId,
      "contract_version",
      version.id,
      "contract.draft_updated",
      `record_version=${version.recordVersion}`,
    );
    return structuredClone(version);
  }
  submitForApproval(org: string, actor: string, versionId: string) {
    this.user(org, actor, "contracts.submit_for_approval");
    const version = this.owned(this.data.versions, org, versionId);
    assertTransition(CONTRACT_TRANSITIONS, version.status, "under_review");
    version.status = "under_review";
    const existing = this.data.approvals.find(
      (x) =>
        x.organizationId === org &&
        x.contractVersionId === version.id &&
        x.status === "pending",
    );
    if (existing) return structuredClone(existing);
    const row: ContractApproval = {
      id: `cap-${crypto.randomUUID()}`,
      organizationId: org,
      contractVersionId: version.id,
      status: "pending",
      requestedBy: actor,
      requestedAt: new Date().toISOString(),
    };
    this.data.approvals.push(row);
    for (const u of this.data.users.filter(
      (x) =>
        x.organizationId === org && x.permissions.includes("contracts.approve"),
    ))
      this.notify(
        org,
        u.id,
        "contract_approval_requested",
        "approval",
        row.id,
        `اعتماد ${version.displayNumber}`,
        `contract-approval:${row.id}:${u.id}`,
      );
    this.audit(
      org,
      actor,
      "contract_version",
      version.id,
      "contract.submitted",
      row.id,
    );
    return structuredClone(row);
  }
  decideApproval(input: Parameters<ContractRepository["decideApproval"]>[0]) {
    this.user(input.organizationId, input.actorId, "contracts.approve");
    const approval = this.owned(
      this.data.approvals,
      input.organizationId,
      input.approvalId,
    );
    if (approval.status !== "pending")
      throw new ContractError("CONFLICT", "Approval already completed");
    if (approval.requestedBy === input.actorId)
      throw new ContractError(
        "FORBIDDEN",
        "Creator cannot approve their own contract",
      );
    if (input.decision !== "approved" && !input.comment.trim())
      throw new ContractError("INVALID", "Comment is required");
    const version = this.owned(
      this.data.versions,
      input.organizationId,
      approval.contractVersionId,
    );
    assertTransition(
      CONTRACT_TRANSITIONS,
      version.status,
      input.decision === "approved"
        ? "approved"
        : input.decision === "changes_requested"
          ? "changes_requested"
          : "changes_requested",
    );
    approval.status = input.decision;
    approval.decidedBy = input.actorId;
    approval.decidedAt = new Date().toISOString();
    approval.comment = clean(input.comment);
    version.status =
      input.decision === "approved" ? "approved" : "changes_requested";
    if (input.decision === "approved") {
      version.approvedAt = approval.decidedAt;
      for (const prior of this.data.versions.filter(
        (x) =>
          x.organizationId === input.organizationId &&
          x.contractId === version.contractId &&
          x.id !== version.id &&
          ["approved", "active"].includes(x.status),
      ))
        prior.status = "superseded";
    }
    this.audit(
      input.organizationId,
      input.actorId,
      "contract_approval",
      approval.id,
      `approval.${input.decision}`,
      input.comment,
    );
    return structuredClone(approval);
  }
  transitionContract(
    input: Parameters<ContractRepository["transitionContract"]>[0],
  ) {
    const permission: Record<string, string> = {
      active: "contracts.activate",
      suspended: "contracts.suspend",
      terminated: "contracts.terminate",
      completed: "contracts.complete",
      cancelled: "contracts.update_draft",
      expired: "contracts.complete",
    };
    this.user(
      input.organizationId,
      input.actorId,
      permission[input.to] ?? "contracts.update_draft",
    );
    const version = this.owned(
      this.data.versions,
      input.organizationId,
      input.versionId,
    );
    assertTransition(CONTRACT_TRANSITIONS, version.status, input.to);
    if (
      ["suspended", "terminated", "cancelled"].includes(input.to) &&
      !input.reason?.trim()
    )
      throw new ContractError("INVALID", "Reason is required");
    if (
      input.to === "completed" &&
      version.snapshot.deliverables.some(
        (x) => x.mandatory && !["completed", "waived"].includes(x.status),
      )
    )
      throw new ContractError(
        "CONFLICT",
        "Mandatory deliverables are incomplete",
      );
    version.status = input.to;
    version.recordVersion++;
    const contract = this.owned(
      this.data.contracts,
      input.organizationId,
      version.contractId,
    );
    contract.updatedAt = new Date().toISOString();
    this.event(
      input.organizationId,
      input.actorId,
      contract,
      `contract.${input.to}`,
      `${version.displayNumber}: ${input.to}`,
    );
    this.audit(
      input.organizationId,
      input.actorId,
      "contract_version",
      version.id,
      `contract.${input.to}`,
      input.reason,
    );
    return structuredClone(version);
  }
  createRevision(input: Parameters<ContractRepository["createRevision"]>[0]) {
    this.user(input.organizationId, input.actorId, "contracts.create_revision");
    if (!input.reason.trim())
      throw new ContractError("INVALID", "Revision reason is required");
    const contract = this.owned(
        this.data.contracts,
        input.organizationId,
        input.contractId,
      ),
      old = this.owned(
        this.data.versions,
        input.organizationId,
        contract.currentVersionId,
      );
    if (!["approved", "active", "suspended"].includes(old.status))
      throw new ContractError(
        "CONFLICT",
        "Only approved or active contracts can be revised",
      );
    const now = new Date().toISOString(),
      version: ContractVersion = {
        ...structuredClone(old),
        id: `cv-${crypto.randomUUID()}`,
        versionNumber: old.versionNumber + 1,
        displayNumber: `${contract.number}-V${old.versionNumber + 1}`,
        status: "draft",
        recordVersion: 1,
        reason: clean(input.reason),
        comparison: clean(input.comparison),
        approvedAt: undefined,
        createdAt: now,
        createdBy: input.actorId,
      };
    contract.currentVersionId = version.id;
    contract.updatedAt = now;
    this.data.versions.push(version);
    this.audit(
      input.organizationId,
      input.actorId,
      "contract",
      contract.id,
      "contract.revision_created",
      input.reason,
    );
    return structuredClone(version);
  }
  createChangeOrder(
    raw: Parameters<ContractRepository["createChangeOrder"]>[0],
  ) {
    const input = changeOrderCreateSchema.parse(raw);
    this.user(input.organizationId, input.actorId, "change_orders.create");
    const contract = this.owned(
        this.data.contracts,
        input.organizationId,
        input.contractId,
      ),
      version = this.owned(
        this.data.versions,
        input.organizationId,
        contract.currentVersionId,
      );
    if (!["active", "suspended"].includes(version.status))
      throw new ContractError(
        "CONFLICT",
        "Change orders require an active or suspended contract",
      );
    if (!input.reason.trim() || !input.description.trim())
      throw new ContractError("INVALID", "Reason and description are required");
    const row: ChangeOrder = {
      id: `co-${crypto.randomUUID()}`,
      organizationId: input.organizationId,
      contractId: contract.id,
      number: this.next(input.organizationId, "change_order"),
      type: clean(input.type),
      reason: clean(input.reason),
      description: clean(input.description),
      valueImpactMinor: input.valueImpactMinor,
      durationImpactDays: input.durationImpactDays,
      currency: contract.currency,
      requestedAt: new Date().toISOString(),
      requestedBy: input.actorId,
      status: "draft",
      recordVersion: 1,
      beforeSnapshot: structuredClone(version.snapshot),
      createdAt: new Date().toISOString(),
    };
    this.data.changeOrders.push(row);
    this.event(
      input.organizationId,
      input.actorId,
      contract,
      "change_order.created",
      `إنشاء ${row.number}`,
      { changeOrderId: row.id },
    );
    this.audit(
      input.organizationId,
      input.actorId,
      "change_order",
      row.id,
      "change_order.created",
      row.reason,
    );
    return structuredClone(row);
  }
  transitionChangeOrder(
    input: Parameters<ContractRepository["transitionChangeOrder"]>[0],
  ) {
    const permission =
      input.to === "approved" || input.to === "applied"
        ? "change_orders.approve"
        : "change_orders.create";
    this.user(input.organizationId, input.actorId, permission);
    const row = this.owned(
      this.data.changeOrders,
      input.organizationId,
      input.changeOrderId,
    );
    assertTransition(CHANGE_ORDER_TRANSITIONS, row.status, input.to);
    if (
      ["changes_requested", "rejected", "cancelled"].includes(input.to) &&
      !input.reason?.trim()
    )
      throw new ContractError("INVALID", "Reason is required");
    if (input.to === "approved" && row.requestedBy === input.actorId)
      throw new ContractError(
        "FORBIDDEN",
        "Requester cannot approve their own change order",
      );
    if (input.to === "applied") {
      const contract = this.owned(
          this.data.contracts,
          input.organizationId,
          row.contractId,
        ),
        version = this.owned(
          this.data.versions,
          input.organizationId,
          contract.currentVersionId,
        ),
        newValue = applyChangeOrder(contract.valueMinor, row.valueImpactMinor),
        newEnd = new Date(
          new Date(contract.endDate + "T00:00:00Z").getTime() +
            row.durationImpactDays * 86400000,
        )
          .toISOString()
          .slice(0, 10);
      contract.valueMinor = newValue;
      contract.endDate = newEnd;
      version.snapshot.valueMinor = newValue;
      version.snapshot.paymentSchedule = calculatePaymentSchedule(
        newValue,
        version.snapshot.paymentSchedule.map((x) => ({
          id: x.id,
          label: x.label,
          percentageBps: x.percentageBps,
          dueRule: x.dueRule,
          milestoneId: x.milestoneId,
          status: x.status,
        })),
      );
      version.recordVersion++;
      row.afterSnapshot = structuredClone(version.snapshot);
      row.appliedAt = new Date().toISOString();
    }
    row.status = input.to;
    row.recordVersion++;
    this.audit(
      input.organizationId,
      input.actorId,
      "change_order",
      row.id,
      `change_order.${input.to}`,
      input.reason,
    );
    return structuredClone(row);
  }
  createWorkOrder(raw: Parameters<ContractRepository["createWorkOrder"]>[0]) {
    const input = workOrderCreateSchema.parse(raw);
    this.user(input.organizationId, input.actorId, "work_orders.create");
    const contract = this.owned(
        this.data.contracts,
        input.organizationId,
        input.contractId,
      ),
      version = this.owned(
        this.data.versions,
        input.organizationId,
        contract.currentVersionId,
      );
    if (version.status !== "active" && !input.overrideReason?.trim())
      throw new ContractError(
        "CONFLICT",
        "Work orders require an active contract or a documented override",
      );
    if (
      input.deliverableId &&
      !version.snapshot.deliverables.some((x) => x.id === input.deliverableId)
    )
      throw new ContractError(
        "INVALID",
        "Deliverable does not belong to contract",
      );
    const now = new Date().toISOString(),
      row: WorkOrder = {
        id: `wo-${crypto.randomUUID()}`,
        organizationId: input.organizationId,
        contractId: contract.id,
        deliverableId: input.deliverableId,
        number: this.next(input.organizationId, "work_order"),
        title: clean(input.title),
        description: clean(input.description),
        type: clean(input.type),
        priority: input.priority,
        department: clean(input.department),
        ownerId: input.ownerId,
        participantIds: input.participantIds ?? [],
        startDate: input.startDate,
        dueDate: input.dueDate,
        status: "draft",
        progress: 0,
        checklist: input.checklist.map((x) => ({
          id: `woc-${crypto.randomUUID()}`,
          title: clean(x.title),
          mandatory: x.mandatory,
          completed: false,
        })),
        notes: "",
        recordVersion: 1,
        createdAt: now,
        createdBy: input.actorId,
      };
    this.data.workOrders.push(row);
    this.notify(
      input.organizationId,
      row.ownerId,
      "work_order_assigned",
      "work_order",
      row.id,
      `إسناد ${row.number}`,
      `work-order:${row.id}:${row.ownerId}`,
    );
    this.event(
      input.organizationId,
      input.actorId,
      contract,
      "work_order.created",
      `إنشاء ${row.number}`,
      { workOrderId: row.id, deliverableId: row.deliverableId },
    );
    this.audit(
      input.organizationId,
      input.actorId,
      "work_order",
      row.id,
      "work_order.created",
      input.overrideReason,
    );
    return structuredClone(row);
  }
  updateWorkOrder(input: Parameters<ContractRepository["updateWorkOrder"]>[0]) {
    this.user(input.organizationId, input.actorId, "work_orders.update");
    const row = this.owned(
      this.data.workOrders,
      input.organizationId,
      input.workOrderId,
    );
    if (row.recordVersion !== input.expectedVersion)
      throw new ContractError("CONFLICT", "Work order version conflict");
    if (input.progress !== undefined) {
      if (input.progress < 0 || input.progress > 100)
        throw new ContractError("INVALID", "Progress must be 0-100");
      row.progress = input.progress;
    }
    if (input.notes !== undefined) row.notes = clean(input.notes);
    if (input.checklist)
      row.checklist = input.checklist.map((x) => ({
        ...x,
        title: clean(x.title),
        completedAt: x.completed
          ? (x.completedAt ?? new Date().toISOString())
          : undefined,
        completedBy: x.completed ? (x.completedBy ?? input.actorId) : undefined,
      }));
    row.recordVersion++;
    this.audit(
      input.organizationId,
      input.actorId,
      "work_order",
      row.id,
      "work_order.updated",
      `progress=${row.progress}`,
    );
    return structuredClone(row);
  }
  transitionWorkOrder(
    input: Parameters<ContractRepository["transitionWorkOrder"]>[0],
  ) {
    const permission =
      input.to === "in_progress"
        ? "work_orders.start"
        : input.to === "completed"
          ? "work_orders.complete"
          : input.to === "reopened"
            ? "work_orders.reopen"
            : "work_orders.update";
    this.user(input.organizationId, input.actorId, permission);
    const row = this.owned(
      this.data.workOrders,
      input.organizationId,
      input.workOrderId,
    );
    assertTransition(WORK_ORDER_TRANSITIONS, row.status, input.to);
    if (
      ["on_hold", "cancelled", "reopened"].includes(input.to) &&
      !input.reason?.trim()
    )
      throw new ContractError("INVALID", "Reason is required");
    if (
      input.to === "completed" &&
      row.checklist.some((x) => x.mandatory && !x.completed)
    )
      throw new ContractError(
        "CONFLICT",
        "Mandatory checklist items are incomplete",
      );
    row.status = input.to;
    row.recordVersion++;
    if (input.to === "completed") {
      row.progress = 100;
      row.completedAt = new Date().toISOString();
    }
    if (input.to === "reopened") {
      row.completedAt = undefined;
      row.closureApprovedAt = undefined;
      row.closureApprovedBy = undefined;
    }
    this.audit(
      input.organizationId,
      input.actorId,
      "work_order",
      row.id,
      `work_order.${input.to}`,
      input.reason,
    );
    return structuredClone(row);
  }
  approveClosure(org: string, actor: string, workOrderId: string) {
    this.user(org, actor, "work_orders.approve_closure");
    const row = this.owned(this.data.workOrders, org, workOrderId);
    if (row.status !== "completed")
      throw new ContractError(
        "CONFLICT",
        "Only completed work orders can be closed",
      );
    if (row.ownerId === actor || row.createdBy === actor)
      throw new ContractError(
        "FORBIDDEN",
        "Executor or creator cannot approve closure",
      );
    row.closureApprovedAt = new Date().toISOString();
    row.closureApprovedBy = actor;
    row.recordVersion++;
    this.audit(org, actor, "work_order", row.id, "work_order.closure_approved");
    return structuredClone(row);
  }
}

export class SupabaseContractRepository implements ContractRepository {
  private unavailable(): never {
    throw new ContractError(
      "INVALID",
      "Supabase contracts adapter is a contract stub; migration is not applied or integration-tested",
    );
  }
  snapshot(): ContractSnapshotData {
    return this.unavailable();
  }
  listContracts(): Paged<{ contract: Contract; version: ContractVersion }> {
    return this.unavailable();
  }
  listWorkOrders(): Paged<WorkOrder> {
    return this.unavailable();
  }
  exportContracts(): string {
    return this.unavailable();
  }
  exportWorkOrders(): string {
    return this.unavailable();
  }
  createFromQuotation(): ContractVersion {
    return this.unavailable();
  }
  updateDraft(): ContractVersion {
    return this.unavailable();
  }
  submitForApproval(): ContractApproval {
    return this.unavailable();
  }
  decideApproval(): ContractApproval {
    return this.unavailable();
  }
  transitionContract(): ContractVersion {
    return this.unavailable();
  }
  createRevision(): ContractVersion {
    return this.unavailable();
  }
  createChangeOrder(): ChangeOrder {
    return this.unavailable();
  }
  transitionChangeOrder(): ChangeOrder {
    return this.unavailable();
  }
  createWorkOrder(): WorkOrder {
    return this.unavailable();
  }
  updateWorkOrder(): WorkOrder {
    return this.unavailable();
  }
  transitionWorkOrder(): WorkOrder {
    return this.unavailable();
  }
  approveClosure(): WorkOrder {
    return this.unavailable();
  }
}
