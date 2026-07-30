-- Gestão comercial de propostas e histórico de versões.
alter table public.sales_proposals
  add column if not exists discount_amount numeric(14,2) not null default 0,
  add column if not exists payment_method text,
  add column if not exists installment_count integer,
  add column if not exists installment_amount numeric(14,2),
  add column if not exists accepted_at timestamptz,
  add column if not exists rejected_at timestamptz;

create table if not exists public.sales_proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.sales_proposals(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(proposal_id, version_number)
);

create index if not exists sales_proposal_versions_proposal_idx
  on public.sales_proposal_versions(proposal_id, version_number desc);

alter table public.sales_proposal_versions enable row level security;

drop policy if exists "sales_proposal_versions_authenticated_all" on public.sales_proposal_versions;
create policy "sales_proposal_versions_authenticated_all"
  on public.sales_proposal_versions for all to authenticated
  using (public.is_active_user()) with check (public.is_active_user());

create or replace function public.save_sales_proposal_version(p_proposal_id uuid)
returns public.sales_proposal_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.sales_proposals;
  v_version integer;
  v_record public.sales_proposal_versions;
begin
  select * into v_proposal from public.sales_proposals where id = p_proposal_id;
  if not found then raise exception 'Proposta não encontrada'; end if;

  select coalesce(max(version_number), 0) + 1 into v_version
  from public.sales_proposal_versions where proposal_id = p_proposal_id;

  insert into public.sales_proposal_versions(proposal_id, version_number, snapshot, created_by)
  values (p_proposal_id, v_version, to_jsonb(v_proposal), auth.uid())
  returning * into v_record;

  return v_record;
end;
$$;

grant execute on function public.save_sales_proposal_version(uuid) to authenticated;

-- Cria a primeira versão das propostas já existentes.
insert into public.sales_proposal_versions(proposal_id, version_number, snapshot, created_by)
select p.id, 1, to_jsonb(p), p.created_by
from public.sales_proposals p
where not exists (
  select 1 from public.sales_proposal_versions v where v.proposal_id = p.id
);
