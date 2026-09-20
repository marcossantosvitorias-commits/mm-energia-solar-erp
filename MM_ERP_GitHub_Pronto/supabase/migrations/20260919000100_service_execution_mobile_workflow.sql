create table if not exists public.service_order_activities (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  activity_type text not null,
  status text not null default 'concluido' check (status in ('pendente','em_andamento','concluido','nao_aplicavel')),
  condition text not null default 'conforme' check (condition in ('conforme','atencao','nao_conforme')),
  observation text,
  position integer not null default 0,
  completed_by uuid references auth.users(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_order_activities_order_idx
  on public.service_order_activities(service_order_id, position, created_at);

alter table public.service_order_activities enable row level security;

drop policy if exists service_order_activities_authenticated_all on public.service_order_activities;
create policy service_order_activities_authenticated_all
  on public.service_order_activities
  for all
  using (public.is_active_user())
  with check (public.is_active_user());

alter table public.service_orders
  add column if not exists report_notes text,
  add column if not exists report_version integer not null default 1,
  add column if not exists customer_signature_name text,
  add column if not exists customer_signature_at timestamptz;

create or replace function public.set_service_order_activity_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_service_order_activity_updated_at on public.service_order_activities;
create trigger trg_service_order_activity_updated_at
before update on public.service_order_activities
for each row execute function public.set_service_order_activity_updated_at();
