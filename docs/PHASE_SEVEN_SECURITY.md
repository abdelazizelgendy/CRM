# أمان المرحلة السابعة

- كل عملية Local تتحقق من المستخدم والشركة والصلاحية، وتمنع Cross-organization وIDOR.
- لا يقبل تنفيذ Supabase المستقبلي `organization_id` من العميل؛ يشتقه من العضوية النشطة.
- Zod strict يمنع Mass Assignment والنصوص تنظف من أقواس HTML.
- Maker-Checker للمورد والميزانية وطلب وأمر الشراء والاستلام والفواتير والمصروفات.
- Idempotency وRecord Version وعقود Atomic Numbering وSnapshots غير قابلة للتعديل.
- CSV يحيّد `= + - @`، والطباعة لا تستخدم HTML خام.
- لا service-role في المتصفح ولا أسرار بنكية أو بيانات حقيقية في Seed.

RLS مفعّل في عقد Migration، لكن السياسات وRPCs تحتاج تنفيذًا واختبارًا على Supabase معزولًا قبل اعتبار الحماية مكتملة.
