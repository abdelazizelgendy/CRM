-- CRM Phase 2: tenant-isolated leads, customers, contacts, interactions, tags and safe workflows.
-- This migration is intentionally independent from the already-applied phase-one migration.

create type public.crm_record_status as enum ('active','qualified','unqualified','converted','lost','archived');
create type public.lead_priority as enum ('low','medium','high','urgent');
create type public.customer_status as enum ('prospect','active','inactive','suspended');
create type public.contact_status as enum ('active','inactive','archived');
create type public.interaction_type as enum ('note','call','meeting','message','email','status_change','assignee_change','follow_up','conversion','merge');

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name_ar text not null check (char_length(trim(name_ar)) between 2 and 80),
  code text not null,
  is_system boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, code), unique (id, organization_id)
);

create table public.lead_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name_ar text not null check (char_length(trim(name_ar)) between 2 and 80),
  code text not null,
  color text not null default '#64748b' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  is_system boolean not null default false,
  is_sensitive boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, code), unique (organization_id, sort_order), unique (id, organization_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_type text not null default 'individual' check (customer_type in ('individual','company')),
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  company_name text, job_title text, email citext, mobile text, whatsapp text,
  normalized_email text generated always as (lower(trim(email::text))) stored,
  normalized_mobile text generated always as (regexp_replace(coalesce(mobile,''),'[^0-9]','','g')) stored,
  normalized_whatsapp text generated always as (regexp_replace(coalesce(whatsapp,''),'[^0-9]','','g')) stored,
  country text default 'السعودية', city text, address text,
  source_id uuid, stage_id uuid not null, priority public.lead_priority not null default 'medium',
  requested_service text, request_description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  next_follow_up_at timestamptz, last_contact_at timestamptz, loss_reason text,
  status public.crm_record_status not null default 'active',
  created_by uuid not null references public.profiles(id) on delete restrict,
  converted_customer_id uuid, converted_contact_id uuid, converted_at timestamptz,
  merged_into_id uuid references public.leads(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  foreign key (source_id,organization_id) references public.lead_sources(id,organization_id) on delete restrict,
  foreign key (stage_id,organization_id) references public.lead_stages(id,organization_id) on delete restrict,
  unique (id, organization_id),
  check (status <> 'converted' or converted_at is not null),
  check (deleted_at is null or status = 'archived')
);

create table public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_type text not null check (customer_type in ('individual','company')),
  name_ar text not null check (char_length(trim(name_ar)) between 2 and 180), name_en text,
  sector text, general_email citext, phone text, whatsapp text, website text,
  normalized_email text generated always as (lower(trim(general_email::text))) stored,
  normalized_phone text generated always as (regexp_replace(coalesce(phone,''),'[^0-9]','','g')) stored,
  normalized_whatsapp text generated always as (regexp_replace(coalesce(whatsapp,''),'[^0-9]','','g')) stored,
  country text default 'السعودية', city text, address text, tax_number text, commercial_registration text,
  account_manager_id uuid references public.profiles(id) on delete set null,
  original_source_id uuid, original_lead_id uuid,
  status public.customer_status not null default 'prospect', notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  foreign key (original_source_id,organization_id) references public.lead_sources(id,organization_id) on delete set null (original_source_id),
  foreign key (original_lead_id,organization_id) references public.leads(id,organization_id) on delete set null (original_lead_id),
  unique (id, organization_id)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_account_id uuid,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  job_title text, department text, email citext, mobile text, whatsapp text,
  normalized_email text generated always as (lower(trim(email::text))) stored,
  normalized_mobile text generated always as (regexp_replace(coalesce(mobile,''),'[^0-9]','','g')) stored,
  normalized_whatsapp text generated always as (regexp_replace(coalesce(whatsapp,''),'[^0-9]','','g')) stored,
  preferred_channel text check (preferred_channel in ('phone','whatsapp','email','message')),
  is_primary boolean not null default false, status public.contact_status not null default 'active', notes text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  foreign key (customer_account_id,organization_id) references public.customer_accounts(id,organization_id) on delete cascade,
  unique (id, organization_id)
);

alter table public.leads add constraint leads_converted_customer_fk foreign key (converted_customer_id,organization_id) references public.customer_accounts(id,organization_id) on delete restrict;
alter table public.leads add constraint leads_converted_contact_fk foreign key (converted_contact_id,organization_id) references public.contacts(id,organization_id) on delete restrict;

create unique index one_primary_contact_per_customer on public.contacts(customer_account_id) where is_primary and deleted_at is null;

create table public.crm_interactions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  interaction_type public.interaction_type not null, description text not null check (char_length(trim(description)) between 1 and 5000),
  performed_by uuid not null references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now(), outcome text, next_follow_up_at timestamptz,
  lead_id uuid, customer_account_id uuid, contact_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (lead_id,organization_id) references public.leads(id,organization_id) on delete cascade,
  foreign key (customer_account_id,organization_id) references public.customer_accounts(id,organization_id) on delete cascade,
  foreign key (contact_id,organization_id) references public.contacts(id,organization_id) on delete cascade,
  check (num_nonnulls(lead_id,customer_account_id,contact_id)=1)
);

