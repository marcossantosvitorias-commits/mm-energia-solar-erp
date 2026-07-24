create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'admin' check (role in ('admin','comercial','financeiro','engenharia','instalador')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  phone text not null,
  email text,
  city text default 'Bauru',
  state text default 'SP',
  customer_type text not null default 'residencial',
  status text not null default 'lead',
  monthly_bill numeric(12,2) not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  phone text,
  email text,
  category text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  description text not null,
  transaction_type text not null check (transaction_type in ('entrada','saida')),
  category text not null default 'Outros',
  amount numeric(14,2) not null check (amount >= 0),
  transaction_date date not null,
  payment_method text,
  origin text,
  supplier_id uuid references public.suppliers(id),
  client_id uuid references public.clients(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  description text not null,
  supplier_name text,
  supplier_id uuid references public.suppliers(id),
  category text not null default 'Fornecedor',
  amount numeric(14,2) not null check (amount >= 0),
  due_date date not null,
  paid_date date,
  status text not null default 'pendente' check (status in ('pendente','paga','cancelada')),
  origin text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  description text not null,
  client_id uuid references public.clients(id),
  client_name text,
  category text,
  amount numeric(14,2) not null check (amount >= 0),
  due_date date not null,
  received_date date,
  status text not null default 'pendente' check (status in ('pendente','recebida','cancelada')),
  origin text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_imports (
  id uuid primary key default gen_random_uuid(),
  import_type text not null check (import_type in ('ofx','csv_contas_pagar','csv_contas_receber')),
  filename text,
  checksum text,
  total_records integer not null default 0,
  imported_records integer not null default 0,
  duplicate_records integer not null default 0,
  ignored_records integer not null default 0,
  imported_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(import_type, checksum)
);

create table if not exists public.belcred_simulations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id),
  project_value numeric(14,2) not null check (project_value > 0),
  installments jsonb not null default '[]'::jsonb,
  copied_text text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 'admin')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger clients_updated_at before update on public.clients for each row execute procedure public.set_updated_at();
create trigger suppliers_updated_at before update on public.suppliers for each row execute procedure public.set_updated_at();
create trigger transactions_updated_at before update on public.financial_transactions for each row execute procedure public.set_updated_at();
create trigger payable_updated_at before update on public.accounts_payable for each row execute procedure public.set_updated_at();
create trigger receivable_updated_at before update on public.accounts_receivable for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.suppliers enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.accounts_payable enable row level security;
alter table public.accounts_receivable enable row level security;
alter table public.data_imports enable row level security;
alter table public.belcred_simulations enable row level security;

create policy "authenticated profiles" on public.profiles for all to authenticated using (true) with check (true);
create policy "authenticated clients" on public.clients for all to authenticated using (true) with check (true);
create policy "authenticated suppliers" on public.suppliers for all to authenticated using (true) with check (true);
create policy "authenticated transactions" on public.financial_transactions for all to authenticated using (true) with check (true);
create policy "authenticated payable" on public.accounts_payable for all to authenticated using (true) with check (true);
create policy "authenticated receivable" on public.accounts_receivable for all to authenticated using (true) with check (true);
create policy "authenticated imports" on public.data_imports for all to authenticated using (true) with check (true);
create policy "authenticated belcred" on public.belcred_simulations for all to authenticated using (true) with check (true);

create index if not exists clients_name_idx on public.clients using gin (to_tsvector('portuguese', name));
create index if not exists transactions_date_idx on public.financial_transactions(transaction_date desc);
create index if not exists payable_due_idx on public.accounts_payable(due_date, status);
create index if not exists receivable_due_idx on public.accounts_receivable(due_date, status);
