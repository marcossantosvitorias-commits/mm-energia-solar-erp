-- Infraestrutura de agenda e notificações push do MM ERP.

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  phone text,
  appointment_type text not null default 'Visita técnica',
  appointment_at timestamptz not null,
  address text,
  notes text,
  status text not null default 'Agendado',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_key text not null,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  notification_type text not null,
  reference_id text,
  sent_at timestamptz not null default now(),
  unique(notification_key, subscription_id)
);

create index if not exists appointments_at_idx on public.appointments(appointment_at);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id, active);
create index if not exists notification_deliveries_sent_idx on public.notification_deliveries(sent_at desc);

alter table public.appointments enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists "appointments_authenticated_all" on public.appointments;
create policy "appointments_authenticated_all" on public.appointments for all to authenticated
using (public.is_active_user()) with check (public.is_active_user());

drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own" on public.push_subscriptions for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Entregas são gravadas somente pela service_role da Edge Function.
drop policy if exists "notification_deliveries_read" on public.notification_deliveries;
create policy "notification_deliveries_read" on public.notification_deliveries for select to authenticated
using (public.is_active_user());

drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at before update on public.appointments
for each row execute procedure public.set_updated_at();

drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at before update on public.push_subscriptions
for each row execute procedure public.set_updated_at();

-- Limpeza automática do histórico antigo.
create or replace function public.cleanup_notification_deliveries()
returns void language sql security definer set search_path = public as $$
  delete from public.notification_deliveries where sent_at < now() - interval '45 days';
$$;
