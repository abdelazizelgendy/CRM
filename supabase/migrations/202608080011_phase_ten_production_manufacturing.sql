-- Phase 10 production/manufacturing schema contract.
-- Migration contract — not applied or integration-tested
-- Review and integration-test on an isolated Supabase project before execution.

create type public.production_revision_status as enum ('draft','under_review','approved','released','superseded','archived');
create type public.production_order_status as enum ('draft','planned','material_check','awaiting_approval','released','in_progress','on_hold','partially_completed','completed','closed','cancelled');

create table public.production_work_centers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  code text not null, name_ar text not null, name_en text, center_type text not null check(center_type in ('internal','external','assembly','quality','packing')),
  shift_minutes integer not null check(shift_minutes>=0), parallel_resources integer not null check(parallel_resources>0), efficiency_bps integer not null check(efficiency_bps between 0 and 20000),
  hourly_rate_minor bigint check(hourly_rate_minor>=0), currency text not null check(currency in ('SAR','EGP','USD')), status text not null check(status in ('active','maintenance','blocked','retired')),
  record_version integer not null default 1, unique(organization_id,code), unique(organization_id,id)
);
create table public.production_boms (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), number text not null,
  output_item_id uuid not null, output_quantity_mills bigint not null check(output_quantity_mills>0), unit_id uuid not null,
  revision integer not null check(revision>0), status public.production_revision_status not null default 'draft', effective_from date not null,
  snapshot_locked boolean not null default false, created_by uuid not null, approved_by uuid, record_version integer not null default 1,
  unique(organization_id,number,revision), unique(organization_id,id)
);
create table public.production_bom_lines (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, bom_id uuid not null, item_id uuid not null,
  quantity_mills bigint not null check(quantity_mills>=0), fixed_quantity_mills bigint not null default 0 check(fixed_quantity_mills>=0), scrap_bps integer not null default 0 check(scrap_bps between 0 and 10000),
  issue_method text not null check(issue_method in ('manual','staging','backflush_preview')), procurement_mode text not null check(procurement_mode in ('make','buy','subcontract')),
  warehouse_id uuid not null, bin_id uuid not null, unique(organization_id,bom_id,id),
  foreign key(organization_id,bom_id) references public.production_boms(organization_id,id) on delete restrict
);
create table public.production_routings (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), number text not null, item_id uuid not null,
  revision integer not null check(revision>0), status public.production_revision_status not null default 'draft', snapshot_locked boolean not null default false,
  created_by uuid not null, approved_by uuid, record_version integer not null default 1, unique(organization_id,number,revision), unique(organization_id,id)
);
create table public.production_routing_operations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, routing_id uuid not null, sequence integer not null check(sequence>0), code text not null,
  name_ar text not null, name_en text, work_center_id uuid not null, setup_minutes integer not null default 0 check(setup_minutes>=0), run_minutes_per_unit integer not null default 0 check(run_minutes_per_unit>=0),
  queue_minutes integer not null default 0 check(queue_minutes>=0), move_minutes integer not null default 0 check(move_minutes>=0), inspection_required boolean not null default false, subcontracted boolean not null default false,
  unique(organization_id,routing_id,sequence), foreign key(organization_id,routing_id) references public.production_routings(organization_id,id) on delete restrict,
  foreign key(organization_id,work_center_id) references public.production_work_centers(organization_id,id) on delete restrict
);
create table public.production_orders (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), number text not null, project_id uuid not null, wbs_id uuid not null, task_id uuid not null,
  production_job_id uuid not null, finished_item_id uuid not null, planned_quantity_mills bigint not null check(planned_quantity_mills>0), completed_good_mills bigint not null default 0 check(completed_good_mills>=0),
  completed_scrap_mills bigint not null default 0 check(completed_scrap_mills>=0), rework_mills bigint not null default 0 check(rework_mills>=0), currency text not null check(currency in ('SAR','EGP','USD')),
  bom_revision integer not null, routing_revision integer not null, bom_snapshot jsonb not null check(jsonb_typeof(bom_snapshot)='array'), routing_snapshot jsonb not null check(jsonb_typeof(routing_snapshot)='array'),
  status public.production_order_status not null default 'draft', material_readiness text not null default 'not_checked', required_date date not null,
  idempotency_key text not null, record_version integer not null default 1, created_by uuid not null, approved_by uuid, released_by uuid,
  unique(organization_id,number), unique(organization_id,idempotency_key), unique(organization_id,id)
);
create table public.production_job_cards (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, number text not null, order_id uuid not null, operation_sequence integer not null,
  work_center_id uuid not null, status text not null, planned_quantity_mills bigint not null check(planned_quantity_mills>0), good_mills bigint not null default 0 check(good_mills>=0),
  scrap_mills bigint not null default 0 check(scrap_mills>=0), rework_mills bigint not null default 0 check(rework_mills>=0), setup_minutes integer not null default 0, run_minutes integer not null default 0,
  inspection_status text not null default 'pending', record_version integer not null default 1, unique(organization_id,number), unique(organization_id,order_id,operation_sequence),
  foreign key(organization_id,order_id) references public.production_orders(organization_id,id) on delete restrict,
  foreign key(organization_id,work_center_id) references public.production_work_centers(organization_id,id) on delete restrict
);
create table public.production_mrp_runs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), number text not null, status text not null,
  horizon_end date not null, parameters jsonb not null, result_snapshot jsonb not null, idempotency_key text not null, created_by uuid not null, created_at timestamptz not null default now(),
  unique(organization_id,number), unique(organization_id,idempotency_key), unique(organization_id,id)
);
create table public.production_completions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null, number text not null, order_id uuid not null, job_card_id uuid not null,
  good_mills bigint not null check(good_mills>=0), scrap_mills bigint not null check(scrap_mills>=0), rework_mills bigint not null check(rework_mills>=0), quality_status text not null check(quality_status in ('pass','conditional','fail')),
  status text not null check(status in ('draft','approved','posted','reversed')), inventory_movement_id uuid, idempotency_key text not null, created_by uuid not null, approved_by uuid,
  unique(organization_id,number), unique(organization_id,idempotency_key), unique(organization_id,inventory_movement_id),
  foreign key(organization_id,order_id) references public.production_orders(organization_id,id) on delete restrict,
  foreign key(organization_id,job_card_id) references public.production_job_cards(organization_id,id) on delete restrict
);