create table public.crm_tags (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 50), color text not null default '#0f766e' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  description text, is_active boolean not null default true, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id,name), unique(id,organization_id)
);
create table public.lead_tags (organization_id uuid not null, lead_id uuid not null, tag_id uuid not null, created_at timestamptz not null default now(), primary key(lead_id,tag_id), foreign key(lead_id,organization_id) references public.leads(id,organization_id) on delete cascade, foreign key(tag_id,organization_id) references public.crm_tags(id,organization_id) on delete cascade);
create table public.customer_tags (organization_id uuid not null, customer_account_id uuid not null, tag_id uuid not null, created_at timestamptz not null default now(), primary key(customer_account_id,tag_id), foreign key(customer_account_id,organization_id) references public.customer_accounts(id,organization_id) on delete cascade, foreign key(tag_id,organization_id) references public.crm_tags(id,organization_id) on delete cascade);
create table public.contact_tags (organization_id uuid not null, contact_id uuid not null, tag_id uuid not null, created_at timestamptz not null default now(), primary key(contact_id,tag_id), foreign key(contact_id,organization_id) references public.contacts(id,organization_id) on delete cascade, foreign key(tag_id,organization_id) references public.crm_tags(id,organization_id) on delete cascade);

create index leads_org_created_idx on public.leads(organization_id,created_at desc) where deleted_at is null;
create index leads_org_stage_idx on public.leads(organization_id,stage_id) where deleted_at is null;
create index leads_org_assignee_idx on public.leads(organization_id,assigned_to) where deleted_at is null;
create index leads_org_followup_idx on public.leads(organization_id,next_follow_up_at) where deleted_at is null;
create index leads_email_idx on public.leads(organization_id,normalized_email) where deleted_at is null and normalized_email <> '';
create index leads_mobile_idx on public.leads(organization_id,normalized_mobile) where deleted_at is null and normalized_mobile <> '';
create index customers_search_idx on public.customer_accounts(organization_id,name_ar) where deleted_at is null;
create index contacts_search_idx on public.contacts(organization_id,full_name) where deleted_at is null;
create index interactions_lead_idx on public.crm_interactions(organization_id,lead_id,occurred_at desc);
create index interactions_customer_idx on public.crm_interactions(organization_id,customer_account_id,occurred_at desc);

create trigger lead_sources_touch before update on public.lead_sources for each row execute function public.touch_updated_at();
create trigger lead_stages_touch before update on public.lead_stages for each row execute function public.touch_updated_at();
create trigger leads_touch before update on public.leads for each row execute function public.touch_updated_at();
create trigger customers_touch before update on public.customer_accounts for each row execute function public.touch_updated_at();
create trigger contacts_touch before update on public.contacts for each row execute function public.touch_updated_at();
create trigger interactions_touch before update on public.crm_interactions for each row execute function public.touch_updated_at();
create trigger tags_touch before update on public.crm_tags for each row execute function public.touch_updated_at();

create or replace function public.current_organization_id() returns uuid language plpgsql stable security definer set search_path=public as $$
declare result uuid;
begin
  select organization_id into result from public.organization_members where user_id=auth.uid() and status='active' order by is_primary_owner desc,created_at limit 1;
  if result is null then raise exception 'No active organization'; end if;
  return result;
end $$;

create or replace function public.has_role(target_org uuid, role_code text) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id and r.organization_id=ur.organization_id where ur.organization_id=target_org and ur.user_id=auth.uid() and r.code=role_code);
$$;

create or replace function public.can_access_lead(target_org uuid, assignee uuid, creator uuid, permission_code text default 'leads.view') returns boolean language sql stable security definer set search_path=public as $$
  select public.has_permission(target_org,permission_code) and (not public.has_role(target_org,'sales_agent') or assignee=auth.uid() or creator=auth.uid());
$$;

revoke all on function public.current_organization_id() from public; grant execute on function public.current_organization_id() to authenticated;
revoke all on function public.has_role(uuid,text) from public; grant execute on function public.has_role(uuid,text) to authenticated;
revoke all on function public.can_access_lead(uuid,uuid,uuid,text) from public; grant execute on function public.can_access_lead(uuid,uuid,uuid,text) to authenticated;

alter table public.lead_sources enable row level security; alter table public.lead_stages enable row level security;
alter table public.leads enable row level security; alter table public.customer_accounts enable row level security;
alter table public.contacts enable row level security; alter table public.crm_interactions enable row level security;
alter table public.crm_tags enable row level security; alter table public.lead_tags enable row level security;
alter table public.customer_tags enable row level security; alter table public.contact_tags enable row level security;

