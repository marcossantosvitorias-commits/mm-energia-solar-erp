import { requireSupabase } from '../lib/supabase';

const DEFAULTS = {
  state: 'SP',
  tariffPerKwh: 0.95,
  panelPowerW: 620,
  irradiation: 5.2,
  performanceRatio: 0.78,
  targetOffsetPercent: 95,
  source: 'site',
};

export async function submitSolarSimulation(input) {
  const supabase = requireSupabase();
  const params = new URLSearchParams(window.location.search);

  const payload = {
    p_name: input.name?.trim(),
    p_phone: input.phone?.trim(),
    p_monthly_bill: Number(input.monthlyBill),
    p_city: input.city?.trim() || null,
    p_state: input.state || DEFAULTS.state,
    p_email: input.email?.trim() || null,
    p_utility_company: input.utilityCompany?.trim() || null,
    p_connection_type: input.connectionType || null,
    p_tariff_per_kwh: Number(input.tariffPerKwh || DEFAULTS.tariffPerKwh),
    p_panel_power_w: Number(input.panelPowerW || DEFAULTS.panelPowerW),
    p_irradiation: Number(input.irradiation || DEFAULTS.irradiation),
    p_performance_ratio: Number(input.performanceRatio || DEFAULTS.performanceRatio),
    p_target_offset_percent: Number(input.targetOffsetPercent || DEFAULTS.targetOffsetPercent),
    p_source: input.source || params.get('utm_source') || DEFAULTS.source,
    p_utm_source: params.get('utm_source'),
    p_utm_medium: params.get('utm_medium'),
    p_utm_campaign: params.get('utm_campaign'),
  };

  if (!payload.p_name) throw new Error('Informe seu nome.');
  if (!payload.p_phone) throw new Error('Informe seu WhatsApp.');
  if (!Number.isFinite(payload.p_monthly_bill) || payload.p_monthly_bill <= 0) {
    throw new Error('Informe um valor válido para a conta de energia.');
  }

  const { data, error } = await supabase.rpc('submit_solar_simulation', payload);
  if (error) throw new Error(error.message || 'Não foi possível calcular sua simulação.');
  return data;
}
