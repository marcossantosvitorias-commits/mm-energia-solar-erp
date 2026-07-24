import pb, { isPocketBaseConfigured } from '../lib/pocketbase.js';

const PAGE_SIZE = 500;

function ensureDatabase() {
  if (!isPocketBaseConfigured) {
    throw new Error('O banco central ainda não está configurado. Informe VITE_POCKETBASE_URL na Hostinger.');
  }
}

function toPocketBaseDate(value) {
  if (!value) return '';
  if (String(value).includes(' ')) return value;
  return `${value} 00:00:00.000Z`;
}

function transactionPayload(item) {
  return {
    externalId: String(item.externalId || item.id || '').trim(),
    description: item.description || item.descricao || '',
    type: item.type || item.tipo || 'saida',
    category: item.category || item.categoria || 'Outros',
    amount: Number(item.amount ?? item.valor ?? 0),
    transactionDate: toPocketBaseDate(item.transactionDate || item.data),
    paymentMethod: item.paymentMethod || item.formaPagamento || '',
    bankAccount: item.bankAccount || 'Santander',
    source: item.source || item.origem || 'Cadastro manual',
    fitid: item.fitid || '',
    client: item.client || '',
    supplier: item.supplier || '',
    notes: item.notes || item.observacoes || '',
    createdBy: pb.authStore.record?.id || '',
  };
}

function payablePayload(item) {
  return {
    externalId: String(item.externalId || item.id || '').trim(),
    description: item.description || item.descricao || '',
    supplierName: item.supplierName || item.fornecedor || '',
    supplier: item.supplier || '',
    category: item.category || item.categoria || 'Fornecedor',
    amount: Number(item.amount ?? item.valor ?? 0),
    dueDate: toPocketBaseDate(item.dueDate || item.vencimento),
    paidDate: toPocketBaseDate(item.paidDate || item.dataPagamento),
    status: item.status || 'pendente',
    paymentMethod: item.paymentMethod || item.formaPagamento || '',
    source: item.source || item.origem || 'Cadastro manual',
    notes: item.notes || item.observacoes || '',
    createdBy: pb.authStore.record?.id || '',
  };
}

function receivablePayload(item) {
  return {
    externalId: String(item.externalId || item.id || '').trim(),
    description: item.description || item.descricao || '',
    clientName: item.clientName || item.cliente || '',
    client: item.client || '',
    category: item.category || item.categoria || 'Venda de sistema solar',
    amount: Number(item.amount ?? item.valor ?? 0),
    dueDate: toPocketBaseDate(item.dueDate || item.vencimento),
    receivedDate: toPocketBaseDate(item.receivedDate || item.dataRecebimento),
    status: item.status || 'pendente',
    paymentMethod: item.paymentMethod || item.formaPagamento || '',
    source: item.source || item.origem || 'Cadastro manual',
    notes: item.notes || item.observacoes || '',
    createdBy: pb.authStore.record?.id || '',
  };
}

async function listAll(collection, sort) {
  ensureDatabase();
  return pb.collection(collection).getFullList({ batch: PAGE_SIZE, sort });
}

async function upsertByExternalId(collection, item, payloadBuilder) {
  ensureDatabase();
  const payload = payloadBuilder(item);

  if (!payload.externalId) {
    throw new Error('O lançamento não possui um identificador único.');
  }

  try {
    const existing = await pb.collection(collection).getFirstListItem(
      `externalId = "${payload.externalId.replaceAll('"', '\\"')}"`,
    );
    return await pb.collection(collection).update(existing.id, payload);
  } catch (error) {
    if (error?.status && error.status !== 404) throw error;
    return pb.collection(collection).create(payload);
  }
}

async function importMany(collection, items, payloadBuilder) {
  const result = { saved: 0, failed: 0, errors: [] };

  for (const item of items) {
    try {
      await upsertByExternalId(collection, item, payloadBuilder);
      result.saved += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({ id: item.id || item.externalId, message: error?.message || 'Erro desconhecido' });
    }
  }

  return result;
}

export const financeDatabase = {
  listTransactions: () => listAll('financial_transactions', '-transactionDate'),
  saveTransaction: (item) => upsertByExternalId('financial_transactions', item, transactionPayload),
  importTransactions: (items) => importMany('financial_transactions', items, transactionPayload),
  deleteTransaction: (id) => pb.collection('financial_transactions').delete(id),

  listPayables: () => listAll('accounts_payable', 'dueDate'),
  savePayable: (item) => upsertByExternalId('accounts_payable', item, payablePayload),
  importPayables: (items) => importMany('accounts_payable', items, payablePayload),
  deletePayable: (id) => pb.collection('accounts_payable').delete(id),

  listReceivables: () => listAll('accounts_receivable', 'dueDate'),
  saveReceivable: (item) => upsertByExternalId('accounts_receivable', item, receivablePayload),
  importReceivables: (items) => importMany('accounts_receivable', items, receivablePayload),
  deleteReceivable: (id) => pb.collection('accounts_receivable').delete(id),

  registerImport: (data) => {
    ensureDatabase();
    return pb.collection('data_imports').create({
      fileName: data.fileName,
      fileType: data.fileType,
      checksum: data.checksum,
      importedRecords: Number(data.importedRecords || 0),
      duplicateRecords: Number(data.duplicateRecords || 0),
      ignoredRecords: Number(data.ignoredRecords || 0),
      status: data.status || 'concluida',
      details: data.details || {},
      createdBy: pb.authStore.record?.id || '',
    });
  },
};
