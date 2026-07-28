-- Links públicos seguros para visualização e aceite de propostas.
alter table public.sales_proposals
  add column if not exists public_token uuid default gen_random_uuid(),
  add column if not exists public_viewed_at timestamptz,
  add column if not exists public_view_count integer not null default 0,
  add column if not exists customer_acceptance_name text,
  add column if not exists customer_acceptance_document text,
  add column if not exists customer_acceptance_ip text,
  add column if not exists customer_acceptance_user_agent text;

update public.sales_proposals
set public_token = gen_random_uuid()
where public_token is null;

alter table public.sales_proposals alter column public_token set not null;
create unique index if not exists sales_proposals_public_token_idx on public.sales_proposals(public_token);

create or replace function public.get_public_sales_proposal(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.sales_proposals%rowtype;
begin
  update public.sales_proposals
     set public_viewed_at = coalesce(public_viewed_at, now()),
         public_view_count = public_view_count + 1
   where public_token = p_token
   returning * into v_proposal;

  if v_proposal.id is null then
    raise exception 'Proposta não encontrada';
  end if;

  return jsonb_build_object(
    'id', v_proposal.id,
    'client_name', v_proposal.client_name,
    'city', v_proposal.city,
    'status', v_proposal.status,
    'total_amount', v_proposal.total_amount,
    'discount_amount', v_proposal.discount_amount,
    'panel_count', v_proposal.panel_count,
    'panel_power_w', v_proposal.panel_power_w,
    'system_power_kw', v_proposal.system_power_kw,
    'monthly_generation_kwh', v_proposal.monthly_generation_kwh,
    'panel_model', v_proposal.panel_model,
    'inverter_model', v_proposal.inverter_model,
    'validity_days', v_proposal.validity_days,
    'notes', v_proposal.notes,
    'payment_method', v_proposal.payment_method,
    'installment_count', v_proposal.installment_count,
    'installment_amount', v_proposal.installment_amount,
    'created_at', v_proposal.created_at,
    'accepted_at', v_proposal.accepted_at,
    'public_token', v_proposal.public_token
  );
end;
$$;

create or replace function public.accept_public_sales_proposal(
  p_token uuid,
  p_name text,
  p_document text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.sales_proposals%rowtype;
begin
  if nullif(trim(p_name), '') is null then
    raise exception 'Informe o nome de quem está aceitando a proposta';
  end if;

  update public.sales_proposals
     set status = 'Aceita',
         accepted_at = coalesce(accepted_at, now()),
         rejected_at = null,
         customer_acceptance_name = trim(p_name),
         customer_acceptance_document = nullif(regexp_replace(coalesce(p_document, ''), '\D', '', 'g'), ''),
         customer_acceptance_user_agent = left(p_user_agent, 500)
   where public_token = p_token
     and status <> 'Recusada'
   returning * into v_proposal;

  if v_proposal.id is null then
    raise exception 'Proposta não encontrada ou indisponível para aceite';
  end if;

  perform public.save_sales_proposal_version(v_proposal.id);

  return jsonb_build_object(
    'id', v_proposal.id,
    'status', v_proposal.status,
    'accepted_at', v_proposal.accepted_at,
    'customer_acceptance_name', v_proposal.customer_acceptance_name
  );
end;
$$;

grant execute on function public.get_public_sales_proposal(uuid) to anon, authenticated;
grant execute on function public.accept_public_sales_proposal(uuid, text, text, text) to anon, authenticated;
