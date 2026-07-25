-- Supabase como fonte única dos dados de negócio do MM ERP.
-- Execute depois das migrations 20260724_001 e 20260724_002.

alter table public.clients add column if not exists address text;
alter table public.clients add column if not exists zip_code text;

alter table public.financial_transactions add column if not exists scope text not null default 'company';
alter table public.accounts_payable add column if not exists scope text not null default 'company';
alter table public.accounts_receivable add column if not exists scope text not null default 'company';

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  client_document text,
  title text not null,
  signed_date date,
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  amount_received numeric(14,2) not null default 0 check (amount_received >= 0),
  amount_receivable numeric(14,2) not null default 0 check (amount_receivable >= 0),
  installation_forecast date,
  status text not null default 'rascunho' check (status in ('rascunho','assinado','concluido','cancelado')),
  document_url text,
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  supplier text not null,
  issue_date date,
  valid_until date,
  panels_count integer not null default 0,
  system_power_kwp numeric(12,3) not null default 0,
  panel_model text,
  inverters_count integer not null default 0,
  inverter_model text,
  structure_description text,
  products_total numeric(14,2) not null default 0,
  freight numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  status text not null default 'ativa' check (status in ('ativa','vencida','comprada','cancelada')),
  document_url text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_proposals (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  supplier_quote_id uuid references public.supplier_quotes(id) on delete set null,
  proposal_date date not null default current_date,
  validity_days integer not null default 7,
  project_value numeric(14,2) not null default 0,
  discounted_value numeric(14,2) not null default 0,
  financing_simulation jsonb not null default '{}'::jsonb,
  calculation jsonb not null default '{}'::jsonb,
  status text not null default 'rascunho' check (status in ('rascunho','enviada','aprovada','recusada','cancelada')),
  pdf_path text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_transactions_scope_date_idx on public.financial_transactions(scope, transaction_date desc);
create index if not exists accounts_payable_scope_due_idx on public.accounts_payable(scope, due_date);
create index if not exists accounts_receivable_scope_due_idx on public.accounts_receivable(scope, due_date);
create index if not exists contracts_client_idx on public.contracts(client_id);
create index if not exists contracts_forecast_idx on public.contracts(installation_forecast);
create index if not exists supplier_quotes_supplier_date_idx on public.supplier_quotes(supplier, issue_date desc);
create index if not exists client_proposals_client_date_idx on public.client_proposals(client_id, proposal_date desc);

alter table public.contracts enable row level security;
alter table public.supplier_quotes enable row level security;
alter table public.erp_settings enable row level security;
alter table public.client_proposals enable row level security;

drop policy if exists "contracts_authenticated_all" on public.contracts;
create policy "contracts_authenticated_all" on public.contracts for all to authenticated
using (public.is_active_user()) with check (public.is_active_user());

drop policy if exists "supplier_quotes_authenticated_all" on public.supplier_quotes;
create policy "supplier_quotes_authenticated_all" on public.supplier_quotes for all to authenticated
using (public.is_active_user()) with check (public.is_active_user());

drop policy if exists "erp_settings_authenticated_all" on public.erp_settings;
create policy "erp_settings_authenticated_all" on public.erp_settings for all to authenticated
using (public.is_active_user()) with check (public.is_active_user());

drop policy if exists "client_proposals_authenticated_all" on public.client_proposals;
create policy "client_proposals_authenticated_all" on public.client_proposals for all to authenticated
using (public.is_active_user()) with check (public.is_active_user());

drop trigger if exists contracts_updated_at on public.contracts;
create trigger contracts_updated_at before update on public.contracts
for each row execute procedure public.set_updated_at();

drop trigger if exists supplier_quotes_updated_at on public.supplier_quotes;
create trigger supplier_quotes_updated_at before update on public.supplier_quotes
for each row execute procedure public.set_updated_at();

drop trigger if exists erp_settings_updated_at on public.erp_settings;
create trigger erp_settings_updated_at before update on public.erp_settings
for each row execute procedure public.set_updated_at();

drop trigger if exists client_proposals_updated_at on public.client_proposals;
create trigger client_proposals_updated_at before update on public.client_proposals
for each row execute procedure public.set_updated_at();

insert into public.supplier_quotes (
  quote_number, supplier, issue_date, panels_count, system_power_kwp, panel_model,
  inverters_count, inverter_model, structure_description, products_total, freight, total, status
) values
  ('WEB-006414070', 'Belenus', '2026-07-25', 4, 2.48, 'TCL Solar bifacial N-Type 620 W', 1, 'Microinversor Deye 2,25 kW 220 V', 'Telha colonial - alumínio Belenergy com ajuste vertical', 3619.53, 500.00, 4119.53, 'ativa'),
  ('WEB-006408977', 'Belenus', '2026-07-24', 6, 3.72, 'JA Solar bifacial N-Type 620 W', 2, 'Microinversor Deye 2,25 kW 220 V', 'Telha colonial - alumínio Belenergy', 6141.56, 500.00, 6641.56, 'ativa'),
  ('WEB-006409592', 'Belenus', '2026-07-24', 8, 4.96, 'TCL Solar bifacial N-Type 620 W', 2, 'Microinversor Deye 2,25 kW 220 V', 'Telha colonial - alumínio Belenergy', 7239.06, 500.00, 7739.06, 'ativa'),
  ('WEB-006409022', 'Belenus', '2026-07-24', 10, 6.20, 'JA Solar bifacial N-Type 620 W', 3, 'Microinversor Deye 2,25 kW 220 V', 'Telha colonial - alumínio Belenergy', 9949.81, 619.04, 10568.85, 'ativa'),
  ('WEB-006409070', 'Belenus', '2026-07-24', 16, 9.92, 'JA Solar bifacial N-Type 620 W', 4, 'Microinversor Deye 2,25 kW 220 V', 'Telha colonial - alumínio Belenergy', 14964.06, 707.25, 15671.31, 'ativa')
on conflict (quote_number) do update set
  supplier = excluded.supplier,
  issue_date = excluded.issue_date,
  panels_count = excluded.panels_count,
  system_power_kwp = excluded.system_power_kwp,
  panel_model = excluded.panel_model,
  inverters_count = excluded.inverters_count,
  inverter_model = excluded.inverter_model,
  structure_description = excluded.structure_description,
  products_total = excluded.products_total,
  freight = excluded.freight,
  total = excluded.total,
  status = excluded.status;

insert into public.erp_settings (key, value, description)
values (
  'belenus_pricing',
  '{"cotacaoId":"WEB-006414070","form":{"materialEletrico":350,"maoDeObra":700,"mensalidadeTreviso":1000,"instalacoesMes":4,"trt":68,"combustivel":100,"outros":0,"imposto":4,"comissao":0,"margem":25,"desconto":3}}'::jsonb,
  'Custos, margem e seleção da calculadora de preços dos kits Belenus.'
)
on conflict (key) do nothing;

insert into public.clients (
  name, document, phone, email, address, zip_code, city, state,
  customer_type, status, monthly_bill, notes
)
select
  'Osvaldo Herminio Cestari Filho', '130.796.368-48', '(14) 99768-4616', null,
  'R. Sebastião Francisco Arruda, 663 - Vila Operária', '17340-000', 'Barra Bonita', 'SP',
  'residencial', 'cliente', 0,
  'Contrato assinado em 20/07/2026. Instalação prevista para a primeira ou segunda semana de agosto; prazo máximo em 18/08/2026.'
where not exists (
  select 1 from public.clients where document = '130.796.368-48'
);

insert into public.contracts (
  external_id, client_id, client_name, client_document, title, signed_date,
  total_amount, amount_received, amount_receivable, installation_forecast,
  status, document_url, notes, payload
)
select
  'contrato-osvaldo-cestari-2026', c.id, c.name, c.document,
  'Contrato de energia solar - Osvaldo Cestari', '2026-07-20',
  12908.00, 6454.00, 6454.00, '2026-08-18', 'assinado',
  'https://valida.ae/cb4fe3bc4c6b6dbd3fca9a85fc229fe810a791180b34f415b',
  'Pagamento: 50% na assinatura e 50% no dia da instalação.',
  '{"sistema":"8 módulos bifaciais e 2 microinversores de 2,25 kW","endereco":"R. Sebastião Francisco Arruda, 663 - Vila Operária, Barra Bonita/SP","pagamento":"50% na assinatura e 50% no dia da instalação"}'::jsonb
from public.clients c
where c.document = '130.796.368-48'
order by c.created_at
limit 1
on conflict (external_id) do update set
  client_id = excluded.client_id,
  client_name = excluded.client_name,
  client_document = excluded.client_document,
  installation_forecast = excluded.installation_forecast,
  amount_receivable = excluded.amount_receivable,
  status = excluded.status,
  notes = excluded.notes,
  payload = excluded.payload;

insert into public.accounts_receivable (
  external_id, description, client_id, client_name, category, amount,
  due_date, status, origin, notes, scope
)
select
  'contrato-osvaldo-cestari-parcela-2', 'Saldo do contrato solar - Osvaldo Cestari',
  c.id, c.name, 'Venda de sistema solar', 6454.00, '2026-08-18', 'pendente',
  'Contrato assinado', 'Receber no dia da instalação. Previsão máxima em 18/08/2026.', 'company'
from public.clients c
where c.document = '130.796.368-48'
order by c.created_at
limit 1
on conflict (external_id) do update set
  client_id = excluded.client_id,
  client_name = excluded.client_name,
  amount = excluded.amount,
  due_date = excluded.due_date,
  status = excluded.status,
  notes = excluded.notes;
