# نموذج بيانات المرحلة السادسة

العقد `202608070007_phase_six_billing_collections.sql` يعرّف settings/sequences/templates، invoices/lines/sources/approvals/attachments/delivery attempts، receipts/allocations، adjustments/lines/approvals، وcollection followups. جميع العلاقات المالية تحمل `organization_id` وقيودًا مركبة، مع Unique Numbers وIdempotency وRecord Version وفهارس الحالة والاستحقاق والرصيد.

**Migration contract — not applied or integration-tested.** لم تطبق Migration على أي مشروع.
