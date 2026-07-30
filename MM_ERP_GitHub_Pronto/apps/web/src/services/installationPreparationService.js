import { requireSupabase } from '../lib/supabase';

const mapOrder = (row) => ({
  ...row,
  orderNumber: row.order_number,
  proposalId: row.proposal_id,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  installationAddress: row.installation_address,
  scheduledAt: row.scheduled_at,
  assignedTeam: row.assigned_team,
  materialStatus: row.material_status,
  roofType: row.roof_type,
  accessNotes: row.access_notes,
  electricalBoardNotes: row.electrical_board_notes,
  responsibleName: row.responsible_name,
  preparationNotes: row.preparation_notes,
  preparationCompletedAt: row.preparation_completed_at,
  proposal: row.sales_proposals || null,
});

export async function getInstallationPreparation(id) {
  const supabase = requireSupabase();
  const [orderResult, itemsResult, checklistResult] = await Promise.all([
    supabase.from('service_orders').select('*, sales_proposals(*)').eq('id', id).single(),
    supabase.from('service_order_items').select('*').eq('service_order_id', id).order('created_at'),
    supabase.from('service_order_checklist').select('*').eq('service_order_id', id).order('position'),
  ]);
  if (orderResult.error) throw new Error(orderResult.error.message);
  if (itemsResult.error) throw new Error(itemsResult.error.message);
  if (checklistResult.error) throw new Error(checklistResult.error.message);
  return { order: mapOrder(orderResult.data), items: itemsResult.data || [], checklist: checklistResult.data || [] };
}

export async function saveInstallationPreparation(id, input) {
  const supabase = requireSupabase();
  const payload = {
    scheduled_at: input.scheduledAt || null,
    installation_address: input.installationAddress?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim().toUpperCase() || 'SP',
    assigned_team: input.assignedTeam?.trim() || null,
    responsible_name: input.responsibleName?.trim() || null,
    material_status: input.materialStatus || 'Pendente',
    roof_type: input.roofType?.trim() || null,
    access_notes: input.accessNotes?.trim() || null,
    electrical_board_notes: input.electricalBoardNotes?.trim() || null,
    preparation_notes: input.preparationNotes?.trim() || null,
  };
  const { data, error } = await supabase.from('service_orders').update(payload).eq('id', id).select('*, sales_proposals(*)').single();
  if (error) throw new Error(error.message);
  return mapOrder(data);
}

export async function setMaterialReserved(itemId, reserved) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('service_order_items').update({ reserved }).eq('id', itemId).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function reserveAllMaterials(serviceOrderId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('service_order_items').update({ reserved: true }).eq('service_order_id', serviceOrderId).select('*');
  if (error) throw new Error(error.message);
  await supabase.from('service_orders').update({ material_status: 'Reservado' }).eq('id', serviceOrderId);
  return data || [];
}

export async function completeInstallationPreparation(serviceOrderId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('complete_service_order_preparation', { p_service_order_id: serviceOrderId });
  if (error) throw new Error(error.message);
  return mapOrder(data);
}