create index production_orders_open_idx on public.production_orders(organization_id,required_date,status) where status not in ('closed','cancelled');
create index production_job_cards_queue_idx on public.production_job_cards(organization_id,work_center_id,status,operation_sequence) where status not in ('completed','cancelled');
create index production_mrp_runs_recent_idx on public.production_mrp_runs(organization_id,created_at desc);

alter table public.production_work_centers enable row level security;
alter table public.production_boms enable row level security;
alter table public.production_bom_lines enable row level security;
alter table public.production_routings enable row level security;
alter table public.production_routing_operations enable row level security;
alter table public.production_orders enable row level security;
alter table public.production_job_cards enable row level security;
alter table public.production_mrp_runs enable row level security;
alter table public.production_completions enable row level security;

-- RLS policies intentionally rely on the existing active organization membership contract.
do $$ declare t text; begin foreach t in array array['production_work_centers','production_boms','production_bom_lines','production_routings','production_routing_operations','production_orders','production_job_cards','production_mrp_runs','production_completions'] loop execute format('create policy %I on public.%I for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))',t||'_tenant_policy',t); end loop; end $$;

insert into public.permissions(code,module,action,name_ar,description)
select code,'production',split_part(code,'.',2),code,'Phase ten production permission' from unnest(array[
 'production.view','production.manage_master_data','production.manage_bom','production.approve_bom','production.manage_routing','production.approve_routing','production.manage_work_centers','production.plan','production.run_mrp','production.approve_plan','production.create_order','production.release_order','production.execute_operation','production.pause_operation','production.override_sequence','production.record_output','production.post_completion','production.record_scrap','production.approve_scrap','production.record_quality','production.approve_quality','production.manage_subcontract','production.view_cost','production.manage_rates','production.close_order','production.reverse','production.export','production.print','production.view_audit'
]::text[]) code on conflict(code) do nothing;

create or replace function public.phase_ten_production_contract_unavailable() returns void language plpgsql security invoker as $$
begin raise exception 'Migration contract — not applied or integration-tested'; end $$;
comment on function public.phase_ten_production_contract_unavailable is 'Explicit guard: atomic numbering, release, MRP, material, operation, completion, scrap and reversal RPCs require isolated integration testing before implementation.';
