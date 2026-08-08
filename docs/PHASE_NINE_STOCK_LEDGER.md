# سجل حركة المخزون

الرصيد يشتق من مجموع `quantity × direction` للحركات المرحلة. لا توجد عملية تعديل مباشر للرصيد. الحركة تحمل Source/Reference وIdempotency وSnapshot التكلفة والعملة والمشروع/WBS/Task/Production Job عند اللزوم.

الحركة المرحلة Immutable. Reversal ينشئ خطوطًا مقابلة ويربط بالأصل؛ لا يحذف الأصل ولا يعيد كتابته. التحويل ينشئ خروجًا وIn Transit ثم Receipt مقابلة.
