import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const normalizePhone = (value: unknown) => String(value || '').replace(/\D/g, '');
const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();

function mapOpportunityStatus(opportunity: any) {
  const status = String(opportunity?.status || '').toLowerCase();
  if (status === 'won') return 'cliente';
  if (status === 'lost' || status === 'abandoned') return 'perdido';
  return 'lead';
}

async function leadConnectorFetch(path: string, token: string, version = '2021-07-28') {
  const response = await fetch(`https://services.leadconnectorhq.com${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, Version: version },
  });
  const text = await response.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) throw new Error(body?.message || body?.error || `LeadConnector respondeu HTTP ${response.status}`);
  return body;
}

async function fetchAllContacts(token: string, locationId: string) {
  const contacts: any[] = [];
  let startAfterId = '';
  let startAfter = '';
  for (let page = 0; page < 500; page += 1) {
    const params = new URLSearchParams({ locationId, limit: '100' });
    if (startAfterId) params.set('startAfterId', startAfterId);
    if (startAfter) params.set('startAfter', startAfter);
    const body = await leadConnectorFetch(`/contacts/?${params.toString()}`, token, '2021-07-28');
    const batch = Array.isArray(body?.contacts) ? body.contacts : [];
    contacts.push(...batch);
    const meta = body?.meta || {};
    const nextId = String(meta?.startAfterId || '');
    const nextTs = String(meta?.startAfter || '');
    if (batch.length < 100 || (!nextId && !nextTs)) break;
    startAfterId = nextId;
    startAfter = nextTs;
  }
  return contacts;
}

async function fetchOpportunities(token: string, locationId: string) {
  try {
    const params = new URLSearchParams({ location_id: locationId, limit: '100' });
    const body = await leadConnectorFetch(`/opportunities/search?${params.toString()}`, token, 'v3');
    return Array.isArray(body?.opportunities) ? body.opportunities : Array.isArray(body?.items) ? body.items : [];
  } catch (error) {
    console.warn('Opportunity sync skipped:', error);
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = Deno.env.get('LEADCONNECTOR_TOKEN') || '';
  const locationId = Deno.env.get('LEADCONNECTOR_LOCATION_ID') || '';
  const authorization = req.headers.get('Authorization') || '';
  if (!supabaseUrl || !anonKey || !serviceRole) return json({ error: 'Supabase não configurado na função.' }, 500);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData?.user) return json({ error: 'Sessão inválida.' }, 401);

  const service = createClient(supabaseUrl, serviceRole);
  const { data: profile } = await service.from('profiles').select('role,active').eq('id', authData.user.id).maybeSingle();
  if (!profile?.active || !['admin', 'comercial'].includes(String(profile.role || ''))) {
    return json({ error: 'Seu usuário não tem permissão para sincronizar a 1North.' }, 403);
  }

  let payload: any = {};
  try { payload = await req.json(); } catch { payload = {}; }
  const action = String(payload?.action || 'sync');
  if (action === 'status') {
    const { count } = await service.from('crm_leadconnector_sync').select('*', { head: true, count: 'exact' });
    return json({ configured: Boolean(token && locationId), synced: count || 0 });
  }

  if (!token || !locationId) {
    return json({ error: 'A integração está instalada, mas faltam LEADCONNECTOR_TOKEN e LEADCONNECTOR_LOCATION_ID nos secrets do Supabase.', configured: false }, 409);
  }

  const contacts = await fetchAllContacts(token, locationId);
  const opportunities = await fetchOpportunities(token, locationId);
  const opportunityByContact = new Map<string, any>();
  for (const opportunity of opportunities) {
    const contactId = String(opportunity?.contactId || opportunity?.contact?.id || '');
    if (contactId && !opportunityByContact.has(contactId)) opportunityByContact.set(contactId, opportunity);
  }

  const result = { total: contacts.length, created: 0, updated: 0, skipped: 0, errors: 0 };
  for (const contact of contacts) {
    const externalId = String(contact?.id || '').trim();
    if (!externalId) { result.skipped += 1; continue; }
    const phone = normalizePhone(contact?.phone || contact?.phoneNumber);
    const email = normalizeEmail(contact?.email);
    const name = String(contact?.name || [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || 'Lead 1North').trim();
    const city = String(contact?.city || '').trim();
    const state = String(contact?.state || '').trim().toUpperCase();
    const leadSource = String(contact?.source || contact?.contactSource || '1North').trim() || '1North';
    const opportunity = opportunityByContact.get(externalId);

    try {
      let existing: any = null;
      const byExternal = await service.from('clients').select('*').eq('external_provider', 'leadconnector').eq('external_id', externalId).maybeSingle();
      existing = byExternal.data;
      if (!existing && phone) existing = (await service.from('clients').select('*').eq('phone', phone).maybeSingle()).data;
      if (!existing && email) existing = (await service.from('clients').select('*').ilike('email', email).maybeSingle()).data;

      const clientRecord: any = {
        name,
        phone: phone || existing?.phone || '',
        email: email || existing?.email || null,
        city: city || existing?.city || null,
        state: state || existing?.state || null,
        customer_type: existing?.customer_type || 'residencial',
        status: opportunity ? mapOpportunityStatus(opportunity) : (existing?.status || 'lead'),
        monthly_bill: existing?.monthly_bill || 0,
        notes: existing?.notes || null,
        lead_source: leadSource,
        external_provider: 'leadconnector',
        external_id: externalId,
        external_payload: { contact, opportunity: opportunity || null },
        updated_at: new Date().toISOString(),
      };

      let client: any;
      if (existing?.id) {
        const updated = await service.from('clients').update(clientRecord).eq('id', existing.id).select('*').single();
        if (updated.error) throw updated.error;
        client = updated.data;
        result.updated += 1;
      } else {
        const created = await service.from('clients').insert(clientRecord).select('*').single();
        if (created.error) throw created.error;
        client = created.data;
        result.created += 1;
      }

      const sync = await service.from('crm_leadconnector_sync').upsert({
        provider: 'leadconnector', location_id: locationId, external_contact_id: externalId,
        external_opportunity_id: opportunity?.id || null, external_pipeline_id: opportunity?.pipelineId || null,
        external_stage_id: opportunity?.pipelineStageId || opportunity?.stageId || null,
        phone: phone || null, contact_name: name, email: email || null, city: city || null,
        lead_source: leadSource, assigned_to_external: opportunity?.assignedTo || contact?.assignedTo || null,
        opportunity_status: opportunity?.status || null, opportunity_value: Number(opportunity?.monetaryValue || 0) || null,
        payload: { contact, opportunity: opportunity || null }, last_event_type: 'full_sync',
        last_event_at: new Date().toISOString(), client_id: client.id, imported_at: new Date().toISOString(),
        sync_error: null, updated_at: new Date().toISOString(),
      }, { onConflict: 'provider,location_id,external_contact_id' });
      if (sync.error) throw sync.error;
    } catch (error) {
      result.errors += 1;
      console.error('LeadConnector contact sync error', externalId, error);
    }
  }

  return json({ ok: true, configured: true, ...result });
});
