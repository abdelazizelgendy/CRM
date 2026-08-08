-- Phase 11 HR/workforce schema contract.
-- Migration contract — not applied or integration-tested.
-- It contains no salary, allowance, deduction, payslip, payment, GL or bank fields.

create type public.hr_worker_status as enum ('draft','active','on_leave','suspended','notice_period','terminated','archived');
create type public.hr_attendance_status as enum ('expected','present','late','partial','absent','approved_leave','holiday','rest_day','missing_punch','pending_correction','corrected');
create type public.hr_payroll_readiness_status as enum ('open','collecting','under_review','exceptions_pending','ready','frozen','exported','reopened','superseded');

alter table public.departments add column if not exists parent_department_id uuid references public.departments(id) on delete restrict;
alter table public.departments add column if not exists code text;

create table public.hr_positions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), department_id uuid not null,
 code text not null, name_ar text not null, name_en text, capacity integer check(capacity is null or capacity>=0), active boolean not null default true,
 effective_from date not null default current_date, effective_to date, record_version integer not null default 1,
 unique(organization_id,code), unique(organization_id,id), foreign key(department_id,organization_id) references public.departments(id,organization_id),
 check(effective_to is null or effective_to>=effective_from)
);
create table public.hr_work_locations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), code text not null, name text not null,
 timezone text not null, active boolean not null default true, record_version integer not null default 1, unique(organization_id,code), unique(organization_id,id)
);
create table public.hr_work_calendars (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), name text not null, timezone text not null,
 working_days smallint[] not null, holiday_rules jsonb not null default '[]'::jsonb, active boolean not null default true, record_version integer not null default 1,
 unique(organization_id,name), unique(organization_id,id)
);
create table public.hr_shift_templates (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, calendar_id uuid not null, name text not null,
 start_minute integer not null check(start_minute between 0 and 1439), end_minute integer not null check(end_minute between 0 and 1439),
 break_minutes integer not null default 0 check(break_minutes between 0 and 1439), grace_minutes integer not null default 0 check(grace_minutes between 0 and 240),
 crosses_midnight boolean not null default false, active boolean not null default true, record_version integer not null default 1,
 unique(organization_id,name), unique(organization_id,id), foreign key(organization_id,calendar_id) references public.hr_work_calendars(organization_id,id)
);
create table public.hr_employee_sequences (
 organization_id uuid primary key references public.organizations(id), last_value bigint not null default 0 check(last_value>=0)
);
create table public.hr_workers (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), employee_number text not null,
 user_id uuid references public.profiles(id) on delete restrict, membership_id uuid, name_ar text not null, name_en text, display_name text not null,
 worker_type text not null check(worker_type in('employee','contractor','temporary','intern','consultant','daily_labor')), status public.hr_worker_status not null default 'draft',
 join_date date not null, service_start_date date not null, expected_end_date date, last_working_date date, department_id uuid not null, position_id uuid not null,
 manager_id uuid, location_id uuid not null, calendar_id uuid not null, default_shift_id uuid not null, work_mode text not null check(work_mode in('on_site','office','hybrid','remote')),
 project_eligible boolean not null default true, work_center_eligible boolean not null default true, work_email citext, work_mobile_masked text,
 sensitive_identity_ciphertext bytea, emergency_contact_ciphertext bytea, document_metadata jsonb not null default '[]'::jsonb,
 record_version integer not null default 1, created_by uuid not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 unique(organization_id,employee_number), unique(organization_id,id), unique(organization_id,user_id), unique(organization_id,membership_id),
 foreign key(membership_id,organization_id) references public.organization_members(id,organization_id) on delete restrict,
 foreign key(department_id,organization_id) references public.departments(id,organization_id), foreign key(organization_id,position_id) references public.hr_positions(organization_id,id),
 foreign key(organization_id,location_id) references public.hr_work_locations(organization_id,id), foreign key(organization_id,calendar_id) references public.hr_work_calendars(organization_id,id),
 foreign key(organization_id,default_shift_id) references public.hr_shift_templates(organization_id,id), foreign key(organization_id,manager_id) references public.hr_workers(organization_id,id),
 check(manager_id is null or manager_id<>id), check(last_working_date is null or last_working_date>=service_start_date)
);
create table public.hr_employment_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, worker_id uuid not null, event_type text not null, effective_date date not null,
 reason text not null, before_snapshot jsonb not null, after_snapshot jsonb not null, created_by uuid not null, approved_by uuid, created_at timestamptz not null default now(),
 unique(organization_id,id), foreign key(organization_id,worker_id) references public.hr_workers(organization_id,id) on delete restrict
);
create table public.hr_shift_assignments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, worker_id uuid not null, shift_id uuid not null, location_id uuid not null,
 effective_from date not null, effective_to date, record_version integer not null default 1, unique(organization_id,id),
 foreign key(organization_id,worker_id) references public.hr_workers(organization_id,id), foreign key(organization_id,shift_id) references public.hr_shift_templates(organization_id,id),
 foreign key(organization_id,location_id) references public.hr_work_locations(organization_id,id), check(effective_to is null or effective_to>=effective_from)
);
create table public.hr_punch_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, worker_id uuid not null, occurred_at timestamptz not null,
 punch_type text not null check(punch_type in('in','out','break_start','break_end')), source text not null check(source in('manual_authorized','web_demo','csv_preview','external_stub')),
 idempotency_key text not null, created_by uuid not null, created_at timestamptz not null default now(), unique(organization_id,idempotency_key), unique(organization_id,id),
 foreign key(organization_id,worker_id) references public.hr_workers(organization_id,id)
);
create table public.hr_attendance_records (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, worker_id uuid not null, shift_id uuid not null, work_date date not null,
 first_in timestamptz, last_out timestamptz, worked_minutes integer not null default 0 check(worked_minutes>=0), late_minutes integer not null default 0 check(late_minutes>=0),
 early_leave_minutes integer not null default 0 check(early_leave_minutes>=0), missing_minutes integer not null default 0 check(missing_minutes>=0),
 status public.hr_attendance_status not null default 'expected', source text not null, project_id uuid, work_center_id uuid, correction_id uuid,
 idempotency_key text not null, record_version integer not null default 1, unique(organization_id,worker_id,work_date), unique(organization_id,idempotency_key), unique(organization_id,id),
 foreign key(organization_id,worker_id) references public.hr_workers(organization_id,id), foreign key(organization_id,shift_id) references public.hr_shift_templates(organization_id,id),
 foreign key(organization_id,project_id) references public.projects(organization_id,id), foreign key(organization_id,work_center_id) references public.production_work_centers(organization_id,id),
 check(last_out is null or first_in is null or last_out>first_in)
);
create table public.hr_attendance_corrections (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, attendance_id uuid not null, requested_values jsonb not null, reason text not null,
 status text not null check(status in('submitted','approved','rejected')), before_snapshot jsonb not null, after_snapshot jsonb,
 requested_by uuid not null, approved_by uuid, idempotency_key text not null, created_at timestamptz not null default now(),
 unique(organization_id,idempotency_key), unique(organization_id,id), foreign key(organization_id,attendance_id) references public.hr_attendance_records(organization_id,id),
 check(approved_by is null or approved_by<>requested_by)
);
alter table public.hr_attendance_records add constraint hr_attendance_correction_fk foreign key(organization_id,correction_id) references public.hr_attendance_corrections(organization_id,id);

