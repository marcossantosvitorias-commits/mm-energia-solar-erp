import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

function ensureDatabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('O Supabase não está configurado nesta publicação.');
  }
}

async function listSimulations(clientId = null) {
  ensureDatabase();
  let query = supabase
    .from('belcred_simulations')
    .select('id, client_id, project_value, simulation, created_at, clients(name, phone)')
    .order('created_at', { ascending: false })
    .limit(30);

  if (clientId) query = query.eq('client_id', clientId);

  const { data, error } = await query;
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
    .select('id, client_id, project_value, simulation, created_at, clients(name, phone)')
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