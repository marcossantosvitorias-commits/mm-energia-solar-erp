const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
});

const sha256 = async (value: string) => {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Segredo ${name} não configurado.`);
  return value;
};

const solarmanBaseUrl = () => Deno.env.get('SOLARMAN_BASE_URL')?.trim() || 'https://globalapi.solarmanpv.com';

const solarmanToken = async () => {
  const appId = requiredEnv('SOLARMAN_APP_ID');
  const appSecret = requiredEnv('SOLARMAN_APP_SECRET');
  const email = requiredEnv('SOLARMAN_EMAIL');
  const password = requiredEnv('SOLARMAN_PASSWORD');
  const orgId = Deno.env.get('SOLARMAN_ORG_ID')?.trim();

  const response = await fetch(`${solarmanBaseUrl()}/account/v1.0/token?appId=${encodeURIComponent(appId)}&language=pt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appSecret,
      email,
      password: await sha256(password),
      ...(orgId ? { orgId: Number(orgId) } : {}),
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.success || !payload?.access_token) {
    throw new Error(payload?.msg || 'Não foi possível autenticar na SOLARMAN.');
  }

  return `${payload.token_type || 'bearer'} ${payload.access_token}`;
};

const solarmanPlants = async () => {
  const authorization = await solarmanToken();
  const response = await fetch(`${solarmanBaseUrl()}/station/v1.0/list?language=pt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authorization },
    body: JSON.stringify({ page: 1, size: 200 }),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.msg || 'Não foi possível consultar as usinas SOLARMAN.');
  }

  const rawPlants = payload.stationList || payload.list || [];
  return rawPlants.map((plant: Record<string, unknown>) => ({
    id: String(plant.id ?? plant.stationId ?? ''),
    client: String(plant.name ?? plant.stationName ?? 'Usina sem nome'),
    provider: 'solarman',
    power: Number(plant.generationPower ?? plant.power ?? 0),
    today: Number(plant.generationValue ?? plant.dayGeneration ?? 0),
    capacity: Number(plant.installedCapacity ?? plant.capacity ?? 0),
    online: String(plant.networkStatus ?? plant.status ?? '').toUpperCase() !== 'OFFLINE',
    alert: Number(plant.alertCount ?? plant.alarmCount ?? 0) > 0,
    updatedAt: new Date().toISOString(),
  }));
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action || 'health';

    if (action === 'health') {
      return json({
        ok: true,
        provider: 'solarman',
        configured: Boolean(
          Deno.env.get('SOLARMAN_APP_ID') &&
          Deno.env.get('SOLARMAN_APP_SECRET') &&
          Deno.env.get('SOLARMAN_EMAIL') &&
          Deno.env.get('SOLARMAN_PASSWORD')
        ),
      });
    }

    if (action === 'listPlants') {
      const plants = await solarmanPlants();
      return json({ ok: true, provider: 'solarman', plants, syncedAt: new Date().toISOString() });
    }

    return json({ error: 'Ação não suportada.' }, 400);
  } catch (error) {
    console.error('solar-monitoring', error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : 'Erro inesperado no monitoramento solar.',
    }, 500);
  }
});
