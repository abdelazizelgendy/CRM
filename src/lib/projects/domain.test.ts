import { describe, expect, it } from "vitest";
import { baselineStateMachine, hasDependencyCycle, ncrStateMachine, projectStateMachine, taskStateMachine, timesheetStateMachine } from "./domain";
import { calculateEvm, clampBps, resourceCapacity, validateTimesheet, weightedProgress } from "./calculations";
import { createProjectSeed } from "./seed";

describe("phase eight project domain", () => {
  it("accepts the approved project lifecycle", () => { expect(projectStateMachine.can("draft", "pending_approval")).toBe(true); expect(projectStateMachine.can("active", "closed")).toBe(false); });
  it("requires closure through the gate", () => expect(() => projectStateMachine.assert("active", "closed")).toThrow());
  it("allows task review before completion", () => { expect(taskStateMachine.can("in_progress", "ready_for_review")).toBe(true); expect(taskStateMachine.can("in_progress", "completed")).toBe(false); });
  it("keeps approved baseline immutable", () => expect(baselineStateMachine.can("approved", "draft")).toBe(false));
  it("keeps approved time out of draft", () => expect(timesheetStateMachine.can("approved", "draft")).toBe(false));
  it("requires NCR verification stage", () => { expect(ncrStateMachine.can("under_correction", "closed")).toBe(false); expect(ncrStateMachine.can("ready_for_verification", "closed")).toBe(true); });
  it("detects direct dependency cycles", () => expect(hasDependencyCycle(["a", "b"], [{ predecessorTaskId: "a", successorTaskId: "b" }, { predecessorTaskId: "b", successorTaskId: "a" }])).toBe(true));
  it("detects indirect dependency cycles", () => expect(hasDependencyCycle(["a", "b", "c"], [{ predecessorTaskId: "a", successorTaskId: "b" }, { predecessorTaskId: "b", successorTaskId: "c" }, { predecessorTaskId: "c", successorTaskId: "a" }])).toBe(true));
  it("accepts an acyclic network", () => expect(hasDependencyCycle(["a", "b", "c"], [{ predecessorTaskId: "a", successorTaskId: "b" }, { predecessorTaskId: "b", successorTaskId: "c" }])).toBe(false));
  it("rejects unknown dependency tasks", () => expect(() => hasDependencyCycle(["a"], [{ predecessorTaskId: "a", successorTaskId: "x" }])).toThrow());
  it("bounds progress", () => { expect(clampBps(10_000)).toBe(10_000); expect(() => clampBps(10_001)).toThrow(); expect(() => clampBps(-1)).toThrow(); });
  it("rolls progress using task weights", () => { const d = createProjectSeed(); expect(weightedProgress(d.tasks.filter(x => x.projectId === "project-1"), d.wbs)).toBe(5200); });
  it("detects resource over-allocation", () => { const d = createProjectSeed(); expect(resourceCapacity(d.assignments, 2400, "u-site", "2026-08-03")).toMatchObject({ allocatedMinutes: 2700, overAllocated: true }); });
  it("rejects negative time", () => expect(() => validateTimesheet([{ workDate: "2026-08-01", minutes: -1, taskId: "a" }])).toThrow());
  it("rejects more than 24 hours per day", () => expect(() => validateTimesheet([{ workDate: "2026-08-01", minutes: 1441, taskId: "a" }])).toThrow());
  it("rejects duplicate task/date entries", () => expect(() => validateTimesheet([{ workDate: "2026-08-01", minutes: 30, taskId: "a" }, { workDate: "2026-08-01", minutes: 20, taskId: "a" }])).toThrow());
  it("calculates EVM and avoids zero division", () => { const d = createProjectSeed(), baseline = d.baselines[0], tasks = d.tasks.filter(x => x.projectId === "project-1"); const value = calculateEvm({ baseline, tasks, approvedProgressBps: 5000, bacMinor: 100_000n, acMinor: 0n, asOf: "2026-08-07" }); expect(value.evMinor).toBe(50_000n); expect(value.cpiBps).toBeNull(); expect(value.spiBps).not.toBeNull(); });
});
