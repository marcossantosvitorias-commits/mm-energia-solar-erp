import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

export async function sendContractToAutentique({ blob, fileName, contract, deliveryMethod }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configure o Supabase antes de enviar contratos ao Autentique.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) throw new Error('Entre novamente no ERP antes de enviar o contrato.');

  const form = new FormData();
  form.append('file', blob, fileName);
  form.append('name', `Contrato de energia solar - ${contract.clientName}`);
  form.append('clientName', contract.clientName || 'Cliente');
  form.append('clientEmail', contract.clientEmail || '');
  form.append('clientPhone', contract.clientPhone || '');
  form.append('clientDocument', contract.clientDocument || '');
  form.append('deliveryMethod', deliveryMethod);

  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/autentique-contract`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: form,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Não foi possível enviar o contrato ao Autentique.');
  return payload;
}
