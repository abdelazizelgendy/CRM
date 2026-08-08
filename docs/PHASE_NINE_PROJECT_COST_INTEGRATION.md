# ربط تكلفة المواد بالمشروع

`Net Material Consumption = Posted Issues - Posted Returns - Valid Reversals`.

Purchase Commitment يخص أمر الشراء. Procurement Receipt يثبت استلامًا تشغيليًا. Stock On-hand رصيد المستودع. Material Consumption يحدث عند الصرف. Project Actual Cost يستخدم Cost Event فريدًا من خط الحركة. Operational Inventory Value هو الكمية × متوسط التكلفة وليس تقييمًا محاسبيًا.

المواد المخزنية لا يجب الاعتراف بها مرة ثانية من Supplier Bill. كل Cost Event يحمل source/sourceLine/idempotency. تكامل Supabase المركزي لمنع الازدواج مع Cost Events المرحلة السابعة مؤجل حتى اختبار قاعدة بيانات معزولة؛ Local يمنع التكرار داخل وحدة المخزون.
