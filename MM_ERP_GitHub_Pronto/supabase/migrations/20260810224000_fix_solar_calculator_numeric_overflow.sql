-- Correção definitiva para "numeric field overflow" na calculadora solar.
-- Amplia a precisão dos campos numéricos usados pelo RPC e pelas propostas.

do $$
begin
  if to_regclass('public.sales_proposals') is not null then
    alter table public.sales_proposals
      alter column total_amount type numeric(30,6) using total_amount::numeric(30,6),
      alter column system_power_kw type numeric(30,6) using system_power_kw::numeric(30,6),
      alter column monthly_generation_kwh type numeric(30,6) using monthly_generation_kwh::numeric(30,6);
  end if;

  if to_regclass('public.solar_simulations') is not null then
    alter table public.solar_simulations
      alter column monthly_bill type numeric(30,6) using monthly_bill::numeric(30,6),
      alter column tariff_per_kwh type numeric(30,6) using tariff_per_kwh::numeric(30,6),
      alter column estimated_consumption_kwh type numeric(30,6) using estimated_consumption_kwh::numeric(30,6),
      alter column target_offset_percent type numeric(30,6) using target_offset_percent::numeric(30,6),
      alter column irradiation type numeric(30,6) using irradiation::numeric(30,6),
      alter column performance_ratio type numeric(30,6) using performance_ratio::numeric(30,6),
      alter column system_power_kw type numeric(30,6) using system_power_kw::numeric(30,6),
      alter column monthly_generation_kwh type numeric(30,6) using monthly_generation_kwh::numeric(30,6),
      alter column estimated_monthly_savings type numeric(30,6) using estimated_monthly_savings::numeric(30,6),
      alter column estimated_annual_savings type numeric(30,6) using estimated_annual_savings::numeric(30,6),
      alter column estimated_investment_min type numeric(30,6) using estimated_investment_min::numeric(30,6),
      alter column estimated_investment_max type numeric(30,6) using estimated_investment_max::numeric(30,6);
  end if;
end
$$;
