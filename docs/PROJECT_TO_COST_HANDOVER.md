# Project → Cost Handover

Project ID وCurrency هما مفتاحا الربط مع المرحلة السابعة. Budget/Commitment/Recognized Cost/ETC/EAC تُقرأ من مصدر التكاليف المركزي ولا تُعاد كتابتها داخل المشروع. Progress لا ينشئ Invoice أو Cost Event. Labor Cost يستخدم Snapshot/Idempotency مستقلين ويتطلب تكامل Supabase قبل الإنتاج.
