-- Estrutura única para CRM, engenharia, instalações e pós-venda
create extension if not exists pgcrypto;

create table if not exists public.workflow_boards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null,
  name text not null,
  board_type text not null check (board_type in ('sales','engineering','installation','after_sales')),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, board_type)
);

create table if not exists public.workflow_columns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null,
  board_id uuid not null references public.workflow_boards(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  color text not null default '#0F172A',
  is_initial boolean not null default false,
  is_final boolean not null default false,
  final_result text null check (final_result is null or final_result in ('won','lost','completed')),
  automation_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (board_id, name)
);

create table if not exists public.workflow_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null,
  board_id uuid not null references public.workflow_boards(id) on delete cascade,
  column_id uuid not null references public.workflow_columns(id) on delete restrict,
  client_id uuid null references public.clients(id) on delete set null,
  proposal_id uuid null references public.sales_proposals(id) on delete set null,
  service_order_id uuid null references public.service_orders(id) on delete set null,
  assigned_user_id uuid null references auth.users(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  position numeric(12,4) not null default 0,
  due_at timestamptz,
  entered_column_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_card_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null,
  card_id uuid not null references public.workflow_cards(id) on delete cascade,
  from_column_id uuid null references public.workflow_columns(id) on delete set null,
  to_column_id uuid not null references public.workflow_columns(id) on delete restrict,
  moved_by uuid null references auth.users(id) on delete set null,
  moved_at timestamptz not null default now(),
  notes text
);

create index if not exists workflow_columns_board_position_idx on public.workflow_columns(board_id, position);
create index if not exists workflow_cards_board_column_position_idx on public.workflow_cards(board_id, column_id, position);
create index if not exists workflow_cards_client_idx on public.workflow_cards(client_id);
create index if not exists workflow_cards_due_idx on public.workflow_cards(due_at);
create index if not exists workflow_history_card_idx on public.workflow_card_history(card_id, moved_at desc);

create or replace function public.set_workflow_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workflow_boards_updated_at on public.workflow_boards;
create trigger workflow_boards_updated_at before update on public.workflow_boards
for each row execute function public.set_workflow_updated_at();

drop trigger if exists workflow_columns_updated_at on public.workflow_columns;
create trigger workflow_columns_updated_at before update on public.workflow_columns
for each row execute function public.set_workflow_updated_at();

drop trigger if exists workflow_cards_updated_at on public.workflow_cards;
create trigger workflow_cards_updated_at before update on public.workflow_cards
for each row execute function public.set_workflow_updated_at();

create or replace function public.register_workflow_card_move()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.column_id is distinct from new.column_id then
    new.entered_column_at = now();
    insert into public.workflow_card_history(card_id, organization_id, from_column_id, to_column_id, moved_by)
    values (new.id, new.organization_id, old.column_id, new.column_id, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists workflow_card_move_history on public.workflow_cards;
create trigger workflow_card_move_history before update of column_id on public.workflow_cards
for each row execute function public.register_workflow_card_move();

alter table public.workflow_boards enable row level security;
alter table public.workflow_columns enable row level security;
alter table public.workflow_cards enable row level security;
alter table public.workflow_card_history enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='workflow_boards' and policyname='workflow_boards_authenticated') then
    create policy workflow_boards_authenticated on public.workflow_boards for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='workflow_columns' and policyname='workflow_columns_authenticated') then
    create policy workflow_columns_authenticated on public.workflow_columns for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='workflow_cards' and policyname='workflow_cards_authenticated') then
    create policy workflow_cards_authenticated on public.workflow_cards for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='workflow_card_history' and policyname='workflow_history_authenticated') then
    create policy workflow_history_authenticated on public.workflow_card_history for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Cria os quatro quadros iniciais e suas colunas apenas quando ainda não existem.
do $$
declare
  b_sales uuid; b_eng uuid; b_install uuid; b_after uuid;
begin
  select id into b_sales from public.workflow_boards where board_type='sales' and organization_id is null limit 1;
  if b_sales is null then
    insert into public.workflow_boards(name, board_type, description) values ('Funil de Vendas','sales','Leads, propostas e negociações') returning id into b_sales;
    insert into public.workflow_columns(board_id,name,position,color,is_initial,is_final,final_result) values
      (b_sales,'Novo lead',1,'#F59E0B',true,false,null),(b_sales,'Contato realizado',2,'#3B82F6',false,false,null),
      (b_sales,'Visita agendada',3,'#8B5CF6',false,false,null),(b_sales,'Proposta gerada',4,'#6366F1',false,false,null),
      (b_sales,'Proposta enviada',5,'#0EA5E9',false,false,null),(b_sales,'Em negociação',6,'#F97316',false,false,null),
      (b_sales,'Venda fechada',7,'#10B981',false,true,'won'),(b_sales,'Venda perdida',8,'#EF4444',false,true,'lost');
  end if;

  select id into b_eng from public.workflow_boards where board_type='engineering' and organization_id is null limit 1;
  if b_eng is null then
    insert into public.workflow_boards(name, board_type, description) values ('Engenharia e Projetos','engineering','Documentação e aprovação na concessionária') returning id into b_eng;
    insert into public.workflow_columns(board_id,name,position,color,is_initial,is_final,final_result) values
      (b_eng,'Documentação pendente',1,'#F59E0B',true,false,null),(b_eng,'Documentação recebida',2,'#3B82F6',false,false,null),
      (b_eng,'Elaborando projeto',3,'#8B5CF6',false,false,null),(b_eng,'Projeto em revisão',4,'#6366F1',false,false,null),
      (b_eng,'Solicitado na concessionária',5,'#0EA5E9',false,false,null),(b_eng,'Correção solicitada',6,'#EF4444',false,false,null),
      (b_eng,'Parecer aprovado',7,'#10B981',false,true,'completed');
  end if;

  select id into b_install from public.workflow_boards where board_type='installation' and organization_id is null limit 1;
  if b_install is null then
    insert into public.workflow_boards(name, board_type, description) values ('Obras e Instalações','installation','Vistoria, instalação e entrega') returning id into b_install;
    insert into public.workflow_columns(board_id,name,position,color,is_initial,is_final,final_result) values
      (b_install,'Vistoria técnica',1,'#F59E0B',true,false,null),(b_install,'Aguardando materiais',2,'#64748B',false,false,null),
      (b_install,'Agendamento',3,'#3B82F6',false,false,null),(b_install,'Equipe em deslocamento',4,'#8B5CF6',false,false,null),
      (b_install,'Obra em andamento',5,'#F97316',false,false,null),(b_install,'Testes e comissionamento',6,'#0EA5E9',false,false,null),
      (b_install,'Entregue',7,'#10B981',false,true,'completed');
  end if;

  select id into b_after from public.workflow_boards where board_type='after_sales' and organization_id is null limit 1;
  if b_after is null then
    insert into public.workflow_boards(name, board_type, description) values ('Pós-venda','after_sales','Homologação, retornos e manutenção') returning id into b_after;
    insert into public.workflow_columns(board_id,name,position,color,is_initial,is_final,final_result) values
      (b_after,'Aguardando homologação',1,'#F59E0B',true,false,null),(b_after,'Sistema homologado',2,'#10B981',false,false,null),
      (b_after,'Retorno de 30 dias',3,'#3B82F6',false,false,null),(b_after,'Manutenção de 180 dias',4,'#8B5CF6',false,false,null),
      (b_after,'Manutenção anual',5,'#0EA5E9',false,false,null),(b_after,'Cliente recorrente',6,'#10B981',false,true,'completed');
  end if;
end $$;