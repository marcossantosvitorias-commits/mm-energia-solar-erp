import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizePhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return `+${digits.startsWith('55') ? digits : `55${digits}`}`;
}

function clean(value: unknown) {
  return String(value || '').trim();
}

function latest(values: Array<string | undefined | null>) {
  return values.filter(Boolean).sort().at(-1) || null;
}

function friendlyAutentiqueError(message: string) {
  if (/Cannot query field/i.test(message)) return 'A integração solicitou um campo que a API do Autentique não disponibiliza. A consulta precisa ser atualizada.';
  return message || 'O Autentique recusou a solicitação.';
}

async function autentiqueRequest(token: string, query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch('https://api.autentique.com.br/v2/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const result = await response.json();
  if (!response.ok || result.errors?.length) {
    const raw = result.errors?.map((item: { message?: string }) => item.message).filter(Boolean).join(' | ') || '';
    throw new Error(friendlyAutentiqueError(raw));
  }
  return result.data;
}

async function findClient(supabase: ReturnType<typeof createClient>, signer: Record<string, any>) {
  const document = clean(signer.document || signer.cpf || signer.user?.document);
  const email = clean(signer.email || signer.user?.email).toLowerCase();
  const phone = normalizePhone(signer.phone || signer.user?.phone || '');

  if (document) {
    const { data } = await supabase.from('clients').select('*').eq('document', document).limit(1).maybeSingle();
    if (data) return data;
  }
  if (email) {
    const { data } = await supabase.from('clients').select('*').ilike('email', email).limit(1).maybeSingle();
    if (data) return data;
  }
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    const { data } = await supabase.from('clients').select('*').limit(200);
    const match = (data || []).find((item: Record<string, any>) => String(item.phone || '').replace(/\D/g, '') === digits);
    if (match) return match;
  }
  return null;
}

async function saveClient(supabase: ReturnType<typeof createClient>, signer: Record<string, any>, userId: string) {
  const existing = await findClient(supabase, signer);
  const name = clean(signer.name || signer.user?.name) || 'Cliente do Autentique';
  const document = clean(signer.document || signer.cpf || signer.user?.document) || null;
  const email = clean(signer.email || signer.user?.email) || null;
  const phone = normalizePhone(signer.phone || signer.user?.phone || '') || existing?.phone || 'Não informado';

  const patch = {
    name: existing?.name || name,
    document: existing?.document || document,
    phone,
    email: existing?.email || email,
    address: existing?.address || null,
    zip_code: existing?.zip_code || null,
    city: existing?.city || null,
    state: existing?.state || null,
    customer_type: existing?.customer_type || 'residencial',
    status: existing?.status === 'cliente' ? 'cliente' : 'lead',
    notes: existing?.notes || 'Cadastro criado automaticamente a partir de contrato do Autentique.',
    created_by: existing?.created_by || userId,
  };

  if (existing?.id) {
    const { data, error } = await supabase.from('clients').update(patch).eq('id', existing.id).select('*').single();
    if (error) throw new Error(`Cliente ${name}: ${error.message}`);
    return data;
  }

  const { data, error } = await supabase.from('clients').insert(patch).select('*').single();
  if (error) throw new Error(`Cliente ${name}: ${error.message}`);
  return data;
}

function documentStatus(signatures: Array<Record<string, any>>) {
  const rejectedAt = latest(signatures.map((item) => item.rejected?.created_at));
  const signedAt = latest(signatures.map((item) => item.signed?.created_at));
  const viewedAt = latest(signatures.map((item) => item.viewed?.created_at));
  const allSigned = signatures.length > 0 && signatures.every((item) => item.signed?.created_at);
  return {
    status: rejectedAt ? 'recusado' : allSigned ? 'assinado' : viewedAt ? 'visualizado' : 'enviado',
    rejectedAt,
    signedAt,
    viewedAt,
  };
}

