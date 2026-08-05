import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const SETTINGS_KEY = 'belenus_pricing';
const KIT_7_PLACAS = {
  id: 'MM-7-PLACAS',
  placas: 7,
  potencia: 4.34,
  modulo: 'TCL Solar bifacial N-Type 620 W',
  inversores: 2,
  inversor: 'Microinversor Deye 2,25 kW 220 V',
  produtos: 0,
  frete: 0,
  total: 0,
  precoAvista: 11412.5,
  estrutura: 'Kit on-grid completo',
  emissao: null,
  validade: null,
  status: 'Ativo',
  kitComercial: true,
};

function ensureDatabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('O Supabase não está configurado nesta publicação.');
  }
}

function mapQuote(row) {
  return {
    id: row.quote_number,
    placas: Number(row.panels_count || 0),
    potencia: Number(row.system_power_kwp || 0),
    modulo: row.panel_model || '',
    inversores: Number(row.inverters_count || 0),
    inversor: row.inverter_model || '',
    produtos: Number(row.products_total || 0),
    frete: Number(row.freight || 0),
    total: Number(row.total || 0),
    estrutura: row.structure_description || '',
    emissao: row.issue_date,
    validade: row.valid_until,
    status: row.status,
  };
}

async function listQuotes() {
  ensureDatabase();
  const { data, error } = await supabase
    .from('supplier_quotes')
    .select('*')
    .eq('supplier', 'Belenus')
    .order('panels_count', { ascending: true });
  if (error) throw error;
  const quotes = (data || []).map(mapQuote).filter((item) => item.placas !== 7);
  return [...quotes, KIT_7_PLACAS].sort((a, b) => a.placas - b.placas);
}

async function getSettings() {
  ensureDatabase();
  const { data, error } = await supabase
    .from('erp_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();
  if (error) throw error;
  return data?.value || null;
}

async function saveSettings(value) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('erp_settings')
    .upsert({
      key: SETTINGS_KEY,
      value,
      description: 'Custos, margem e seleção da calculadora de preços dos kits Belenus.',
    }, { onConflict: 'key' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export const belenusPricingService = { listQuotes, getSettings, saveSettings };
