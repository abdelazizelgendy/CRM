# أمن المرحلة التاسعة

- عزل الشركة وفحص الملكية قبل إرجاع السجل لمنع IDOR.
- صلاحيات خادم دقيقة وLeast Privilege؛ أمين المستودع لا يرى التقييم ولا يعتمد Reversal أو تسويات كبيرة.
- Maker‑Checker، Record Version، Idempotency Keys، Validation وZod للمدخلات.
- كميات `bigint` محليًا و`numeric(24,3)` في عقد PostgreSQL؛ الأموال Minor Units.
- CSV يسبق القيم الخطرة (`= + - @`) بعلامة اقتباس لمنع Formula Injection.
- Snapshot التكلفة محجوب حسب الصلاحية، ولا يقبل `organization_id` من نموذج واجهة ليقرر الملكية.
- RLS Select لكل جدول في عقد Migration؛ سياسات الكتابة مؤجلة عمدًا حتى RPCs مخولة ومختبرة.