create policy sources_read on public.lead_sources for select using(public.has_permission(organization_id,'leads.view'));
create policy sources_manage on public.lead_sources for all using(public.has_permission(organization_id,'crm.settings.manage')) with check(public.has_permission(organization_id,'crm.settings.manage'));
create policy stages_read on public.lead_stages for select using(public.has_permission(organization_id,'leads.view'));
create policy stages_manage on public.lead_stages for all using(public.has_permission(organization_id,'crm.settings.manage')) with check(public.has_permission(organization_id,'crm.settings.manage'));
create policy leads_read on public.leads for select using(public.can_access_lead(organization_id,assigned_to,created_by,'leads.view'));
create policy leads_create on public.leads for insert with check(organization_id=public.current_organization_id() and created_by=auth.uid() and public.has_permission(organization_id,'leads.create'));
create policy leads_update on public.leads for update using(public.can_access_lead(organization_id,assigned_to,created_by,'leads.update')) with check(organization_id=public.current_organization_id() and public.can_access_lead(organization_id,assigned_to,created_by,'leads.update'));
create policy customers_read on public.customer_accounts for select using(public.has_permission(organization_id,'customers.view'));
create policy customers_create on public.customer_accounts for insert with check(organization_id=public.current_organization_id() and created_by=auth.uid() and public.has_permission(organization_id,'customers.create'));
create policy customers_update on public.customer_accounts for update using(public.has_permission(organization_id,'customers.update')) with check(organization_id=public.current_organization_id() and public.has_permission(organization_id,'customers.update'));
create policy contacts_read on public.contacts for select using(public.has_permission(organization_id,'contacts.view'));
create policy contacts_create on public.contacts for insert with check(organization_id=public.current_organization_id() and created_by=auth.uid() and public.has_permission(organization_id,'contacts.create'));
create policy contacts_update on public.contacts for update using(public.has_permission(organization_id,'contacts.update')) with check(organization_id=public.current_organization_id() and public.has_permission(organization_id,'contacts.update'));
create policy interactions_read on public.crm_interactions for select using(public.is_org_member(organization_id) and (public.has_permission(organization_id,'leads.view') or public.has_permission(organization_id,'customers.view')));
create policy interactions_create on public.crm_interactions for insert with check(
  organization_id=public.current_organization_id() and performed_by=auth.uid() and (
    (lead_id is not null and exists(select 1 from public.leads l where l.id=crm_interactions.lead_id and l.organization_id=crm_interactions.organization_id and public.can_access_lead(l.organization_id,l.assigned_to,l.created_by,'leads.update'))) or
    (customer_account_id is not null and public.has_permission(crm_interactions.organization_id,'customers.update')) or
    (contact_id is not null and public.has_permission(crm_interactions.organization_id,'contacts.update'))
  )
);
create policy tags_read on public.crm_tags for select using(public.is_org_member(organization_id));
create policy tags_manage on public.crm_tags for all using(public.has_permission(organization_id,'crm.settings.manage')) with check(public.has_permission(organization_id,'crm.settings.manage'));
create policy lead_tags_read on public.lead_tags for select using(exists(select 1 from public.leads l where l.id=lead_id and public.can_access_lead(l.organization_id,l.assigned_to,l.created_by,'leads.view')));
create policy lead_tags_manage on public.lead_tags for all using(public.has_permission(organization_id,'leads.update')) with check(organization_id=public.current_organization_id() and public.has_permission(organization_id,'leads.update'));
create policy customer_tags_read on public.customer_tags for select using(public.has_permission(organization_id,'customers.view'));
create policy customer_tags_manage on public.customer_tags for all using(public.has_permission(organization_id,'customers.update')) with check(organization_id=public.current_organization_id() and public.has_permission(organization_id,'customers.update'));
create policy contact_tags_read on public.contact_tags for select using(public.has_permission(organization_id,'contacts.view'));
create policy contact_tags_manage on public.contact_tags for all using(public.has_permission(organization_id,'contacts.update')) with check(organization_id=public.current_organization_id() and public.has_permission(organization_id,'contacts.update'));

create or replace function public.prevent_used_stage_delete() returns trigger language plpgsql set search_path=public as $$
begin
  if old.is_sensitive or exists(select 1 from public.leads where stage_id=old.id and deleted_at is null) then raise exception 'Stage is protected or in use'; end if;
  return old;
end $$;
create trigger protect_stage_delete before delete on public.lead_stages for each row execute function public.prevent_used_stage_delete();

create or replace function public.protect_lead_sensitive_changes() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.assigned_to is distinct from new.assigned_to and not public.has_permission(old.organization_id,'leads.assign') then raise exception 'Missing leads.assign permission'; end if;
  if old.status is distinct from new.status and new.status='archived' and not public.has_permission(old.organization_id,'leads.delete') then raise exception 'Missing leads.delete permission'; end if;
  if old.status is distinct from new.status and new.status='converted' and not public.has_permission(old.organization_id,'leads.convert') then raise exception 'Missing leads.convert permission'; end if;
  if old.merged_into_id is distinct from new.merged_into_id and not public.has_permission(old.organization_id,'leads.merge') then raise exception 'Missing leads.merge permission'; end if;
  return new;
end $$;
create trigger protect_lead_changes before update on public.leads for each row execute function public.protect_lead_sensitive_changes();

create or replace function public.audit_crm_change() returns trigger language plpgsql security definer set search_path=public as $$
declare org uuid; rid uuid; action text;
begin
  org=coalesce(new.organization_id,old.organization_id); rid=coalesce(new.id,old.id); action=lower(tg_op);
  insert into public.audit_logs(organization_id,actor_id,event_type,module,description,record_type,record_id,old_values,new_values)
  values(org,auth.uid(),'crm.'||tg_table_name||'.'||action,'crm','تم '||case action when 'insert' then 'إنشاء' else 'تعديل' end||' سجل CRM',tg_table_name,rid,
    case when tg_op='UPDATE' then jsonb_build_object('status',old.status,'updated_at',old.updated_at) else null end,
    case when tg_op in ('INSERT','UPDATE') then jsonb_build_object('status',new.status,'updated_at',new.updated_at) else null end);
  return coalesce(new,old);
end $$;
create trigger audit_leads after insert or update on public.leads for each row execute function public.audit_crm_change();
create trigger audit_customers after insert or update on public.customer_accounts for each row execute function public.audit_crm_change();
create trigger audit_contacts after insert or update on public.contacts for each row execute function public.audit_crm_change();

create or replace function public.audit_crm_setting_change() returns trigger language plpgsql security definer set search_path=public as $$
declare org uuid:=coalesce(new.organization_id,old.organization_id); rid uuid:=coalesce(new.id,old.id);
begin
  insert into public.audit_logs(organization_id,actor_id,event_type,module,description,record_type,record_id,old_values,new_values)
  values(org,auth.uid(),'crm.settings.'||lower(tg_op),'crm','تم تعديل إعدادات CRM',tg_table_name,rid,case when tg_op='UPDATE' then to_jsonb(old)-'created_by' else null end,case when tg_op<>'DELETE' then to_jsonb(new)-'created_by' else null end);
  return coalesce(new,old);
