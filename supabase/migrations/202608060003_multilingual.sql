-- Multilingual extension: localized CRM configuration without changing tenant isolation.
alter table public.lead_sources add column if not exists name_en text;
alter table public.lead_stages add column if not exists name_en text;
alter table public.crm_tags add column if not exists name_ar text;
alter table public.crm_tags add column if not exists name_en text;

update public.crm_tags set name_ar = name where name_ar is null;

alter table public.lead_sources add constraint lead_sources_name_en_length
  check (name_en is null or char_length(trim(name_en)) between 2 and 80);
alter table public.lead_stages add constraint lead_stages_name_en_length
  check (name_en is null or char_length(trim(name_en)) between 2 and 80);
alter table public.crm_tags add constraint crm_tags_name_ar_length
  check (name_ar is null or char_length(trim(name_ar)) between 1 and 50);
alter table public.crm_tags add constraint crm_tags_name_en_length
  check (name_en is null or char_length(trim(name_en)) between 1 and 50);

update public.lead_sources set name_en = case code
  when 'whatsapp' then 'WhatsApp' when 'phone' then 'Phone call'
  when 'email' then 'Email' when 'website' then 'Website'
  when 'facebook' then 'Facebook' when 'instagram' then 'Instagram'
  when 'linkedin' then 'LinkedIn' when 'tiktok' then 'TikTok'
  when 'x' then 'X' when 'google_business' then 'Google Business'
  when 'referral' then 'Referral' when 'event' then 'Exhibition or event'
  when 'tender' then 'Tender' when 'manual' then 'Manual entry'
  when 'other' then 'Other source' else name_en end
where name_en is null;

update public.lead_stages set name_en = case code
  when 'new' then 'New' when 'not_contacted' then 'Not contacted'
  when 'contacted' then 'Contacted' when 'qualifying' then 'Qualifying'
  when 'qualified' then 'Qualified' when 'follow_up' then 'Follow-up'
  when 'converted' then 'Converted' when 'unqualified' then 'Unqualified'
  when 'lost' then 'Lost' else name_en end
where name_en is null;

comment on column public.lead_sources.name_en is 'Optional English display name; Arabic remains the required source locale.';
comment on column public.lead_stages.name_en is 'Optional English display name; Arabic remains the required source locale.';
comment on column public.crm_tags.name_ar is 'Arabic localized tag label.';
comment on column public.crm_tags.name_en is 'English localized tag label.';