create table public.hr_leave_types (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), code text not null, name text not null,
 paid_information_flag boolean not null default false, unit text not null check(unit in('days','hours')), requires_balance boolean not null default true,
 requires_attachment boolean not null default false, allow_half_day boolean not null default false, allow_hourly boolean not null default false,
 allow_negative boolean not null default false, policy_config jsonb not null default '{}'::jsonb, active boolean not null default true,
 unique(organization_id,code), unique(organization_id,id)
);
create table public.hr_leave_requests (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, worker_id uuid not null, leave_type_id uuid not null,
 starts_at timestamptz not null, ends_at timestamptz not null, requested_units_mills bigint not null check(requested_units_mills>0), reason text not null,
 handover_notes text not null default '', project_id uuid, task_id uuid, balance_snapshot_mills bigint not null, status text not null,
 record_version integer not null default 1, created_by uuid not null, approved_by uuid, idempotency_key text not null,
 unique(organization_id,idempotency_key), unique(organization_id,id), foreign key(organization_id,worker_id) references public.hr_workers(organization_id,id),
 foreign key(organization_id,leave_type_id) references public.hr_leave_types(organization_id,id), foreign key(organization_id,project_id) references public.projects(organization_id,id),
 foreign key(organization_id,task_id) references public.project_tasks(organization_id,id), check(ends_at>=starts_at)
);
create table public.hr_leave_ledger (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, worker_id uuid not null, leave_type_id uuid not null,
 entry_type text not null check(entry_type in('opening','accrual','consumption','reversal','adjustment','carry_forward','expiry')), units_mills bigint not null check(units_mills<>0),
 source_id uuid, reversal_of_id uuid, status text not null default 'posted' check(status='posted'), created_by uuid not null, approved_by uuid not null,
 occurred_at timestamptz not null default now(), idempotency_key text not null, unique(organization_id,idempotency_key), unique(organization_id,reversal_of_id), unique(organization_id,id),
 foreign key(organization_id,worker_id) references public.hr_workers(organization_id,id), foreign key(organization_id,leave_type_id) references public.hr_leave_types(organization_id,id),
 foreign key(reversal_of_id) references public.hr_leave_ledger(id), check(created_by<>approved_by or entry_type not in('adjustment'))
);
create table public.hr_overtime_records (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, worker_id uuid not null, work_date date not null,
 starts_at timestamptz not null, ends_at timestamptz not null, minutes integer not null check(minutes>0), reason text not null,
 project_id uuid, wbs_id uuid, task_id uuid, production_order_id uuid, work_center_id uuid, attendance_reconciled boolean not null default false,
 status text not null check(status in('submitted','approved','rejected')), created_by uuid not null, approved_by uuid, idempotency_key text not null, record_version integer not null default 1,
 unique(organization_id,idempotency_key), unique(organization_id,id), foreign key(organization_id,worker_id) references public.hr_workers(organization_id,id),
 foreign key(organization_id,project_id) references public.projects(organization_id,id), foreign key(organization_id,wbs_id) references public.project_wbs_items(organization_id,id),
 foreign key(organization_id,task_id) references public.project_tasks(organization_id,id), foreign key(organization_id,production_order_id) references public.production_orders(organization_id,id),
 foreign key(organization_id,work_center_id) references public.production_work_centers(organization_id,id), check(ends_at>starts_at), check(approved_by is null or approved_by<>created_by)
);
create table public.hr_time_reconciliations (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, worker_id uuid not null, period_start date not null, period_end date not null,
 attendance_minutes integer not null, timesheet_minutes integer not null, job_card_minutes integer not null, linked_job_card_minutes integer not null default 0,
 approved_leave_minutes integer not null, approved_overtime_minutes integer not null, unallocated_minutes integer not null, overallocated_minutes integer not null,
 missing_data jsonb not null default '[]'::jsonb, source_ids jsonb not null default '[]'::jsonb, status text not null, approved_by uuid, updated_at timestamptz not null default now(),
 unique(organization_id,worker_id,period_start,period_end), unique(organization_id,id), foreign key(organization_id,worker_id) references public.hr_workers(organization_id,id), check(period_end>=period_start)
);
create table public.hr_workforce_assignments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, worker_id uuid not null, project_id uuid, wbs_id uuid, task_id uuid, work_center_id uuid,
 effective_from date not null, effective_to date, planned_minutes integer not null check(planned_minutes>=0), shift_id uuid not null, location_id uuid not null,
 required_certification_type_ids uuid[] not null default '{}', status text not null, record_version integer not null default 1, unique(organization_id,id),
 foreign key(organization_id,worker_id) references public.hr_workers(organization_id,id), foreign key(organization_id,project_id) references public.projects(organization_id,id),
 foreign key(organization_id,wbs_id) references public.project_wbs_items(organization_id,id), foreign key(organization_id,task_id) references public.project_tasks(organization_id,id),
 foreign key(organization_id,work_center_id) references public.production_work_centers(organization_id,id), foreign key(organization_id,shift_id) references public.hr_shift_templates(organization_id,id),
 foreign key(organization_id,location_id) references public.hr_work_locations(organization_id,id), check(effective_to is null or effective_to>=effective_from)
);
create table public.hr_worker_development (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, worker_id uuid not null, record_type text not null check(record_type in('skill','certification','training')),
 code text not null, details jsonb not null, issue_date date, expiry_date date, verified_by uuid, override_by uuid, override_reason text,
 unique(organization_id,id), foreign key(organization_id,worker_id) references public.hr_workers(organization_id,id)
);
create table public.hr_worker_checklists (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, worker_id uuid not null, checklist_type text not null check(checklist_type in('onboarding','offboarding')),
 tasks jsonb not null, status text not null, record_version integer not null default 1, unique(organization_id,id), foreign key(organization_id,worker_id) references public.hr_workers(organization_id,id)
);
create table public.hr_performance_reviews (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, worker_id uuid not null, reviewer_id uuid not null, review_period text not null,
 criteria_snapshot jsonb not null, rating integer not null check(rating between 1 and 5), comments text not null, acknowledged boolean not null default false,
 status text not null, revision integer not null default 1, record_version integer not null default 1, unique(organization_id,worker_id,review_period,revision), unique(organization_id,id),
 foreign key(organization_id,worker_id) references public.hr_workers(organization_id,id)
);
create table public.hr_payroll_readiness_batches (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), number text not null, period_start date not null, period_end date not null,
 timezone text not null, status public.hr_payroll_readiness_status not null default 'open', snapshot_hash text, snapshot_version integer not null default 1,
 frozen_snapshot jsonb, frozen_by uuid, exported_at timestamptz, drift boolean not null default false, override_reason text, idempotency_key text not null,
 record_version integer not null default 1, created_by uuid not null, unique(organization_id,number), unique(organization_id,idempotency_key), unique(organization_id,id), check(period_end>=period_start)
);
create table public.hr_payroll_readiness_lines (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, batch_id uuid not null, worker_id uuid not null,
 scheduled_minutes integer not null, attendance_minutes integer not null, approved_regular_minutes integer not null, overtime_minutes integer not null,
 paid_leave_units_mills bigint not null, unpaid_leave_units_mills bigint not null, absence_minutes integer not null, late_minutes integer not null,
 early_minutes integer not null, missing_punches integer not null, manual_adjustment_minutes integer not null default 0, adjustment_reason text,
 unresolved_exceptions integer not null, reconciliation_status text not null, source_ids jsonb not null, unique(organization_id,batch_id,worker_id),
 foreign key(organization_id,batch_id) references public.hr_payroll_readiness_batches(organization_id,id), foreign key(organization_id,worker_id) references public.hr_workers(organization_id,id)
);

