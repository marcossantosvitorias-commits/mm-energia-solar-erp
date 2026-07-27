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
  if (!response.ok) throw new Error(payload.error || 'Não foi possível enviar o contrato ao Autentique.');
  return payload;
}

export async function listAutentiqueContracts({ limit = 60, pages = 10 } = {}) {
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
  if (!response.ok) throw new Error(payload.error || 'Não foi possível buscar os contratos no Autentique.');
  return payload.documents || [];
}