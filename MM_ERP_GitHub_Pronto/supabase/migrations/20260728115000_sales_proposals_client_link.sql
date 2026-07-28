-- Garante o vínculo entre proposta e cliente antes das automações dos Kanbans.
alter table public.sales_proposals
  add column if not exists client_id uuid null references public.clients(id) on delete set null;

create index if not exists sales_proposals_client_id_idx
  on public.sales_proposals(client_id);
