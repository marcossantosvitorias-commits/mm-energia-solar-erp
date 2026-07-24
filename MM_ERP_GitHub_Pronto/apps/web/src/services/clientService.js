import { supabase } from '../lib/supabase.js';
import { requireSupabase } from './erpDatabaseService.js';

function fromDatabase(client) {
  return {
    ...client, customerType: client.customer_type, monthlyBill: Number(client.monthly_bill || 0),
    created: client.created_at, updated: client.updated_at,
  };
}

function toDatabase(data) {
  return {
    name: data.name, document: data.document || null, phone: data.phone,
    email: data.email || null, city: data.city || null, state: data.state || null,
    customer_type: data.customerType || 'residencial', status: data.status || 'lead',
    monthly_bill: Number(data.monthlyBill || 0), notes: data.notes || null,
  };
}

export async function listClients() {
  requireSupabase();
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromDatabase);
}

export async function createClient(data) {
  requireSupabase();
  const { data: created, error } = await supabase.from('clients').insert(toDatabase(data)).select('*').single();
  if (error) throw error;
  return fromDatabase(created);
}

export async function updateClient(id, data) {
  requireSupabase();
  const { data: updated, error } = await supabase.from('clients').update(toDatabase(data)).eq('id', id).select('*').single();
  if (error) throw error;
  return fromDatabase(updated);
}

export async function deleteClient(id) {
  requireSupabase();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}
