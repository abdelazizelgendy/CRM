# Inventory → Cost Handover

Issue مرحل للمشروع ينشئ Cost Event فريدًا بالقيمة `quantity × issue cost snapshot`. Return وReversal يعكسان القيمة الأصلية. العملة لا تتغير، ولا يستخدم سعر حالي. يجب على Adapter المركزي رفض source/reference سبق الاعتراف به، وألا يعتبر Receipt أو Transfer تكلفة مشروع.
