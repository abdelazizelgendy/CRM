# تحليل فجوات المرحلة الحادية عشرة

## الموجود ويعاد استخدامه

- الهوية في `profiles` والعضوية في `organization_members`؛ لا يصبح المستخدم موظفًا تلقائيًا.
- `departments` وRBAC وAudit/Notifications/Timeline وأنماط Local Provider وSupabase Stub.
- Project Resources و`project_resource_assignments` وTimesheets من المرحلة الثامنة.
- Work Centers وJob Cards و`laborMinutes` من المرحلة العاشرة.
- BigInt/Integer minutes وIdempotency وOptimistic Concurrency وMaker-Checker.

## الموجود ويحتاج توسيعًا

- الأقسام: hierarchy/code مع Effective History في أحداث العمل.
- Resource Assignments: Worker eligibility ومراجع المشروع/WBS/task/work center بدل إنشاء سجل وقت جديد.
- Timeline والإشعارات: أحداث HR داخلية؛ لا Email/SMS/WhatsApp فعلي.
- المرفقات: metadata فقط؛ لا رفع وثائق هوية أو شهادات حقيقية.

## المضاف

Worker Master اختياري الربط بـUser/Membership، positions/locations/calendars/shifts، Employment Events، Attendance/Punch/Corrections، Leave Types/Requests/Ledger، Overtime، Time Reconciliation، Workforce Assignments، Skills/Certifications/Training، Checklists، Performance وPayroll Readiness snapshots/CSV.

## المؤجل

Supabase Adapter وRLS/RPC integration الفعلي، رفع الملفات، أجهزة الحضور، GPS/Biometrics، تخطيط آلي، Payroll Engine والرواتب والمدفوعات والمحاسبة والتكاملات الحكومية. Migration 012 عقد غير مطبق.

## حل الازدواج

User هوية دخول، Membership علاقة بالشركة، Worker سجل عمل، Project Resource تخصيص، Shop-floor Assignee منفذ عملية. العامل قد يكون بلا User والمستخدم الخارجي قد يكون بلا Worker. Attendance ليس Productive Time؛ التسوية تقرأ Timesheet وJob Card وتخصم Job Card المرتبطة بالمهمة من التجميع لمنع double counting.
