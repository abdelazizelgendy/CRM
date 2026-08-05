-- CRM Phase 1: multi-tenant identity, RBAC, invitations and immutable audit log.
create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.organization_status as enum ('active','suspended','trial','closed');
create type public.member_status as enum ('invited','active','suspended','inactive','expired');
create type public.invitation_status as enum ('pending','accepted','cancelled','expired');
create type public.audit_result as enum ('success','failure');

create table public.organizations (
  id uuid primary key default gen_random_uuid(), name_ar text not null check (char_length(name_ar) >= 2), name_en text,
  logo_url text, email text, phone text, whatsapp text, country text default 'السعودية', city text, address text,
  tax_number text, commercial_registration text, default_currency text not null default 'SAR', timezone text not null default 'Asia/Riyadh',
  default_language text not null default 'ar', status public.organization_status not null default 'trial',
  created_by uuid references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, full_name text not null, phone text, avatar_url text,
  job_title text, department_id uuid, language text not null default 'ar', timezone text not null default 'Asia/Riyadh',
  is_super_admin boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.departments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name_ar text not null, name_en text, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, name_ar), unique(id, organization_id)
);
alter table public.profiles add constraint profiles_department_fk foreign key (department_id) references public.departments(id) on delete set null;
create table public.organization_members (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, status public.member_status not null default 'invited',
  is_primary_owner boolean not null default false, last_login_at timestamptz, invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,user_id), unique(id,organization_id),
  foreign key(user_id) references public.profiles(id) on delete cascade
);
create table public.roles (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null, name_ar text not null, name_en text not null, description text, is_system boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,code), unique(id,organization_id)
);
create table public.permissions (
  id uuid primary key default gen_random_uuid(), code text not null unique, module text not null, action text not null,
  name_ar text not null, description text, created_at timestamptz not null default now()
);
create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade, permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(role_id,permission_id)
);
create table public.user_roles (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role_id uuid not null references public.roles(id) on delete restrict,
  assigned_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), primary key(organization_id,user_id,role_id),
  foreign key(organization_id,user_id) references public.organization_members(organization_id,user_id) on delete cascade,
  foreign key(role_id,organization_id) references public.roles(id,organization_id) on delete cascade
);
create table public.invitations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  email citext not null, full_name text not null, phone text, department_id uuid references public.departments(id) on delete set null,
  job_title text, role_id uuid not null references public.roles(id) on delete restrict, token_hash text not null unique,
  status public.invitation_status not null default 'pending', expires_at timestamptz not null default (now()+interval '72 hours'),
  invited_by uuid not null references auth.users(id) on delete restrict, accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz, cancelled_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_pending_invitation_per_org_email on public.invitations(organization_id,email) where status='pending';
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null, event_type text not null, module text not null, description text not null,
  record_type text, record_id uuid, old_values jsonb, new_values jsonb, ip_address inet, user_agent text,
  result public.audit_result not null default 'success', created_at timestamptz not null default now()
);
create table public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade, settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.system_settings (
  key text primary key, value jsonb not null, is_public boolean not null default false, updated_at timestamptz not null default now()
);

create index members_org_status_idx on public.organization_members(organization_id,status);
create index members_user_idx on public.organization_members(user_id);
create index roles_org_idx on public.roles(organization_id);
create index audit_org_created_idx on public.audit_logs(organization_id,created_at desc);
create index invitations_org_status_idx on public.invitations(organization_id,status);

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
create trigger organizations_touch before update on public.organizations for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger departments_touch before update on public.departments for each row execute function public.touch_updated_at();
create trigger members_touch before update on public.organization_members for each row execute function public.touch_updated_at();
create trigger roles_touch before update on public.roles for each row execute function public.touch_updated_at();
create trigger invitations_touch before update on public.invitations for each row execute function public.touch_updated_at();

create or replace function public.is_org_member(target_org uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organization_members m where m.organization_id=target_org and m.user_id=auth.uid() and m.status='active');
$$;
create or replace function public.has_permission(target_org uuid, permission_code text) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id join public.permissions p on p.id=rp.permission_id
    where ur.organization_id=target_org and ur.user_id=auth.uid() and p.code=permission_code)
  or exists(select 1 from public.profiles where id=auth.uid() and is_super_admin);
$$;
revoke all on function public.is_org_member(uuid) from public; grant execute on function public.is_org_member(uuid) to authenticated;
revoke all on function public.has_permission(uuid,text) from public; grant execute on function public.has_permission(uuid,text) to authenticated;

create or replace function public.record_self_auth_event(event_name text) returns void language plpgsql security definer set search_path=public as $$
declare member_record record;
begin
  if event_name not in ('auth.login','auth.logout','auth.password_changed') then raise exception 'Unsupported event'; end if;
  for member_record in select organization_id from public.organization_members where user_id=auth.uid() and status='active' loop
    insert into public.audit_logs(organization_id,actor_id,event_type,module,description)
    values(member_record.organization_id,auth.uid(),event_name,'authentication',case event_name when 'auth.login' then 'تم تسجيل الدخول' when 'auth.logout' then 'تم تسجيل الخروج' else 'تم تغيير كلمة المرور' end);
    if event_name='auth.login' then update public.organization_members set last_login_at=now() where organization_id=member_record.organization_id and user_id=auth.uid(); end if;
  end loop;
