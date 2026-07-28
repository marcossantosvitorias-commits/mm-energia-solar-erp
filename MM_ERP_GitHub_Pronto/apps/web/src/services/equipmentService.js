import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

function ensureDatabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('O Supabase não está configurado nesta publicação.');
  }
}

function toPayload(item) {
  return {
    external_id: String(item.externalId || item.id || '').trim() || null,
    type: item.type || item.tipo || 'Outro',
    brand: item.brand || item.marca || '',
    model: item.model || item.modelo || '',
    power_w: Number(item.powerW ?? item.potencia ?? 0),
    unit_cost: Number(item.unitCost ?? item.custo ?? 0),
    stock_quantity: Number(item.stockQuantity ?? item.estoque ?? 0),
    supplier: item.supplier || item.fornecedor || null,
    price_date: item.priceDate || null,
    notes: item.notes || null,
  };
}

async function list() {
  ensureDatabase();
  const { data, error } = await supabase
    .from('equipment_catalog')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function save(item) {
  ensureDatabase();
  const payload = toPayload(item);
  const query = payload.external_id
    ? supabase.from('equipment_catalog').upsert(payload, { onConflict: 'external_id' })
    : supabase.from('equipment_catalog').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  return data;
}

async function remove(id) {
  ensureDatabase();
  const { error } = await supabase.from('equipment_catalog').delete().eq('id', id);
  if (error) throw error;
}

async function importMany(items) {
  const result = { saved: 0, failed: 0 };
  for (const item of items) {
    try {
      await save(item);
      result.saved += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}

export const equipmentService = { list, save, remove, importMany };
