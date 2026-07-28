-- Calculadora solar pública e captura de leads integrada ao CRM/Kanban.
create table if not exists public.solar_simulations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid null references public.clients(id) on delete set null,
  proposal_id uuid null references public.sales_proposals(id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  city text,
  state text not null default 'SP',
  utility_company text,
  connection_type text check (connection_type is null or connection_type in ('monofasica','bifasica','trifasica')),
  monthly_bill numeric(14,2) not null check (monthly_bill > 0),
  tariff_per_kwh numeric(10,4) not null default 0.95 check (tariff_per_kwh > 0),
  estimated_consumption_kwh numeric(12,2) not null,
  target_offset_percent numeric(5,2) not null default 95 check (target_offset_percent > 0 and target_offset_percent <= 100),
  irradiation numeric(6,3) not null default 5.2 check (irradiation > 0),
  performance_ratio numeric(5,4) not null default 0.78 check (performance_ratio > 0 and performance_ratio <= 1),
  panel_power_w integer not null default 620 check (panel_power_w > 0),
  panel_count integer not null check (panel_count > 0),
  system_power_kw numeric(10,3) not null,
  monthly_generation_kwh numeric(12,2) not null,
  estimated_monthly_savings numeric(14,2) not null,
  estimated_annual_savings numeric(14,2) not null,
  estimated_investment_min numeric(14,2),
  estimated_investment_max numeric(14,2),
  source text not null default 'site',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status text not null default 'Novo' check (status in ('Novo','Contatado','Convertido','Descartado')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists solar_simulations_created_idx on public.solar_simulations(created_at desc);
create index if not exists solar_simulations_phone_idx on public.solar_simulations(phone);
create index if not exists solar_simulations_city_idx on public.solar_simulations(city);
create index if not exists solar_simulations_source_idx on public.solar_simulations(source);
create index if not exists solar_simulations_status_idx on public.solar_simulations(status);

alter table public.solar_simulations enable row level security;

drop policy if exists "solar_simulations_authenticated_all" on public.solar_simulations;
create policy "solar_simulations_authenticated_all" on public.solar_simulations
for all to authenticated using (public.is_active_user()) with check (public.is_active_user());

drop trigger if exists solar_simulations_updated_at on public.solar_simulations;
create trigger solar_simulations_updated_at before update on public.solar_simulations
for each row execute procedure public.set_updated_at();

create or replace function public.submit_solar_simulation(
  p_name text,
  p_phone text,
  p_monthly_bill numeric,
  p_city text default null,
  p_state text default 'SP',
  p_email text default null,
  p_utility_company text default null,
  p_connection_type text default null,
  p_tariff_per_kwh numeric default 0.95,
  p_panel_power_w integer default 620,
  p_irradiation numeric default 5.2,
  p_performance_ratio numeric default 0.78,
  p_target_offset_percent numeric default 95,
  p_source text default 'site',
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_consumption numeric;
  v_required_generation numeric;
  v_kwp numeric;
  v_panel_count integer;
  v_generation numeric;
  v_monthly_savings numeric;
  v_annual_savings numeric;
  v_investment_min numeric;
  v_investment_max numeric;
  v_simulation_id uuid;
  v_proposal_id uuid;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'Nome é obrigatório'; end if;
  if coalesce(trim(p_phone), '') = '' then raise exception 'WhatsApp é obrigatório'; end if;
  if p_monthly_bill is null or p_monthly_bill <= 0 then raise exception 'Valor da conta deve ser maior que zero'; end if;
  if p_tariff_per_kwh is null or p_tariff_per_kwh <= 0 then raise exception 'Tarifa inválida'; end if;
  if p_panel_power_w is null or p_panel_power_w <= 0 then raise exception 'Potência do módulo inválida'; end if;

  v_consumption := round(p_monthly_bill / p_tariff_per_kwh, 2);
  v_required_generation := v_consumption * (p_target_offset_percent / 100.0);
  v_kwp := v_required_generation / (p_irradiation * 30 * p_performance_ratio);
  v_panel_count := greatest(1, ceil((v_kwp * 1000) / p_panel_power_w));
  v_kwp := round((v_panel_count * p_panel_power_w) / 1000.0, 3);
  v_generation := round(v_kwp * p_irradiation * 30 * p_performance_ratio, 2);
  v_monthly_savings := round(least(v_generation, v_consumption) * p_tariff_per_kwh, 2);
  v_annual_savings := round(v_monthly_savings * 12, 2);

  -- Faixa inicial parametrizada por kWp; será refinada pelo módulo de precificação.
  v_investment_min := round(v_kwp * 3300, 2);
  v_investment_max := round(v_kwp * 4300, 2);

  insert into public.sales_proposals(
    client_name, phone, city, status, total_amount, panel_count, panel_power_w,
    system_power_kw, monthly_generation_kwh, validity_days, notes, proposal_data
  ) values (
    trim(p_name), trim(p_phone), nullif(trim(p_city), ''), 'Gerada', v_investment_min,
    v_panel_count, p_panel_power_w, v_kwp, v_generation, 7,
    'Simulação automática gerada pela calculadora solar.',
    jsonb_build_object(
      'origin','solar_calculator',
      'monthly_bill',p_monthly_bill,
      'estimated_consumption_kwh',v_consumption,
      'estimated_monthly_savings',v_monthly_savings,
      'estimated_annual_savings',v_annual_savings,
      'investment_range',jsonb_build_object('min',v_investment_min,'max',v_investment_max),
      'utility_company',p_utility_company,
      'connection_type',p_connection_type,
      'source',coalesce(nullif(p_source,''),'site')
    )
  ) returning id into v_proposal_id;

  insert into public.solar_simulations(
    proposal_id, name, phone, email, city, state, utility_company, connection_type,
    monthly_bill, tariff_per_kwh, estimated_consumption_kwh, target_offset_percent,
    irradiation, performance_ratio, panel_power_w, panel_count, system_power_kw,
    monthly_generation_kwh, estimated_monthly_savings, estimated_annual_savings,
    estimated_investment_min, estimated_investment_max, source,
    utm_source, utm_medium, utm_campaign
  ) values (
    v_proposal_id, trim(p_name), trim(p_phone), nullif(trim(p_email),''), nullif(trim(p_city),''),
    coalesce(nullif(trim(p_state),''),'SP'), nullif(trim(p_utility_company),''), p_connection_type,
    p_monthly_bill, p_tariff_per_kwh, v_consumption, p_target_offset_percent,
    p_irradiation, p_performance_ratio, p_panel_power_w, v_panel_count, v_kwp,
    v_generation, v_monthly_savings, v_annual_savings,
    v_investment_min, v_investment_max, coalesce(nullif(p_source,''),'site'),
    nullif(trim(p_utm_source),''), nullif(trim(p_utm_medium),''), nullif(trim(p_utm_campaign),'')
  ) returning id into v_simulation_id;

  return jsonb_build_object(
    'simulation_id',v_simulation_id,
    'proposal_id',v_proposal_id,
    'estimated_consumption_kwh',v_consumption,
    'panel_count',v_panel_count,
    'panel_power_w',p_panel_power_w,
    'system_power_kw',v_kwp,
    'monthly_generation_kwh',v_generation,
    'estimated_monthly_savings',v_monthly_savings,
    'estimated_annual_savings',v_annual_savings,
    'estimated_investment_min',v_investment_min,
    'estimated_investment_max',v_investment_max
  );
end;
$$;

grant execute on function public.submit_solar_simulation(
  text,text,numeric,text,text,text,text,text,numeric,integer,numeric,numeric,numeric,text,text,text,text
) to anon, authenticated;

alter publication supabase_realtime add table public.solar_simulations;