create index hr_workers_active_idx on public.hr_workers(organization_id,department_id,location_id,status) where status not in('archived','terminated');
create index hr_attendance_daily_idx on public.hr_attendance_records(organization_id,work_date,status);
create index hr_leave_pending_idx on public.hr_leave_requests(organization_id,status,starts_at) where status like 'pending%';
create index hr_cert_expiry_idx on public.hr_worker_development(organization_id,expiry_date) where record_type='certification';
create index hr_readiness_period_idx on public.hr_payroll_readiness_batches(organization_id,period_start,period_end,status);

create or replace function public.prevent_hr_event_mutation() returns trigger language plpgsql as $$ begin raise exception 'Posted HR event rows are immutable; post a reversal/correction'; end $$;
create trigger hr_employment_events_immutable before update or delete on public.hr_employment_events for each row execute function public.prevent_hr_event_mutation();
create trigger hr_leave_ledger_immutable before update or delete on public.hr_leave_ledger for each row execute function public.prevent_hr_event_mutation();
create trigger hr_punch_events_immutable before update or delete on public.hr_punch_events for each row execute function public.prevent_hr_event_mutation();

create or replace function public.next_hr_employee_number(target_org uuid) returns text language plpgsql security definer set search_path=public as $$
declare n bigint;
begin
 if not public.has_permission(target_org,'hr.manage_workers') then raise exception 'Forbidden'; end if;
 insert into public.hr_employee_sequences(organization_id,last_value) values(target_org,1)
 on conflict(organization_id) do update set last_value=public.hr_employee_sequences.last_value+1 returning last_value into n;
 return 'EMP-'||lpad(n::text,6,'0');