end $$;
revoke all on function public.record_self_auth_event(text) from public; grant execute on function public.record_self_auth_event(text) to authenticated;

alter table public.organizations enable row level security; alter table public.profiles enable row level security;
alter table public.departments enable row level security; alter table public.organization_members enable row level security;
alter table public.roles enable row level security; alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security; alter table public.user_roles enable row level security;
alter table public.invitations enable row level security; alter table public.audit_logs enable row level security;
alter table public.organization_settings enable row level security; alter table public.system_settings enable row level security;

create policy org_read on public.organizations for select using(public.is_org_member(id));
create policy org_update on public.organizations for update using(public.has_permission(id,'organization.settings.manage')) with check(public.has_permission(id,'organization.settings.manage'));
create policy profile_self_read on public.profiles for select using(id=auth.uid());
create policy profile_org_read on public.profiles for select using(exists(select 1 from public.organization_members me join public.organization_members them on them.organization_id=me.organization_id where me.user_id=auth.uid() and me.status='active' and them.user_id=profiles.id));
create policy profile_self_update on public.profiles for update using(id=auth.uid()) with check(id=auth.uid() and is_super_admin=false);
create policy departments_read on public.departments for select using(public.is_org_member(organization_id));
create policy departments_manage on public.departments for all using(public.has_permission(organization_id,'organization.settings.manage')) with check(public.has_permission(organization_id,'organization.settings.manage'));
create policy members_read on public.organization_members for select using(public.is_org_member(organization_id));
create policy members_manage on public.organization_members for update using(public.has_permission(organization_id,'users.manage') and not is_primary_owner) with check(public.has_permission(organization_id,'users.manage') and not is_primary_owner);
create policy roles_read on public.roles for select using(public.is_org_member(organization_id));
create policy roles_manage on public.roles for all using(public.has_permission(organization_id,'roles.manage') and not (is_system and code='owner')) with check(public.has_permission(organization_id,'roles.manage') and not (is_system and code='owner'));
create policy permissions_read on public.permissions for select to authenticated using(true);
create policy role_permissions_read on public.role_permissions for select using(exists(select 1 from public.roles r where r.id=role_id and public.is_org_member(r.organization_id)));
create policy role_permissions_manage on public.role_permissions for all using(exists(select 1 from public.roles r where r.id=role_id and public.has_permission(r.organization_id,'roles.manage') and r.code<>'owner')) with check(exists(select 1 from public.roles r where r.id=role_id and public.has_permission(r.organization_id,'roles.manage') and r.code<>'owner'));
create policy user_roles_read on public.user_roles for select using(public.is_org_member(organization_id));
create policy user_roles_manage on public.user_roles for all using(public.has_permission(organization_id,'roles.manage') and user_id<>auth.uid() and not exists(select 1 from public.organization_members m where m.organization_id=user_roles.organization_id and m.user_id=user_roles.user_id and m.is_primary_owner)) with check(public.has_permission(organization_id,'roles.manage') and user_id<>auth.uid());
create policy invitations_read on public.invitations for select using(public.has_permission(organization_id,'users.invite'));
create policy invitations_manage on public.invitations for all using(public.has_permission(organization_id,'users.invite')) with check(public.has_permission(organization_id,'users.invite') and invited_by=auth.uid());
create policy audit_read on public.audit_logs for select using(public.has_permission(organization_id,'audit.view'));
create policy settings_read on public.organization_settings for select using(public.is_org_member(organization_id));
create policy settings_manage on public.organization_settings for all using(public.has_permission(organization_id,'organization.settings.manage')) with check(public.has_permission(organization_id,'organization.settings.manage'));
create policy system_public_read on public.system_settings for select using(is_public=true or exists(select 1 from public.profiles where id=auth.uid() and is_super_admin));

create or replace function public.create_custom_role(target_org uuid, role_name_ar text, role_name_en text, role_description text, permission_ids uuid[]) returns uuid
language plpgsql security definer set search_path=public as $$
declare new_role_id uuid;
begin
  if not public.has_permission(target_org,'roles.manage') then raise exception 'Forbidden'; end if;
  insert into public.roles(organization_id,code,name_ar,name_en,description,is_system)
  values(target_org,'custom_'||substr(replace(gen_random_uuid()::text,'-',''),1,12),role_name_ar,role_name_en,role_description,false) returning id into new_role_id;
  insert into public.role_permissions(role_id,permission_id) select new_role_id,id from public.permissions where id=any(permission_ids);
  if not found then raise exception 'At least one permission is required'; end if;
  insert into public.audit_logs(organization_id,actor_id,event_type,module,description,record_type,record_id,new_values)
  values(target_org,auth.uid(),'role.created','roles','تم إنشاء دور مخصص','role',new_role_id,jsonb_build_object('name_ar',role_name_ar));
  return new_role_id;
