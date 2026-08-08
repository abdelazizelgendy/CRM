# أمن وخصوصية المرحلة الحادية عشرة

- كل سجل مقيد بـorganizationId، وLocal Repository يمنع IDOR؛ Migration 012 يفعّل RLS بعقد العضوية.
- الحقول الحساسة والتقييمات وPayroll Readiness تحجب من snapshot دون صلاحية.
- Zod على مدخلات worker/punch/period، وversion/idempotency على العمليات الحرجة.
- Maker-Checker للربط والتصحيح والرصيد والوقت الإضافي والإنهاء وFreeze/Reopen.
- CSV neutralization للبادئات `= + - @ tab CR`، ولا تسجل أرقام هوية كاملة.
- لا Service Role في الواجهة، ولا بيانات موظفين حقيقية في Seed.

RLS/RPC والـciphertext لم يختبرا على PostgreSQL؛ Supabase Adapter يرفض التشغيل حتى التكامل المعتمد.
