# معمارية المرحلة الخامسة

تتبع الوحدة الطبقات: `ContractsWorkspace` للعرض؛ `repository.ts` لخدمات التطبيق والتفويض؛ `domain.ts` لآلات الحالات؛ `calculations.ts` للحسابات بـBigInt؛ `types.ts` لنموذج المجال؛ و`provider.ts` لتبديل Local/Supabase دون تعديل الصفحات.

`LocalContractRepository` منفذ وقابل للاختبار. `SupabaseContractRepository` Stub صريح وغير منفذ. Migration 006 عقد بيانات/RLS فقط وغير مطبق أو مختبر تكامليًا.
