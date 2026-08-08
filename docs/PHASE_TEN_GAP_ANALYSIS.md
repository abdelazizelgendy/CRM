# تحليل فجوات المرحلة العاشرة

## الموجود والمعاد استخدامه

- Production Jobs وProject/WBS/Tasks/Quality من المرحلة الثامنة.
- Item/UOM/Warehouse/Bin/Lot/Serial وInventory Ledger والحجز والصرف والمرتجعات من المرحلة التاسعة.
- Procurement/Purchase Orders/Supplier Bills وCost Events من المرحلة السابعة.
- Provider/Local Adapter/Supabase Stub وRBAC/Audit/Timeline وأنماط BigInt القائمة.

## الفجوة المغلقة

لم توجد BOM/Routing/Work Centers/Production Orders/MRP/Job Cards أو Completion receipt. أضيفت كوحدة مستقلة منطقيًا، مع references إلى المصادر القائمة وعدم إنشاء Ledger أو Quality أو Purchase domain موازية. أكبر المخاطر هي ازدواج حركة المخزون وازدواج التكلفة؛ يعالجان بـIdempotency وIssue cost snapshot ومصدر تكلفة واحد.

## المؤجل

Supabase integration، Backflush فعلي، Phantom BOM، Finite Capacity، APS، MRP II، رفع مرفقات، أجهزة المسح، IoT والتكلفة المحاسبية.
