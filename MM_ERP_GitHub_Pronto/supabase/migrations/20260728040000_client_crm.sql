-- CRM centralizado de clientes e leads.

create table if not exists public.client_interactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  interaction_type text not null default 'contato' check (
    interaction_type in ('contato','whatsapp','ligacao','visita','proposta','financiamento','observacao')
  ),
  description text not null,
  next_action_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists client_interactions_client_idx
on public.client_interactions (client_id, created_at desc);

alter table public.clients enable row level security;
alter table public.client_interactions enable row level security;

drop policy if exists "clients_authenticated_all" on public.clients;
drop policy if exists "clients_commercial_access" on public.clients;
create policy "clients_commercial_access"
on public.clients for all to authenticated
using (public.has_any_role(array['admin','financeiro','comercial']))
with check (public.has_any_role(array['admin','financeiro','comercial']));

drop policy if exists "client_interactions_commercial_access" on public.client_interactions;
create policy "client_interactions_commercial_access"
on public.client_interactions for all to authenticated
using (public.has_any_role(array['admin','financeiro','comercial']))
with check (public.has_any_role(array['admin','financeiro','comercial']));

comment on table public.client_interactions is
  'Histórico de contatos, visitas, propostas, financiamentos e próximos passos de cada cliente.';
