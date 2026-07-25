import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function onlyDigits(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Usuário não autenticado.');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('BLING_CLIENT_ID')!;
    const clientSecret = Deno.env.get('BLING_CLIENT_SECRET')!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error('Sessão inválida.');

    const admin = createClient(supabaseUrl, serviceKey);
    const userId = userData.user.id;
    const input = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = input.action || 'status';

    if (action === 'status') {
      const { data: connection } = await admin
        .from('bling_connections')
        .select('connected_at, updated_at, expires_at, scope')
        .eq('user_id', userId)
        .maybeSingle();
      const { count } = await admin
        .from('bling_sync_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'sucesso');
      return json({ connected: Boolean(connection), connection, successfulSyncs: count || 0 });
    }

    if (action === 'disconnect') {
      await admin.from('bling_connections').delete().eq('user_id', userId);
      return json({ connected: false });
    }

    if (action !== 'sync-clients') throw new Error('Ação não reconhecida.');

    let { data: connection, error: connectionError } = await admin
      .from('bling_connections')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (connectionError || !connection) throw new Error('Conecte o ERP ao Bling antes de sincronizar.');

    if (new Date(connection.expires_at).getTime() <= Date.now() + 60_000) {
      const basic = btoa(`${clientId}:${clientSecret}`);
      const tokenResponse = await fetch('https://api.bling.com.br/Api/v3/oauth/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'enable-jwt': '1',
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: connection.refresh_token }),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(tokenData?.error_description || 'Não foi possível renovar a conexão com o Bling.');
      connection = {
        ...connection,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || connection.refresh_token,
        expires_at: new Date(Date.now() + Number(tokenData.expires_in || 21600) * 1000).toISOString(),
      };
      await admin.from('bling_connections').update({
        access_token: connection.access_token,
        refresh_token: connection.refresh_token,
        expires_at: connection.expires_at,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId);
    }

    const { data: clients, error: clientsError } = await admin
      .from('clients')
      .select('*')
      .is('bling_id', null)
      .order('created_at', { ascending: true })
      .limit(100);
    if (clientsError) throw clientsError;

    const result = { total: clients?.length || 0, success: 0, failed: 0, errors: [] as Array<{ id: string; message: string }> };

    for (const client of clients || []) {
      const document = onlyDigits(client.document);
      const payload: Record<string, unknown> = {
        nome: client.name,
        tipo: document.length === 14 ? 'J' : 'F',
        numeroDocumento: document || undefined,
        telefone: client.phone || undefined,
        email: client.email || undefined,
        endereco: client.city || client.state ? {
          geral: {
            municipio: client.city || undefined,
            uf: client.state ? String(client.state).toUpperCase().slice(0, 2) : undefined,
          },
        } : undefined,
      };

      try {
        const response = await fetch('https://api.bling.com.br/Api/v3/contatos', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'enable-jwt': '1',
          },
          body: JSON.stringify(payload),
        });
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(responseData?.error?.description || responseData?.message || `Erro ${response.status}`);

        const blingId = String(responseData?.data?.id || responseData?.id || '');
        if (!blingId) throw new Error('O Bling não retornou o ID do contato.');

        await admin.from('clients').update({ bling_id: blingId, bling_synced_at: new Date().toISOString() }).eq('id', client.id);
        await admin.from('bling_sync_log').insert({
          user_id: userId, entity_type: 'client', local_id: client.id, bling_id: blingId,
          operation: 'create', status: 'sucesso', payload, response: responseData,
        });
        result.success += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido.';
        result.failed += 1;
        result.errors.push({ id: client.id, message });
        await admin.from('bling_sync_log').insert({
          user_id: userId, entity_type: 'client', local_id: client.id,
          operation: 'create', status: 'erro', message, payload,
        });
      }

      await sleep(400);
    }

    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erro desconhecido.' }, 400);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
