-- Automação entre propostas, engenharia, instalações e pós-venda.
-- Depende das migrations de propostas, ordens de serviço e workflow_kanbans.

create unique index if not exists workflow_cards_sales_proposal_unique
  on public.workflow_cards(board_id, proposal_id)
  where proposal_id is not null;

create unique index if not exists workflow_cards_installation_order_unique
  on public.workflow_cards(board_id, service_order_id)
  where service_order_id is not null;

create or replace function public.workflow_board_id(p_type text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.workflow_boards
  where board_type = p_type and active = true
  order by organization_id nulls first, created_at
  limit 1;
$$;

create or replace function public.workflow_column_id(p_board uuid, p_name text, p_initial boolean default false)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.workflow_columns
  where board_id = p_board
    and (name = p_name or (p_initial and is_initial = true))
  order by case when name = p_name then 0 else 1 end, position
  limit 1;
$$;

create or replace function public.ensure_proposal_sales_card(p_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.sales_proposals%rowtype;
  b uuid;
  c uuid;
  card uuid;
  target_name text;
begin
  select * into p from public.sales_proposals where id = p_proposal_id;
  if not found then return null; end if;

  b := public.workflow_board_id('sales');
  if b is null then return null; end if;

  target_name := case p.status
    when 'Venda Fechada' then 'Venda fechada'
    when 'Enviada' then 'Proposta enviada'
    when 'Gerada' then 'Proposta gerada'
    when 'Perdida' then 'Venda perdida'
    else 'Novo lead'
  end;
  c := public.workflow_column_id(b, target_name, true);

  insert into public.workflow_cards(
    board_id, column_id, client_id, proposal_id, title, description,
    priority, position, metadata, created_by
  ) values (
    b, c, p.client_id, p.id,
    coalesce(nullif(p.client_name, ''), 'Proposta solar'),
    concat_ws(' · ', nullif(p.city, ''), nullif(p.phone, '')),
    'normal', extract(epoch from now()),
    jsonb_build_object(
      'source', 'sales_proposals',
      'proposal_status', p.status,
      'total_amount', p.total_amount,
      'system_power_kw', p.system_power_kw,
      'panel_count', p.panel_count
    ), auth.uid()
  )
  on conflict (board_id, proposal_id) where proposal_id is not null
  do update set
    column_id = excluded.column_id,
    client_id = excluded.client_id,
    title = excluded.title,
    description = excluded.description,
    metadata = public.workflow_cards.metadata || excluded.metadata,
    completed_at = case when target_name in ('Venda fechada','Venda perdida') then now() else null end
  returning id into card;

  return card;
end;
$$;

create or replace function public.ensure_engineering_card(p_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.sales_proposals%rowtype;
  b uuid;
  c uuid;
  card uuid;
begin
  select * into p from public.sales_proposals where id = p_proposal_id;
  if not found then return null; end if;
  b := public.workflow_board_id('engineering');
  c := public.workflow_column_id(b, 'Documentação pendente', true);
  if b is null or c is null then return null; end if;

  select id into card from public.workflow_cards
  where board_id = b and proposal_id = p.id limit 1;
  if card is not null then return card; end if;

  insert into public.workflow_cards(
    board_id, column_id, client_id, proposal_id, title, description,
    priority, position, metadata, created_by
  ) values (
    b, c, p.client_id, p.id,
    coalesce(nullif(p.client_name, ''), 'Projeto fotovoltaico'),
    concat('Projeto de ', coalesce(p.system_power_kw, 0), ' kWp · ', coalesce(p.panel_count, 0), ' módulos'),
    'high', extract(epoch from now()),
    jsonb_build_object('source','sale_closed','total_amount',p.total_amount,'phone',p.phone,'city',p.city),
    auth.uid()
  ) returning id into card;
  return card;
end;
$$;

create or replace function public.ensure_installation_card(p_service_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.service_orders%rowtype;
  b uuid;
  c uuid;
  card uuid;
  target_name text;
begin
  select * into o from public.service_orders where id = p_service_order_id;
  if not found then return null; end if;
  b := public.workflow_board_id('installation');
  if b is null then return null; end if;

  target_name := case o.status
    when 'Aguardando materiais' then 'Aguardando materiais'
    when 'Agendada' then 'Agendamento'
    when 'Equipe em deslocamento' then 'Equipe em deslocamento'
    when 'Instalação iniciada' then 'Obra em andamento'
    when 'Testes elétricos' then 'Testes e comissionamento'
    when 'Concluída' then 'Entregue'
    else 'Vistoria técnica'
  end;
  c := public.workflow_column_id(b, target_name, true);

  insert into public.workflow_cards(
    board_id, column_id, client_id, proposal_id, service_order_id,
    assigned_user_id, title, description, priority, position, due_at,
    metadata, created_by
  ) values (
    b, c, o.client_id, o.proposal_id, o.id, o.responsible_user_id,
    concat('OS #', o.order_number, ' · ', o.customer_name),
    concat_ws(' · ', nullif(o.city,''), nullif(o.assigned_team,'')),
    case when o.scheduled_at is not null and o.scheduled_at < now() and o.status <> 'Concluída' then 'urgent' else 'high' end,
    extract(epoch from now()), o.scheduled_at,
    jsonb_build_object('source','service_orders','order_number',o.order_number,'service_status',o.status,'phone',o.customer_phone),
    auth.uid()
  )
  on conflict (board_id, service_order_id) where service_order_id is not null
  do update set
    column_id = excluded.column_id,
    assigned_user_id = excluded.assigned_user_id,
    title = excluded.title,
    description = excluded.description,
    due_at = excluded.due_at,
    priority = excluded.priority,
    metadata = public.workflow_cards.metadata || excluded.metadata,
    completed_at = case when o.status = 'Concluída' then coalesce(o.completed_at, now()) else null end
  returning id into card;
  return card;
end;
$$;

create or replace function public.ensure_after_sales_card(p_service_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.service_orders%rowtype;
  b uuid;
  c uuid;
  card uuid;
begin
  select * into o from public.service_orders where id = p_service_order_id;
  if not found or o.status <> 'Concluída' then return null; end if;
  b := public.workflow_board_id('after_sales');
  c := public.workflow_column_id(b, 'Aguardando homologação', true);
  if b is null or c is null then return null; end if;

  select id into card from public.workflow_cards where board_id=b and service_order_id=o.id limit 1;
  if card is not null then return card; end if;

  insert into public.workflow_cards(
    board_id,column_id,client_id,proposal_id,service_order_id,title,description,
    priority,position,due_at,metadata,created_by
  ) values (
    b,c,o.client_id,o.proposal_id,o.id,
    concat(o.customer_name,' · Pós-venda'),
    concat('OS #',o.order_number,' concluída. Acompanhar homologação e retorno ao cliente.'),
    'normal',extract(epoch from now()),coalesce(o.completed_at,now()) + interval '30 days',
    jsonb_build_object(
      'source','service_order_completed',
      'order_number',o.order_number,
      'completed_at',coalesce(o.completed_at,now()),
      'maintenance_180_at',coalesce(o.completed_at,now()) + interval '180 days',
      'maintenance_365_at',coalesce(o.completed_at,now()) + interval '365 days'
    ),auth.uid()
  ) returning id into card;
  return card;
end;
$$;

create or replace function public.sync_proposal_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_proposal_sales_card(new.id);
  if new.status = 'Venda Fechada' then
    perform public.ensure_engineering_card(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists sync_proposal_workflow_after_write on public.sales_proposals;
create trigger sync_proposal_workflow_after_write
after insert or update of status, client_name, phone, city, total_amount on public.sales_proposals
for each row execute function public.sync_proposal_workflow();

create or replace function public.sync_service_order_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_installation_card(new.id);
  if new.status = 'Concluída' then
    perform public.ensure_after_sales_card(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists sync_service_order_workflow_after_write on public.service_orders;
create trigger sync_service_order_workflow_after_write
after insert or update of status, scheduled_at, responsible_user_id, assigned_team on public.service_orders
for each row execute function public.sync_service_order_workflow();

-- Ao concluir o quadro de engenharia, garante que a OS correspondente apareça no quadro de instalações.
create or replace function public.sync_engineering_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  board_type_value text;
  final_value text;
  os_id uuid;
begin
  if old.column_id is not distinct from new.column_id then return new; end if;

  select b.board_type, c.final_result into board_type_value, final_value
  from public.workflow_boards b
  join public.workflow_columns c on c.id = new.column_id
  where b.id = new.board_id;

  if board_type_value = 'engineering' and final_value = 'completed' then
    select id into os_id from public.service_orders
    where proposal_id = new.proposal_id and status <> 'Cancelada'
    order by created_at desc limit 1;
    if os_id is not null then
      perform public.ensure_installation_card(os_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_engineering_completion_after_move on public.workflow_cards;
create trigger sync_engineering_completion_after_move
after update of column_id on public.workflow_cards
for each row execute function public.sync_engineering_completion();

-- Sincroniza registros já existentes quando a migration for aplicada.
do $$
declare r record;
begin
  for r in select id from public.sales_proposals loop
    perform public.ensure_proposal_sales_card(r.id);
  end loop;
  for r in select id from public.service_orders loop
    perform public.ensure_installation_card(r.id);
    perform public.ensure_after_sales_card(r.id);
  end loop;
end $$;
