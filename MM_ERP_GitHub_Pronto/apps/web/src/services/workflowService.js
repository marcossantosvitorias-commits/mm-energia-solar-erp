import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

function ensureDatabase() {
  if (!isSupabaseConfigured || !supabase) throw new Error('O Supabase não está configurado nesta publicação.');
}

export async function listWorkflowBoards() {
  ensureDatabase();
  const { data, error } = await supabase
    .from('workflow_boards')
    .select('*')
    .eq('active', true)
    .order('created_at');
  if (error) throw error;
  return data || [];
}

export async function getWorkflowBoard(boardId) {
  ensureDatabase();
  const [{ data: board, error: boardError }, { data: columns, error: columnsError }, { data: cards, error: cardsError }] = await Promise.all([
    supabase.from('workflow_boards').select('*').eq('id', boardId).single(),
    supabase.from('workflow_columns').select('*').eq('board_id', boardId).order('position'),
    supabase.from('workflow_cards').select('*, clients(id,name,phone,city,state), sales_proposals(id,total_amount,status), service_orders(id,order_number,status)').eq('board_id', boardId).order('position'),
  ]);
  if (boardError) throw boardError;
  if (columnsError) throw columnsError;
  if (cardsError) throw cardsError;
  return { board, columns: columns || [], cards: cards || [] };
}

export async function createWorkflowCard(boardId, columnId, card) {
  ensureDatabase();
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('workflow_cards')
    .insert({
      board_id: boardId,
      column_id: columnId,
      client_id: card.clientId || null,
      proposal_id: card.proposalId || null,
      service_order_id: card.serviceOrderId || null,
      title: card.title.trim(),
      description: card.description?.trim() || null,
      priority: card.priority || 'normal',
      due_at: card.dueAt || null,
      position: Number(card.position || Date.now()),
      metadata: card.metadata || {},
      created_by: authData?.user?.id || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function moveWorkflowCard(cardId, columnId, position = Date.now()) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('workflow_cards')
    .update({ column_id: columnId, position })
    .eq('id', cardId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorkflowCard(cardId, changes) {
  ensureDatabase();
  const payload = {};
  if (changes.title !== undefined) payload.title = changes.title.trim();
  if (changes.description !== undefined) payload.description = changes.description?.trim() || null;
  if (changes.priority !== undefined) payload.priority = changes.priority;
  if (changes.dueAt !== undefined) payload.due_at = changes.dueAt || null;
  if (changes.assignedUserId !== undefined) payload.assigned_user_id = changes.assignedUserId || null;
  if (changes.metadata !== undefined) payload.metadata = changes.metadata || {};
  const { data, error } = await supabase.from('workflow_cards').update(payload).eq('id', cardId).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteWorkflowCard(cardId) {
  ensureDatabase();
  const { error } = await supabase.from('workflow_cards').delete().eq('id', cardId);
  if (error) throw error;
}

export async function listWorkflowCardHistory(cardId) {
  ensureDatabase();
  const { data, error } = await supabase
    .from('workflow_card_history')
    .select('*, from_column:workflow_columns!workflow_card_history_from_column_id_fkey(name), to_column:workflow_columns!workflow_card_history_to_column_id_fkey(name)')
    .eq('card_id', cardId)
    .order('moved_at', { ascending: false });
  if (error) throw error;
  return data || [];
}