async function saveAutentiqueDocument(supabase: ReturnType<typeof createClient>, document: Record<string, any>, userId: string) {
  const signatures = document.signatures || [];
  const signer = signatures[0] || {};
  const client = await saveClient(supabase, signer, userId);
  const state = documentStatus(signatures);
  const signingUrl = signer.link?.short_link || '';
  const originalUrl = document.files?.original || '';
  const signedUrl = document.files?.signed || '';
  const payload = {
    external_id: `autentique-${document.id}`,
    autentique_id: document.id,
    signer_public_id: signer.public_id || null,
    client_id: client?.id || null,
    client_name: client?.name || signer.name || document.name || 'Cliente',
    client_document: client?.document || null,
    client_phone: client?.phone || null,
    client_email: client?.email || signer.email || signer.user?.email || null,
    title: document.name || 'Contrato do Autentique',
    signed_date: state.signedAt ? String(state.signedAt).slice(0, 10) : null,
    total_amount: 0,
    amount_received: 0,
    amount_receivable: 0,
    status: state.status,
    document_url: signedUrl || signingUrl || originalUrl || null,
    signing_url: signingUrl || null,
    original_file_url: originalUrl || null,
    signed_file_url: signedUrl || null,
    viewed_at: state.viewedAt,
    rejected_at: state.rejectedAt,
    signed_at: state.signedAt,
    synced_at: new Date().toISOString(),
    source: 'Autentique',
    notes: 'Sincronizado automaticamente da conta Autentique.',
    payload: {
      sistema: document.name || 'Contrato importado do Autentique',
      endereco: client?.address || '',
      pagamento: '',
      signerName: signer.name || signer.user?.name || '',
    },
    raw_data: document,
    created_by: userId,
  };

  const { data, error } = await supabase.from('contracts').upsert(payload, { onConflict: 'external_id' }).select('*').single();
  if (error) throw new Error(`Contrato ${document.name || document.id}: ${error.message}`);
  return data;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const authHeader = request.headers.get('Authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const autentiqueToken = Deno.env.get('AUTENTIQUE_API_TOKEN') || '';
    if (!autentiqueToken) return json({ error: 'A integração com o Autentique ainda não possui a chave de acesso configurada.' }, 500);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Sessão inválida. Entre novamente no ERP.' }, 401);

    const database = createClient(supabaseUrl, serviceRoleKey || anonKey, {
      global: serviceRoleKey ? undefined : { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = await request.json().catch(() => ({}));
      if (payload.action !== 'list') return json({ error: 'Ação não reconhecida.' }, 400);

      const limit = Math.min(Math.max(Number(payload.limit || 60), 1), 60);
      const maxPages = Math.min(Math.max(Number(payload.pages || 10), 1), 20);
      const all: Record<string, any>[] = [];
      let total = 0;
      const query = `
        query ListDocuments($limit: Int!, $page: Int!) {
          documents(limit: $limit, page: $page) {
            total
            data {
              id name created_at
              signatures {
                public_id name email created_at
                link { short_link }
                viewed { created_at }
                signed { created_at }
                rejected { created_at }
                user { id name email }
              }
              files { original signed }
            }
          }
        }
      `;

      for (let page = 1; page <= maxPages; page += 1) {
        const data = await autentiqueRequest(autentiqueToken, query, { limit, page });
        const result = data?.documents;
        const rows = result?.data || [];
        total = Number(result?.total || rows.length);
        all.push(...rows);
        if (!rows.length || all.length >= total || rows.length < limit) break;
      }

      const saved = [];
      const errors = [];
      for (const document of all) {
        try {
          saved.push(await saveAutentiqueDocument(database, document, userData.user.id));
        } catch (error) {
          errors.push({ id: document.id, name: document.name, error: error instanceof Error ? error.message : String(error) });
        }
      }

      const { data: contracts, error: listError } = await database.from('contracts').select('*').order('created_at', { ascending: false });
      if (listError) throw listError;

      return json({ ok: true, total, imported: saved.length, failed: errors.length, errors, contracts: contracts || [] });
    }

    const body = await request.formData();
    const file = body.get('file');
    if (!(file instanceof File)) return json({ error: 'Arquivo PDF não recebido.' }, 400);

    const name = String(body.get('name') || 'Contrato de energia solar');
    const clientName = String(body.get('clientName') || 'Cliente');
    const clientEmail = String(body.get('clientEmail') || '').trim();
    const clientPhone = normalizePhone(String(body.get('clientPhone') || ''));
    const clientDocument = String(body.get('clientDocument') || '').trim();
    const deliveryMethod = String(body.get('deliveryMethod') || 'email');

    if (deliveryMethod === 'email' && !clientEmail) return json({ error: 'O cliente não possui e-mail cadastrado.' }, 422);
    if (deliveryMethod === 'whatsapp' && !clientPhone) return json({ error: 'O cliente não possui WhatsApp cadastrado.' }, 422);

    const signer = deliveryMethod === 'whatsapp'
      ? { name: clientName, phone: clientPhone, delivery_method: 'DELIVERY_METHOD_WHATSAPP', action: 'SIGN' }
      : { name: clientName, email: clientEmail, action: 'SIGN' };

    const mutation = `
      mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
        createDocument(document: $document, signers: $signers, file: $file) {
          id name created_at
          signatures { public_id name email link { short_link } }
        }
      }
    `;
    const operations = JSON.stringify({ query: mutation, variables: { document: { name, refusable: true }, signers: [signer], file: null } });
    const upload = new FormData();
    upload.append('operations', operations);
    upload.append('map', JSON.stringify({ file: ['variables.file'] }));
    upload.append('file', file, file.name || 'contrato.pdf');

    const response = await fetch('https://api.autentique.com.br/v2/graphql', {
      method: 'POST', headers: { Authorization: `Bearer ${autentiqueToken}` }, body: upload,
    });
    const result = await response.json();
    if (!response.ok || result.errors?.length) {
      const raw = result.errors?.map((item: { message?: string }) => item.message).filter(Boolean).join(' | ') || '';
      return json({ error: friendlyAutentiqueError(raw), details: result.errors || result }, 422);
    }

    const document = result.data?.createDocument;
    const signature = document?.signatures?.[0] || {};
    const existingClient = await findClient(database, { name: clientName, email: clientEmail, phone: clientPhone, document: clientDocument });
    const client = existingClient || await saveClient(database, { name: clientName, email: clientEmail, phone: clientPhone, document: clientDocument }, userData.user.id);
    const contractPayload = {
      external_id: `autentique-${document?.id}`,
      autentique_id: document?.id,
      signer_public_id: signature.public_id || null,
      client_id: client?.id || null,
      client_name: clientName,
      client_document: clientDocument || null,
      client_phone: clientPhone || null,
      client_email: clientEmail || null,
      title: name,
      status: 'enviado',
      document_url: signature.link?.short_link || null,
      signing_url: signature.link?.short_link || null,
      source: 'ERP/Autentique',
      synced_at: new Date().toISOString(),
      raw_data: document || {},
      payload: {},
      created_by: userData.user.id,
    };
    const { error: saveError } = await database.from('contracts').upsert(contractPayload, { onConflict: 'external_id' });
    if (saveError) throw saveError;

    return json({
      ok: true,
      documentId: document?.id || '',
      signingLink: signature.link?.short_link || '',
      signerPublicId: signature.public_id || '',
      deliveryMethod,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erro inesperado ao processar contrato.' }, 500);
  }
});
