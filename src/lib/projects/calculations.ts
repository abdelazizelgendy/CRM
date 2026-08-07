import type { ProjectBaseline, ProjectMetrics, ProjectTask, ResourceAssignment, Timesheet, WbsItem } from "./types";

export const clampBps = (value: number) => { if (!Number.isInteger(value) || value < 0 || value > 10_000) throw new Error("Progress must be an integer between 0 and 10000 bps"); return value; };
export function weightedProgress(tasks: ProjectTask[], wbs: WbsItem[]) {
  const active = tasks.filter(task => wbs.some(item => item.id === task.wbsId && item.active));
  const weight = active.reduce((sum, task) => sum + task.weightBps, 0);
  if (!weight) return 0;
  return Math.round(active.reduce((sum, task) => sum + clampBps(task.progressBps) * task.weightBps, 0) / weight);
}
export function resourceCapacity(assignments: ResourceAssignment[], capacityMinutes: number, userId: string, weekStart: string) {
  const allocatedMinutes = assignments.filter(x => x.userId === userId && x.weekStart === weekStart).reduce((sum, x) => sum + x.plannedMinutes, 0);
  return { allocatedMinutes, capacityMinutes, utilizationBps: capacityMinutes > 0 ? Math.round(allocatedMinutes * 10_000 / capacityMinutes) : null, overAllocated: allocatedMinutes > capacityMinutes };
}
export function validateTimesheet(entries: Array<{ workDate: string; minutes: number; taskId: string }>) {
  const daily = new Map<string, number>(), unique = new Set<string>();
  for (const entry of entries) { if (!Number.isInteger(entry.minutes) || entry.minutes <= 0) throw new Error("Time must be a positive whole number of minutes"); const key = `${entry.taskId}:${entry.workDate}`; if (unique.has(key)) throw new Error("Duplicate task/date time entry"); unique.add(key); daily.set(entry.workDate, (daily.get(entry.workDate) ?? 0) + entry.minutes); }
  if ([...daily.values()].some(minutes => minutes > 1_440)) throw new Error("Daily time cannot exceed 24 hours");
}
export function calculateEvm(input: { baseline: ProjectBaseline; tasks: ProjectTask[]; approvedProgressBps: number; bacMinor: bigint; acMinor: bigint; asOf: string }): Pick<ProjectMetrics, "pvMinor" | "evMinor" | "acMinor" | "spiBps" | "cpiBps"> {
  const items = input.baseline.snapshot ?? input.baseline.items; const dueWeight = items.filter(item => item.plannedFinish <= input.asOf).reduce((sum, item) => sum + item.weightBps, 0); const pvMinor = input.bacMinor * BigInt(Math.min(10_000, dueWeight)) / 10_000n; const evMinor = input.bacMinor * BigInt(clampBps(input.approvedProgressBps)) / 10_000n;
  return { pvMinor, evMinor, acMinor: input.acMinor, spiBps: pvMinor > 0n ? Number(evMinor * 10_000n / pvMinor) : null, cpiBps: input.acMinor > 0n ? Number(evMinor * 10_000n / input.acMinor) : null };
}
export function approvedMinutes(timesheets: Timesheet[]) { return timesheets.filter(x => x.status === "approved").reduce((sum, sheet) => sum + sheet.totalMinutes, 0); }
