# نموذج بيانات المرحلة الحادية عشرة

العلاقات الأساسية: Organization → Worker؛ Worker ↔ User/Membership اختياري؛ Worker → Department/Position/Manager/Location/Calendar/Shift؛ Worker → Attendance/Leave/Overtime/Development/Checklist/Performance؛ Worker → Workforce Assignment → Project/WBS/Task أو Work Center؛ Payroll Readiness Batch → Lines → source IDs. الأحداث المرحلة immutable، والتغييرات التاريخية Effective-dated، والرصيد مشتق من Leave Ledger.
