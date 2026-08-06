# معمارية المرحلة الثالثة

```mermaid
flowchart TD
  UI[Inbox UI] --> Contract[InboxRepository]
  Contract --> Local[Local Adapter]
  Contract --> Stub[Supabase Stub]
  Local --> Seed[Multi-tenant Seed]
  Stub --> Future[Future RPC and RLS]
```

`DATA_PROVIDER` يحدد مزود مساحة العمل. الصندوق لا يعرف تفاصيل Supabase. `LocalInboxRepository` ينفذ التحقق والصلاحيات والعزل وIdempotency وسجل التدقيق، و`SupabaseInboxRepository` يفشل بوضوح حتى مرحلة التكامل. Migration 004 يعرّف مخطط القاعدة وRLS القراءة؛ الكتابة ستتم لاحقًا عبر RPCs أمنية فقط.
