# أمان المرحلة الخامسة

- تفحص كل علاقة بـ`organization_id` وتمنع IDOR والعلاقات بين شركتين.
- الصلاحيات مطبقة داخل Repository؛ إخفاء الزر ليس حاجز الأمان.
- تمنع Mass Assignment وتحرير Approved/Active، وتستخدم Soft Delete وrecord version وidempotency.
- CSV يحيد Formula Injection ويستخدم UTF-8 BOM. النصوص تُزال منها علامات HTML قبل التخزين/الطباعة.
- القيم المالية محجوبة دون `contracts.view_financials`، ولا تنتقل تكلفة العرض أو هامشه.
- فصل المنشئ عن المعتمد، والمنفذ/المنشئ عن معتمد إغلاق أمر العمل.
- المرفقات Metadata فقط؛ Migration تقيد الحجم وتمنع فواصل المسارات. لا يوجد رفع إنتاجي.
