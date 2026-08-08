# Production to Inventory handover

Completion المعتمدة ذات Good Quantity موجبة فقط تستدعي `InventoryRepository.postProductionCompletion`. الحركة تحمل production completion/project/WBS/task/job references وIdempotency key، وتدخل available output bin. Scrap وRework لا يدخلان Finished Goods. الحركة المرحلة immutable وتصحيحها المستقبلي يكون Reversal لا حذفًا.
