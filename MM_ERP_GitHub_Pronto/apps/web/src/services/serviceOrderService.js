import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

function ensureDatabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('O Supabase não está configurado nesta publicação.');
  }
}

function fromDatabase(order) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    clientId: order.client_id,
    proposalId: order.proposal_id,
    appointmentId: order.appointment_id,
    status: order.status,
    serviceType: order.service_type,
    scheduledAt: order.scheduled_at,
    startedAt: order.started_at,
    completedAt: order.completed_at,
    customerName: order.customer_name,
    customerPhone: order.customer_phone || '',
    installationAddress: order.installation_address || '',
    city: order.city || '',
    state: order.state || 'SP',
    assignedTeam: order.assigned_team || '',
    responsibleUserId: order.responsible_user_id,
    notes: order.notes || '',
    technicalNotes: order.technical_notes || '',
    customerObservations: order.customer_observations || '',
    totalCost: Number(order.total_cost || 0),
    createdBy: order.created_by,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    client: order.clients || null,
    proposal: order.sales_proposals || null,
    appointment: order.appointments || null,
  };
}

function toDatabase(data) {
  return {
    client_id: data.clientId || null,
    proposal_id: data.proposalId || null,
    appointment_id: data.appointmentId || null,
    status: data.status || 'Aguardando materiais',
    service_type: data.serviceType?.trim() || 'Instalação fotovoltaica',
    scheduled_at: data.scheduledAt || null,
    started_at: data.startedAt || null,
    completed_at: data.completedAt || null,
    customer_name: data.customerName?.trim(),
    customer_phone: data.customerPhone?.trim() || null,
    installation_address: data.installationAddress?.trim() || null,
    city: data.city?.trim() || null,
    state: data.state?.trim().toUpperCase() || 'SP',
    assigned_team: data.assignedTeam?.trim() || null,
    responsible_user_id: data.responsibleUserId || null,
    notes: data.notes?.trim() || null,
    technical_notes: data.technicalNotes?.trim() || null,
    customer_observations: data.customerObservations?.trim() || null,
    total_cost: Number(data.totalCost || 0),
  };
}

const orderSelect = `
  *,
  clients(id, name, phone, email, city, state),
  sales_proposals(id, proposal_number, total_value, status),
  appointments(id, appointment_at, appointment_type, status)
`;

export async function listServiceOrders(filters = {}) {
  ensureDatabase();
  let query = supabase
    .from('service_orders')
    .select(orderSelect)
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (filters.status && filters.status !== 'todos') query = query.eq('status', filters.status);
  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.proposalId) query = query.eq('proposal_id', filters.proposalId);
  if (filters.dateFrom) query = query.gte('scheduled_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('scheduled_at', filters.dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(fromDatabase);
}

export async function getServiceOrder(id) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('service_orders')
    .select(orderSelect)
    .eq('id', id)
    .single();
  if (error) throw error;
  return fromDatabase(data);
}

export async function createServiceOrder(data) {
  ensureDatabase();

  if (!data.customerName?.trim()) {
    throw new Error('Informe o nome do cliente.');
  }

  if (data.proposalId) {
    const { data: existing, error: existingError } = await supabase
      .from('service_orders')
      .select('id, status')
      .eq('proposal_id', data.proposalId)
      .not('status', 'in', '(Concluída,Cancelada)')
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) throw new Error('Esta proposta já possui uma Ordem de Serviço ativa.');
  }

  const { data: created, error } = await supabase
    .from('service_orders')
    .insert(toDatabase(data))
    .select(orderSelect)
    .single();
  if (error) throw error;

  if (data.clientId) {
    await supabase.from('client_interactions').insert({
      client_id: data.clientId,
      interaction_type: 'observacao',
      description: `Ordem de Serviço nº ${created.order_number} criada.`,
      next_action_at: data.scheduledAt || null,
    });
  }

  return fromDatabase(created);
}

export async function updateServiceOrder(id, data) {
  ensureDatabase();
  const payload = toDatabase(data);
  delete payload.started_at;
  delete payload.completed_at;

  const { data: updated, error } = await supabase
    .from('service_orders')
    .update(payload)
    .eq('id', id)
    .select(orderSelect)
    .single();
  if (error) throw error;
  return fromDatabase(updated);
}

