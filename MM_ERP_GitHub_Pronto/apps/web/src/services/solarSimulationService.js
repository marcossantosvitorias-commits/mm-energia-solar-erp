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

const round = (value, digits = 2) => Number(Number(value).toFixed(digits));

function calculateSolarSimulationLocally(input, persistenceWarning = '') {
  const monthlyBill = Number(input.monthlyBill);
  const tariffPerKwh = Number(input.tariffPerKwh || DEFAULTS.tariffPerKwh);
  const panelPowerW = Number(input.panelPowerW || DEFAULTS.panelPowerW);
  const irradiation = Number(input.irradiation || DEFAULTS.irradiation);
  const performanceRatio = Number(input.performanceRatio || DEFAULTS.performanceRatio);
  const targetOffsetPercent = Number(input.targetOffsetPercent || DEFAULTS.targetOffsetPercent);

  const estimatedConsumptionKwh = round(monthlyBill / tariffPerKwh, 2);
  const requiredGeneration = estimatedConsumptionKwh * (targetOffsetPercent / 100);
  const requiredKwp = requiredGeneration / (irradiation * 30 * performanceRatio);
  const panelCount = Math.max(1, Math.ceil((requiredKwp * 1000) / panelPowerW));
  const systemPowerKw = round((panelCount * panelPowerW) / 1000, 3);
  const monthlyGenerationKwh = round(systemPowerKw * irradiation * 30 * performanceRatio, 2);
  const estimatedMonthlySavings = round(Math.min(monthlyGenerationKwh, estimatedConsumptionKwh) * tariffPerKwh, 2);
  const estimatedAnnualSavings = round(estimatedMonthlySavings * 12, 2);

  return {
    simulation_id: null,
    proposal_id: null,
    estimated_consumption_kwh: estimatedConsumptionKwh,
    panel_count: panelCount,
    panel_power_w: panelPowerW,
    system_power_kw: systemPowerKw,
    monthly_generation_kwh: monthlyGenerationKwh,
    estimated_monthly_savings: estimatedMonthlySavings,
    estimated_annual_savings: estimatedAnnualSavings,
    estimated_investment_min: round(systemPowerKw * 3300, 2),
    estimated_investment_max: round(systemPowerKw * 4300, 2),
    ...(persistenceWarning ? { persistence_warning: persistenceWarning } : {}),
  };
}

function isNumericOverflow(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('numeric field overflow') || message.includes('numeric overflow');
}

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

  if (!payload.p_name) throw new Error('Informe o nome do cliente.');
  if (!payload.p_phone) throw new Error('Informe o WhatsApp do cliente.');
  if (!Number.isFinite(payload.p_monthly_bill) || payload.p_monthly_bill <= 0) {
    throw new Error('Informe um valor válido para a conta de energia.');
  }

  const localResult = calculateSolarSimulationLocally(input);

  try {
    const { data, error } = await supabase.rpc('submit_solar_simulation', payload);
    if (error) {
      if (isNumericOverflow(error)) {
        return calculateSolarSimulationLocally(input, 'Cálculo concluído. O banco ainda precisa da atualização de estrutura para gravar esta simulação automaticamente.');
      }
      throw error;
    }
    return data || localResult;
  } catch (error) {
    if (isNumericOverflow(error)) {
      return calculateSolarSimulationLocally(input, 'Cálculo concluído. O banco ainda precisa da atualização de estrutura para gravar esta simulação automaticamente.');
    }
    throw new Error(error?.message || 'Não foi possível calcular a simulação.');
  }
}

export async function listSolarSimulations({ search = '', status = '', limit = 100 } = {}) {
  const supabase = requireSupabase();
  let query = supabase
    .from('solar_simulations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (search.trim()) {
    const term = search.trim().replace(/[%(),]/g, '');
    query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,city.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) {
    if (isNumericOverflow(error)) return [];
    throw new Error(error.message || 'Não foi possível carregar as simulações.');
  }
  return data || [];
}

export async function updateSolarSimulationStatus(id, status) {
  const supabase = requireSupabase();
  const allowed = ['Novo', 'Contatado', 'Convertido', 'Descartado'];
  if (!allowed.includes(status)) throw new Error('Status inválido.');

  const { data, error } = await supabase
    .from('solar_simulations')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Não foi possível atualizar o status.');
  return data;
}

export async function getSolarSimulation(id) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('solar_simulations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message || 'Simulação não encontrada.');
  return data;
}
