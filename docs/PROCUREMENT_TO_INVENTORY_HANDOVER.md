# Procurement → Inventory Handover

المصدر هو Procurement Receipt معتمد، لا Supplier Bill. ينشئ المستخدم Stock Receipt Posting مستقلًا يحدد Item/Warehouse/Bin/Lot/Serial وCost Snapshot والعملة. Posting واحد فقط لكل مرجع عبر Idempotency. الكمية المرفوضة لا تُرحل، والحجر يحتفظ بها خارج Available.