end $$;
create trigger audit_lead_sources after insert or update on public.lead_sources for each row execute function public.audit_crm_setting_change();
create trigger audit_lead_stages after insert or update on public.lead_stages for each row execute function public.audit_crm_setting_change();
create trigger audit_crm_tags after insert or update on public.crm_tags for each row execute function public.audit_crm_setting_change();

create or replace function public.find_lead_duplicates(candidate_email text, candidate_mobile text, candidate_whatsapp text, candidate_company text default null)
returns table(id uuid,full_name text,company_name text,email citext,mobile text,whatsapp text,match_reason text) language sql stable security definer set search_path=public as $$
  with normalized as (select lower(trim(coalesce(candidate_email,''))) e,regexp_replace(coalesce(candidate_mobile,''),'[^0-9]','','g') m,regexp_replace(coalesce(candidate_whatsapp,''),'[^0-9]','','g') w,lower(trim(coalesce(candidate_company,''))) c)
  select l.id,l.full_name,l.company_name,l.email,l.mobile,l.whatsapp,
    concat_ws('، ',case when n.e<>'' and l.normalized_email=n.e then 'البريد' end,case when n.m<>'' and l.normalized_mobile=n.m then 'الجوال' end,case when n.w<>'' and l.normalized_whatsapp=n.w then 'واتساب' end,case when n.c<>'' and lower(trim(coalesce(l.company_name,'')))=n.c and (l.normalized_mobile=n.m or l.normalized_email=n.e) then 'الشركة ووسيلة التواصل' end)
  from public.leads l cross join normalized n where l.organization_id=public.current_organization_id() and l.deleted_at is null and public.can_access_lead(l.organization_id,l.assigned_to,l.created_by,'leads.view') and ((n.e<>'' and l.normalized_email=n.e) or (n.m<>'' and l.normalized_mobile=n.m) or (n.w<>'' and l.normalized_whatsapp=n.w) or (n.c<>'' and lower(trim(coalesce(l.company_name,'')))=n.c and ((n.m<>'' and l.normalized_mobile=n.m) or (n.e<>'' and l.normalized_email=n.e)))) limit 10;
$$;

create or replace function public.create_lead(payload jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); result uuid; default_stage uuid;
begin
  if not public.has_permission(org,'leads.create') then raise exception 'Forbidden'; end if;
  if nullif(payload->>'assigned_to','') is not null and not public.has_permission(org,'leads.assign') then raise exception 'Missing leads.assign permission'; end if;
  select id into default_stage from public.lead_stages where organization_id=org and is_active order by sort_order limit 1;
  insert into public.leads(organization_id,customer_type,full_name,company_name,job_title,email,mobile,whatsapp,country,city,address,source_id,stage_id,priority,requested_service,request_description,assigned_to,next_follow_up_at,created_by)
  values(org,coalesce(payload->>'customer_type','individual'),payload->>'full_name',nullif(payload->>'company_name',''),nullif(payload->>'job_title',''),nullif(payload->>'email','')::citext,nullif(payload->>'mobile',''),nullif(payload->>'whatsapp',''),coalesce(nullif(payload->>'country',''),'السعودية'),nullif(payload->>'city',''),nullif(payload->>'address',''),nullif(payload->>'source_id','')::uuid,coalesce(nullif(payload->>'stage_id','')::uuid,default_stage),coalesce(nullif(payload->>'priority','')::public.lead_priority,'medium'),nullif(payload->>'requested_service',''),nullif(payload->>'request_description',''),nullif(payload->>'assigned_to','')::uuid,nullif(payload->>'next_follow_up_at','')::timestamptz,auth.uid()) returning id into result;
  return result;
end $$;

create or replace function public.archive_leads(lead_ids uuid[]) returns integer language plpgsql security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); affected integer;
begin
  if not public.has_permission(org,'leads.delete') then raise exception 'Forbidden'; end if;
  update public.leads set status='archived',deleted_at=now() where id=any(lead_ids) and organization_id=org and deleted_at is null and public.can_access_lead(organization_id,assigned_to,created_by,'leads.delete');
  get diagnostics affected=row_count; return affected;
end $$;

create or replace function public.change_lead_stage(target_lead uuid,target_stage uuid) returns void language plpgsql security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); old_stage uuid;
begin
  select stage_id into old_stage from public.leads where id=target_lead and organization_id=org and deleted_at is null and public.can_access_lead(organization_id,assigned_to,created_by,'leads.update') for update;
  if old_stage is null or not exists(select 1 from public.lead_stages where id=target_stage and organization_id=org and is_active) then raise exception 'Invalid lead or stage'; end if;
  update public.leads set stage_id=target_stage where id=target_lead;
  insert into public.crm_interactions(organization_id,interaction_type,description,performed_by,lead_id) values(org,'status_change','تم تغيير مرحلة العميل المحتمل',auth.uid(),target_lead);
end $$;

