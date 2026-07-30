import { requireSupabase } from '../lib/supabase';
import { getServiceOrder, listServiceOrderChecklist, listServiceOrderPhotos, listServiceOrderSignatures } from './serviceOrderService.js';

export async function loadInstallationCompletion(orderId) {
  const [order, checklist, photos, signatures] = await Promise.all([
    getServiceOrder(orderId),
    listServiceOrderChecklist(orderId),
    listServiceOrderPhotos(orderId),
    listServiceOrderSignatures(orderId),
  ]);
  return { order, checklist, photos, signatures };
}

export async function finalizeInstallation(orderId, data, position) {
  const supabase = requireSupabase();
  const { data: result, error } = await supabase.rpc('finalize_service_order_mobile', {
    p_service_order_id: orderId,
    p_data: data,
    p_latitude: position?.latitude || null,
    p_longitude: position?.longitude || null,
    p_accuracy_m: position?.accuracy || null,
  });
  if (error) throw new Error(error.message);
  return result;
}

export function buildTechnicalReportData(order, form, checklist, photos, signatures) {
  return {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    address: `${order.installationAddress || ''} - ${order.city || ''}/${order.state || ''}`,
    scheduledAt: order.scheduledAt,
    completedAt: new Date().toISOString(),
    team: order.assignedTeam,
    system: order.proposal,
    tests: form,
    checklist,
    photos,
    signatures,
  };
}