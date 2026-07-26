import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { clearLocalErpData, collectLocalErpData, KNOWN_KEYS } from './localDataSafety.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function withoutUndefined(row) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

function clientRow(item, userId) {
  return withoutUndefined({
    id: /^[0-9a-f-]{36}$/i.test(item.id || '') ? item.id : undefined,
    name: item.name || item.nome || 'Sem nome',
    document: item.document || item.documento || null,
    phone: item.phone || item.telefone || 'Não informado',
    email: item.email || null,
    address: item.address || item.endereco || null,
    zip_code: item.zipCode || item.zip_code || item.cep || null,
    city: item.city || item.cidade || null,
    state: item.state || item.estado || null,
    customer_type: item.customerType || item.customer_type || item.tipoCliente || 'residencial',
    status: item.status || 'lead',
    monthly_bill: Number(item.monthlyBill ?? item.monthly_bill ?? item.contaMedia ?? 0),
    notes: item.notes || item.observacoes || null,
    created_by: userId,
  });
}

function transactionRow(item, userId, scope = 'company') {
  return {
    external_id: String(item.external_id || item.externalId || item.id || crypto.randomUUID()),
    description: item.description || item.descricao || 'Lançamento importado',
    transaction_type: item.transaction_type || item.type || item.tipo || 'saida',
    category: item.category || item.categoria || 'Outros',
    amount: Math.abs(Number(item.amount ?? item.valor ?? 0)),
    transaction_date: normalizeDate(item.transaction_date || item.transactionDate || item.data) || new Date().toISOString().slice(0, 10),
    payment_method: item.payment_method || item.paymentMethod || item.formaPagamento || null,
    origin: item.origin || item.source || item.origem || 'Migração do navegador',
    notes: item.notes || item.observacoes || null,
    scope,
    created_by: userId,
  };
}

function payableRow(item, userId) {
  return {
    external_id: String(item.external_id || item.externalId || item.id || crypto.randomUUID()),
    description: item.description || item.descricao || 'Conta importada',
    supplier: item.supplier || item.supplierName || item.fornecedor || null,
    category: item.category || item.categoria || 'Fornecedor',
    amount: Math.abs(Number(item.amount ?? item.valor ?? 0)),
    due_date: normalizeDate(item.due_date || item.dueDate || item.vencimento) || new Date().toISOString().slice(0, 10),
    paid_date: normalizeDate(item.paid_date || item.paidDate || item.dataPagamento),
    status: item.status || 'pendente',
    origin: item.origin || item.source || item.origem || 'Migração do navegador',
    notes: item.notes || item.observacoes || null,
    scope: 'company',
    created_by: userId,
  };
}

function receivableRow(item, userId) {
  return {
    external_id: String(item.external_id || item.externalId || item.id || crypto.randomUUID()),
    description: item.description || item.descricao || 'Conta a receber importada',
    client_name: item.client_name || item.clientName || item.client || item.cliente || null,
    category: item.category || item.categoria || 'Venda de sistema solar',
    amount: Math.abs(Number(item.amount ?? item.valor ?? 0)),
    due_date: normalizeDate(item.due_date || item.dueDate || item.vencimento) || new Date().toISOString().slice(0, 10),
    received_date: normalizeDate(item.received_date || item.receivedDate || item.dataRecebimento),
    status: item.status || 'pendente',
    payment_method: item.payment_method || item.paymentMethod || item.formaPagamento || null,
    origin: item.origin || item.source || item.origem || 'Migração do navegador',
    notes: item.notes || item.observacoes || null,
    scope: 'company',
    created_by: userId,
  };
}

function productRow(item, userId) {
  return {
    external_id: String(item.externalId || item.id || `${item.fornecedor || 'local'}-${item.marca || ''}-${item.modelo || ''}`),
    bling_id: item.blingId ? String(item.blingId) : null,
    sku: item.sku || null,
    product_type: item.tipo || 'Outro',
    brand: item.marca || null,
    model: item.modelo || item.nome || 'Produto migrado',
    power_w: Number(item.potencia || 0),
    supplier: item.fornecedor || null,
    cost_price: Number(item.custo || 0),
    sale_price: Number(item.precoVenda || 0),
    stock_quantity: Number(item.estoque || 0),
    warehouse: item.deposito || null,
    ncm: item.ncm || null,
    unit: item.unidade || 'UN',
    origin: item.origem || 'Migração do navegador',
    created_by: userId,
  };
}

function contractRow(item, userId) {
  return {
    external_id: String(item.externalId || item.id || crypto.randomUUID()),
    client_name: item.cliente || item.clientName || 'Cliente',
    client_document: item.documento || item.clientDocument || null,
    title: item.titulo || item.title || 'Contrato de energia solar',
    signed_date: normalizeDate(item.assinatura || item.signedDate),
    total_amount: Number(item.valorTotal || item.totalAmount || 0),
    amount_received: Number(item.recebido || item.amountReceived || 0),
    amount_receivable: Number(item.aReceber || item.amountReceivable || 0),
    installation_forecast: normalizeDate(item.prazoLimite || item.installationForecast),
    status: item.status || 'rascunho',
    document_url: item.validacao || item.documentUrl || null,
    notes: item.observacoes || item.notes || null,
    payload: {
      sistema: item.sistema || '',
      endereco: item.endereco || '',
      pagamento: item.pagamento || '',
    },
    created_by: userId,
  };
}

