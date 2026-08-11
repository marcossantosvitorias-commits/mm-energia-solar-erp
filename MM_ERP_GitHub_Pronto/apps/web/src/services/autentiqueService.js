import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

async function getSession() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configure o Supabase antes de usar o Autentique.');
  }
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) throw new Error('Entre novamente no ERP antes de usar o Autentique.');
  return sessionData.session;
}

function endpoint() {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/autentique-contract`;
}

const VALIDATION_MESSAGES = {
  field_required: 'campo obrigatório',
  must_be_a_valid_email_address: 'e-mail inválido',
  format_is_invalid: 'formato inválido',
  unavailable_credits: 'créditos/documentos do plano do Autentique indisponíveis',
  unavailable_verifications_credits: 'créditos de verificação insuficientes',
  without_permission: 'usuário sem permissão na organização do Autentique',
};

function autentiqueError(payload, fallback) {
  if (!payload) return fallback;
  if (payload.error && payload.error !== 'validation') return payload.error;

  const details = Array.isArray(payload.details) ? payload.details : [];
  const messages = [];
  details.forEach((item) => {
    const validation = item?.extensions?.validation || {};
    Object.entries(validation).forEach(([field, errors]) => {
      const list = Array.isArray(errors) ? errors : [errors];
      list.forEach((code) => {
        const translated = VALIDATION_MESSAGES[code] || String(code || '').replaceAll('_', ' ');
        messages.push(`${field}: ${translated}`);
      });
    });
  });

  if (messages.length) return `Autentique recusou o envio: ${messages.join('; ')}.`;
  if (payload.error === 'validation') {
    return 'Autentique recusou algum dado do envio. Confira e-mail, WhatsApp e disponibilidade do plano e tente novamente.';
  }
  return payload.error || fallback;
}

export async function sendContractToAutentique({ blob, fileName, contract, deliveryMethod }) {
  const session = await getSession();
  const form = new FormData();
  form.append('file', blob, fileName);
  form.append('name', `Contrato de energia solar - ${contract.clientName}`);
  form.append('clientName', contract.clientName || 'Cliente');
  form.append('clientEmail', contract.clientEmail || '');
  form.append('clientPhone', contract.clientPhone || '');
  form.append('clientDocument', contract.clientDocument || '');
  form.append('deliveryMethod', deliveryMethod);

  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: form,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(autentiqueError(payload, 'Não foi possível enviar o contrato ao Autentique.'));
  return payload;
}

export async function syncAutentiqueContracts({ limit = 60, pages = 20 } = {}) {
  const session = await getSession();
  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'list', limit, pages }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(autentiqueError(payload, 'Não foi possível buscar os contratos no Autentique.'));
  return payload;
}

export async function listStoredContracts() {
  await getSession();
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveLocalContract(contract) {
  await getSession();
  const payload = {
    external_id: contract.externalId || `erp-${crypto.randomUUID()}`,
    client_id: contract.clientId || null,
    client_name: contract.clientName || 'Cliente',
    client_document: contract.clientDocument || null,
    client_phone: contract.clientPhone || null,
    client_email: contract.clientEmail || null,
    title: contract.title || `Contrato de energia solar - ${contract.clientName || 'Cliente'}`,
    total_amount: Number(contract.totalValue || 0),
    amount_received: Number(contract.amountReceived || 0),
    amount_receivable: Number(contract.amountReceivable ?? contract.totalValue ?? 0),
    status: contract.status || 'rascunho',
    document_url: contract.documentUrl || null,
    source: 'ERP',
    notes: contract.notes || null,
    payload: {
      sistema: contract.systemDescription || '',
      endereco: contract.installationAddress || '',
      pagamento: contract.paymentTerms || '',
      components: contract.components || '',
    },
  };
  const { data, error } = await supabase
    .from('contracts')
    .upsert(payload, { onConflict: 'external_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data || null;
}
