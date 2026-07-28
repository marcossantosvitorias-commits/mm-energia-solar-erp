-- Preparação da instalação: dados técnicos, materiais e liberação da OS.

alter table public.service_orders
  add column if not exists material_status text not null default 'Pendente',
  add column if not exists roof_type text,
  add column if not exists access_notes text,
  add column if not exists electrical_board_notes text,
  add column if not exists responsible_name text,
  add column if not exists preparation_notes text,
  add column if not exists preparation_completed_at timestamptz,
  add column if not exists preparation_completed_by uuid references auth.users(id);

alter table public.service_orders
  drop constraint if exists service_orders_material_status_check;
alter table public.service_orders
  add constraint service_orders_material_status_check
  check (material_status in ('Pendente', 'Em separação', 'Parcial', 'Reservado', 'Liberado'));

create or replace function public.seed_service_order_from_proposal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  proposal_row public.sales_proposals%rowtype;
begin
  if new.proposal_id is null then
    return new;
  end if;

  select * into proposal_row
  from public.sales_proposals
  where id = new.proposal_id;

  if not found then
    return new;
  end if;

  if coalesce(proposal_row.panel_count, 0) > 0 and not exists (
    select 1 from public.service_order_items
    where service_order_id = new.id and category = 'Módulos'
  ) then
    insert into public.service_order_items (
      service_order_id, description, category, quantity, unit, reserved, notes
    ) values (
      new.id,
      coalesce(proposal_row.panel_model, 'Módulo fotovoltaico') ||
        case when proposal_row.panel_power_w is not null then ' ' || proposal_row.panel_power_w || ' W' else '' end,
      'Módulos', proposal_row.panel_count, 'un', false,
      'Material importado automaticamente da proposta comercial.'
    );
  end if;

  if coalesce(proposal_row.inverter_model, '') <> '' and not exists (
    select 1 from public.service_order_items
    where service_order_id = new.id and category = 'Inversor'
  ) then
    insert into public.service_order_items (
      service_order_id, description, category, quantity, unit, reserved, notes
    ) values (
      new.id, proposal_row.inverter_model, 'Inversor', 1, 'un', false,
      'Material importado automaticamente da proposta comercial.'
    );
  end if;

  update public.service_orders
     set preparation_notes = coalesce(preparation_notes,
       concat('Sistema previsto: ', coalesce(proposal_row.panel_count, 0),
              ' módulos; ', coalesce(proposal_row.system_power_kw, 0), ' kWp; geração estimada ',
              coalesce(proposal_row.monthly_generation_kwh, 0), ' kWh/mês.'))
   where id = new.id;

  return new;
end;
$$;

drop trigger if exists service_order_seed_from_proposal on public.service_orders;
create trigger service_order_seed_from_proposal
after insert on public.service_orders
for each row execute procedure public.seed_service_order_from_proposal();

create or replace function public.complete_service_order_preparation(p_service_order_id uuid)
returns public.service_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.service_orders%rowtype;
  pending_materials integer;
begin
  if not public.is_active_user() then
    raise exception 'Usuário sem permissão.';
  end if;

  select count(*) into pending_materials
  from public.service_order_items
  where service_order_id = p_service_order_id
    and reserved = false;

  if pending_materials > 0 then
    raise exception 'Existem % materiais ainda não reservados.', pending_materials;
  end if;

  update public.service_orders
     set material_status = 'Liberado',
         preparation_completed_at = now(),
         preparation_completed_by = auth.uid(),
         status = case when scheduled_at is not null then 'Agendada' else status end,
         updated_at = now()
   where id = p_service_order_id
   returning * into result;

  if result.id is null then
    raise exception 'Ordem de Serviço não encontrada.';
  end if;

  return result;
end;
$$;

grant execute on function public.complete_service_order_preparation(uuid) to authenticated;