end $$;
revoke all on function public.create_custom_role(uuid,text,text,text,uuid[]) from public;
grant execute on function public.create_custom_role(uuid,text,text,text,uuid[]) to authenticated;

insert into public.permissions(code,module,action,name_ar) values
('dashboard.view','dashboard','view','عرض لوحة التحكم'),('users.view','users','view','عرض المستخدمين'),('users.manage','users','manage','إدارة المستخدمين'),
('users.invite','users','invite','دعوة المستخدمين'),('roles.view','roles','view','عرض الأدوار'),('roles.manage','roles','manage','إدارة الأدوار'),
('audit.view','audit','view','عرض سجل النشاط'),('organization.settings.manage','organization','manage','إدارة إعدادات الشركة'),
('profile.view','profile','view','عرض الملف الشخصي'),('sensitive.execute','system','execute','تنفيذ إجراءات حساسة');

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public,auth as $$
declare org_id uuid; owner_role uuid; role_record record; pending_invite public.invitations%rowtype;
begin
  insert into public.profiles(id,full_name,phone) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1)),new.raw_user_meta_data->>'phone');
  if nullif(new.raw_user_meta_data->>'invitation_token','') is not null then
    select * into pending_invite from public.invitations
      where token_hash=encode(digest(new.raw_user_meta_data->>'invitation_token','sha256'),'hex')
      and lower(email::text)=lower(new.email) and status='pending' and expires_at>now() for update;
    if pending_invite.id is null then raise exception 'Invalid or expired invitation'; end if;
    update public.profiles set full_name=pending_invite.full_name,phone=pending_invite.phone,job_title=pending_invite.job_title,department_id=pending_invite.department_id where id=new.id;
    insert into public.organization_members(organization_id,user_id,status,invited_by) values(pending_invite.organization_id,new.id,'active',pending_invite.invited_by);
    insert into public.user_roles(organization_id,user_id,role_id,assigned_by) values(pending_invite.organization_id,new.id,pending_invite.role_id,pending_invite.invited_by);
    update public.invitations set status='accepted',accepted_by=new.id,accepted_at=now() where id=pending_invite.id;
    insert into public.audit_logs(organization_id,actor_id,event_type,module,description,record_type,record_id) values(pending_invite.organization_id,new.id,'invitation.accepted','users','تم قبول دعوة المستخدم','invitation',pending_invite.id);
  elsif nullif(new.raw_user_meta_data->>'organization_name','') is not null then
    insert into public.organizations(name_ar,email,phone,created_by) values(new.raw_user_meta_data->>'organization_name',new.email,new.raw_user_meta_data->>'phone',new.id) returning id into org_id;
    insert into public.organization_settings(organization_id) values(org_id);
    insert into public.departments(organization_id,name_ar,name_en) values(org_id,'الإدارة','Management'),(org_id,'المبيعات','Sales'),(org_id,'خدمة العملاء','Customer Service'),(org_id,'التسويق','Marketing');
    insert into public.organization_members(organization_id,user_id,status,is_primary_owner) values(org_id,new.id,'active',true);
    for role_record in select * from (values ('owner','مالك الشركة','Owner',true),('admin','مدير النظام','Admin',true),('sales_manager','مدير المبيعات','Sales Manager',true),('sales_agent','موظف المبيعات','Sales Agent',true),('customer_service','خدمة العملاء','Customer Service',true),('marketing_manager','مسؤول التسويق','Marketing Manager',true),('accountant','المحاسب','Accountant',true),('viewer','مشاهد','Viewer',true)) as r(code,name_ar,name_en,is_system) loop
      insert into public.roles(organization_id,code,name_ar,name_en,is_system) values(org_id,role_record.code,role_record.name_ar,role_record.name_en,role_record.is_system) returning id into owner_role;
      if role_record.code='owner' then
        insert into public.role_permissions(role_id,permission_id) select owner_role,id from public.permissions;
        insert into public.user_roles(organization_id,user_id,role_id,assigned_by) values(org_id,new.id,owner_role,new.id);
      elsif role_record.code='admin' then insert into public.role_permissions(role_id,permission_id) select owner_role,id from public.permissions where code<>'sensitive.execute';
      else insert into public.role_permissions(role_id,permission_id) select owner_role,id from public.permissions where code in ('dashboard.view','profile.view');
      end if;
    end loop;
    insert into public.audit_logs(organization_id,actor_id,event_type,module,description,new_values) values(org_id,new.id,'organization.created','organization','تم إنشاء الشركة وحساب المالك',jsonb_build_object('organization_id',org_id));
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.prevent_audit_mutation() returns trigger language plpgsql as $$ begin raise exception 'audit_logs are immutable'; end $$;
create trigger audit_immutable before update or delete on public.audit_logs for each row execute function public.prevent_audit_mutation();

grant usage on schema public to authenticated;
grant select,update on public.organizations,public.profiles,public.organization_members to authenticated;
grant select,insert,update on public.departments,public.roles,public.role_permissions,public.user_roles,public.invitations,public.organization_settings to authenticated;
grant select on public.permissions,public.audit_logs,public.system_settings to authenticated;
