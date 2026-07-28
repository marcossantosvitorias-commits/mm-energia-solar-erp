import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

function ensureDatabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('O Supabase não está configurado nesta publicação.');
  }
}

export async function closeProposalAsSale(proposalId) {
  ensureDatabase();

  const { data: proposal, error: proposalError } = await supabase
    .from('sales_proposals')
    .update({ status: 'Venda Fechada' })
    .eq('id', proposalId)
    .select('*')
    .single();

  if (proposalError) throw proposalError;

  const { data: order, error: orderError } = await supabase
    .from('service_orders')
    .select('*')
    .eq('proposal_id', proposalId)
    .not('status', 'in', '(Concluída,Cancelada)')
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) {
    throw new Error('A venda foi fechada, mas a Ordem de Serviço não foi localizada. Verifique se a migration de automação foi aplicada.');
  }

  return { proposal, serviceOrder: order };
}

export async function reopenProposal(proposalId, status = 'Enviada') {
  ensureDatabase();
  const { data, error } = await supabase
    .from('sales_proposals')
    .update({ status })
    .eq('id', proposalId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function getProposalServiceOrder(proposalId) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('service_orders')
    .select('id, order_number, status, scheduled_at, customer_name')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}
