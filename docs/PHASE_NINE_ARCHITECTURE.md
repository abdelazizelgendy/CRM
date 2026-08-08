# معمارية المرحلة التاسعة

`UI → Inventory Repository → Domain/Calculations → Local Provider`، مع `SupabaseInventoryRepository` كـStub رافض صريح. الأنواع والحسابات والحالات منفصلة عن الواجهة. الرصيد Read Model مشتق من `InventoryMovement[]` ولا توجد دالة لتعديله مباشرة.

كل سجل يحمل `organizationId`. كل عملية تتحقق من المستخدم والصلاحية والملكية والإصدار المتوقع وIdempotency حيث تنطبق. الحركات المرحلة غير قابلة للتعديل؛ التصحيح بحركة Reversal مقابلة.
