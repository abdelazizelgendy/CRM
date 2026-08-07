# Contract to Invoice Handover

المصدر المؤهل يحمل contract/version، quotation، sales request، customer، owner، department، city، currency، payment schedule item، amount/due date وChange Orders المعتمدة. الإنشاء ينسخها Snapshot ويقفل المصدر ضد إعادة الفوترة. المصدر غير المؤهل يعرض سببًا مثل عدم اكتمال المعلم أو سبق الفوترة. Local Mode لا يحدّث Repository العقود نفسه؛ التكامل الدائم مؤجل لـSupabase Adapter.
