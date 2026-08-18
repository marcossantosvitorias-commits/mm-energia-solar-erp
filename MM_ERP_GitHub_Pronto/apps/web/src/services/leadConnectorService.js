import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('O Supabase não está configurado nesta publicação.');
  }
}

export async function getLeadConnectorStatus() {
  ensureSupabase();
  const { data, error } = await supabase.functions.invoke('leadconnector-sync', {
    body: { action: 'status' },
  });
  if (error) throw error;
  return data;
}

export async function syncLeadConnector() {
  ensureSupabase();
  const { data, error } = await supabase.functions.invoke('leadconnector-sync', {
    body: { action: 'sync' },
  });
  if (error) throw error;
  if (data?.error) {
    const errorWithDetails = new Error(data.error);
    errorWithDetails.details = data;
    throw errorWithDetails;
  }
  return data;
}
