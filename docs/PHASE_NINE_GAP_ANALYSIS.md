# Gap Analysis — المرحلة التاسعة

## الموجود وأُعيد استخدامه

- المرحلة السابعة: الموردون، طلبات وأوامر الشراء، Procurement Receipts، Supplier Bills، Cost Events وحسابات Minor Units.
- المرحلة الثامنة: Projects وWBS وTasks وProduction Jobs والصلاحيات وTimeline/Notifications ونمط Local/Supabase Provider.
- المصادقة وعزل الشركات وRTL/LTR والطباعة عبر المتصفح من المراحل السابقة.

## الفجوات التي عولجت

- لم يكن هناك Item Master أو مستودعات أو Stock Ledger أو حجز وصرف وتحويل وجرد.
- Procurement Receipt كان لا يزيد المخزون؛ أضيف Stock Receipt Posting مستقل، مع إبقاء Supplier Bill منفصلة.
- Production readiness كانت مرجع مشتريات فقط؛ أضيفت قراءة الطلب والمعتمد والمحجوز والمصروف والنقص.
- لم يكن هناك تقييم مخزون؛ أضيف Moving Weighted Average تشغيلي مع Snapshot للصرف.

## فجوات مؤجلة بصدق

- Supabase Adapter غير منفذ ويُرجع خطأ واضحًا.
- Migration 010 عقد غير مطبق أو مختبر تكامليًا، وعقود RPC ترفض التشغيل.
- لا رفع ملفات إنتاجي أو ماسح Barcode أو MRP كامل أو تقييم محاسبي رسمي.
