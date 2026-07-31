-- Corrige bancos antigos em que sales_proposals foi criada com tipos incompatíveis.
-- Mantém os dados existentes e amplia os limites usados pela ERP 2.0.

do $$
begin
  if to_regclass('public.sales_proposals') is not null then
    alter table public.sales_proposals
      alter column phone type text using coalesce(phone::text, ''),
      alter column total_amount type numeric(14,2) using coalesce(total_amount, 0)::numeric(14,2),
      alter column panel_count type integer using coalesce(panel_count, 0)::integer,
      alter column panel_power_w type integer using panel_power_w::integer,
      alter column system_power_kw type numeric(10,3) using system_power_kw::numeric(10,3),
      alter column monthly_generation_kwh type numeric(12,2) using monthly_generation_kwh::numeric(12,2),
      alter column validity_days type integer using coalesce(validity_days, 7)::integer;

    alter table public.sales_proposals
      alter column phone set not null,
      alter column phone set default '',
      alter column total_amount set default 0,
      alter column panel_count set default 0,
      alter column validity_days set default 7;
  end if;
end
$$;