end $$;
revoke all on function public.next_hr_employee_number(uuid) from public; grant execute on function public.next_hr_employee_number(uuid) to authenticated;

do $$ declare t text; begin foreach t in array array[
 'hr_positions','hr_work_locations','hr_work_calendars','hr_shift_templates','hr_employee_sequences','hr_workers','hr_employment_events','hr_shift_assignments',
 'hr_punch_events','hr_attendance_records','hr_attendance_corrections','hr_leave_types','hr_leave_requests','hr_leave_ledger','hr_overtime_records',
 'hr_time_reconciliations','hr_workforce_assignments','hr_worker_development','hr_worker_checklists','hr_performance_reviews','hr_payroll_readiness_batches','hr_payroll_readiness_lines'
] loop execute format('alter table public.%I enable row level security',t);execute format('create policy %I on public.%I for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))',t||'_tenant_policy',t);end loop;end $$;

insert into public.permissions(code,module,action,name_ar,description)
select code,split_part(code,'.',1),split_part(code,'.',2),code,'Phase eleven HR/workforce permission' from unnest(array[
 'hr.view','hr.view_sensitive','hr.manage_workers','hr.link_user','hr.manage_structure','hr.manage_positions','hr.manage_locations','hr.manage_calendars','hr.manage_shifts',
 'attendance.view','attendance.record','attendance.request_correction','attendance.approve_correction','leave.view','leave.request','leave.manage_types','leave.approve_manager','leave.approve_hr','leave.adjust_balance',
 'overtime.request','overtime.approve','workforce.assign','workforce.reconcile_time','skills.manage','training.manage','performance.manage','performance.view_sensitive',
 'payroll_readiness.view','payroll_readiness.prepare','payroll_readiness.freeze','payroll_readiness.reopen','payroll_readiness.export','hr.reports.view','hr.audit.view'
]::text[]) code on conflict(code) do nothing;

create or replace function public.phase_eleven_hr_contract_unavailable() returns void language plpgsql security invoker as $$
begin raise exception 'Migration 012 contract — not applied or integration-tested; transactional HR RPCs are unavailable'; end $$;
comment on function public.phase_eleven_hr_contract_unavailable is 'Guard for identity linking, corrections, leave posting/reversal, overtime approval, readiness freeze/reopen/export and sensitive field access until isolated integration testing.';
