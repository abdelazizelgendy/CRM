-- Development-only phase-four seed. Apply only after migration 005 in an isolated project.
-- Uses up to two existing demo organizations; all names and addresses are synthetic.
do $$ declare tenant record;category_id uuid;item_id uuid;template_id uuid;customer_id uuid;request_id uuid;begin
 for tenant in select o.id organization_id,m.user_id from public.organizations o join public.organization_members m on m.organization_id=o.id and m.is_primary_owner and m.status='active' order by o.created_at limit 2 loop
  insert into public.service_categories(organization_id,code,name_ar,name_en,created_by) values(tenant.organization_id,'DESIGN','التصميم الهندسي التجريبي','Demo Engineering Design',tenant.user_id) returning id into category_id;
  insert into public.catalog_items(organization_id,category_id,code,name_ar,name_en,description_ar,description_en,unit,currency,unit_price,internal_cost,tax_rate,created_by) values(tenant.organization_id,category_id,'ARCH-DEMO','تصميم معماري تجريبي','Demo Architectural Design','بيانات غير حقيقية','Synthetic data','م²','SAR',45,26,15,tenant.user_id) returning id into item_id;
  insert into public.quotation_templates(organization_id,name_ar,name_en,language,introduction,scope,exclusions,assumptions,payment_terms,terms,allowed_variables,is_default,created_by) values(tenant.organization_id,'القالب التجريبي','Demo Template','bilingual','عرض {{quotation_number}} للعميل {{customer_name}}','نطاق تجريبي','الرسوم الحكومية','مدخلات معتمدة','50% مقدم','صلاحية 15 يومًا',array['quotation_number','customer_name'],true,tenant.user_id) returning id into template_id;
  select id into customer_id from public.customer_accounts where organization_id=tenant.organization_id and deleted_at is null order by created_at limit 1;
  if customer_id is not null then insert into public.sales_requests(organization_id,request_number,title,description,customer_id,source,status,priority,owner_id,currency,created_by) values(tenant.organization_id,'RFQ-DEMO-00001','طلب تصميم تجريبي','بيانات اختبار غير حقيقية',customer_id,'Manual','needs_pricing','medium',tenant.user_id,'SAR',tenant.user_id) returning id into request_id;end if;
 end loop;
 if(select count(*) from public.organizations)<2 then raise notice 'Create a second demo organization to test tenant isolation.';end if;
end $$;
