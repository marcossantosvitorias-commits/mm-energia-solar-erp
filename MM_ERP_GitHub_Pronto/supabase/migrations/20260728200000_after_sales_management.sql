create table if not exists public.installed_systems (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null unique references public.service_orders(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  proposal_id uuid references public.sales_proposals(id) on delete set null,
  status text not null default 'Aguardando homologação',
  installation_date timestamptz,
  utility_company text,
  consumer_unit text,
  protocol_number text,
  homologation_status text not null default 'Pendente',
  homologation_submitted_at timestamptz,
  homologation_approved_at timestamptz,
  monitoring_platform text,
  monitoring_login text,
  monitoring_status text not null default 'Pendente',
  last_generation_kwh numeric(12,2),
  last_generation_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.installed_system_warranties (
  id uuid primary key default gen_random_uuid(),
  installed_system_id uuid not null references public.installed_systems(id) on delete cascade,
  equipment_type text not null,
  brand text,
  model text,
  serial_number text,
  warranty_years numeric(6,2),
  warranty_start_date date,
  warranty_end_date date,
  invoice_number text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.after_sales_interactions (
  id uuid primary key default gen_random_uuid(),
  installed_system_id uuid not null references public.installed_systems(id) on delete cascade,
  interaction_type text not null default 'Acompanhamento',
  description text not null,
  interaction_at timestamptz not null default now(),
  next_action_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

alter table public.installed_systems enable row level security;
alter table public.installed_system_warranties enable row level security;
alter table public.after_sales_interactions enable row level security;

create policy "authenticated manage installed systems" on public.installed_systems for all to authenticated using (true) with check (true);
create policy "authenticated manage warranties" on public.installed_system_warranties for all to authenticated using (true) with check (true);
create policy "authenticated manage after sales" on public.after_sales_interactions for all to authenticated using (true) with check (true);

create or replace function public.create_installed_system_after_completion()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status = 'Concluída' and coalesce(old.status,'') <> 'Concluída' then
    insert into public.installed_systems(service_order_id, client_id, proposal_id, installation_date, next_follow_up_at)
    values(new.id, new.client_id, new.proposal_id, coalesce(new.completed_at, now()), now() + interval '7 days')
    on conflict(service_order_id) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists service_order_completed_create_installed_system on public.service_orders;
create trigger service_order_completed_create_installed_system
after update of status on public.service_orders for each row
execute procedure public.create_installed_system_after_completion();

insert into public.installed_systems(service_order_id, client_id, proposal_id, installation_date, next_follow_up_at)
select id, client_id, proposal_id, coalesce(completed_at, now()), now() + interval '7 days'
from public.service_orders where status='Concluída'
on conflict(service_order_id) do nothing;