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

type SolarmanToken = {
  authorization: string;
  orgId?: number;
};

const requestSolarmanToken = async (orgId?: number): Promise<SolarmanToken> => {
  const appId = requiredEnv('SOLARMAN_APP_ID');
  const appSecret = requiredEnv('SOLARMAN_APP_SECRET');
  const email = requiredEnv('SOLARMAN_EMAIL');
  const password = requiredEnv('SOLARMAN_PASSWORD');

  const response = await fetch(`${solarmanBaseUrl()}/account/v1.0/token?appId=${encodeURIComponent(appId)}&language=pt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appSecret,
      email,
      password: await sha256(password),
      ...(orgId ? { orgId } : {}),
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.success || !payload?.access_token) {
    throw new Error(payload?.msg || 'Não foi possível autenticar na SOLARMAN.');
  }

  return {
    authorization: `${payload.token_type || 'bearer'} ${payload.access_token}`,
    ...(orgId ? { orgId } : {}),
  };
};

const discoverOrganizationIds = async (userToken: SolarmanToken) => {
  const configuredOrgId = Number(Deno.env.get('SOLARMAN_ORG_ID')?.trim() || 0);
  if (configuredOrgId > 0) return [configuredOrgId];

  const response = await fetch(`${solarmanBaseUrl()}/account/v1.0/info?language=pt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: userToken.authorization,
    },
    body: JSON.stringify({}),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.msg || 'Não foi possível consultar as organizações da conta SOLARMAN.');
  }

  const organizations = Array.isArray(payload.orgInfoList) ? payload.orgInfoList : [];
  return [...new Set(
    organizations
      .map((organization: Record<string, unknown>) => Number(organization.companyId ?? organization.orgId ?? 0))
      .filter((orgId: number) => orgId > 0),
  )];
};

const stationListFromPayload = (payload: Record<string, unknown>) => {
  const candidates = [payload.stationList, payload.list, payload.data];
  const list = candidates.find(Array.isArray);
  return Array.isArray(list) ? list as Record<string, unknown>[] : [];
};

const fetchAllPlantsForToken = async (token: SolarmanToken) => {
  const plants: Record<string, unknown>[] = [];
  const pageSize = 200;
  const maximumPages = 100;

  for (let page = 1; page <= maximumPages; page += 1) {
    const response = await fetch(`${solarmanBaseUrl()}/station/v1.0/list?language=pt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token.authorization,
      },
      body: JSON.stringify({ page, size: pageSize }),
    });

    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.msg || `Não foi possível consultar a página ${page} das usinas SOLARMAN.`);
    }

    const pagePlants = stationListFromPayload(payload);
    plants.push(...pagePlants);

    const total = Number(payload.total ?? payload.totalCount ?? payload.count ?? 0);
    if (pagePlants.length === 0 || pagePlants.length < pageSize || (total > 0 && plants.length >= total)) break;
  }

  return plants;
};

const normalizePlant = (plant: Record<string, unknown>) => ({
  id: String(plant.id ?? plant.stationId ?? plant.plantId ?? ''),
  client: String(plant.name ?? plant.stationName ?? plant.plantName ?? 'Usina sem nome'),
  provider: 'solarman',
  power: Number(plant.generationPower ?? plant.power ?? plant.currentPower ?? 0),
  today: Number(plant.generationValue ?? plant.dayGeneration ?? plant.generationToday ?? 0),
  capacity: Number(plant.installedCapacity ?? plant.capacity ?? 0),
  online: String(plant.networkStatus ?? plant.status ?? '').toUpperCase() !== 'OFFLINE',
  alert: Number(plant.alertCount ?? plant.alarmCount ?? 0) > 0,
  updatedAt: new Date().toISOString(),
});

const solarmanPlants = async () => {
  const userToken = await requestSolarmanToken();
  const organizationIds = await discoverOrganizationIds(userToken);
  const tokens = organizationIds.length > 0
    ? await Promise.all(organizationIds.map((orgId) => requestSolarmanToken(orgId)))
    : [userToken];

  const results = await Promise.all(tokens.map(fetchAllPlantsForToken));
  const uniquePlants = new Map<string, ReturnType<typeof normalizePlant>>();

  results.flat().forEach((rawPlant) => {
    const plant = normalizePlant(rawPlant);
    if (plant.id) uniquePlants.set(plant.id, plant);
  });

  return {
    plants: [...uniquePlants.values()].sort((a, b) => a.client.localeCompare(b.client, 'pt-BR')),
    organizations: organizationIds.length || 1,
  };
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
      const result = await solarmanPlants();
      return json({
        ok: true,
        provider: 'solarman',
        plants: result.plants,
        organizations: result.organizations,
        total: result.plants.length,
        syncedAt: new Date().toISOString(),
      });
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
