import { describe,expect,it } from "vitest";
import { attendanceMetrics, certificationStatus, headcountAt, leaveBalance, readinessBlockers, reconcileTime, safeCsvCell, shiftDuration } from "./calculations";
import type { LeaveLedgerEntry, ShiftTemplate } from "./types";
const day:ShiftTemplate={id:"day",organizationId:"o",name:"Day",startMinute:480,endMinute:1020,breakMinutes:60,graceMinutes:10,calendarId:"c",crossesMidnight:false};
describe("HR deterministic calculations",()=>{
 it("calculates normal shift minutes",()=>expect(shiftDuration(day)).toBe(480));
 it("calculates cross-midnight shift",()=>expect(shiftDuration({...day,startMinute:1200,endMinute:240,crossesMidnight:true})).toBe(420));
 it("returns missing time without punches",()=>expect(attendanceMetrics(day).missingMinutes).toBe(480));
 it("applies grace and break",()=>expect(attendanceMetrics(day,"2026-08-08T08:12:00.000Z","2026-08-08T17:00:00.000Z")).toEqual({workedMinutes:468,lateMinutes:2,earlyLeaveMinutes:0,missingMinutes:12}));
 it("derives immutable leave balance",()=>{const rows=[{workerId:"w",leaveTypeId:"l",unitsMills:10000n,status:"posted"},{workerId:"w",leaveTypeId:"l",unitsMills:-2500n,status:"posted"}] as LeaveLedgerEntry[];expect(leaveBalance(rows,"w","l")).toBe(7500n);});
 it("avoids double-counting linked job-card time",()=>expect(reconcileTime({workerId:"w",periodStart:"2026-08-01",periodEnd:"2026-08-07",attendanceMinutes:480,timesheetMinutes:300,jobCardMinutes:180,jobCardsLinkedToProjectMinutes:180,leaveMinutes:0,overtimeMinutes:0}).unallocatedMinutes).toBe(180));
 it("detects over-allocation",()=>expect(reconcileTime({workerId:"w",periodStart:"a",periodEnd:"b",attendanceMinutes:400,timesheetMinutes:300,jobCardMinutes:200,leaveMinutes:0,overtimeMinutes:0}).overAllocatedMinutes).toBe(100));
 it("counts readiness blockers",()=>expect(readinessBlockers([{missingPunches:1,unresolvedExceptions:2,reconciliationStatus:"unreconciled"}] as never)).toBe(4));
 it("calculates effective headcount",()=>expect(headcountAt([{status:"active",joinDate:"2026-01-01"},{status:"terminated",joinDate:"2025-01-01",lastWorkingDate:"2026-07-01"},{status:"draft",joinDate:"2026-01-01"}],"2026-08-08")).toBe(1));
 it("classifies certificate expiry",()=>{expect(certificationStatus("2026-08-07","2026-08-08")).toBe("expired");expect(certificationStatus("2026-08-20","2026-08-08")).toBe("expiring");expect(certificationStatus("2027-01-01","2026-08-08")).toBe("valid");});
 it("neutralizes CSV formula injection",()=>expect(safeCsvCell("=HYPERLINK('x')")).toBe('"\'=HYPERLINK(\'x\')"'));
});
