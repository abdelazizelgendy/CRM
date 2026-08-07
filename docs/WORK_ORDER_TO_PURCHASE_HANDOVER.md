# التسليم من أمر العمل إلى الشراء

طلب الشراء يحمل `projectId` و`contractId` و`workOrderId` وCost Center/Code والعملة وتاريخ الاحتياج. الربط سياقي فقط ولا يغير حالة أمر العمل في Local Mode.

التكامل الدائم يحتاج Supabase Adapter وComposite FK داخل الشركة وفحص صلاحية المستخدم على المشروع وأمر العمل.
