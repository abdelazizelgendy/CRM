# دورة أمر الشراء

`draft → pending_approval → approved → issued_internal → partially_received → fully_received → closed` مع `cancelled` وفق القيود.

أمر الشراء ينشأ مرة من ترسية معتمدة ويحفظ Snapshot. التعديل بعد الإصدار يكون Revision ولا يعيد كتابة النسخة السابقة. القيمة الصادرة تمثل Commitment تشغيليًا وليست Actual Cost أو دليل دفع.
