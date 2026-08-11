import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { BELENUS_CATALOG } from '../data/belenusCatalog.js';

const SETTINGS_KEY = 'belenus_pricing';
const BELENUS_DISCOUNT_PERCENT = 12;
const BELENUS_DISCOUNT_FACTOR = 1 - (BELENUS_DISCOUNT_PERCENT / 100);
const money = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

function withBelenusDiscount(item) {
  if (!item) return null;
  const tablePrice = money(item.price);
  return {
    ...item,
    tablePrice,
    discountPercent: BELENUS_DISCOUNT_PERCENT,
    price: money(tablePrice * BELENUS_DISCOUNT_FACTOR),
    priceSource: 'BelEnergy app - preço com 12% de desconto',
  };
}

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

const KIT_12_PLACAS_MICRO = {
  id: 'WEB-006511686',
  placas: 12,
  potencia: 7.44,
  modulo: 'TCL Solar bifacial N-Type 620 W - MFTC-1.2-BF-132-620W',
  inversores: 3,
  inversor: 'Microinversor Growatt monofásico 2,5 kW, 4 MPPT, 220 V - MINVGR-MO-220V-2.5KW',
  produtos: 10430.60,
  frete: 642.12,
  total: 11072.72,
  precoAvista: 0,
  estrutura: 'Fibrocimento - haste de aço inox 200 mm para madeira, 2 linhas de 6 módulos em retrato',
  emissao: '2026-08-10',
  validade: '2026-08-13',
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
    payload: row.payload || {},
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
  const quotes = (data || []).map(mapQuote).filter((item) => item.placas !== 7 && item.id !== KIT_12_PLACAS_MICRO.id);
  return [...quotes, KIT_7_PLACAS, KIT_12_PLACAS_MICRO].sort((a, b) => a.placas - b.placas);
}

async function listPublishedCatalogKits() {
  ensureDatabase();
  const { data, error } = await supabase
    .from('supplier_quotes')
    .select('*')
    .eq('supplier', 'Belenus')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || [])
    .filter((row) => row.payload?.source === 'belenus_catalog_builder')
    .map(mapQuote);
}

async function publishCatalogKit(input) {
  ensureDatabase();
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const quoteNumber = `BEL-CALC-${input.panelsCount}-${stamp}`;
  const issueDate = now.toISOString().slice(0, 10);

  const payload = {
    source: 'belenus_catalog_builder',
    name: input.name || `${input.panelsCount} placas - cálculo Belenus`,
    discountPercent: BELENUS_DISCOUNT_PERCENT,
    items: (input.items || []).map((item) => ({
      sku: item.sku,
      category: item.category,
      brand: item.brand,
      model: item.model,
      unit: item.unit,
      quantity: Number(item.quantidade || 0),
      tablePrice: Number(item.tablePrice || 0),
      unitPrice: Number(item.price || 0),
      subtotal: money(Number(item.price || 0) * Number(item.quantidade || 0)),
    })),
  };

  const { data, error } = await supabase
    .from('supplier_quotes')
    .insert({
      quote_number: quoteNumber,
      supplier: 'Belenus',
      issue_date: issueDate,
      valid_until: null,
      panels_count: Number(input.panelsCount || 0),
      system_power_kwp: money(input.systemPowerKwp),
      panel_model: input.panelModel || '',
      inverters_count: Number(input.invertersCount || 0),
      inverter_model: input.inverterModel || '',
      structure_description: 'Kit calculado manualmente no acervo Belenus com preços líquidos de 12% de desconto.',
      products_total: money(input.productsTotal),
      freight: money(input.freight),
      total: money(input.total),
      status: 'ativa',
      payload,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

function listCatalog({ category = '', search = '' } = {}) {
  const normalizedSearch = String(search || '').trim().toLowerCase();
  return BELENUS_CATALOG
    .map(withBelenusDiscount)
    .filter((item) => !category || item.category === category)
    .filter((item) => !normalizedSearch || [item.sku, item.category, item.brand, item.model]
      .join(' ').toLowerCase().includes(normalizedSearch))
    .sort((a, b) => a.category.localeCompare(b.category, 'pt-BR') || a.price - b.price);
}

function getCatalogItem(sku) {
  return withBelenusDiscount(BELENUS_CATALOG.find((item) => item.sku === sku) || null);
}

function getCatalogCategories() {
  return [...new Set(BELENUS_CATALOG.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
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

export const belenusPricingService = {
  discountPercent: BELENUS_DISCOUNT_PERCENT,
  listQuotes,
  listPublishedCatalogKits,
  publishCatalogKit,
  listCatalog,
  getCatalogItem,
  getCatalogCategories,
  getSettings,
  saveSettings,
};
