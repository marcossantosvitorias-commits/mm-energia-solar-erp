-- Corrige instalações antigas da ERP em que campos financeiros e de geração
-- foram criados com precisão insuficiente para propostas reais.
do $$
begin
  if to_regclass('public.sales_proposals') is not null then
    alter table public.sales_proposals
      alter column total_amount type numeric(18,2) using coalesce(total_amount, 0)::numeric(18,2),
      alter column discount_amount type numeric(18,2) using coalesce(discount_amount, 0)::numeric(18,2),
      alter column installment_amount type numeric(18,2) using installment_amount::numeric(18,2),
      alter column system_power_kw type numeric(14,3) using system_power_kw::numeric(14,3),
      alter column monthly_generation_kwh type numeric(16,2) using monthly_generation_kwh::numeric(16,2);
  end if;

  if to_regclass('public.solar_simulations') is not null then
    alter table public.solar_simulations
      alter column monthly_bill type numeric(18,2) using monthly_bill::numeric(18,2),
      alter column tariff_per_kwh type numeric(14,4) using tariff_per_kwh::numeric(14,4),
      alter column estimated_consumption_kwh type numeric(16,2) using estimated_consumption_kwh::numeric(16,2),
      alter column system_power_kw type numeric(14,3) using system_power_kw::numeric(14,3),
      alter column monthly_generation_kwh type numeric(16,2) using monthly_generation_kwh::numeric(16,2),
      alter column estimated_monthly_savings type numeric(18,2) using estimated_monthly_savings::numeric(18,2),
      alter column estimated_annual_savings type numeric(18,2) using estimated_annual_savings::numeric(18,2),
      alter column estimated_investment_min type numeric(18,2) using estimated_investment_min::numeric(18,2),
      alter column estimated_investment_max type numeric(18,2) using estimated_investment_max::numeric(18,2);
  end if;
end
$$;
