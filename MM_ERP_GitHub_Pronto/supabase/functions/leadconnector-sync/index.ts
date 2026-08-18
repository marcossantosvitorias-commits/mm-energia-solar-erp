import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const digits = (v: unknown) => String(v || '').replace(/\D/g, '');
const email = (v: unknown) => String(v || '').trim().toLowerCase();
const lcStatus = (status: string) => status === 'cliente' ? 'won' : status === 'perdido' ? 'lost' : 'open';
const erpStatus = (status: string) => status === 'won' ? 'cliente' : ['lost','abandoned'].includes(status) ? 'perdido' : 'lead';

async function lcFetch(path: string, token: string, init: RequestInit = {}, version = '2021-07-28') {
  const response = await fetch(`https://services.leadconnectorhq.com${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Version: version, ...(init.headers || {}) },
  });
  const text = await response.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) throw new Error(body?.message || body?.error || `LeadConnector HTTP ${response.status}`);
  return body;
}

async function fetchAllContacts(token: string, locationId: string) {
  const out: any[] = [];
  let startAfterId = '';
  let startAfter = '';
  for (let page = 0; page < 500; page += 1) {
    const qs = new URLSearchParams({ locationId, limit: '100' });
    if (startAfterId) qs.set('startAfterId', startAfterId);
    if (startAfter) qs.set('startAfter', startAfter);
    const body = await lcFetch(`/contacts/?${qs}`, token);
    const batch = Array.isArray(body?.contacts) ? body.contacts : [];
    out.push(...batch);
    const meta = body?.meta || {};
    if (batch.length < 100 || (!meta?.startAfterId && !meta?.startAfter)) break;
    startAfterId = String(meta.startAfterId || '');
    startAfter = String(meta.startAfter || '');
  }
  return out;
}

async function fetchOpportunities(token: string, locationId: string) {
  try {
    const qs = new URLSearchParams({ location_id: locationId, limit: '100' });
    const body = await lcFetch(`/opportunities/search?${qs}`, token, {}, 'v3');
    return Array.isArray(body?.opportunities) ? body.opportunities : Array.isArray(body?.items) ? body.items : [];
  } catch { return []; }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = Deno.env.get('LEADCONNECTOR_TOKEN') || '';
  const locationId = Deno.env.get('LEADCONNECTOR_LOCATION_ID') || '';
  const pipelineId = Deno.env.get('LEADCONNECTOR_PIPELINE_ID') || '';
  let stageMap: Record<string,string> = {};
  try { stageMap = JSON.parse(Deno.env.get('LEADCONNECTOR_STAGE_MAP') || '{}'); } catch { stageMap = {}; }

  const authorization = req.headers.get('Authorization') || '';
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData?.user) return json({ error: 'Sessão inválida.' }, 401);
  const service = createClient(supabaseUrl, serviceRole);
  const { data: profile } = await service.from('profiles').select('role,active').eq('id', authData.user.id).maybeSingle();
  if (!profile?.active || !['admin','comercial'].includes(String(profile.role || ''))) return json({ error: 'Sem permissão para sincronizar CRM.' }, 403);

  let payload: any = {};
  try { payload = await req.json(); } catch { payload = {}; }
  const action = String(payload?.action || 'sync');

  if (action === 'status') {
    const { count } = await service.from('crm_leadconnector_sync').select('*', { head: true, count: 'exact' });
    return json({ configured: Boolean(token && locationId), synced: count || 0, outbound: Boolean(token && locationId) });
  }

  if (!token || !locationId) return json({ error: 'Faltam LEADCONNECTOR_TOKEN e LEADCONNECTOR_LOCATION_ID.', configured: false }, 409);

  if (action === 'push_client') {
    const clientId = String(payload?.clientId || '');
    if (!clientId) return json({ error: 'clientId obrigatório.' }, 400);
    const { data: client, error: clientError } = await service.from('clients').select('*').eq('id', clientId).single();
    if (clientError || !client) return json({ error: 'Lead não encontrado.' }, 404);

    let externalId = String(client.external_id || '');
    const contactBody = {
      locationId,
      name: client.name,
      firstName: String(client.name || '').split(' ')[0] || client.name,
      phone: client.phone || undefined,
      email: client.email || undefined,
      address1: client.address || undefined,
      city: client.city || undefined,
      state: client.state || undefined,
      postalCode: client.zip_code || undefined,
      source: client.lead_source || 'MM ERP',
    };

    if (externalId) {
      await lcFetch(`/contacts/${externalId}`, token, { method: 'PUT', body: JSON.stringify(contactBody) });
    } else {
      const created = await lcFetch('/contacts/', token, { method: 'POST', body: JSON.stringify(contactBody) });
      externalId = String(created?.contact?.id || created?.id || '');
      if (externalId) await service.from('clients').update({ external_provider: 'leadconnector', external_id: externalId, lead_source: client.lead_source || 'MM ERP' }).eq('id', clientId);
    }

    const { data: syncRow } = await service.from('crm_leadconnector_sync').select('*').eq('client_id', clientId).maybeSingle();
    const opportunityId = String(syncRow?.external_opportunity_id || '');
    if (opportunityId) {
      await lcFetch(`/opportunities/${opportunityId}`, token, { method: 'PUT', body: JSON.stringify({ status: lcStatus(client.status), ...(stageMap[client.status] ? { pipelineStageId: stageMap[client.status] } : {}) }) }, 'v3');
    } else if (pipelineId && externalId) {
      const createdOpp = await lcFetch('/opportunities/', token, { method: 'POST', body: JSON.stringify({ pipelineId, locationId, name: client.name, contactId: externalId, status: lcStatus(client.status), ...(stageMap[client.status] ? { pipelineStageId: stageMap[client.status] } : {}) }) }, 'v3');
      const oppId = String(createdOpp?.opportunity?.id || createdOpp?.id || '');
      if (oppId) await service.from('crm_leadconnector_sync').upsert({ provider:'leadconnector', location_id:locationId, external_contact_id:externalId, external_opportunity_id:oppId, client_id:clientId, contact_name:client.name, phone:client.phone, email:client.email, lead_source:client.lead_source || 'MM ERP', last_event_type:'erp_push', last_event_at:new Date().toISOString(), imported_at:new Date().toISOString(), updated_at:new Date().toISOString() }, { onConflict:'provider,location_id,external_contact_id' });
    }

    await service.from('crm_leadconnector_sync').update({ last_event_type:'erp_push', last_event_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('client_id', clientId);
    return json({ ok:true, clientId, externalId });
  }

  const contacts = await fetchAllContacts(token, locationId);
  const opportunities = await fetchOpportunities(token, locationId);
  const oppByContact = new Map<string,any>();
  for (const o of opportunities) { const cid = String(o?.contactId || o?.contact?.id || ''); if (cid && !oppByContact.has(cid)) oppByContact.set(cid, o); }
  const result = { total: contacts.length, created:0, updated:0, skipped:0, errors:0 };

  for (const contact of contacts) {
    const externalId = String(contact?.id || '').trim();
    if (!externalId) { result.skipped++; continue; }
    const phone = digits(contact?.phone || contact?.phoneNumber);
    const mail = email(contact?.email);
    const name = String(contact?.name || [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || 'Lead 1North').trim();
    const opportunity = oppByContact.get(externalId);
    try {
      let existing: any = null;
      const a = await service.from('clients').select('*').eq('external_provider','leadconnector').eq('external_id',externalId).maybeSingle(); existing = a.data;
      if (!existing && phone) { const b = await service.from('clients').select('*').eq('phone',phone).maybeSingle(); existing = b.data; }
      if (!existing && mail) { const c = await service.from('clients').select('*').ilike('email',mail).maybeSingle(); existing = c.data; }
      const row:any = { name, phone:phone || existing?.phone || '', email:mail || existing?.email || null, city:contact?.city || existing?.city || null, state:String(contact?.state || existing?.state || '').toUpperCase() || null, customer_type:existing?.customer_type || 'residencial', status: opportunity ? erpStatus(String(opportunity.status || '')) : (existing?.status || 'lead'), monthly_bill:existing?.monthly_bill || 0, notes:existing?.notes || null, lead_source:contact?.source || '1North', external_provider:'leadconnector', external_id:externalId, external_payload:{contact,opportunity:opportunity || null}, updated_at:new Date().toISOString() };
      let client:any;
      if (existing?.id) { const u=await service.from('clients').update(row).eq('id',existing.id).select('*').single(); if(u.error) throw u.error; client=u.data; result.updated++; }
      else { const i=await service.from('clients').insert(row).select('*').single(); if(i.error) throw i.error; client=i.data; result.created++; }
      const syncRow = { provider:'leadconnector', location_id:locationId, external_contact_id:externalId, external_opportunity_id:opportunity?.id || null, external_pipeline_id:opportunity?.pipelineId || null, external_stage_id:opportunity?.pipelineStageId || opportunity?.stageId || null, phone:phone || null, contact_name:name, email:mail || null, city:contact?.city || null, lead_source:contact?.source || '1North', assigned_to_external:opportunity?.assignedTo || contact?.assignedTo || null, opportunity_status:opportunity?.status || null, opportunity_value:Number(opportunity?.monetaryValue || 0) || null, payload:{contact,opportunity:opportunity || null}, last_event_type:'full_sync', last_event_at:new Date().toISOString(), client_id:client.id, imported_at:new Date().toISOString(), sync_error:null, updated_at:new Date().toISOString() };
      const s=await service.from('crm_leadconnector_sync').upsert(syncRow,{onConflict:'provider,location_id,external_contact_id'}); if(s.error) throw s.error;
    } catch (e) { result.errors++; console.error(e); }
  }
  return json({ ok:true, configured:true, ...result });
});