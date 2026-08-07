# قواعد توزيع التحصيل

يدعم سندًا واحدًا لعدة فواتير وعدة سندات لفاتورة، كاملًا أو جزئيًا. لا توزيع تلقائي؛ اقتراح الأقدم فالأحدث يجب أن يبقى Preview قبل التأكيد. الشروط: confirmed receipt، issued invoice، نفس organization/customer/currency، مبلغ موجب لا يتجاوز unallocated أو open balance، Idempotency Key ونسخ متوقعة. العكس يغيّر allocation إلى Reversed ولا يحذفه.
