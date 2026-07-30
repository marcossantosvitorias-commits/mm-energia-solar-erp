-- Cria automaticamente uma Ordem de Serviço quando uma proposta vira venda fechada.

create unique index if not exists service_orders_active_proposal_unique
on public.service_orders(proposal_id)
where proposal_id is not null and status not in ('Concluída', 'Cancelada');

create or replace function public.create_service_order_from_closed_sale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  customer record;
  created_order public.service_orders%rowtype;
  city_name text;
  state_name text;
begin
  if new.status <> 'Venda Fechada' or coalesce(old.status, '') = 'Venda Fechada' then
    return new;
  end if;

  if exists (
    select 1
    from public.service_orders
    where proposal_id = new.id
      and status not in ('Concluída', 'Cancelada')
  ) then
    return new;
  end if;

  if new.client_id is not null then
    select * into customer from public.clients where id = new.client_id;
  end if;

  city_name := coalesce(customer.city, split_part(coalesce(new.city, ''), '/', 1), null);
  state_name := coalesce(customer.state, nullif(split_part(coalesce(new.city, ''), '/', 2), ''), 'SP');

  insert into public.service_orders (
    client_id,
    proposal_id,
    status,
    service_type,
    customer_name,
    customer_phone,
    installation_address,
    city,
    state,
    notes,
    created_by
  ) values (
    new.client_id,
    new.id,
    'Aguardando materiais',
    'Instalação fotovoltaica',
    coalesce(customer.name, new.client_name),
    coalesce(customer.phone, new.phone),
    customer.address,
    city_name,
    state_name,
    concat(
      'OS criada automaticamente a partir da proposta. Sistema: ',
      coalesce(new.panel_count, 0), ' módulos de ', coalesce(new.panel_power_w, 0),
      ' W; potência ', coalesce(new.system_power_kw, 0), ' kWp; valor ',
      to_char(coalesce(new.total_amount, 0), 'FM999G999G990D00')
    ),
    auth.uid()
  )
  returning * into created_order;

  if new.client_id is not null then
    update public.clients
       set status = 'cliente', updated_at = now()
     where id = new.client_id;

    insert into public.client_interactions (
      client_id,
      interaction_type,
      description
    ) values (
      new.client_id,
      'observacao',
      concat('Venda fechada. Ordem de Serviço nº ', created_order.order_number, ' criada automaticamente.')
    );
  end if;

  return new;
end;
$$;

drop trigger if exists sales_proposal_closed_create_service_order on public.sales_proposals;
create trigger sales_proposal_closed_create_service_order
after update of status on public.sales_proposals
for each row
when (new.status = 'Venda Fechada')
execute procedure public.create_service_order_from_closed_sale();
