create table if not exists public.solar_monitoring_plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null default 'solarman',
  external_id text not null,
  client_name text not null,
  current_power_w numeric(14,3) not null default 0,
  generation_today_kwh numeric(14,3) not null default 0,
  installed_capacity_kwp numeric(14,3) not null default 0,
  is_online boolean not null default false,
  has_alert boolean not null default false,
  source_updated_at text,
  imported_at timestamptz not null default now(),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, external_id)
);

create index if not exists solar_monitoring_plants_client_idx
  on public.solar_monitoring_plants (client_name);

alter table public.solar_monitoring_plants enable row level security;

drop policy if exists "solar_monitoring_select_own" on public.solar_monitoring_plants;
create policy "solar_monitoring_select_own"
  on public.solar_monitoring_plants for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "solar_monitoring_insert_own" on public.solar_monitoring_plants;
create policy "solar_monitoring_insert_own"
  on public.solar_monitoring_plants for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "solar_monitoring_update_own" on public.solar_monitoring_plants;
create policy "solar_monitoring_update_own"
  on public.solar_monitoring_plants for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "solar_monitoring_delete_own" on public.solar_monitoring_plants;
create policy "solar_monitoring_delete_own"
  on public.solar_monitoring_plants for delete
  to authenticated
  using (user_id = auth.uid());
