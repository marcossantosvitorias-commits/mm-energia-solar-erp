import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { collectLocalErpData, markMigrationCompleted } from './localDataSafety.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function stableUuid(value) {
  const source = String(value || 'cliente-local').trim().toLowerCase();
  const words = [];

  for (let seed = 0; seed < 4; seed += 1) {
    let hash = (2166136261 ^ seed) >>> 0;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    words.push(hash.toString(16).padStart(8, '0'));
  }

  const hex = words.join('').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4];
  const normalized = hex.join('');

  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20, 32)}`;
}

function clientRow(item, userId) {
  const identity = item.id || item.document || item.documento || item.email || item.phone || item.telefone || item.name || item.nome;

  return {
    id: isUuid(item.id) ? item.id : stableUuid(identity),
    name: item.name || item.nome || 'Sem nome',
    document: item.document || item.documento || null,
    phone: item.phone || item.telefone || 'Não informado',
    email: item.email || null,
    city: item.city || item.cidade || null,
    state: item.state || item.estado || null,
    customer_type: item.customerType || item.customer_type || item.tipoCliente || 'residencial',
    status: item.status || 'lead',
    monthly_bill: Number(item.monthlyBill ?? item.monthly_bill ?? item.contaMedia ?? 0),
    notes: item.notes || item.observacoes || null,
    created_by: userId,
  };
}

function transactionRow(item, userId) {
  return {
    external_id: String(item.external_id || item.externalId || item.id || '').trim() || null,
    description: item.description || item.descricao || 'Lançamento importado',
    transaction_type: item.transaction_type || item.type || item.tipo || 'saida',
    category: item.category || item.categoria || 'Outros',
    amount: Math.abs(Number(item.amount ?? item.valor ?? 0)),
    transaction_date: normalizeDate(item.transaction_date || item.transactionDate || item.data),
    payment_method: item.payment_method || item.paymentMethod || item.formaPagamento || null,
    origin: item.origin || item.source || item.origem || 'Migração do navegador',
    notes: item.notes || item.observacoes || null,
    created_by: userId,
  };
}

function payableRow(item, userId) {
  return {
    external_id: String(item.external_id || item.externalId || item.id || '').trim() || null,
    description: item.description || item.descricao || 'Conta importada',
    supplier: item.supplier || item.supplierName || item.fornecedor || null,
    category: item.category || item.categoria || 'Fornecedor',
    amount: Math.abs(Number(item.amount ?? item.valor ?? 0)),
    due_date: normalizeDate(item.due_date || item.dueDate || item.vencimento),
    paid_date: normalizeDate(item.paid_date || item.paidDate || item.dataPagamento),
    status: item.status || 'pendente',
    origin: item.origin || item.source || item.origem || 'Migração do navegador',
    notes: item.notes || item.observacoes || null,
    created_by: userId,
  };
}

function receivableRow(item, userId) {
  return {
    external_id: String(item.external_id || item.externalId || item.id || '').trim() || null,
    description: item.description || item.descricao || 'Conta a receber importada',
    client_name: item.client_name || item.client || item.cliente || null,
    category: item.category || item.categoria || 'Venda de sistema solar',
    amount: Math.abs(Number(item.amount ?? item.valor ?? 0)),
    due_date: normalizeDate(item.due_date || item.dueDate || item.vencimento),
    received_date: normalizeDate(item.received_date || item.receivedDate || item.dataRecebimento),
    status: item.status || 'pendente',
    payment_method: item.payment_method || item.paymentMethod || item.formaPagamento || null,
    origin: item.origin || item.source || item.origem || 'Migração do navegador',
    notes: item.notes || item.observacoes || null,
    created_by: userId,
  };
}

function productRow(item, userId) {
  return {
    external_id: String(item.externalId || item.external_id || item.id || `${item.fornecedor || 'local'}-${item.marca || ''}-${item.modelo || ''}`),
    bling_id: item.blingId ? String(item.blingId) : null,
    sku: item.sku || null,
    product_type: item.tipo || item.product_type || 'Outro',
    brand: item.marca || item.brand || null,
    model: item.modelo || item.model || item.nome || 'Produto migrado',
    power_w: Number(item.potencia ?? item.power_w ?? 0),
    supplier: item.fornecedor || item.supplier || null,
    cost_price: Number(item.custo ?? item.cost_price ?? 0),
    sale_price: Number(item.precoVenda ?? item.sale_price ?? 0),
    stock_quantity: Number(item.estoque ?? item.stock_quantity ?? 0),
    warehouse: item.deposito || item.warehouse || null,
    ncm: item.ncm || null,
    unit: item.unidade || item.unit || 'UN',
    origin: item.origem || item.origin || 'Migração do navegador',
    created_by: userId,
  };
}

async function upsertBatch(table, rows, conflictColumn) {
  const validRows = rows.filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && value !== ''));
  if (!validRows.length) return { table, saved: 0 };

  const options = conflictColumn ? { onConflict: conflictColumn, ignoreDuplicates: true } : undefined;
  const { error } = await supabase.from(table).upsert(validRows, options);
  if (error) throw new Error(`${table}: ${error.message}`);
  return { table, saved: validRows.length };
}

export async function migrateLocalDataToSupabase() {
  if (!isSupabaseConfigured) throw new Error('Supabase ainda não está configurado no ERP.');

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Entre no ERP antes de migrar os dados.');

  const snapshot = collectLocalErpData();
  const local = snapshot.data;
  const userId = userData.user.id;

  const results = [];
  results.push(await upsertBatch('clients', asArray(local['mm-erp-clients']).map((item) => clientRow(item, userId)), 'id'));
  results.push(await upsertBatch('financial_transactions', asArray(local['mm-erp-movimentacoes-v2']).map((item) => transactionRow(item, userId)), 'external_id'));
  results.push(await upsertBatch('accounts_payable', asArray(local['mm-erp-contas-pagar-v2']).map((item) => payableRow(item, userId)), 'external_id'));
  results.push(await upsertBatch('accounts_receivable', asArray(local['mm-erp-contas-receber-v2']).map((item) => receivableRow(item, userId)), 'external_id'));

  const localProducts = [
    ...asArray(local['mm-erp-equipamentos-v1']),
    ...asArray(local['mm-erp-equipamentos-v2']),
  ];
  results.push(await upsertBatch('erp_products', localProducts.map((item) => productRow(item, userId)), 'external_id'));

  const summary = {
    exportedAt: snapshot.exportedAt,
    records: results.reduce((total, item) => total + item.saved, 0),
    tables: results,
    localDataPreserved: true,
  };

  markMigrationCompleted(summary);
  return summary;
}