export async function updateServiceOrderStatus(id, status) {
  ensureDatabase();
  const changes = { status };
  if (status === 'Instalação iniciada') changes.started_at = new Date().toISOString();
  if (status === 'Concluída') changes.completed_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from('service_orders')
    .update(changes)
    .eq('id', id)
    .select(orderSelect)
    .single();
  if (error) throw error;

  if (updated.client_id) {
    await supabase.from('client_interactions').insert({
      client_id: updated.client_id,
      interaction_type: 'observacao',
      description: `OS nº ${updated.order_number}: status alterado para ${status}.`,
    });
  }

  return fromDatabase(updated);
}

export async function deleteServiceOrder(id) {
  ensureDatabase();
  const { error } = await supabase.from('service_orders').delete().eq('id', id);
  if (error) throw error;
}

export async function listServiceOrderItems(serviceOrderId) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('service_order_items')
    .select('*')
    .eq('service_order_id', serviceOrderId)
    .order('created_at');
  if (error) throw error;
  return data || [];
}

export async function addServiceOrderItem(serviceOrderId, item) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('service_order_items')
    .insert({
      service_order_id: serviceOrderId,
      equipment_id: item.equipmentId || null,
      description: item.description.trim(),
      category: item.category?.trim() || null,
      quantity: Number(item.quantity || 1),
      unit: item.unit?.trim() || 'un',
      unit_cost: Number(item.unitCost || 0),
      reserved: Boolean(item.reserved),
      used_quantity: Number(item.usedQuantity || 0),
      notes: item.notes?.trim() || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateServiceOrderItem(id, item) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('service_order_items')
    .update({
      description: item.description.trim(),
      category: item.category?.trim() || null,
      quantity: Number(item.quantity || 1),
      unit: item.unit?.trim() || 'un',
      unit_cost: Number(item.unitCost || 0),
      reserved: Boolean(item.reserved),
      used_quantity: Number(item.usedQuantity || 0),
      notes: item.notes?.trim() || null,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteServiceOrderItem(id) {
  ensureDatabase();
  const { error } = await supabase.from('service_order_items').delete().eq('id', id);
  if (error) throw error;
}

export async function listServiceOrderChecklist(serviceOrderId) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('service_order_checklist')
    .select('*')
    .eq('service_order_id', serviceOrderId)
    .order('position');
  if (error) throw error;
  return data || [];
}

export async function updateChecklistItem(id, completed, notes = null) {
  ensureDatabase();
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('service_order_checklist')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? authData?.user?.id || null : null,
      notes: notes?.trim() || null,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listServiceOrderPhotos(serviceOrderId) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('service_order_photos')
    .select('*')
    .eq('service_order_id', serviceOrderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addServiceOrderPhoto(serviceOrderId, photo) {
  ensureDatabase();
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('service_order_photos')
    .insert({
      service_order_id: serviceOrderId,
      stage: photo.stage || 'Durante',
      storage_path: photo.storagePath,
      caption: photo.caption?.trim() || null,
      latitude: photo.latitude || null,
      longitude: photo.longitude || null,
      uploaded_by: authData?.user?.id || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function addServiceOrderSignature(serviceOrderId, signature) {
  ensureDatabase();
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('service_order_signatures')
    .insert({
      service_order_id: serviceOrderId,
      signer_name: signature.signerName.trim(),
      signer_document: signature.signerDocument?.trim() || null,
      signature_data: signature.signatureData,
      acceptance_text: signature.acceptanceText?.trim() || null,
      latitude: signature.latitude || null,
      longitude: signature.longitude || null,
      created_by: authData?.user?.id || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function listServiceOrderSignatures(serviceOrderId) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('service_order_signatures')
    .select('*')
    .eq('service_order_id', serviceOrderId)
    .order('signed_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function completeServiceOrder(id) {
  ensureDatabase();

  const { data: pendingChecklist, error: checklistError } = await supabase
    .from('service_order_checklist')
    .select('id, item')
    .eq('service_order_id', id)
    .eq('required', true)
    .eq('completed', false);
  if (checklistError) throw checklistError;
  if (pendingChecklist?.length) {
    throw new Error(`Existem ${pendingChecklist.length} itens obrigatórios pendentes no checklist.`);
  }

  const { count, error: signatureError } = await supabase
    .from('service_order_signatures')
    .select('id', { count: 'exact', head: true })
    .eq('service_order_id', id);
  if (signatureError) throw signatureError;
  if (!count) throw new Error('Colete a assinatura do cliente antes de concluir a OS.');

  return updateServiceOrderStatus(id, 'Concluída');
}
