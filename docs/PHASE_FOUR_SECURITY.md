# أمن المرحلة الرابعة

- `organizationId` يشتق من Workspace في التطبيق؛ واجهة المستخدم لا تطلبه.
- كل قراءة أو كتابة في Local Repository تتحقق من هوية المستخدم والشركة والصلاحية.
- Viewer وCustomer Service لا يريان التكلفة أو الهامش. Snapshot في Repository يحذف الحقول نفسها؛ إخفاء الزر ليس الحماية.
- لا يعدل إلا Draft أو Changes Requested، ويستخدم `recordVersion` لمنع فقد التحديثات المتزامنة.
- القرارات السابقة لا تعدل، والإرسال له Idempotency Key فريد داخل الشركة.
- القوالب تستخدم Allowlist وتعقم الرموز ولا تسمح بـJavaScript أو متغيرات التكلفة والهامش.
- الحذف تشغيليًا أرشفة منطقية. لا توجد عمليات حذف للسجل والتاريخ.
- Migration تفعل RLS ولا تمنح سياسات كتابة مباشرة؛ العمليات الحساسة مؤجلة إلى RPCs مراجعة.
- لا توجد أسرار أو بيانات عملاء حقيقية. عناوين `example.test` مخصصة للاختبار.
- CSV ينفذ من Repository بصلاحيات `sales_requests.export` و`quotations.export`، ويصدر السجلات المرئية فقط ويمنع Formula Injection.
- مدخلات Zod هي Allowlist لمنع Mass Assignment، والتكلفة والهامش يحذفان من Snapshot غير المصرح له قبل وصول البيانات للواجهة.

قبل الإنتاج يلزم تطبيق Migration في مشروع اختبار، تنفيذ Supabase Adapter وRPCs، اختبار حسابين لشركتين، مراجعة RLS، Storage policies للمرفقات، وفحص أمني مستقل. لا يجوز تشغيل Local Adapter في إنتاج حقيقي.
