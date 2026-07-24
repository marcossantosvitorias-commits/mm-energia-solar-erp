import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const erpUrl = Deno.env.get('ERP_APP_URL') || 'https://mmenergiasolar.com.br/app/bling';

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');

    if (oauthError) throw new Error(`Autorização recusada: ${oauthError}`);
    if (!code || !state) throw new Error('Código ou estado OAuth ausente.');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('BLING_CLIENT_ID')!;
    const clientSecret = Deno.env.get('BLING_CLIENT_SECRET')!;
    const redirectUri = Deno.env.get('BLING_REDIRECT_URI')!;
    if (!clientId || !clientSecret || !redirectUri) throw new Error('Segredos do Bling não configurados.');

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: stateRow, error: stateError } = await admin
      .from('bling_oauth_states')
      .select('*')
      .eq('state', state)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (stateError || !stateRow) throw new Error('Solicitação OAuth inválida ou expirada.');

    const basic = btoa(`${clientId}:${clientSecret}`);
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
    const tokenResponse = await fetch('https://api.bling.com.br/Api/v3/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'enable-jwt': '1',
      },
      body,
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokenData?.error_description || tokenData?.message || 'Falha ao obter tokens do Bling.');

    const expiresAt = new Date(Date.now() + Number(tokenData.expires_in || 21600) * 1000).toISOString();
    const { error: saveError } = await admin.from('bling_connections').upsert({
      user_id: stateRow.user_id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_at: expiresAt,
      scope: tokenData.scope || null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (saveError) throw saveError;

    await admin.from('bling_oauth_states').update({ used_at: new Date().toISOString() }).eq('state', state);

    return Response.redirect(`${erpUrl}${erpUrl.includes('?') ? '&' : '?'}bling=connected`, 302);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'Erro desconhecido.');
    return Response.redirect(`${erpUrl}${erpUrl.includes('?') ? '&' : '?'}bling=error&message=${message}`, 302);
  }
});
