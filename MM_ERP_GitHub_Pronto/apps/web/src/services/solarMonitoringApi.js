import { supabase } from '../lib/supabase.js';

async function callSolarMonitoring(action) {
  const response = await supabase.functions.invoke('solar-monitoring', { body: { action } });
  if (response.error) throw new Error(response.error.message || 'Falha na central de monitoramento.');
  if (!response.data?.ok) throw new Error(response.data?.error || 'A integração retornou um erro.');
  return response.data;
}

export async function checkSolarMonitoring() {
  return callSolarMonitoring('health');
}

export async function syncSolarmanPlants() {
  const data = await callSolarMonitoring('listPlants');
  return data.plants || [];
}
