import { supabase } from '../lib/supabase.js';
import { requireSupabase } from './erpDatabaseService.js';

function dateBr(value) {
  if (!value) return '';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function dateIso(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [day, month, year] = String(value).split('/');
  return year ? `${year}-${month}-${day}` : value;
}

export const settingsDatabase = {
  async get(key, fallback = null) {
    requireSupabase();
    const { data, error } = await supabase.from('erp_settings').select('value').eq('key', key).maybeSingle();
    if (error) throw error;
    return data?.value ?? fallback;
  },

  async set(key, value, description = null) {
    requireSupabase();
    const { data, error } = await supabase
      .from('erp_settings')
      .upsert({ key, value, description }, { onConflict: 'key' })
      .select('*')
      .single();
    if (error) throw error;
    return data.value;
  },
};

export const quotesDatabase = {
  async list(supplier = null) {
    requireSupabase();
    let query = supabase.from('supplier_quotes').select('*').order('issue_date', { ascending: false });
    if (supplier) query = query.eq('supplier', supplier);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) => ({
      databaseId: row.id,
      id: row.quote_number,
      fornecedor: row.supplier,
      placas: Number(row.panels_count || 0),
      potencia: Number(row.system_power_kwp || 0),
      modulo: row.panel_model,
      inversores: Number(row.inverters_count || 0),
      inversor: row.inverter_model,
      estrutura: row.structure_description,
      produtos: Number(row.products_total || 0),
      frete: Number(row.freight || 0),
      total: Number(row.total || 0),
      emissao: dateBr(row.issue_date),
      validade: dateBr(row.valid_until),
      status: row.status,
      documentoUrl: row.document_url,
      ...row.payload,
    }));
  },

  async save(item) {
    requireSupabase();
    const payload = {
      quote_number: String(item.id || item.quoteNumber),
      supplier: item.fornecedor || item.supplier || 'Belenus',
      issue_date: dateIso(item.emissao || item.issueDate),
      valid_until: dateIso(item.validade || item.validUntil),
      panels_count: Number(item.placas || item.panelsCount || 0),
      system_power_kwp: Number(item.potencia || item.systemPowerKwp || 0),
      panel_model: item.modulo || item.panelModel || null,
      inverters_count: Number(item.inversores || item.invertersCount || 0),
      inverter_model: item.inversor || item.inverterModel || null,
      structure_description: item.estrutura || item.structureDescription || null,
      products_total: Number(item.produtos || item.productsTotal || 0),
      freight: Number(item.frete || item.freight || 0),
      total: Number(item.total || 0),
      status: item.status || 'ativa',
      document_url: item.documentoUrl || item.documentUrl || null,
      payload: item.payload || {},
    };
    const { data, error } = await supabase
      .from('supplier_quotes')
      .upsert(payload, { onConflict: 'quote_number' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
};

export const contractsDatabase = {
  async list() {
    requireSupabase();
    const { data, error } = await supabase.from('contracts').select('*').order('signed_date', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      externalId: row.external_id,
      clientId: row.client_id,
      cliente: row.client_name,
      documento: row.client_document,
      titulo: row.title,
      assinatura: row.signed_date,
      valorTotal: Number(row.total_amount || 0),
      recebido: Number(row.amount_received || 0),
      aReceber: Number(row.amount_receivable || 0),
      prazoLimite: row.installation_forecast,
      status: row.status,
      validacao: row.document_url,
      observacoes: row.notes,
      sistema: row.payload?.sistema || '',
      endereco: row.payload?.endereco || '',
      pagamento: row.payload?.pagamento || '',
    }));
  },

  async save(item) {
    requireSupabase();
    const payload = {
      external_id: String(item.externalId || item.id),
      client_id: item.clientId || null,
      client_name: item.cliente || item.clientName,
      client_document: item.documento || item.clientDocument || null,
      title: item.titulo || item.title || 'Contrato de energia solar',
      signed_date: item.assinatura || item.signedDate || null,
      total_amount: Number(item.valorTotal || item.totalAmount || 0),
      amount_received: Number(item.recebido || item.amountReceived || 0),
      amount_receivable: Number(item.aReceber || item.amountReceivable || 0),
      installation_forecast: item.prazoLimite || item.installationForecast || null,
      status: item.status || 'rascunho',
      document_url: item.validacao || item.documentUrl || null,
      notes: item.observacoes || item.notes || null,
      payload: {
        sistema: item.sistema || '',
        endereco: item.endereco || '',
        pagamento: item.pagamento || '',
        ...(item.payload || {}),
      },
    };
    const { data, error } = await supabase
      .from('contracts')
      .upsert(payload, { onConflict: 'external_id' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
};

export const proposalsDatabase = {
  async list() {
    requireSupabase();
    const { data, error } = await supabase.from('client_proposals').select('*').order('proposal_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async save(item) {
    requireSupabase();
    const payload = {
      external_id: String(item.externalId || item.id || crypto.randomUUID()),
      client_id: item.clientId || null,
      client_name: item.clientName || item.cliente || 'Cliente',
      supplier_quote_id: item.supplierQuoteId || null,
      proposal_date: item.proposalDate || new Date().toISOString().slice(0, 10),
      validity_days: Number(item.validityDays || 7),
      project_value: Number(item.projectValue || item.precoVenda || 0),
      discounted_value: Number(item.discountedValue || item.precoComDesconto || 0),
      financing_simulation: item.financingSimulation || {},
      calculation: item.calculation || {},
      status: item.status || 'rascunho',
      pdf_path: item.pdfPath || null,
    };
    const { data, error } = await supabase
      .from('client_proposals')
      .upsert(payload, { onConflict: 'external_id' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
};
