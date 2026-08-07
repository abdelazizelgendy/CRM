# معمارية المرحلة السادسة

`BillingWorkspace` يستهلك `BillingRepository` فقط. التسلسل: UI → Repository/Application Service → Zod/Authorization → Domain calculations → Local Adapter. مصادر القرار المركزية في `src/lib/billing`: الأنواع والحالات، `calculations.ts` للأموال والتسوية وAging والكشف، `schemas.ts` للتحقق، و`repository.ts` للعزل والصلاحيات والعمليات الذرية التجريبية.

`SupabaseBillingRepository` Stub صريح يفشل برسالة واضحة. الصفحات لا تعتمد على تفاصيل التخزين ويمكن تبديل المزود دون تغييرها بعد تنفيذ الـAdapter.
