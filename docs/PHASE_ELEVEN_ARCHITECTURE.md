# معمارية المرحلة الحادية عشرة

`types/calculations/schemas` تمثل Domain حتميًا؛ `HrRepository` يفرض tenant/permission/version/idempotency؛ `LocalHrRepository` منفذ ومختبر على بيانات مصطنعة؛ `SupabaseHrRepository` Stub يرفض التشغيل. واجهة catch-all على `/dashboard/hr/[[...segments]]` تعرض المصادر نفسها ولا تقدم نجاحًا خارجيًا وهميًا. Migration 012 هو عقد PostgreSQL/RLS غير مطبق.
