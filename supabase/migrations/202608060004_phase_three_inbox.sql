-- Phase 3 contract. Keep unapplied until the approved Supabase integration phase.
create type public.conversation_status as enum ('new','open','pending_customer','pending_internal','resolved','closed','spam');
create type public.message_direction as enum ('inbound','outbound','internal');
create type public.message_delivery_status as enum ('draft','queued','sent','delivered','read','failed');
create type public.sla_state as enum ('within','at_risk','breached');

create table public.channels (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), code text not null,
  name_ar text not null, name_en text not null, connection_state text not null default 'disconnected' check(connection_state in ('demo','disconnected','connected')),
  inbound_enabled boolean not null default false, reply_enabled boolean not null default false, default_assignee_id uuid references auth.users(id),
  sla_minutes integer not null default 60 check(sla_minutes between 1 and 10080), external_account_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
  unique(organization_id,code)
);
create table public.external_identities (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), channel_id uuid not null references public.channels(id),
  external_id text not null, lead_id uuid references public.leads(id), customer_id uuid references public.customer_accounts(id), contact_id uuid references public.contacts(id),
  display_name text not null, phone text, email citext, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
  unique(organization_id,channel_id,external_id)
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), channel_id uuid not null references public.channels(id), external_identity_id uuid not null references public.external_identities(id),
  status public.conversation_status not null default 'new', priority public.lead_priority not null default 'medium', assignee_id uuid references auth.users(id), subject text,
  unread_count integer not null default 0 check(unread_count>=0), sla_state public.sla_state not null default 'within', first_response_at timestamptz, resolved_at timestamptz,
  external_thread_id text, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
  unique(organization_id,id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), conversation_id uuid not null,
  direction public.message_direction not null, body text not null check(length(body) between 1 and 5000), sender_id uuid references auth.users(id), sender_name text not null,
  delivery_status public.message_delivery_status not null default 'draft', idempotency_key text, external_message_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
  foreign key(conversation_id,organization_id) references public.conversations(id,organization_id), unique(organization_id,idempotency_key)
);
create table public.message_attachments (id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),message_id uuid not null references public.messages(id),file_name text not null,mime_type text not null,size_bytes bigint not null check(size_bytes between 1 and 10485760),storage_path text not null,created_at timestamptz not null default now(),archived_at timestamptz);
create table public.conversation_tags (organization_id uuid not null references public.organizations(id),conversation_id uuid not null,tag_id uuid not null references public.crm_tags(id),created_at timestamptz not null default now(),primary key(organization_id,conversation_id,tag_id),foreign key(conversation_id,organization_id) references public.conversations(id,organization_id));
create table public.conversation_history (id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),conversation_id uuid not null,actor_id uuid not null references auth.users(id),event_type text not null,old_value jsonb,new_value jsonb,created_at timestamptz not null default now(),foreign key(conversation_id,organization_id) references public.conversations(id,organization_id));
create table public.canned_responses (id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),name_ar text not null,name_en text not null,content_ar text not null,content_en text not null,category text not null,shortcut text not null,is_active boolean not null default true,channel_codes text[] not null default '{}',created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),archived_at timestamptz,unique(organization_id,shortcut));
create table public.sla_policies (id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),name text not null,priority public.lead_priority not null,first_response_minutes integer not null,resolution_minutes integer not null,business_hours jsonb not null default '{}',is_active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),user_id uuid not null references auth.users(id),conversation_id uuid references public.conversations(id),type text not null,title text not null,is_read boolean not null default false,created_at timestamptz not null default now(),read_at timestamptz,archived_at timestamptz);

insert into public.permissions(code,name_ar,name_en,module) values
('inbox.view','عرض صندوق المحادثات','View inbox','inbox'),('conversations.view','عرض المحادثات','View conversations','inbox'),('conversations.reply','الرد على المحادثات','Reply to conversations','inbox'),('conversations.assign','إسناد المحادثات','Assign conversations','inbox'),('conversations.change_status','تغيير حالة المحادثة','Change conversation status','inbox'),('conversations.change_priority','تغيير أولوية المحادثة','Change conversation priority','inbox'),('conversations.link_crm','ربط المحادثة بـ CRM','Link conversation to CRM','inbox'),('conversations.merge','دمج المحادثات','Merge conversations','inbox'),('conversations.close','إغلاق المحادثات','Close conversations','inbox'),('internal_notes.create','إضافة ملاحظات داخلية','Create internal notes','inbox'),('canned_responses.view','عرض الردود الجاهزة','View canned responses','inbox'),('canned_responses.manage','إدارة الردود الجاهزة','Manage canned responses','inbox'),('inbox_settings.manage','إدارة إعدادات الصندوق','Manage inbox settings','inbox'),('inbox_reports.view','عرض تقارير الصندوق','View inbox reports','inbox'),('notifications.view','عرض الإشعارات','View notifications','inbox') on conflict(code) do nothing;

alter table public.channels enable row level security; alter table public.external_identities enable row level security; alter table public.conversations enable row level security; alter table public.messages enable row level security; alter table public.message_attachments enable row level security; alter table public.conversation_tags enable row level security; alter table public.conversation_history enable row level security; alter table public.canned_responses enable row level security; alter table public.sla_policies enable row level security; alter table public.notifications enable row level security;
create policy inbox_channels_read on public.channels for select using(public.is_org_member(organization_id) and public.has_permission(organization_id,'inbox.view'));
create policy inbox_identities_read on public.external_identities for select using(public.is_org_member(organization_id) and public.has_permission(organization_id,'conversations.view'));
create policy inbox_conversations_read on public.conversations for select using(public.is_org_member(organization_id) and public.has_permission(organization_id,'conversations.view'));
create policy inbox_messages_read on public.messages for select using(public.is_org_member(organization_id) and public.has_permission(organization_id,'conversations.view'));
create policy inbox_templates_read on public.canned_responses for select using(public.is_org_member(organization_id) and public.has_permission(organization_id,'canned_responses.view'));
create policy inbox_notifications_read on public.notifications for select using(user_id=auth.uid() and public.is_org_member(organization_id) and public.has_permission(organization_id,'notifications.view'));
-- Writes intentionally require security-definer RPCs in the integration phase. No permissive insert/update/delete policies are added here.
