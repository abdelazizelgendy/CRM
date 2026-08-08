# تقرير المرحلة التاسعة — إدارة المخزون والمستودعات والمواد

## نقطة البداية

- المستودع: `abdelazizelgendy/CRM`.
- فرع الأساس: `agent/phase-eight-project-operations`.
- آخر Commit منشور للأساس: `a52ed724777e2b14a566f86d09bcffb36ad21b63`.
- Draft PR #8: مفتوح ولم يُدمج.
- فرع التنفيذ: `agent/phase-nine-inventory-materials`.

## التنفيذ

أعيد استخدام Procurement Receipts/Purchase Orders/Supplier Bills/Cost Events من المرحلة السابعة، وProjects/WBS/Tasks/Production Jobs من المرحلة الثامنة. أضيف Item Master وUOM/Conversions وWarehouses/Zones/Bins وLots/Serials، وLedger مشتق، وطلبات وحجوزات وصرف ومرتجعات وتحويلات وجرد وتسويات وتالف وإعادة طلب، مع Local Provider وSupabase Stub.

الشاشات تبدأ من `/dashboard/inventory` وتغطي Items، Categories، Units، Warehouses، Stock، Movements، Material Requests، Reservations، Receipts، Issues، Returns، Transfers، Counts، Adjustments، Damage، Reorder، Approvals وReports. تعرض `/dashboard/projects/[id]/materials` الطلب والمحجوز والمصروف والاستهلاك الصافي والنقص والربط بـWBS/Task/Production Job.

## الضوابط

- الرصيد مشتق من الحركات ولا يعدل مباشرة.
- الحركات المرحلة Immutable وتصحيحها Reversal.
- منع السالب وOver-reservation وPosting المكرر وخلط العملات.
- Moving Weighted Average مع Snapshot للصرف وعودة المرتجع بالتكلفة الأصلية.
- التحويل لا يمثل تكلفة مشروع، وSupplier Bill لا تزيد المخزون.
- Cost Event للمادة يصدر من Movement Line فريد لمنع التكرار داخل Local Adapter.
- Least Privilege وMaker‑Checker وعزل الشركات وRecord Version وIdempotency.

## الاختبارات

Lint وTypecheck وBuild ناجحة. `npm test` ناجح 227/227؛ منها 47 اختبار Inventory. الفحص البصري غير ممكن لغياب المتصفح المحلي، وتشغيل HTTP server محلي تعذر بسبب قيد `uv_interface_addresses`. التفاصيل في `PHASE_NINE_TEST_REPORT.md`.

## Migration وSupabase

`202608080010_phase_nine_inventory_materials.sql` هو **Migration contract — not applied or integration-tested**. يحتوي نموذج الجداول والفهارس وComposite FKs وRLS Select وحارس Immutable وعقد RPC رافضًا صريحًا. سياسات الكتابة وعمليات RPC الفعلية مؤجلة حتى اختبار PostgreSQL/Supabase معزول. Supabase Adapter غير منفذ ويرفض التشغيل بوضوح.

## القيود والتأكيدات

لا General Ledger، لا Journal Entries، لا Accounts Payable، لا Supplier Payments، لا Bank Transfers، لا MRP كامل، لا Barcode/RFID hardware، لا تقييم محاسبي رسمي، لا Migration مطبقة، ولا نشر إنتاجي. بيانات Seed مصطنعة لشركتين ويمكن Reset عبر `resetInventoryDemoRepository()`.

## Git والنشر

يُحدّث هذا القسم بعد إنشاء Commit ورفع الفرع وفتح Draft PR. لن يُدمج PR ولن يُحوّل إلى Ready.

## الحكم قبل النشر

قيد التنفيذ — غير جاهزة للاعتماد حتى اكتمال مراجعة Git والنشر وفتح Draft PR ومراجعة CI.
