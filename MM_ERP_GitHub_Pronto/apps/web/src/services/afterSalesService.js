import { requireSupabase } from '../lib/supabase';

export async function listInstalledSystems() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('installed_systems').select('*, service_orders(order_number, customer_name, customer_phone, city, state), sales_proposals(panel_count, panel_power_w, system_power_kw, inverter_model)').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateInstalledSystem(id, changes) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('installed_systems').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listWarranties(installedSystemId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('installed_system_warranties').select('*').eq('installed_system_id', installedSystemId).order('created_at');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addWarranty(installedSystemId, warranty) {
  const supabase = requireSupabase();
  const start = warranty.warranty_start_date || null;
  let end = warranty.warranty_end_date || null;
  if (!end && start && warranty.warranty_years) {
    const date = new Date(`${start}T12:00:00`); date.setFullYear(date.getFullYear() + Number(warranty.warranty_years)); end = date.toISOString().slice(0, 10);
  }
  const { data, error } = await supabase.from('installed_system_warranties').insert({ installed_system_id: installedSystemId, ...warranty, warranty_years: warranty.warranty_years ? Number(warranty.warranty_years) : null, warranty_end_date: end }).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listAfterSalesInteractions(installedSystemId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('after_sales_interactions').select('*').eq('installed_system_id', installedSystemId).order('interaction_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addAfterSalesInteraction(installedSystemId, interaction) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('after_sales_interactions').insert({ installed_system_id: installedSystemId, ...interaction }).select('*').single();
  if (error) throw new Error(error.message);
  if (interaction.next_action_at) await updateInstalledSystem(installedSystemId, { next_follow_up_at: interaction.next_action_at });
  return data;
}