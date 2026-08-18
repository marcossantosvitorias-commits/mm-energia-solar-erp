import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

function ensureDatabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('O Supabase não está configurado nesta publicação.');
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
    customerType: client.customer_type || 'residencial',
    status: client.status || 'lead',
    monthlyBill: Number(client.monthly_bill || 0),
    notes: client.notes || '',
    leadSource: client.lead_source || '',
    externalProvider: client.external_provider || '',
    externalId: client.external_id || '',
    created: client.created_at,
    updated: client.updated_at,
  };
}

function toDatabase(data) {
  return {
    name: data.name.trim(),
    document: data.document?.trim() || null,
    phone: data.phone.trim(),
    email: data.email?.trim() || null,
    address: data.address?.trim() || null,
    zip_code: data.zipCode?.trim() || null,
    city: data.city?.trim() || null,
    state: data.state?.trim().toUpperCase() || null,
    customer_type: data.customerType || 'residencial',
    status: data.status || 'lead',
    monthly_bill: Number(data.monthlyBill || 0),
    notes: data.notes?.trim() || null,
    ...(data.leadSource ? { lead_source: data.leadSource } : {}),
    ...(data.externalProvider ? { external_provider: data.externalProvider } : {}),
    ...(data.externalId ? { external_id: data.externalId } : {}),
  };
}

async function pushClientToLeadConnector(clientId) {
  try {
    await supabase.functions.invoke('leadconnector-sync', {
      body: { action: 'push_client', clientId },
    });
  } catch (error) {
    console.warn('LeadConnector sync pending:', error);
  }
}

export async function listClients() {
  ensureDatabase();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromDatabase);
}

export async function createClient(data) {
  ensureDatabase();
  const { data: created, error } = await supabase
    .from('clients')
    .insert(toDatabase(data))
    .select('*')
    .single();
  if (error) throw error;
  await pushClientToLeadConnector(created.id);
  return fromDatabase(created);
}

export async function updateClient(id, data) {
  ensureDatabase();
  const { data: updated, error } = await supabase
    .from('clients')
    .update(toDatabase(data))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  await pushClientToLeadConnector(updated.id);
  return fromDatabase(updated);
}

export async function deleteClient(id) {
  ensureDatabase();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

export async function listClientInteractions(clientId) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('client_interactions')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createClientInteraction(clientId, interaction) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('client_interactions')
    .insert({
      client_id: clientId,
      interaction_type: interaction.type || 'contato',
      description: interaction.description.trim(),
      next_action_at: interaction.nextActionAt || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClientInteraction(id) {
  ensureDatabase();
  const { error } = await supabase.from('client_interactions').delete().eq('id', id);
  if (error) throw error;
}
