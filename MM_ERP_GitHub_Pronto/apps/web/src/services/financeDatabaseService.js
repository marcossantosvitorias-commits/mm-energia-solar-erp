import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

function ensureDatabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('O banco central ainda não está configurado. Informe VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente de publicação.');
  }
}

function scopeOf(item) {
  return item.scope || item.escopo || 'company';
}

function transactionPayload(item) {
  return {
    external_id: String(item.externalId || item.id || '').trim() || null,
    description: item.description || item.descricao || '',
    transaction_type: item.type || item.tipo || 'saida',
    category: item.category || item.categoria || 'Outros',
    amount: Number(item.amount ?? item.valor ?? 0),
    transaction_date: item.transactionDate || item.data,
    payment_method: item.paymentMethod || item.formaPagamento || null,
    origin: item.source || item.origem || 'Cadastro manual',
    notes: item.notes || item.observacoes || null,
    scope: scopeOf(item),
  };
}

function payablePayload(item) {
  return {
    external_id: String(item.externalId || item.id || '').trim() || null,
    description: item.description || item.descricao || '',
    supplier: item.supplierName || item.fornecedor || null,
    category: item.category || item.categoria || 'Fornecedor',
    amount: Number(item.amount ?? item.valor ?? 0),
    due_date: item.dueDate || item.vencimento,
    paid_date: item.paidDate || item.dataPagamento || null,
    status: item.status || 'pendente',
    origin: item.source || item.origem || 'Cadastro manual',
    notes: item.notes || item.observacoes || null,
    scope: scopeOf(item),
  };
}

function receivablePayload(item) {
  return {
    external_id: String(item.externalId || item.id || '').trim() || null,
    description: item.description || item.descricao || '',
    client_name: item.client || item.cliente || null,
    category: item.category || item.categoria || 'Venda de sistema solar',
    amount: Number(item.amount ?? item.valor ?? 0),
    due_date: item.dueDate || item.vencimento,
    received_date: item.receivedDate || item.dataRecebimento || null,
    status: item.status || 'pendente',
    payment_method: item.paymentMethod || item.formaPagamento || null,
    origin: item.source || item.origem || 'Cadastro manual',
    notes: item.notes || item.observacoes || null,
    scope: scopeOf(item),
  };
}

async function listAll(table, orderColumn, ascending = false, scope = 'company') {
  ensureDatabase();
  let query = supabase.from(table).select('*').order(orderColumn, { ascending });
  if (scope) query = query.eq('scope', scope);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function upsertByExternalId(table, item, payloadBuilder) {
  ensureDatabase();
  const payload = payloadBuilder(item);

  if (!payload.external_id) {
    const { data, error } = await supabase.from(table).insert(payload).select('*').single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from(table)
    .upsert(payload, { onConflict: 'external_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function importMany(table, items, payloadBuilder) {
  ensureDatabase();
  const result = { saved: 0, failed: 0, errors: [] };

  for (const item of items) {
    try {
      await upsertByExternalId(table, item, payloadBuilder);
      result.saved += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({ id: item.id || item.externalId, message: error?.message || 'Erro desconhecido' });
    }
  }

  return result;
}

async function remove(table, id) {
  ensureDatabase();
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export const financeDatabase = {
  listTransactions: (scope = 'company') => listAll('financial_transactions', 'transaction_date', false, scope),
  saveTransaction: (item) => upsertByExternalId('financial_transactions', item, transactionPayload),
  importTransactions: (items) => importMany('financial_transactions', items, transactionPayload),
  deleteTransaction: (id) => remove('financial_transactions', id),

  listPayables: (scope = 'company') => listAll('accounts_payable', 'due_date', true, scope),
  savePayable: (item) => upsertByExternalId('accounts_payable', item, payablePayload),
  importPayables: (items) => importMany('accounts_payable', items, payablePayload),
  deletePayable: (id) => remove('accounts_payable', id),

  listReceivables: (scope = 'company') => listAll('accounts_receivable', 'due_date', true, scope),
  saveReceivable: (item) => upsertByExternalId('accounts_receivable', item, receivablePayload),
  importReceivables: (items) => importMany('accounts_receivable', items, receivablePayload),
  deleteReceivable: (id) => remove('accounts_receivable', id),

  async registerImport(data) {
    ensureDatabase();
    const { data: record, error } = await supabase
      .from('data_imports')
      .insert({
        file_name: data.fileName,
        file_type: data.fileType,
        imported_count: Number(data.importedRecords || 0),
        duplicate_count: Number(data.duplicateRecords || 0),
        ignored_count: Number(data.ignoredRecords || 0),
      })
      .select('*')
      .single();

    if (error) throw error;
    return record;
  },
};
