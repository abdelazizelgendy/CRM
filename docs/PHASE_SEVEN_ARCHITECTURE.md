# معمارية المرحلة السابعة

التسلسل: UI (`ProcurementWorkspace`) → Repository/Application Contract → Zod → Authorization → State Machines → Financial Calculations → Local Adapter. الواجهة لا تنفذ قواعد مالية مستقلة.

المصادر المركزية في `src/lib/procurement`: `types.ts`، `domain.ts`، `calculations.ts`، `schemas.ts`، `repository.ts`، `provider.ts` و`seed.ts`.

`SupabaseProcurementRepository` Stub يفشل برسالة صريحة. Migration 008 عقد مستقل غير مطبق.
