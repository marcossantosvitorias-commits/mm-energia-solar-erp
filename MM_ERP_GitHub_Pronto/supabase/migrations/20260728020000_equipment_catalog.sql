-- Catálogo central de equipamentos da MM Energia Solar.

create table if not exists public.equipment_catalog (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  type text not null,
  brand text not null,
  model text not null,
  power_w numeric(12,2) not null default 0,
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  stock_quantity numeric(14,3) not null default 0 check (stock_quantity >= 0),
  supplier text,
  price_date date,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists equipment_catalog_search_idx
on public.equipment_catalog using gin (
  to_tsvector('simple', coalesce(type, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(model, '') || ' ' || coalesce(supplier, ''))
);

alter table public.equipment_catalog enable row level security;

drop policy if exists "equipment_catalog_operational_read" on public.equipment_catalog;
create policy "equipment_catalog_operational_read"
on public.equipment_catalog for select to authenticated
using (public.has_any_role(array['admin', 'engenharia']));

drop policy if exists "equipment_catalog_operational_write" on public.equipment_catalog;
create policy "equipment_catalog_operational_write"
on public.equipment_catalog for all to authenticated
using (public.has_any_role(array['admin', 'engenharia']))
with check (public.has_any_role(array['admin', 'engenharia']));

drop trigger if exists equipment_catalog_updated_at on public.equipment_catalog;
create trigger equipment_catalog_updated_at
before update on public.equipment_catalog
for each row execute procedure public.set_updated_at();
