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

async function autentiqueRequest(token: string, query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch('https://api.autentique.com.br/v2/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const result = await response.json();
  if (!response.ok || result.errors?.length) {
    const message = result.errors?.map((item: { message?: string }) => item.message).filter(Boolean).join(' | ')
      || 'O Autentique recusou a solicitação.';
    throw new Error(message);
  }
  return result.data;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const authHeader = request.headers.get('Authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const autentiqueToken = Deno.env.get('AUTENTIQUE_API_TOKEN') || '';

    if (!autentiqueToken) return json({ error: 'AUTENTIQUE_API_TOKEN não configurado no Supabase.' }, 500);

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Sessão inválida. Entre novamente no ERP.' }, 401);

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = await request.json().catch(() => ({}));
      if (payload.action !== 'list') return json({ error: 'Ação não reconhecida.' }, 400);

      const limit = Math.min(Math.max(Number(payload.limit || 60), 1), 60);
      const maxPages = Math.min(Math.max(Number(payload.pages || 5), 1), 20);
      const all: unknown[] = [];
      let total = 0;

      const query = `
        query ListDocuments($limit: Int!, $page: Int!) {
          documents(limit: $limit, page: $page) {
            total
            data {
              id
              name
              created_at
              signatures {
                public_id
                name
                email
                created_at
                link { short_link }
                viewed { created_at }
                signed { created_at }
                rejected { created_at }
                user { id name email phone }
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

      return json({ ok: true, total, documents: all });
    }

    const body = await request.formData();
    const file = body.get('file');
    if (!(file instanceof File)) return json({ error: 'Arquivo PDF não recebido.' }, 400);

    const name = String(body.get('name') || 'Contrato de energia solar');
    const clientName = String(body.get('clientName') || 'Cliente');
    const clientEmail = String(body.get('clientEmail') || '').trim();
    const clientPhone = normalizePhone(String(body.get('clientPhone') || ''));
    const deliveryMethod = String(body.get('deliveryMethod') || 'email');

    if (deliveryMethod === 'email' && !clientEmail) return json({ error: 'O cliente não possui e-mail cadastrado.' }, 422);
    if (deliveryMethod === 'whatsapp' && !clientPhone) return json({ error: 'O cliente não possui WhatsApp cadastrado.' }, 422);

    const signer = deliveryMethod === 'whatsapp'
      ? { name: clientName, phone: clientPhone, delivery_method: 'DELIVERY_METHOD_WHATSAPP', action: 'SIGN' }
      : { name: clientName, email: clientEmail, action: 'SIGN' };

    const mutation = `
      mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
        createDocument(document: $document, signers: $signers, file: $file) {
          id
          name
          created_at
          signatures {
            public_id
            name
            email
            link { short_link }
          }
        }
      }
    `;

    const operations = JSON.stringify({
      query: mutation,
      variables: {
        document: { name, refusable: true },
        signers: [signer],
        file: null,
      },
    });

    const upload = new FormData();
    upload.append('operations', operations);
    upload.append('map', JSON.stringify({ file: ['variables.file'] }));
    upload.append('file', file, file.name || 'contrato.pdf');

    const response = await fetch('https://api.autentique.com.br/v2/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${autentiqueToken}` },
      body: upload,
    });
    const result = await response.json();

    if (!response.ok || result.errors?.length) {
      const message = result.errors?.map((item: { message?: string }) => item.message).filter(Boolean).join(' | ')
        || 'O Autentique recusou o envio do documento.';
      return json({ error: message, details: result.errors || result }, 422);
    }

    const document = result.data?.createDocument;
    const signature = document?.signatures?.[0];
    return json({
      ok: true,
      documentId: document?.id || '',
      signingLink: signature?.link?.short_link || '',
      signerPublicId: signature?.public_id || '',
      deliveryMethod,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erro inesperado ao processar contrato.' }, 500);
  }
});