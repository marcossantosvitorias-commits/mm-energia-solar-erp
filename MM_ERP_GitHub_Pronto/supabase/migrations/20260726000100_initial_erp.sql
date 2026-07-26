create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
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
  city text,
  state text,
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
  category text,
  amount numeric(14,2) not null check (amount >= 0),
  transaction_date date not null,
  payment_method text,
  origin text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts_payable (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  description text not null,
  supplier text,
  category text,
  amount numeric(14,2) not null check (amount >= 0),
  due_date date not null,
  paid_date date,
  status text not null default 'pendente' check (status in ('pendente','paga','vencida','cancelada')),
  origin text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  description text not null,
  client_id uuid references public.clients(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  due_date date not null,
  received_date date,
  status text not null default 'pendente' check (status in ('pendente','recebida','vencida','cancelada')),
  payment_method text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text not null,
  imported_count integer not null default 0,
  duplicate_count integer not null default 0,
  ignored_count integer not null default 0,
  imported_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.belcred_simulations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  project_value numeric(14,2) not null check (project_value > 0),
  simulation jsonb not null,
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

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true and p.role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 'admin')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at before update on public.clients for each row execute procedure public.set_updated_at();
drop trigger if exists suppliers_updated_at on public.suppliers;
create trigger suppliers_updated_at before update on public.suppliers for each row execute procedure public.set_updated_at();
drop trigger if exists financial_transactions_updated_at on public.financial_transactions;
create trigger financial_transactions_updated_at before update on public.financial_transactions for each row execute procedure public.set_updated_at();
drop trigger if exists accounts_payable_updated_at on public.accounts_payable;
create trigger accounts_payable_updated_at before update on public.accounts_payable for each row execute procedure public.set_updated_at();
drop trigger if exists accounts_receivable_updated_at on public.accounts_receivable;
create trigger accounts_receivable_updated_at before update on public.accounts_receivable for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.suppliers enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.accounts_payable enable row level security;
alter table public.accounts_receivable enable row level security;
alter table public.data_imports enable row level security;
alter table public.belcred_simulations enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists "clients_authenticated_all" on public.clients;
create policy "clients_authenticated_all" on public.clients for all to authenticated using (public.is_active_user()) with check (public.is_active_user());
drop policy if exists "suppliers_authenticated_all" on public.suppliers;
create policy "suppliers_authenticated_all" on public.suppliers for all to authenticated using (public.is_active_user()) with check (public.is_active_user());
drop policy if exists "transactions_authenticated_all" on public.financial_transactions;
create policy "transactions_authenticated_all" on public.financial_transactions for all to authenticated using (public.is_active_user()) with check (public.is_active_user());
drop policy if exists "payable_authenticated_all" on public.accounts_payable;
create policy "payable_authenticated_all" on public.accounts_payable for all to authenticated using (public.is_active_user()) with check (public.is_active_user());
drop policy if exists "receivable_authenticated_all" on public.accounts_receivable;
create policy "receivable_authenticated_all" on public.accounts_receivable for all to authenticated using (public.is_active_user()) with check (public.is_active_user());
drop policy if exists "imports_authenticated_all" on public.data_imports;
create policy "imports_authenticated_all" on public.data_imports for all to authenticated using (public.is_active_user()) with check (public.is_active_user());
drop policy if exists "belcred_authenticated_all" on public.belcred_simulations;
create policy "belcred_authenticated_all" on public.belcred_simulations for all to authenticated using (public.is_active_user()) with check (public.is_active_user());

create index if not exists clients_name_idx on public.clients using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(phone,'') || ' ' || coalesce(email,'')));
create index if not exists financial_transactions_date_idx on public.financial_transactions(transaction_date desc);
create index if not exists accounts_payable_due_idx on public.accounts_payable(due_date);
create index if not exists accounts_receivable_due_idx on public.accounts_receivable(due_date);
