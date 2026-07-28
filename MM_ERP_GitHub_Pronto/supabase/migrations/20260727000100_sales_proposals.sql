-- Histórico central de propostas comerciais da MM Energia Solar.
create table if not exists public.sales_proposals (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  phone text not null,
  city text,
  status text not null default 'Gerada',
  total_amount numeric(14,2) not null default 0,
  panel_count integer not null default 0,
  panel_power_w integer,
  system_power_kw numeric(10,3),
  monthly_generation_kwh numeric(12,2),
  panel_model text,
  inverter_model text,
  validity_days integer not null default 7,
  notes text,
  proposal_data jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_proposals_created_idx on public.sales_proposals(created_at desc);
create index if not exists sales_proposals_client_idx on public.sales_proposals(client_name);
create index if not exists sales_proposals_phone_idx on public.sales_proposals(phone);
create index if not exists sales_proposals_status_idx on public.sales_proposals(status);

alter table public.sales_proposals enable row level security;

drop policy if exists "sales_proposals_authenticated_all" on public.sales_proposals;
create policy "sales_proposals_authenticated_all" on public.sales_proposals for all to authenticated
using (public.is_active_user()) with check (public.is_active_user());

drop trigger if exists sales_proposals_updated_at on public.sales_proposals;
create trigger sales_proposals_updated_at before update on public.sales_proposals
for each row execute procedure public.set_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sales_proposals'
  ) then
    alter publication supabase_realtime add table public.sales_proposals;
  end if;
end
$$;