create or replace function public.add_crm_interaction(target_type text,target_id uuid,kind public.interaction_type,body text,outcome_text text default null,follow_up timestamptz default null) returns uuid language plpgsql security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); result uuid;
begin
  if target_type='lead' and not exists(select 1 from public.leads where id=target_id and organization_id=org and public.can_access_lead(organization_id,assigned_to,created_by,'leads.update')) then raise exception 'Forbidden';
  elsif target_type='customer' and not (public.has_permission(org,'customers.update') and exists(select 1 from public.customer_accounts where id=target_id and organization_id=org)) then raise exception 'Forbidden';
  elsif target_type='contact' and not (public.has_permission(org,'contacts.update') and exists(select 1 from public.contacts where id=target_id and organization_id=org)) then raise exception 'Forbidden'; end if;
  insert into public.crm_interactions(organization_id,interaction_type,description,performed_by,next_follow_up_at,outcome,lead_id,customer_account_id,contact_id)
  values(org,kind,body,auth.uid(),follow_up,outcome_text,case when target_type='lead' then target_id end,case when target_type='customer' then target_id end,case when target_type='contact' then target_id end) returning id into result;
  if target_type='lead' and follow_up is not null then update public.leads set next_follow_up_at=follow_up where id=target_id; end if;
  return result;
end $$;

create or replace function public.convert_lead(target_lead uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); l public.leads%rowtype; customer_id uuid; contact_id uuid; existing uuid;
begin
  if not public.has_permission(org,'leads.convert') then raise exception 'Forbidden'; end if;
  select * into l from public.leads where id=target_lead and organization_id=org and deleted_at is null and public.can_access_lead(organization_id,assigned_to,created_by,'leads.update') for update;
  if l.id is null then raise exception 'Lead not found'; end if; if l.converted_at is not null then raise exception 'Lead already converted'; end if;
  select id into existing from public.customer_accounts where organization_id=org and deleted_at is null and ((l.normalized_email<>'' and normalized_email=l.normalized_email) or (l.normalized_mobile<>'' and normalized_phone=l.normalized_mobile)) limit 1;
  if existing is not null then raise exception 'Potential customer duplicate'; end if;
  insert into public.customer_accounts(organization_id,customer_type,name_ar,general_email,phone,whatsapp,country,city,address,account_manager_id,original_source_id,original_lead_id,status,notes,created_by)
  values(org,l.customer_type,coalesce(nullif(l.company_name,''),l.full_name),l.email,l.mobile,l.whatsapp,l.country,l.city,l.address,l.assigned_to,l.source_id,l.id,'active',l.request_description,auth.uid()) returning id into customer_id;
  insert into public.contacts(organization_id,customer_account_id,full_name,job_title,email,mobile,whatsapp,is_primary,assigned_to,created_by)
  values(org,customer_id,l.full_name,l.job_title,l.email,l.mobile,l.whatsapp,true,l.assigned_to,auth.uid()) returning id into contact_id;
  insert into public.customer_tags(organization_id,customer_account_id,tag_id) select org,customer_id,tag_id from public.lead_tags where lead_id=l.id on conflict do nothing;
  insert into public.contact_tags(organization_id,contact_id,tag_id) select org,contact_id,tag_id from public.lead_tags where lead_id=l.id on conflict do nothing;
  update public.crm_interactions set lead_id=null,customer_account_id=customer_id where lead_id=l.id;
  insert into public.crm_interactions(organization_id,interaction_type,description,performed_by,customer_account_id) values(org,'conversion','تم تحويل العميل المحتمل إلى عميل',auth.uid(),customer_id);
  update public.leads set status='converted',converted_customer_id=customer_id,converted_contact_id=contact_id,converted_at=now() where id=l.id;
  insert into public.audit_logs(organization_id,actor_id,event_type,module,description,record_type,record_id,new_values) values(org,auth.uid(),'lead.converted','crm','تم تحويل العميل المحتمل إلى عميل','lead',l.id,jsonb_build_object('customer_id',customer_id,'contact_id',contact_id));
  return jsonb_build_object('customer_id',customer_id,'contact_id',contact_id);
end $$;

create or replace function public.merge_leads(master_id uuid,duplicate_id uuid,resolutions jsonb default '{}'::jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); master public.leads%rowtype; duplicate public.leads%rowtype;
begin
  if master_id=duplicate_id or not public.has_permission(org,'leads.merge') then raise exception 'Forbidden'; end if;
  select * into master from public.leads where id=master_id and organization_id=org and deleted_at is null for update;
  select * into duplicate from public.leads where id=duplicate_id and organization_id=org and deleted_at is null for update;
  if master.id is null or duplicate.id is null then raise exception 'Lead not found'; end if;
  update public.leads set full_name=coalesce(nullif(resolutions->>'full_name',''),master.full_name),company_name=coalesce(nullif(resolutions->>'company_name',''),master.company_name,duplicate.company_name),email=coalesce(nullif(resolutions->>'email','')::citext,master.email,duplicate.email),mobile=coalesce(nullif(resolutions->>'mobile',''),master.mobile,duplicate.mobile),whatsapp=coalesce(nullif(resolutions->>'whatsapp',''),master.whatsapp,duplicate.whatsapp),request_description=coalesce(master.request_description,duplicate.request_description) where id=master.id;
  update public.crm_interactions set lead_id=master.id where lead_id=duplicate.id;
  insert into public.lead_tags(organization_id,lead_id,tag_id) select org,master.id,tag_id from public.lead_tags where lead_id=duplicate.id on conflict do nothing;
  update public.leads set status='archived',deleted_at=now(),merged_into_id=master.id where id=duplicate.id;
  insert into public.crm_interactions(organization_id,interaction_type,description,performed_by,lead_id) values(org,'merge','تم دمج سجل مكرر داخل هذا السجل',auth.uid(),master.id);
  insert into public.audit_logs(organization_id,actor_id,event_type,module,description,record_type,record_id,old_values,new_values) values(org,auth.uid(),'lead.merged','crm','تم دمج سجلين للعملاء المحتملين','lead',master.id,jsonb_build_object('duplicate_id',duplicate.id),jsonb_build_object('master_id',master.id));
  return master.id;
