-- Execução de instalação em campo: GPS, eventos, sincronização e fotos.

alter table public.service_orders
  add column if not exists check_in_at timestamptz,
  add column if not exists check_in_latitude numeric(10,7),
  add column if not exists check_in_longitude numeric(10,7),
  add column if not exists check_out_at timestamptz,
  add column if not exists check_out_latitude numeric(10,7),
  add column if not exists check_out_longitude numeric(10,7),
  add column if not exists field_sync_at timestamptz;

create table if not exists public.service_order_field_events (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  latitude numeric(10,7),
  longitude numeric(10,7),
  accuracy_m numeric(10,2),
  client_event_id text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  synced_at timestamptz not null default now()
);

create unique index if not exists service_order_field_events_client_unique
  on public.service_order_field_events(service_order_id, client_event_id)
  where client_event_id is not null;
create index if not exists service_order_field_events_order_idx
  on public.service_order_field_events(service_order_id, created_at desc);

alter table public.service_order_field_events enable row level security;
drop policy if exists "service_order_field_events_authenticated_all" on public.service_order_field_events;
create policy "service_order_field_events_authenticated_all"
  on public.service_order_field_events for all to authenticated
  using (public.is_active_user()) with check (public.is_active_user());

create or replace function public.register_service_order_field_event(
  p_service_order_id uuid,
  p_event_type text,
  p_event_data jsonb default '{}'::jsonb,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_accuracy_m numeric default null,
  p_client_event_id text default null
)
returns public.service_order_field_events
language plpgsql
security definer
set search_path = public
as $$
declare
  created_event public.service_order_field_events%rowtype;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Usuário não autorizado.';
  end if;

  insert into public.service_order_field_events (
    service_order_id, event_type, event_data, latitude, longitude,
    accuracy_m, client_event_id, created_by
  ) values (
    p_service_order_id, trim(p_event_type), coalesce(p_event_data, '{}'::jsonb),
    p_latitude, p_longitude, p_accuracy_m, nullif(trim(p_client_event_id), ''), auth.uid()
  )
  on conflict (service_order_id, client_event_id) where client_event_id is not null
  do update set synced_at = now()
  returning * into created_event;

  if p_event_type = 'check_in' then
    update public.service_orders set
      status = 'Instalação iniciada',
      started_at = coalesce(started_at, now()),
      check_in_at = coalesce(check_in_at, now()),
      check_in_latitude = p_latitude,
      check_in_longitude = p_longitude,
      field_sync_at = now()
    where id = p_service_order_id;
  elsif p_event_type = 'check_out' then
    update public.service_orders set
      check_out_at = now(),
      check_out_latitude = p_latitude,
      check_out_longitude = p_longitude,
      field_sync_at = now()
    where id = p_service_order_id;
  else
    update public.service_orders set field_sync_at = now() where id = p_service_order_id;
  end if;

  return created_event;
end;
$$;

grant execute on function public.register_service_order_field_event(uuid,text,jsonb,numeric,numeric,numeric,text) to authenticated;