function quoteRow(item, userId) {
  return {
    quote_number: String(item.id || item.quoteNumber || crypto.randomUUID()),
    supplier: item.fornecedor || item.supplier || 'Belenus',
    issue_date: normalizeDate(item.emissao || item.issueDate),
    panels_count: Number(item.placas || item.panelsCount || 0),
    system_power_kwp: Number(item.potencia || item.systemPowerKwp || 0),
    panel_model: item.modulo || item.panelModel || null,
    inverters_count: Number(item.inversores || item.invertersCount || 0),
    inverter_model: item.inversor || item.inverterModel || null,
    structure_description: item.estrutura || null,
    products_total: Number(item.produtos || 0),
    freight: Number(item.frete || 0),
    total: Number(item.total || 0),
    status: item.status || 'ativa',
    created_by: userId,
  };
}

async function upsertBatch(table, rows, conflictColumn) {
  const validRows = rows.map(withoutUndefined).filter((row) => Object.values(row).some((value) => value !== null && value !== ''));
  if (!validRows.length) return { table, saved: 0 };

  for (let index = 0; index < validRows.length; index += 500) {
    const chunk = validRows.slice(index, index + 500);
    const options = conflictColumn ? { onConflict: conflictColumn } : undefined;
    const { error } = await supabase.from(table).upsert(chunk, options);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  return { table, saved: validRows.length };
}

async function migrateClients(items, userId) {
  let saved = 0;
  for (const item of items) {
    const row = clientRow(item, userId);
    let existingId = null;
    if (row.document) {
      const { data, error } = await supabase.from('clients').select('id').eq('document', row.document).limit(1).maybeSingle();
      if (error) throw new Error(`clients: ${error.message}`);
      existingId = data?.id || null;
    }
    const query = existingId
      ? supabase.from('clients').update(row).eq('id', existingId)
      : supabase.from('clients').insert(row);
    const { error } = await query;
    if (error) throw new Error(`clients: ${error.message}`);
    saved += 1;
  }
  return { table: 'clients', saved };
}

const CONTROL_KEY_PARTS = ['temporary-session', 'notificacao-boletos', 'carga-santander', 'supabase-migration'];

export async function migrateLocalDataToSupabase({ clearAfterSuccess = true } = {}) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase ainda não está configurado no ERP.');

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Entre no ERP com sua conta Supabase antes de migrar os dados.');

  const snapshot = collectLocalErpData();
  const local = snapshot.data;
  const userId = userData.user.id;
  const results = [];

  results.push(await migrateClients(asArray(local['mm-erp-clients']), userId));
  results.push(await upsertBatch('financial_transactions', asArray(local['mm-erp-movimentacoes-v2']).map((item) => transactionRow(item, userId, 'company')), 'external_id'));
  results.push(await upsertBatch('financial_transactions', asArray(local['mm-erp-marcos-v2']).map((item) => transactionRow(item, userId, 'personal-marcos')), 'external_id'));
  results.push(await upsertBatch('accounts_payable', asArray(local['mm-erp-contas-pagar-v2']).map((item) => payableRow(item, userId)), 'external_id'));
  results.push(await upsertBatch('accounts_receivable', asArray(local['mm-erp-contas-receber-v2']).map((item) => receivableRow(item, userId)), 'external_id'));

  const products = [
    ...asArray(local['mm-erp-equipamentos-v1']),
    ...asArray(local['mm-erp-equipamentos-v2']),
  ];
  results.push(await upsertBatch('erp_products', products.map((item) => productRow(item, userId)), 'external_id'));
  results.push(await upsertBatch('contracts', asArray(local['mm-erp-contratos-v1']).map((item) => contractRow(item, userId)), 'external_id'));
  results.push(await upsertBatch('supplier_quotes', asArray(local['mm-erp-belenus-cotacoes']).map((item) => quoteRow(item, userId)), 'quote_number'));

  const personalSettings = [
    ['belenus_pricing', local['mm-erp-cotacoes-belenus-config-v1']],
    ['tax_simulator', local['mm-erp-tributos-v2']],
  ].filter(([, value]) => value !== undefined && value !== null);
  results.push(await upsertBatch('erp_settings', personalSettings.map(([key, value]) => ({ key, value, updated_by: userId })), 'key'));

  const belcredRows = asArray(local['mm-erp-belcred-simulacoes']).map((item) => ({
    client_id: item.clientId || null,
    project_value: Number(item.projectValue || item.valor || 0),
    simulation: item.simulation || item.simulacao || item,
    created_by: userId,
  }));
  results.push(await upsertBatch('belcred_simulations', belcredRows));

  const unknownEntries = Object.entries(local).filter(([key]) =>
    !KNOWN_KEYS.includes(key) && !CONTROL_KEY_PARTS.some((part) => key.includes(part))
  );
  results.push(await upsertBatch('erp_module_records', unknownEntries.map(([key, value]) => ({
    module: 'legacy-browser-data',
    external_id: key,
    payload: { value, migratedAt: new Date().toISOString() },
    created_by: userId,
  })), 'module,external_id'));

  const summary = {
    exportedAt: snapshot.exportedAt,
    completedAt: new Date().toISOString(),
    records: results.reduce((total, item) => total + item.saved, 0),
    tables: results,
    localKeysRemoved: 0,
  };

  const { error: statusError } = await supabase.from('erp_settings').upsert({
    key: 'browser_data_migration',
    value: summary,
    description: 'Resultado da migração única do armazenamento local para o Supabase.',
    updated_by: userId,
  }, { onConflict: 'key' });
  if (statusError) throw new Error(`erp_settings: ${statusError.message}`);

  const { error: importError } = await supabase.from('data_imports').insert({
    file_name: 'armazenamento-local-do-navegador',
    file_type: 'browser-migration',
    imported_count: summary.records,
    imported_by: userId,
  });
  if (importError) throw new Error(`data_imports: ${importError.message}`);

  if (clearAfterSuccess) summary.localKeysRemoved = clearLocalErpData().length;
  return summary;
}
