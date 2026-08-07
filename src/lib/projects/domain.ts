import type { BaselineStatus, NcrStatus, ProductionStatus, ProjectStatus, SnagStatus, TaskStatus, TimesheetStatus } from "./types";

const machine = <T extends string>(map: Record<T, readonly T[]>) => ({
  can: (from: T, to: T) => map[from]?.includes(to) ?? false,
  assert(from: T, to: T) { if (!this.can(from, to)) throw new Error(`Invalid transition: ${from} -> ${to}`); },
});
export const projectStateMachine = machine<ProjectStatus>({ draft: ["pending_approval", "cancelled"], pending_approval: ["approved", "draft", "cancelled"], approved: ["active", "cancelled"], active: ["on_hold", "ready_for_handover", "cancelled"], on_hold: ["active", "cancelled"], ready_for_handover: ["active", "closed"], closed: ["reopened"], reopened: ["active", "closed"], cancelled: [] });
export const taskStateMachine = machine<TaskStatus>({ not_started: ["ready", "cancelled"], ready: ["in_progress", "blocked", "cancelled"], in_progress: ["blocked", "ready_for_review", "cancelled"], blocked: ["ready", "in_progress", "cancelled"], ready_for_review: ["completed", "in_progress"], completed: ["reopened"], reopened: ["in_progress", "cancelled"], cancelled: [] });
export const baselineStateMachine = machine<BaselineStatus>({ draft: ["pending_approval"], pending_approval: ["approved", "rejected", "draft"], approved: ["superseded"], rejected: ["draft"], superseded: [] });
export const timesheetStateMachine = machine<TimesheetStatus>({ draft: ["submitted"], submitted: ["under_review", "returned", "rejected"], under_review: ["approved", "returned", "rejected"], approved: ["corrected"], rejected: ["draft"], returned: ["draft"], corrected: [] });
export const productionStateMachine = machine<ProductionStatus>({ planned: ["released", "cancelled"], released: ["in_production", "cancelled"], in_production: ["quality_hold", "ready_for_site", "cancelled"], quality_hold: ["in_production", "cancelled"], ready_for_site: ["installed", "cancelled"], installed: ["completed"], completed: [], cancelled: [] });
export const ncrStateMachine = machine<NcrStatus>({ draft: ["open", "cancelled"], open: ["action_proposed", "rejected", "cancelled"], action_proposed: ["action_approved", "rejected"], action_approved: ["under_correction"], under_correction: ["ready_for_verification"], ready_for_verification: ["closed", "under_correction"], closed: ["reopened"], reopened: ["under_correction"], rejected: ["draft"], cancelled: [] });
export const snagStateMachine = machine<SnagStatus>({ open: ["in_progress", "cancelled"], in_progress: ["ready_for_review", "cancelled"], ready_for_review: ["closed", "in_progress"], closed: ["reopened"], reopened: ["in_progress"], cancelled: [] });

export function hasDependencyCycle(taskIds: string[], edges: Array<{ predecessorTaskId: string; successorTaskId: string }>) {
  const graph = new Map(taskIds.map(id => [id, [] as string[]]));
  for (const edge of edges) { if (!graph.has(edge.predecessorTaskId) || !graph.has(edge.successorTaskId)) throw new Error("Dependency references an unknown task"); graph.get(edge.predecessorTaskId)!.push(edge.successorTaskId); }
  const visiting = new Set<string>(), visited = new Set<string>();
  const walk = (id: string): boolean => { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); for (const next of graph.get(id) ?? []) if (walk(next)) return true; visiting.delete(id); visited.add(id); return false; };
  return taskIds.some(walk);
}
