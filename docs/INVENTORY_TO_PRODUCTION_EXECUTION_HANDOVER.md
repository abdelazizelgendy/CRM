# Inventory to Production execution handover

الحجز والتجهيز والصرف والمرتجع يمران عبر Inventory domain القائم. On-hand مشتق من posted movements، وAvailable يستبعد Reserved وQuarantine/Damaged/Expired. لا يوجد تعديل رصيد مباشر أو Ledger موازٍ أو Backflush فعلي.