end $$;

revoke all on function public.find_lead_duplicates(text,text,text,text) from public;
revoke all on function public.create_lead(jsonb) from public; revoke all on function public.archive_leads(uuid[]) from public;
revoke all on function public.change_lead_stage(uuid,uuid) from public; revoke all on function public.add_crm_interaction(text,uuid,public.interaction_type,text,text,timestamptz) from public;
revoke all on function public.convert_lead(uuid) from public; revoke all on function public.merge_leads(uuid,uuid,jsonb) from public;
grant execute on function public.find_lead_duplicates(text,text,text,text) to authenticated;
grant execute on function public.create_lead(jsonb) to authenticated; grant execute on function public.archive_leads(uuid[]) to authenticated;
grant execute on function public.change_lead_stage(uuid,uuid) to authenticated; grant execute on function public.add_crm_interaction(text,uuid,public.interaction_type,text,text,timestamptz) to authenticated;
grant execute on function public.convert_lead(uuid) to authenticated; grant execute on function public.merge_leads(uuid,uuid,jsonb) to authenticated;

create or replace function public.record_crm_activity(event_name text,event_description text,event_summary jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); required_permission text;
begin
  if event_name not in ('leads.imported','leads.exported') then raise exception 'Unsupported event'; end if;
  required_permission=case when event_name='leads.imported' then 'leads.import' else 'leads.export' end;
  if not public.has_permission(org,required_permission) then raise exception 'Forbidden'; end if;
  insert into public.audit_logs(organization_id,actor_id,event_type,module,description,new_values) values(org,auth.uid(),event_name,'crm',event_description,event_summary);
end $$;
revoke all on function public.record_crm_activity(text,text,jsonb) from public; grant execute on function public.record_crm_activity(text,text,jsonb) to authenticated;

create or replace function public.import_leads(rows_payload jsonb,duplicate_action text default 'skip') returns jsonb language plpgsql security definer set search_path=public as $$
declare org uuid:=public.current_organization_id(); item jsonb; duplicate_id uuid; default_stage uuid; created_count integer:=0; duplicate_count integer:=0; rejected_count integer:=0; row_number integer:=0; errors jsonb:='[]'::jsonb;
begin
  if not public.has_permission(org,'leads.import') or not public.has_permission(org,'leads.create') then raise exception 'Forbidden'; end if;
  if duplicate_action not in ('skip','update','create') or jsonb_typeof(rows_payload)<>'array' or jsonb_array_length(rows_payload)>500 then raise exception 'Invalid import payload'; end if;
  select id into default_stage from public.lead_stages where organization_id=org and is_active order by sort_order limit 1;
  for item in select value from jsonb_array_elements(rows_payload) loop
    row_number=row_number+1;
    begin
      if char_length(trim(coalesce(item->>'fullName','')))<2 then raise exception 'full_name is required'; end if;
      if nullif(item->>'assignedTo','') is not null and not public.has_permission(org,'leads.assign') then raise exception 'Missing leads.assign permission'; end if;
      duplicate_id=null;
      select l.id into duplicate_id from public.leads l where l.organization_id=org and l.deleted_at is null and (
        (lower(trim(coalesce(item->>'email','')))<>'' and l.normalized_email=lower(trim(item->>'email'))) or
        (regexp_replace(coalesce(item->>'mobile',''),'[^0-9]','','g')<>'' and l.normalized_mobile=regexp_replace(item->>'mobile','[^0-9]','','g')) or
        (regexp_replace(coalesce(item->>'whatsapp',''),'[^0-9]','','g')<>'' and l.normalized_whatsapp=regexp_replace(item->>'whatsapp','[^0-9]','','g'))
      ) limit 1 for update;
      if duplicate_id is not null then
        duplicate_count=duplicate_count+1;
        if duplicate_action='skip' then continue;
        elsif duplicate_action='update' then
          update public.leads set full_name=item->>'fullName',company_name=nullif(item->>'companyName',''),email=nullif(item->>'email','')::citext,mobile=nullif(item->>'mobile',''),whatsapp=nullif(item->>'whatsapp',''),city=nullif(item->>'city',''),priority=coalesce(nullif(item->>'priority','')::public.lead_priority,priority),requested_service=coalesce(nullif(item->>'requestedService',''),requested_service),request_description=coalesce(nullif(item->>'requestDescription',''),request_description) where id=duplicate_id;
          created_count=created_count+1; continue;
        end if;
      end if;
      insert into public.leads(organization_id,customer_type,full_name,company_name,job_title,email,mobile,whatsapp,country,city,address,source_id,stage_id,priority,requested_service,request_description,assigned_to,created_by)
      values(org,coalesce(nullif(item->>'customerType',''),'individual'),item->>'fullName',nullif(item->>'companyName',''),nullif(item->>'jobTitle',''),nullif(item->>'email','')::citext,nullif(item->>'mobile',''),nullif(item->>'whatsapp',''),coalesce(nullif(item->>'country',''),'السعودية'),nullif(item->>'city',''),nullif(item->>'address',''),nullif(item->>'sourceId','')::uuid,coalesce(nullif(item->>'stageId','')::uuid,default_stage),coalesce(nullif(item->>'priority','')::public.lead_priority,'medium'),nullif(item->>'requestedService',''),nullif(item->>'requestDescription',''),nullif(item->>'assignedTo','')::uuid,auth.uid());
      created_count=created_count+1;
    exception when others then rejected_count=rejected_count+1; errors=errors||jsonb_build_array(jsonb_build_object('row',row_number,'reason',sqlerrm)); end;
  end loop;
  insert into public.audit_logs(organization_id,actor_id,event_type,module,description,new_values) values(org,auth.uid(),'leads.imported','crm','تم استيراد ملف العملاء المحتملين',jsonb_build_object('created',created_count,'duplicates',duplicate_count,'rejected',rejected_count));
  return jsonb_build_object('created',created_count,'duplicates',duplicate_count,'rejected',rejected_count,'errors',errors);
