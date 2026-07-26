-- Completa a persistência do ERP no Supabase.
-- Execute depois de 20260726000100_initial_erp.sql.

create table if not exists public.erp_products (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  bling_id text unique,
  sku text,
  product_type text not null default 'Outro',
  brand text,
  model text not null,
  power_w numeric(12,2) not null default 0,
  supplier text,
  cost_price numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0,
  stock_quantity numeric(14,3) not null default 0,
  warehouse text,
  ncm text,
  unit text not null default 'UN',
  origin text,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bling_contacts (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  name text not null,
  trade_name text,
  document text,
  phone text,
  email text,
  address jsonb not null default '{}'::jsonb,
  contact_type text,
  status text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  order_number text,
  order_date date,
  supplier text,
  status text,
  total numeric(14,2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  origin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  order_number text,
  order_date date,
  client_name text,
  client_document text,
  status text,
  total numeric(14,2) not null default 0,
  payment_method text,
  seller text,
  items jsonb not null default '[]'::jsonb,
  origin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_module_records (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  external_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(module, external_id)
);

alter table public.accounts_receivable add column if not exists client_name text;
alter table public.accounts_receivable add column if not exists category text;
alter table public.accounts_receivable add column if not exists origin text;

drop trigger if exists erp_products_updated_at on public.erp_products;
create trigger erp_products_updated_at before update on public.erp_products
for each row execute procedure public.set_updated_at();
drop trigger if exists bling_contacts_updated_at on public.bling_contacts;
create trigger bling_contacts_updated_at before update on public.bling_contacts
for each row execute procedure public.set_updated_at();
drop trigger if exists purchase_orders_updated_at on public.purchase_orders;
create trigger purchase_orders_updated_at before update on public.purchase_orders
for each row execute procedure public.set_updated_at();
drop trigger if exists sales_orders_updated_at on public.sales_orders;
create trigger sales_orders_updated_at before update on public.sales_orders
for each row execute procedure public.set_updated_at();
drop trigger if exists erp_module_records_updated_at on public.erp_module_records;
create trigger erp_module_records_updated_at before update on public.erp_module_records
for each row execute procedure public.set_updated_at();

alter table public.erp_products enable row level security;
alter table public.bling_contacts enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.sales_orders enable row level security;
alter table public.erp_module_records enable row level security;

drop policy if exists "erp_products_authenticated_all" on public.erp_products;
create policy "erp_products_authenticated_all" on public.erp_products for all to authenticated
using (public.is_active_user()) with check (public.is_active_user());
drop policy if exists "bling_contacts_authenticated_all" on public.bling_contacts;
create policy "bling_contacts_authenticated_all" on public.bling_contacts for all to authenticated
using (public.is_active_user()) with check (public.is_active_user());
drop policy if exists "purchase_orders_authenticated_all" on public.purchase_orders;
create policy "purchase_orders_authenticated_all" on public.purchase_orders for all to authenticated
using (public.is_active_user()) with check (public.is_active_user());
drop policy if exists "sales_orders_authenticated_all" on public.sales_orders;
create policy "sales_orders_authenticated_all" on public.sales_orders for all to authenticated
using (public.is_active_user()) with check (public.is_active_user());
drop policy if exists "erp_module_records_authenticated_all" on public.erp_module_records;
create policy "erp_module_records_authenticated_all" on public.erp_module_records for all to authenticated
using (public.is_active_user()) with check (public.is_active_user());

create index if not exists erp_products_search_idx on public.erp_products
using gin (to_tsvector('simple', coalesce(model,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(sku,'')));
create index if not exists erp_products_supplier_idx on public.erp_products(supplier);
create index if not exists purchase_orders_date_idx on public.purchase_orders(order_date desc);
create index if not exists sales_orders_date_idx on public.sales_orders(order_date desc);
create index if not exists erp_module_records_module_idx on public.erp_module_records(module);
