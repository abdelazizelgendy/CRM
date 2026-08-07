import { beforeEach, describe, expect, it } from "vitest";
import { createContractSeed } from "./seed";
import { LocalContractRepository } from "./repository";
const org = "org-madar-demo";
describe("local contract repository", () => {
  let repo: LocalContractRepository;
  beforeEach(() => {
    repo = new LocalContractRepository();
  });
  const emptyRepo = () => {
    const seed = createContractSeed();
    seed.contracts = [];
    seed.versions = [];
    seed.workOrders = [];
    seed.timeline = [];
    return new LocalContractRepository(seed);
  };
  it("isolates organizations and blocks IDOR", () => {
    expect(() => repo.listContracts("org-other-demo", "u-owner")).toThrow(
      /Cross-tenant/,
    );
    expect(() =>
      repo.createRevision({
        organizationId: org,
        actorId: "u-owner",
        contractId: "q-other",
        reason: "x",
        comparison: "x",
      }),
    ).toThrow(/not found/i);
  });
  it("redacts financial values without permission", () => {
    expect(repo.snapshot(org, "u-viewer").contracts[0].valueMinor).toBe(0n);
    expect(repo.snapshot(org, "u-viewer").audit).toEqual([]);
    expect(repo.snapshot(org, "u-owner").contracts[0].valueMinor).toBe(
      12000000n,
    );
  });
  it("validates conversion dates on the service boundary", () => {
    repo = emptyRepo();
    expect(() =>
      repo.createFromQuotation({
        organizationId: org,
        actorId: "u-owner",
        quotationVersionId: "qv-contract-source",
        ownerId: "u-sales",
        department: "التنفيذ",
        type: "تصميم",
        startDate: "2026-10-02",
        endDate: "2026-10-01",
        language: "ar",
        idempotencyKey: "bad-dates",
      }),
    ).toThrow(/End date/);
  });
  it("converts only a qualified quotation once and is idempotent", () => {
    repo = emptyRepo();
    const first = repo.createFromQuotation({
      organizationId: org,
      actorId: "u-owner",
      quotationVersionId: "qv-contract-source",
      ownerId: "u-sales",
      department: "التنفيذ",
      type: "تصميم",
      startDate: "2026-09-01",
      endDate: "2026-10-01",
      language: "bilingual",
      idempotencyKey: "convert-1",
    });
    const second = repo.createFromQuotation({
      organizationId: org,
      actorId: "u-owner",
      quotationVersionId: "qv-contract-source",
      ownerId: "u-sales",
      department: "التنفيذ",
      type: "تصميم",
      startDate: "2026-09-01",
      endDate: "2026-10-01",
      language: "bilingual",
      idempotencyKey: "convert-1",
    });
    expect(second.id).toBe(first.id);
    expect(first.snapshot.lineItems.some((x) => x.id === "ql-optional")).toBe(
      true,
    );
  });
  it("prevents duplicate original contracts with different keys", () => {
    repo = emptyRepo();
    repo.createFromQuotation({
      organizationId: org,
      actorId: "u-owner",
      quotationVersionId: "qv-contract-source",
      ownerId: "u-sales",
      department: "A",
      type: "B",
      startDate: "2026-10-01",
      endDate: "2026-11-01",
      language: "ar",
      idempotencyKey: "one",
    });
    expect(() =>
      repo.createFromQuotation({
        organizationId: org,
        actorId: "u-owner",
        quotationVersionId: "qv-contract-source",
        ownerId: "u-sales",
        department: "A",
        type: "B",
        startDate: "2026-10-01",
        endDate: "2026-11-01",
        language: "ar",
        idempotencyKey: "two",
      }),
    ).toThrow(/already exists/);
  });
  it("enforces optimistic concurrency and immutable active records", () => {
    expect(() =>
      repo.updateDraft({
        organizationId: org,
        actorId: "u-owner",
        versionId: "cv-1",
        expectedVersion: 1,
        title: "x",
      }),
    ).toThrow(/Only draft/);
    const seed = createContractSeed();
    seed.versions[0].status = "draft";
    repo = new LocalContractRepository(seed);
    expect(() =>
      repo.updateDraft({
        organizationId: org,
        actorId: "u-owner",
        versionId: "cv-1",
        expectedVersion: 9,
        title: "x",
      }),
    ).toThrow(/conflict/);
  });
  it("separates approval requester from approver", () => {
    const seed = createContractSeed();
    seed.versions[0].status = "draft";
    repo = new LocalContractRepository(seed);
    const approval = repo.submitForApproval(org, "u-owner", "cv-1");
    expect(() =>
      repo.decideApproval({
        organizationId: org,
        actorId: "u-owner",
        approvalId: approval.id,
        decision: "approved",
        comment: "ok",
      }),
    ).toThrow(/cannot approve/);
    expect(
      repo.decideApproval({
        organizationId: org,
        actorId: "u-admin",
        approvalId: approval.id,
        decision: "approved",
        comment: "ok",
      }).status,
    ).toBe("approved");
  });
  it("applies an approved change order once", () => {
    const co = repo.createChangeOrder({
      organizationId: org,
      actorId: "u-sales",
      contractId: "ctr-1",
      type: "قيمة",
      reason: "نطاق إضافي",
      description: "إضافة شاشة",
      valueImpactMinor: 100000n,
      durationImpactDays: 2,
    });
    repo.transitionChangeOrder({
      organizationId: org,
      actorId: "u-sales",
      changeOrderId: co.id,
      to: "under_review",
    });
    repo.transitionChangeOrder({
      organizationId: org,
      actorId: "u-owner",
      changeOrderId: co.id,
      to: "approved",
    });
    const applied = repo.transitionChangeOrder({
      organizationId: org,
      actorId: "u-owner",
      changeOrderId: co.id,
      to: "applied",
    });
    expect(applied.afterSnapshot?.valueMinor).toBe(12100000n);
    expect(() =>
      repo.transitionChangeOrder({
        organizationId: org,
        actorId: "u-owner",
        changeOrderId: co.id,
        to: "applied",
      }),
    ).toThrow(/Invalid transition/);
  });
  it("requires checklist completion and separates closure approval", () => {
    const wo = repo.createWorkOrder({
      organizationId: org,
      actorId: "u-owner",
      contractId: "ctr-1",
      title: "اختبار",
      description: "اختبار",
      type: "تنفيذ",
      priority: "high",
      department: "تنفيذ",
      ownerId: "u-sales",
      startDate: "2026-08-08",
      dueDate: "2026-08-20",
      checklist: [{ title: "فحص", mandatory: true }],
    });
    repo.transitionWorkOrder({
      organizationId: org,
      actorId: "u-owner",
      workOrderId: wo.id,
      to: "planned",
    });
    repo.transitionWorkOrder({
      organizationId: org,
      actorId: "u-owner",
      workOrderId: wo.id,
      to: "ready",
    });
    repo.transitionWorkOrder({
      organizationId: org,
      actorId: "u-owner",
      workOrderId: wo.id,
      to: "in_progress",
    });
    expect(() =>
      repo.transitionWorkOrder({
        organizationId: org,
        actorId: "u-owner",
        workOrderId: wo.id,
        to: "completed",
      }),
    ).toThrow(/checklist/);
    const checked = repo.updateWorkOrder({
      organizationId: org,
      actorId: "u-owner",
      workOrderId: wo.id,
      expectedVersion: 4,
      checklist: [{ ...wo.checklist[0], completed: true }],
    });
    repo.transitionWorkOrder({
      organizationId: org,
      actorId: "u-owner",
      workOrderId: wo.id,
      to: "completed",
    });
    expect(() => repo.approveClosure(org, "u-owner", wo.id)).toThrow(
      /cannot approve/,
    );
    expect(repo.approveClosure(org, "u-admin", wo.id).closureApprovedBy).toBe(
      "u-admin",
    );
    expect(checked.checklist[0].completed).toBe(true);
  });
  it("neutralizes CSV formulas", () => {
    const seed = createContractSeed();
    seed.versions[0].snapshot.title = '=HYPERLINK("bad")';
    repo = new LocalContractRepository(seed);
    expect(repo.exportContracts(org, "u-owner")).toContain("'=HYPERLINK");
  });
  it("applies actual filters and pagination", () => {
    expect(
      repo.listContracts(org, "u-owner", {
        status: "active",
        page: 1,
        pageSize: 1,
      }).total,
    ).toBe(1);
    expect(repo.listContracts(org, "u-owner", { status: "draft" }).total).toBe(
      0,
    );
    expect(
      repo.listWorkOrders(org, "u-owner", { priority: "high" }).total,
    ).toBe(1);
  });
});
