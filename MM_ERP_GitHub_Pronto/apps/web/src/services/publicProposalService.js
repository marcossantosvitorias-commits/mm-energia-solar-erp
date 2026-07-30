import { requireSupabase } from '../lib/supabase';

export async function getPublicProposal(token) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('get_public_sales_proposal', { p_token: token });
  if (error) throw new Error(error.message || 'Não foi possível abrir a proposta.');
  return data;
}

export async function acceptPublicProposal(token, { name, document }) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('accept_public_sales_proposal', {
    p_token: token,
    p_name: name?.trim(),
    p_document: document?.trim() || null,
    p_user_agent: navigator.userAgent || null,
  });
  if (error) throw new Error(error.message || 'Não foi possível aceitar a proposta.');
  return data;
}

export function buildPublicProposalUrl(token) {
  return `${window.location.origin}/proposta/${token}`;
}
