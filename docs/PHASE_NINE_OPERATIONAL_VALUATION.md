# التقييم التشغيلي

الطريقة الافتراضية: Moving Weighted Average.

`New Average = (Old Qty × Old Average + Receipt Qty × Receipt Cost) ÷ (Old Qty + Receipt Qty)`

يستخدم الحساب أعدادًا صحيحة وتقريب Half-up. أول استلام يحدد المتوسط، ولا تحدث قسمة على صفر. الصرف لا يغير المتوسط ويحفظ Snapshot؛ المرتجع يستخدم Snapshot الأصلي؛ التحويل يحافظ عليه؛ Adjustment المقبول يدخل كاستلام مستقل. لا تخلط العملات. النتائج تشغيلية غير محاسبية.
