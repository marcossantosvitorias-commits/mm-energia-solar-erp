import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

function ensureDatabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado. Os clientes não serão salvos no navegador. Configure o banco para continuar.');
  }
}

function fromDatabase(client) {
  return {
    id: client.id,
    name: client.name,
    document: client.document || '',
    phone: client.phone || '',
    email: client.email || '',
    address: client.address || '',
    zipCode: client.zip_code || '',
    city: client.city || '',
    state: client.state || '',
    customerType: client.customer_type,
    status: client.status,
    monthlyBill: Number(client.monthly_bill || 0),
    notes: client.notes || '',
    created: client.created_at,
    updated: client.updated_at,
  };
}

function toDatabase(data) {
  return {
    name: data.name,
    document: data.document || null,
    phone: data.phone,
    email: data.email || null,
    address: data.address || null,
    zip_code: data.zipCode || null,
    city: data.city || null,
    state: data.state || null,
    customer_type: data.customerType || 'residencial',
    status: data.status || 'lead',
    monthly_bill: Number(data.monthlyBill || 0),
    notes: data.notes || null,
  };
}

export async function listClients() {
  ensureDatabase();
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromDatabase);
}

export async function createClient(data) {
  ensureDatabase();
  const { data: created, error } = await supabase.from('clients').insert(toDatabase(data)).select('*').single();
  if (error) throw error;
  return fromDatabase(created);
}

export async function updateClient(id, data) {
  ensureDatabase();
  const { data: updated, error } = await supabase.from('clients').update(toDatabase(data)).eq('id', id).select('*').single();
  if (error) throw error;
  return fromDatabase(updated);
}

export async function deleteClient(id) {
  ensureDatabase();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}
