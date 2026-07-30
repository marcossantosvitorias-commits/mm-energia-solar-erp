-- Confirmação interna: proposta aceita pelo cliente -> venda fechada -> OS.
alter table public.sales_proposals
  add column if not exists sale_confirmation_status text not null default 'Não aplicável',
  add column if not exists sale_confirmed_at timestamptz,
  add column if not exists sale_confirmed_by uuid references auth.users(id),
  add column if not exists sale_confirmation_notes text;

alter table public.sales_proposals
  drop constraint if exists sales_proposals_sale_confirmation_status_check;
alter table public.sales_proposals
  add constraint sales_proposals_sale_confirmation_status_check
  check (sale_confirmation_status in ('Não aplicável', 'Pendente', 'Confirmada', 'Rejeitada'));

update public.sales_proposals
set sale_confirmation_status = case
  when status = 'Aceita' then 'Pendente'
  when status = 'Venda Fechada' then 'Confirmada'
  else 'Não aplicável'
end
where sale_confirmation_status = 'Não aplicável';

create or replace function public.mark_proposal_confirmation_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Aceita' and coalesce(old.status, '') <> 'Aceita' then
    new.sale_confirmation_status := 'Pendente';
    new.sale_confirmed_at := null;
    new.sale_confirmed_by := null;
  elsif new.status not in ('Aceita', 'Venda Fechada') and old.status is distinct from new.status then
    new.sale_confirmation_status := 'Não aplicável';
  end if;
  return new;
end;
$$;

drop trigger if exists sales_proposal_confirmation_pending on public.sales_proposals;
create trigger sales_proposal_confirmation_pending
before update of status on public.sales_proposals
for each row execute procedure public.mark_proposal_confirmation_pending();

create or replace function public.confirm_accepted_proposal_sale(
  p_proposal_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.sales_proposals%rowtype;
  v_order public.service_orders%rowtype;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Usuário não autorizado.';
  end if;

  select * into v_proposal
  from public.sales_proposals
  where id = p_proposal_id
  for update;

  if not found then
    raise exception 'Proposta não encontrada.';
  end if;

  if v_proposal.status not in ('Aceita', 'Venda Fechada') then
    raise exception 'Somente propostas aceitas podem ser confirmadas como venda.';
  end if;

  if v_proposal.status = 'Aceita' then
    update public.sales_proposals
       set status = 'Venda Fechada',
           sale_confirmation_status = 'Confirmada',
           sale_confirmed_at = now(),
           sale_confirmed_by = auth.uid(),
           sale_confirmation_notes = nullif(trim(coalesce(p_notes, '')), '')
     where id = p_proposal_id
     returning * into v_proposal;
  end if;

  select * into v_order
  from public.service_orders
  where proposal_id = p_proposal_id
    and status not in ('Concluída', 'Cancelada')
  order by created_at desc
  limit 1;

  if v_order.id is null then
    raise exception 'A venda foi confirmada, mas a Ordem de Serviço não foi criada.';
  end if;

  perform public.save_sales_proposal_version(p_proposal_id);

  return jsonb_build_object(
    'proposal', to_jsonb(v_proposal),
    'service_order', to_jsonb(v_order)
  );
end;
$$;

grant execute on function public.confirm_accepted_proposal_sale(uuid, text) to authenticated;

create or replace function public.reject_accepted_proposal_confirmation(
  p_proposal_id uuid,
  p_notes text default null
)
returns public.sales_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.sales_proposals%rowtype;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Usuário não autorizado.';
  end if;

  update public.sales_proposals
     set status = 'Em negociação',
         sale_confirmation_status = 'Rejeitada',
         sale_confirmed_at = null,
         sale_confirmed_by = auth.uid(),
         sale_confirmation_notes = nullif(trim(coalesce(p_notes, '')), '')
   where id = p_proposal_id
     and status = 'Aceita'
   returning * into v_proposal;

  if v_proposal.id is null then
    raise exception 'A proposta não está aguardando confirmação.';
  end if;

  perform public.save_sales_proposal_version(p_proposal_id);
  return v_proposal;
end;
$$;

grant execute on function public.reject_accepted_proposal_confirmation(uuid, text) to authenticated;

create index if not exists sales_proposals_confirmation_pending_idx
on public.sales_proposals(sale_confirmation_status, accepted_at desc)
where sale_confirmation_status = 'Pendente';