with contatos as (
  select distinct on (regexp_replace(phone, '\\D', '', 'g'))
    trim(client_name) as name,
    trim(phone) as phone,
    nullif(trim(city), '') as city,
    'proposta' as source
  from public.sales_proposals
  where coalesce(trim(client_name), '') <> ''
    and length(regexp_replace(coalesce(phone, ''), '\\D', '', 'g')) >= 10
  order by regexp_replace(phone, '\\D', '', 'g'), created_at desc
), inseridos as (
  insert into public.clients(name, phone, city, state, status, lead_source)
  select c.name, c.phone, c.city, 'SP', 'proposta', c.source
  from contatos c
  where not exists (
    select 1 from public.clients x
    where regexp_replace(coalesce(x.phone, ''), '\\D', '', 'g') = regexp_replace(c.phone, '\\D', '', 'g')
  )
  returning id
)
update public.sales_proposals p
set client_id = c.id
from public.clients c
where p.client_id is null
  and length(regexp_replace(coalesce(p.phone, ''), '\\D', '', 'g')) >= 10
  and regexp_replace(c.phone, '\\D', '', 'g') = regexp_replace(p.phone, '\\D', '', 'g');

with contatos as (
  select distinct on (regexp_replace(phone, '\\D', '', 'g'))
    trim(name) as name,
    trim(phone) as phone,
    nullif(trim(city), '') as city,
    monthly_bill,
    'simulacao-solar' as source
  from public.solar_simulations
  where coalesce(trim(name), '') <> ''
    and length(regexp_replace(coalesce(phone, ''), '\\D', '', 'g')) >= 10
  order by regexp_replace(phone, '\\D', '', 'g'), created_at desc
)
insert into public.clients(name, phone, city, state, status, monthly_bill, lead_source)
select c.name, c.phone, c.city, 'SP', 'lead', c.monthly_bill, c.source
from contatos c
where not exists (
  select 1 from public.clients x
  where regexp_replace(coalesce(x.phone, ''), '\\D', '', 'g') = regexp_replace(c.phone, '\\D', '', 'g')
);

update public.solar_simulations s
set client_id = c.id
from public.clients c
where s.client_id is null
  and length(regexp_replace(coalesce(s.phone, ''), '\\D', '', 'g')) >= 10
  and regexp_replace(c.phone, '\\D', '', 'g') = regexp_replace(s.phone, '\\D', '', 'g');
