import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const STORAGE_KEY = 'mm-erp-clients';

const CLIENTE_OSVALDO = {
  id: 'cliente-osvaldo-cestari',
  name: 'Osvaldo Herminio Cestari Filho',
  document: '130.796.368-48',
  phone: '(14) 99768-4616',
  email: '',
  address: 'R. Sebastião Francisco Arruda, 663 - Vila Operária',
  zipCode: '17340-000',
  city: 'Barra Bonita',
  state: 'SP',
  customerType: 'residencial',
  status: 'cliente',
  monthlyBill: 0,
  notes: 'Cliente com contrato solar assinado em 20/07/2026. Instalação prevista para a primeira ou segunda semana de agosto de 2026.',
  nextContactAt: null,
  reminderNote: '',
  reminderDone: false,
  created: '2026-07-20T08:26:00-03:00',
  updated: new Date().toISOString(),
};

function readLocalClients() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const clients = raw ? JSON.parse(raw) : [];
    if (!clients.some((client) => client.id === CLIENTE_OSVALDO.id || client.document === CLIENTE_OSVALDO.document)) {
      const updated = [CLIENTE_OSVALDO, ...clients];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    }
    return clients;
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
    address: client.address || '',
    zipCode: client.zip_code || '',
    customerType: client.customer_type,
    monthlyBill: Number(client.monthly_bill || 0),
    nextContactAt: client.next_contact_at || null,
    reminderNote: client.reminder_note || '',
    reminderDone: Boolean(client.reminder_done),
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
    next_contact_at: data.nextContactAt || null,
    reminder_note: data.reminderNote || null,
    reminder_done: Boolean(data.reminderDone),
  };
}

export async function listClients() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const clients = (data || []).map(fromDatabase);
    if (!clients.some((client) => client.document === CLIENTE_OSVALDO.document)) {
      const { data: created, error: createError } = await supabase.from('clients').insert(toDatabase(CLIENTE_OSVALDO)).select('*').single();
      if (createError) throw createError;
      return [fromDatabase(created), ...clients];
    }
    return clients;
  }
  return readLocalClients().sort((a, b) => new Date(b.created) - new Date(a.created));
}

export async function createClient(data) {
  if (isSupabaseConfigured) {
    const { data: created, error } = await supabase.from('clients').insert(toDatabase(data)).select('*').single();
    if (error) throw error;
    return fromDatabase(created);
  }
  const clients = readLocalClients();
  const client = { id: crypto.randomUUID(), created: new Date().toISOString(), updated: new Date().toISOString(), ...data };
  writeLocalClients([client, ...clients]);
  return client;
}

export async function updateClient(id, data) {
  if (isSupabaseConfigured) {
    const { data: updated, error } = await supabase.from('clients').update(toDatabase(data)).eq('id', id).select('*').single();
    if (error) throw error;
    return fromDatabase(updated);
  }
  const clients = readLocalClients();
  const updated = clients.map((client) => client.id === id ? { ...client, ...data, updated: new Date().toISOString() } : client);
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
