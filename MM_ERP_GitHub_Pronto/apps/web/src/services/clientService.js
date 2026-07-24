import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const STORAGE_KEY = 'mm-erp-clients';

function readLocalClients() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalClients(clients) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function fromDatabase(client) {
  return {
    ...client,
    customerType: client.customer_type,
    monthlyBill: Number(client.monthly_bill || 0),
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
    city: data.city || null,
    state: data.state || null,
    customer_type: data.customerType || 'residencial',
    status: data.status || 'lead',
    monthly_bill: Number(data.monthlyBill || 0),
    notes: data.notes || null,
  };
}

export async function listClients() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(fromDatabase);
  }

  return readLocalClients().sort((a, b) => new Date(b.created) - new Date(a.created));
}

export async function createClient(data) {
  if (isSupabaseConfigured) {
    const { data: created, error } = await supabase
      .from('clients')
      .insert(toDatabase(data))
      .select('*')
      .single();

    if (error) throw error;
    return fromDatabase(created);
  }

  const clients = readLocalClients();
  const client = {
    id: crypto.randomUUID(),
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    ...data,
  };

  writeLocalClients([client, ...clients]);
  return client;
}

export async function updateClient(id, data) {
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase
      .from('clients')
      .update(toDatabase(data))
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return fromDatabase(updated);
  }

  const clients = readLocalClients();
  const updated = clients.map((client) =>
    client.id === id
      ? { ...client, ...data, updated: new Date().toISOString() }
      : client,
  );

  writeLocalClients(updated);
  return updated.find((client) => client.id === id);
}

export async function deleteClient(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    return;
  }

  writeLocalClients(readLocalClients().filter((client) => client.id !== id));
}
