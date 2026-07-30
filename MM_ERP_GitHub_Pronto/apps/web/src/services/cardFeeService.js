import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

function ensureDatabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('O Supabase não está configurado nesta publicação.');
  }
}

async function list(provider = 'My Gateway') {
  ensureDatabase();
  const { data, error } = await supabase
    .from('card_fee_schedules')
    .select('*')
    .eq('provider', provider)
    .eq('active', true)
    .order('installments', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function listAll() {
  ensureDatabase();
  const { data, error } = await supabase
    .from('card_fee_schedules')
    .select('*')
    .order('provider', { ascending: true })
    .order('installments', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function saveMany(provider, fees) {
  ensureDatabase();
  const payload = fees.map((item) => ({
    provider,
    installments: Number(item.installments),
    fee_percent: Number(item.fee_percent || 0),
    active: item.active !== false,
    notes: item.notes || null,
  }));
  const { data, error } = await supabase
    .from('card_fee_schedules')
    .upsert(payload, { onConflict: 'provider,installments' })
    .select('*');
  if (error) throw error;
  return data || [];
}

export const cardFeeService = { list, listAll, saveMany };
