# نموذج بيانات المرحلة التاسعة

المجاميع الرئيسية: Items/Categories/UOM/Conversions، Warehouses/Zones/Bins، Settings/Lots/Serials، Movements/Lines، Material Requests/Lines، Reservations/Lines، Documents/Lines، Transfers/Lines، Counts/Lines، Damage، Reorder Policies وApprovals.

العلاقات المهمة تستخدم `(organization_id, id)` في Foreign Keys المركبة. `inventory_stock_balances` View مشتقة من الحركات المرحلة. الكميات ثلاثية الدقة والأموال BigInt Minor Units، والعملة محفوظة في كل Snapshot لمنع خلط العملات.