end $$;
revoke all on function public.import_leads(jsonb,text) from public; grant execute on function public.import_leads(jsonb,text) to authenticated;

insert into public.permissions(code,module,action,name_ar) values
('leads.view','crm','view','عرض العملاء المحتملين'),('leads.create','crm','create','إنشاء عميل محتمل'),('leads.update','crm','update','تعديل العملاء المحتملين'),('leads.delete','crm','delete','أرشفة العملاء المحتملين'),('leads.assign','crm','assign','تعيين مسؤول المتابعة'),('leads.convert','crm','convert','تحويل العميل المحتمل'),('leads.merge','crm','merge','دمج السجلات المكررة'),('leads.import','crm','import','استيراد العملاء المحتملين'),('leads.export','crm','export','تصدير العملاء المحتملين'),
('customers.view','crm','view','عرض العملاء'),('customers.create','crm','create','إنشاء عميل'),('customers.update','crm','update','تعديل العملاء'),('customers.delete','crm','delete','أرشفة العملاء'),('contacts.view','crm','view','عرض جهات الاتصال'),('contacts.create','crm','create','إنشاء جهة اتصال'),('contacts.update','crm','update','تعديل جهات الاتصال'),('contacts.delete','crm','delete','أرشفة جهات الاتصال'),('crm.settings.manage','crm','manage','إدارة إعدادات CRM'),('crm.reports.view','crm','view','عرض تقارير CRM') on conflict(code) do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.module='crm'
where r.code='owner' or (r.code='admin') or (r.code='sales_manager')
or (r.code='sales_agent' and p.code in ('leads.view','leads.create','leads.update','leads.delete','leads.assign','leads.convert','leads.import','leads.export','customers.view','contacts.view','contacts.create','contacts.update','crm.reports.view'))
or (r.code='customer_service' and p.code in ('customers.view','customers.update','contacts.view','contacts.create','contacts.update','leads.view'))
or (r.code='marketing_manager' and p.code in ('leads.view','leads.create','leads.update','leads.import','leads.export','crm.reports.view'))
or (r.code='accountant' and p.code in ('customers.view','contacts.view'))
or (r.code='viewer' and p.code in ('leads.view','customers.view','contacts.view','crm.reports.view'))
on conflict do nothing;

