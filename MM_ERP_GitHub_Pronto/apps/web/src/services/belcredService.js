import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

function ensureDatabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('O Supabase não está configurado nesta publicação.');
  }
}

async function listSimulations() {
  ensureDatabase();
  const { data, error } = await supabase
    .from('belcred_simulations')
    .select('id, client_id, project_value, simulation, created_at')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data || [];
}

async function saveSimulation({ clientId = null, projectValue, simulation }) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('belcred_simulations')
    .insert({
      client_id: clientId || null,
      project_value: Number(projectValue),
      simulation,
    })
    .select('id, client_id, project_value, simulation, created_at')
    .single();
  if (error) throw error;
  return data;
}

async function removeSimulation(id) {
  ensureDatabase();
  const { error } = await supabase.from('belcred_simulations').delete().eq('id', id);
  if (error) throw error;
}

export const belcredService = {
  listSimulations,
  saveSimulation,
  removeSimulation,
};
