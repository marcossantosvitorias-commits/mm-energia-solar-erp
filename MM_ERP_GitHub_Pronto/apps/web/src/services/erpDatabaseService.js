import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

export function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
  }
}

async function upsertMany(table, rows, conflict = 'external_id') {
  requireSupabase();
  if (!rows.length) return { saved: 0 };
  const { data, error } = await supabase.from(table).upsert(rows, { onConflict: conflict }).select('id');
  if (error) throw error;
  return { saved: data?.length || rows.length };
}

export const productsDatabase = {
  async list() {
    requireSupabase();
    const { data, error } = await supabase.from('erp_products').select('*').eq('active', true).order('model');
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id, externalId: row.external_id, blingId: row.bling_id, sku: row.sku,
      tipo: row.product_type, marca: row.brand, modelo: row.model,
      potencia: Number(row.power_w || 0), fornecedor: row.supplier,
      custo: Number(row.cost_price || 0), precoVenda: Number(row.sale_price || 0),
      estoque: Number(row.stock_quantity || 0), deposito: row.warehouse,
      ncm: row.ncm, unidade: row.unit, origem: row.origin,
      atualizadoEm: row.updated_at ? new Date(row.updated_at).toLocaleDateString('pt-BR') : null,
    }));
  },
  saveMany(items) {
    return upsertMany('erp_products', items.map((item) => ({
      external_id: String(item.externalId || item.id),
      bling_id: item.blingId ? String(item.blingId) : null,
      sku: item.sku || null, product_type: item.tipo || 'Outro',
      brand: item.marca || null, model: item.modelo || item.nome || 'Produto',
      power_w: Number(item.potencia || 0), supplier: item.fornecedor || null,
      cost_price: Number(item.custo || 0), sale_price: Number(item.precoVenda || 0),
      stock_quantity: Number(item.estoque || 0), warehouse: item.deposito || null,
      ncm: item.ncm || null, unit: item.unidade || 'UN', origin: item.origem || 'ERP',
    })));
  },
  async remove(id) {
    requireSupabase();
    const { error } = await supabase.from('erp_products').delete().eq('id', id);
    if (error) throw error;
  },
};

export const blingDatabase = {
  contacts(items) {
    return upsertMany('bling_contacts', items.map((x) => ({
      external_id: String(x.blingId || x.id), name: x.nome || 'Contato',
      trade_name: x.fantasia || null, document: x.documento || null,
      phone: x.telefone || null, email: x.email || null,
      address: { endereco: x.endereco, numero: x.numero, bairro: x.bairro, cep: x.cep, cidade: x.cidade, estado: x.estado },
      contact_type: x.tipoContato || null, status: x.situacao || null, raw_data: x,
    })));
  },
  products: (items) => productsDatabase.saveMany(items),
  async stock(items) {
    requireSupabase();
    let saved = 0;
    for (const x of items) {
      let query = supabase.from('erp_products').update({
        stock_quantity: Number(x.estoque || 0), cost_price: Number(x.custo || 0), warehouse: x.deposito || null,
      });
      query = x.blingId ? query.eq('bling_id', String(x.blingId)) : query.eq('sku', x.sku);
      const { error } = await query;
      if (error) throw error;
      saved += 1;
    }
    return { saved };
  },
  purchases(items) {
    return upsertMany('purchase_orders', items.map((x) => ({
      external_id: String(x.id), order_number: x.numero, order_date: x.data,
      supplier: x.fornecedor, status: x.situacao, total: Number(x.quantidade || 0) * Number(x.valorUnitario || 0),
      items: [x], origin: 'Bling',
    })));
  },
  sales(items) {
    return upsertMany('sales_orders', items.map((x) => ({
      external_id: String(x.id), order_number: x.numero, order_date: x.data,
      client_name: x.cliente, client_document: x.documento, total: Number(x.total || 0),
      payment_method: x.pagamento, seller: x.vendedor, items: [x], origin: 'Bling',
    })));
  },
  async registerImport(fileName, fileType, count) {
    requireSupabase();
    const { error } = await supabase.from('data_imports').insert({
      file_name: fileName, file_type: fileType, imported_count: count,
    });
    if (error) throw error;
  },
};

export const moduleDatabase = {
  async list(module) {
    requireSupabase();
    const { data, error } = await supabase.from('erp_module_records').select('*').eq('module', module).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((x) => ({ id: x.id, externalId: x.external_id, ...x.payload }));
  },
  save(module, item) {
    return upsertMany('erp_module_records', [{
      module, external_id: String(item.externalId || item.id || crypto.randomUUID()), payload: item,
    }], 'module,external_id');
  },
  saveMany(module, items) {
    return upsertMany('erp_module_records', items.map((item) => ({
      module,
      external_id: String(item.externalId || item.id || crypto.randomUUID()),
      payload: item,
    })), 'module,external_id');
  },
  async remove(module, id) {
    requireSupabase();
    const { error } = await supabase.from('erp_module_records').delete().eq('module', module).eq('id', id);
    if (error) throw error;
  },
  async replace(module, items) {
    requireSupabase();
    const { error } = await supabase.from('erp_module_records').delete().eq('module', module);
    if (error) throw error;
    return this.saveMany(module, items);
  },
};
