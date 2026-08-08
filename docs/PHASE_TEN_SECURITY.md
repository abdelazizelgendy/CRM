# أمن المرحلة العاشرة

- كل سجل تشغيلي يحمل `organizationId` ويُقرأ عبر `owned()` مع منع CROSS_TENANT/IDOR.
- Least Privilege وصلاحيات دقيقة، مع Maker-Checker للـBOM/Routing/Order/Completion.
- Optimistic concurrency على السجلات القابلة للتعديل، وIdempotency على Order/MRP/Completion/Inventory receipt.
- التكاليف ومعدلات مراكز العمل مخفية دون `production.view_cost`.
- HTML يُنظف في ملخصات Timeline، والتصدير المستقبلي ملزم بحماية CSV formula injection.
- Migration 011 يتضمن composite references وRLS contract، لكنه غير مطبق أو مختبر تكامليًا.