create or replace function public.seed_crm_defaults_for_org(target_org uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if target_org<>public.current_organization_id() or not public.has_permission(target_org,'crm.settings.manage') then raise exception 'Forbidden'; end if;
  insert into public.lead_sources(organization_id,name_ar,code,is_system,sort_order,created_by) values
  (target_org,'واتساب','whatsapp',true,10,auth.uid()),(target_org,'مكالمة هاتفية','phone',true,20,auth.uid()),(target_org,'بريد إلكتروني','email',true,30,auth.uid()),(target_org,'الموقع الإلكتروني','website',true,40,auth.uid()),(target_org,'فيسبوك','facebook',true,50,auth.uid()),(target_org,'إنستجرام','instagram',true,60,auth.uid()),(target_org,'لينكدإن','linkedin',true,70,auth.uid()),(target_org,'تيك توك','tiktok',true,80,auth.uid()),(target_org,'X','x',true,90,auth.uid()),(target_org,'Google Business','google_business',true,100,auth.uid()),(target_org,'إحالة','referral',true,110,auth.uid()),(target_org,'معرض أو فعالية','event',true,120,auth.uid()),(target_org,'مناقصة','tender',true,130,auth.uid()),(target_org,'إدخال يدوي','manual',true,140,auth.uid()),(target_org,'مصدر آخر','other',true,150,auth.uid()) on conflict(organization_id,code) do nothing;
  insert into public.lead_stages(organization_id,name_ar,code,color,sort_order,is_system,is_sensitive,created_by) values
  (target_org,'جديد','new','#2563eb',10,true,true,auth.uid()),(target_org,'لم يتم التواصل','not_contacted','#64748b',20,true,false,auth.uid()),(target_org,'تم التواصل','contacted','#0891b2',30,true,false,auth.uid()),(target_org,'جارٍ التأهيل','qualifying','#7c3aed',40,true,false,auth.uid()),(target_org,'مؤهل','qualified','#059669',50,true,false,auth.uid()),(target_org,'متابعة لاحقة','follow_up','#d97706',60,true,false,auth.uid()),(target_org,'تم التحويل','converted','#16a34a',70,true,true,auth.uid()),(target_org,'غير مؤهل','unqualified','#dc2626',80,true,true,auth.uid()),(target_org,'مفقود','lost','#991b1b',90,true,true,auth.uid()) on conflict(organization_id,code) do nothing;
end $$;
revoke all on function public.seed_crm_defaults_for_org(uuid) from public; grant execute on function public.seed_crm_defaults_for_org(uuid) to authenticated;

-- New organizations created after this migration receive CRM defaults and role grants
-- without changing the already-applied phase-one migration.
create or replace function public.bootstrap_crm_for_owner_membership() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.is_primary_owner and new.status='active' then
    insert into public.lead_sources(organization_id,name_ar,code,is_system,sort_order,created_by) values
    (new.organization_id,'واتساب','whatsapp',true,10,new.user_id),(new.organization_id,'مكالمة هاتفية','phone',true,20,new.user_id),(new.organization_id,'بريد إلكتروني','email',true,30,new.user_id),(new.organization_id,'الموقع الإلكتروني','website',true,40,new.user_id),(new.organization_id,'فيسبوك','facebook',true,50,new.user_id),(new.organization_id,'إنستجرام','instagram',true,60,new.user_id),(new.organization_id,'لينكدإن','linkedin',true,70,new.user_id),(new.organization_id,'تيك توك','tiktok',true,80,new.user_id),(new.organization_id,'X','x',true,90,new.user_id),(new.organization_id,'Google Business','google_business',true,100,new.user_id),(new.organization_id,'إحالة','referral',true,110,new.user_id),(new.organization_id,'معرض أو فعالية','event',true,120,new.user_id),(new.organization_id,'مناقصة','tender',true,130,new.user_id),(new.organization_id,'إدخال يدوي','manual',true,140,new.user_id),(new.organization_id,'مصدر آخر','other',true,150,new.user_id) on conflict(organization_id,code) do nothing;
    insert into public.lead_stages(organization_id,name_ar,code,color,sort_order,is_system,is_sensitive,created_by) values
    (new.organization_id,'جديد','new','#2563eb',10,true,true,new.user_id),(new.organization_id,'لم يتم التواصل','not_contacted','#64748b',20,true,false,new.user_id),(new.organization_id,'تم التواصل','contacted','#0891b2',30,true,false,new.user_id),(new.organization_id,'جارٍ التأهيل','qualifying','#7c3aed',40,true,false,new.user_id),(new.organization_id,'مؤهل','qualified','#059669',50,true,false,new.user_id),(new.organization_id,'متابعة لاحقة','follow_up','#d97706',60,true,false,new.user_id),(new.organization_id,'تم التحويل','converted','#16a34a',70,true,true,new.user_id),(new.organization_id,'غير مؤهل','unqualified','#dc2626',80,true,true,new.user_id),(new.organization_id,'مفقود','lost','#991b1b',90,true,true,new.user_id) on conflict(organization_id,code) do nothing;
  end if;
  return new;
end $$;
create trigger bootstrap_crm_after_owner_membership after insert on public.organization_members for each row execute function public.bootstrap_crm_for_owner_membership();

create or replace function public.grant_crm_permissions_to_new_role() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.code not in ('owner','admin') then
    insert into public.role_permissions(role_id,permission_id)
    select new.id,p.id from public.permissions p where p.module='crm' and (
      new.code='sales_manager'
      or (new.code='sales_agent' and p.code in ('leads.view','leads.create','leads.update','leads.delete','leads.assign','leads.convert','leads.import','leads.export','customers.view','contacts.view','contacts.create','contacts.update','crm.reports.view'))
      or (new.code='customer_service' and p.code in ('customers.view','customers.update','contacts.view','contacts.create','contacts.update','leads.view'))
      or (new.code='marketing_manager' and p.code in ('leads.view','leads.create','leads.update','leads.import','leads.export','crm.reports.view'))
      or (new.code='accountant' and p.code in ('customers.view','contacts.view'))
      or (new.code='viewer' and p.code in ('leads.view','customers.view','contacts.view','crm.reports.view'))
    ) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger grant_crm_permissions_after_role after insert on public.roles for each row execute function public.grant_crm_permissions_to_new_role();

-- Backfill defaults for organizations created during phase one before this migration existed.
insert into public.lead_sources(organization_id,name_ar,code,is_system,sort_order,created_by)
select o.id,v.name_ar,v.code,true,v.sort_order,m.user_id from public.organizations o join public.organization_members m on m.organization_id=o.id and m.is_primary_owner
cross join (values ('واتساب','whatsapp',10),('مكالمة هاتفية','phone',20),('بريد إلكتروني','email',30),('الموقع الإلكتروني','website',40),('فيسبوك','facebook',50),('إنستجرام','instagram',60),('لينكدإن','linkedin',70),('تيك توك','tiktok',80),('X','x',90),('Google Business','google_business',100),('إحالة','referral',110),('معرض أو فعالية','event',120),('مناقصة','tender',130),('إدخال يدوي','manual',140),('مصدر آخر','other',150)) v(name_ar,code,sort_order)
on conflict(organization_id,code) do nothing;
insert into public.lead_stages(organization_id,name_ar,code,color,sort_order,is_system,is_sensitive,created_by)
select o.id,v.name_ar,v.code,v.color,v.sort_order,true,v.sensitive,m.user_id from public.organizations o join public.organization_members m on m.organization_id=o.id and m.is_primary_owner
cross join (values ('جديد','new','#2563eb',10,true),('لم يتم التواصل','not_contacted','#64748b',20,false),('تم التواصل','contacted','#0891b2',30,false),('جارٍ التأهيل','qualifying','#7c3aed',40,false),('مؤهل','qualified','#059669',50,false),('متابعة لاحقة','follow_up','#d97706',60,false),('تم التحويل','converted','#16a34a',70,true),('غير مؤهل','unqualified','#dc2626',80,true),('مفقود','lost','#991b1b',90,true)) v(name_ar,code,color,sort_order,sensitive)
on conflict(organization_id,code) do nothing;

grant select,insert,update on public.lead_sources,public.lead_stages,public.leads,public.customer_accounts,public.contacts,public.crm_interactions,public.crm_tags,public.lead_tags,public.customer_tags,public.contact_tags to authenticated;
