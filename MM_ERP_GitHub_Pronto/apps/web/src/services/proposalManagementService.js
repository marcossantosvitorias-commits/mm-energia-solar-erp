import { requireSupabase } from '../lib/supabase';

export async function listSalesProposals() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('sales_proposals')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getSalesProposal(id) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('sales_proposals')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSalesProposal(id, changes) {
  const supabase = requireSupabase();
  const payload = {
    ...changes,
    total_amount: Number(changes.total_amount || 0),
    discount_amount: Number(changes.discount_amount || 0),
    panel_count: Number(changes.panel_count || 0),
    panel_power_w: changes.panel_power_w ? Number(changes.panel_power_w) : null,
    system_power_kw: changes.system_power_kw ? Number(changes.system_power_kw) : null,
    monthly_generation_kwh: changes.monthly_generation_kwh ? Number(changes.monthly_generation_kwh) : null,
    validity_days: Number(changes.validity_days || 7),
    installment_count: changes.installment_count ? Number(changes.installment_count) : null,
    installment_amount: changes.installment_amount ? Number(changes.installment_amount) : null,
  };
  const { data, error } = await supabase
    .from('sales_proposals')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  const version = await supabase.rpc('save_sales_proposal_version', { p_proposal_id: id });
  if (version.error) throw new Error(version.error.message);
  return data;
}

export async function markProposalAsSent(id) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('sales_proposals')
    .update({ status: 'Enviada', sent_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProposalStatus(id, status) {
  const timestamps = {
    Aceita: { accepted_at: new Date().toISOString(), rejected_at: null },
    Recusada: { rejected_at: new Date().toISOString(), accepted_at: null },
  };
  return updateSalesProposal(id, { status, ...(timestamps[status] || {}) });
}

export async function listProposalVersions(proposalId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('sales_proposal_versions')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('version_number', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function deleteSalesProposal(id) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('sales_proposals').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
