-- Vincula propostas comerciais aos clientes do CRM.

alter table public.sales_proposals
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists sales_proposals_client_id_idx
  on public.sales_proposals(client_id);

-- Substitui a política permissiva original por acesso comercial explícito.
drop policy if exists "sales_proposals_authenticated_all" on public.sales_proposals;
drop policy if exists "sales_proposals_commercial" on public.sales_proposals;
create policy "sales_proposals_commercial"
on public.sales_proposals for all to authenticated
using (public.has_any_role(array['admin','financeiro','comercial']))
with check (public.has_any_role(array['admin','financeiro','comercial']));
