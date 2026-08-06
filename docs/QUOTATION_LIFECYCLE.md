# دورة حياة عرض السعر

`Draft → Under Review → Approved → Ready to Send → Sent → Viewed/Accepted/Rejected (Demo)`.

المسارات البديلة: `Under Review → Changes Requested → Draft/Review`، أو `Rejected Internally`. عند إنشاء Revision تتحول النسخة السابقة إلى `Superseded` وتبقى Snapshot كاملة دون حذف.

لا يقبل النظام ردًا على إصدار منتهي أو مستبدل أو ملغي. القبول التجريبي يحدث Sales Request إلى Won، لكنه يسجل `isLegalAcceptance=false`. الرفض لا يمنع إصدارًا جديدًا.

الإنشاء والإرسال والردود تكتب Timeline وAudit، وتحديث طلب المبيعات يحدث في العملية نفسها داخل Local Repository.
