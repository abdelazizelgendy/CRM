-- Phase-two development seed. Apply only to a local/test Supabase project after seed.sql.
-- It uses the first two existing demo organizations so tenant isolation can be tested.
do $$
declare tenant record; stage_new uuid; stage_qualified uuid; source_manual uuid; tag_hot uuid; lead_one uuid; lead_two uuid; customer_one uuid; contact_one uuid;
begin
  for tenant in
    select o.id organization_id,m.user_id from public.organizations o join public.organization_members m on m.organization_id=o.id and m.is_primary_owner and m.status='active' order by o.created_at limit 2
  loop
    select id into stage_new from public.lead_stages where organization_id=tenant.organization_id and code='new';
    select id into stage_qualified from public.lead_stages where organization_id=tenant.organization_id and code='qualified';
    select id into source_manual from public.lead_sources where organization_id=tenant.organization_id and code='manual';
    insert into public.crm_tags(organization_id,name,color,description,created_by) values(tenant.organization_id,'فرصة ساخنة','#dc2626','وسم تجريبي',tenant.user_id) on conflict(organization_id,name) do update set color=excluded.color returning id into tag_hot;
    insert into public.leads(organization_id,customer_type,full_name,company_name,email,mobile,city,source_id,stage_id,priority,requested_service,request_description,assigned_to,next_follow_up_at,created_by)
      values(tenant.organization_id,'company','عميل شركة تجريبي','شركة الاختبار',('company-'||substr(tenant.organization_id::text,1,6)||'@example.test')::citext,'0500000001','جدة',source_manual,stage_qualified,'high','تصميم وإشراف','بيانات تطوير غير حقيقية',tenant.user_id,now()+interval '2 days',tenant.user_id) returning id into lead_one;
    insert into public.leads(organization_id,customer_type,full_name,email,mobile,city,source_id,stage_id,priority,requested_service,assigned_to,next_follow_up_at,created_by)
      values(tenant.organization_id,'individual','عميل فرد تجريبي',('person-'||substr(tenant.organization_id::text,1,6)||'@example.test')::citext,'0500000002','الرياض',source_manual,stage_new,'medium','استشارة هندسية',tenant.user_id,now()-interval '1 day',tenant.user_id) returning id into lead_two;
    insert into public.lead_tags(organization_id,lead_id,tag_id) values(tenant.organization_id,lead_one,tag_hot);
    insert into public.customer_accounts(organization_id,customer_type,name_ar,general_email,phone,city,account_manager_id,original_source_id,status,notes,created_by)
      values(tenant.organization_id,'company','عميل قائم تجريبي',('customer-'||substr(tenant.organization_id::text,1,6)||'@example.test')::citext,'0500000003','جدة',tenant.user_id,source_manual,'active','بيانات تطوير',tenant.user_id) returning id into customer_one;
    insert into public.contacts(organization_id,customer_account_id,full_name,job_title,email,mobile,is_primary,assigned_to,created_by)
      values(tenant.organization_id,customer_one,'مسؤول تجريبي','مدير مشروع',('contact-'||substr(tenant.organization_id::text,1,6)||'@example.test')::citext,'0500000004',true,tenant.user_id,tenant.user_id) returning id into contact_one;
    insert into public.crm_interactions(organization_id,interaction_type,description,performed_by,lead_id,outcome,next_follow_up_at) values(tenant.organization_id,'call','مكالمة تعريفية تجريبية',tenant.user_id,lead_one,'طلب عرض فني',now()+interval '2 days');
    insert into public.crm_interactions(organization_id,interaction_type,description,performed_by,customer_account_id) values(tenant.organization_id,'meeting','اجتماع تجريبي مع العميل',tenant.user_id,customer_one);
  end loop;
  if (select count(*) from public.organizations)<2 then raise notice 'Create a second demo organization to complete the tenant-isolation seed.'; end if;
end $$;

insert into public.system_settings(key,value,is_public) values('phase','{"number":2,"name":"CRM core"}'::jsonb,true)
on conflict(key) do update set value=excluded.value,updated_at=now();
