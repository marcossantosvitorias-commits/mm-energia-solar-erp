import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type':'application/json' } });
const digits = (v: unknown) => String(v || '').replace(/\D/g, '');
const mail = (v: unknown) => String(v || '').trim().toLowerCase();
const mapStatus = (status: string) => status === 'won' ? 'cliente' : ['lost','abandoned'].includes(status) ? 'perdido' : 'lead';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error:'Método não permitido.' },405);
  const secret = Deno.env.get('LEADCONNECTOR_WEBHOOK_SECRET') || '';
  const supplied = req.headers.get('x-mm-leadconnector-secret') || new URL(req.url).searchParams.get('secret') || '';
  if (!secret || supplied !== secret) return json({ error:'Webhook não autorizado.' },401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const locationId = Deno.env.get('LEADCONNECTOR_LOCATION_ID') || '';
  const db = createClient(supabaseUrl, serviceRole);
  let payload:any = {};
  try { payload = await req.json(); } catch { return json({ error:'JSON inválido.' },400); }

  const type = String(payload?.type || payload?.event || payload?.eventType || 'webhook');
  const contact = payload?.contact || payload?.data?.contact || payload?.data || payload;
  const opportunity = payload?.opportunity || payload?.data?.opportunity || (type.toLowerCase().includes('opportunity') ? payload?.data || payload : null);
  const externalContactId = String(contact?.id || contact?.contactId || opportunity?.contactId || payload?.contactId || '').trim();
  if (!externalContactId) return json({ ok:true, ignored:true, reason:'Evento sem contactId' });

  const phone = digits(contact?.phone || contact?.phoneNumber || opportunity?.contact?.phone);
  const email = mail(contact?.email || opportunity?.contact?.email);
  const name = String(contact?.name || opportunity?.contact?.name || [contact?.firstName,contact?.lastName].filter(Boolean).join(' ') || 'Lead 1North').trim();

  let existing:any = null;
  const byExternal = await db.from('clients').select('*').eq('external_provider','leadconnector').eq('external_id',externalContactId).maybeSingle();
  existing = byExternal.data;
  if (!existing && phone) { const q = await db.from('clients').select('*').eq('phone',phone).maybeSingle(); existing=q.data; }
  if (!existing && email) { const q = await db.from('clients').select('*').ilike('email',email).maybeSingle(); existing=q.data; }

  const row:any = {
    name: name || existing?.name || 'Lead 1North',
    phone: phone || existing?.phone || '',
    email: email || existing?.email || null,
    city: contact?.city || existing?.city || null,
    state: String(contact?.state || existing?.state || '').toUpperCase() || null,
    customer_type: existing?.customer_type || 'residencial',
    status: opportunity ? mapStatus(String(opportunity?.status || '')) : (existing?.status || 'lead'),
    monthly_bill: existing?.monthly_bill || 0,
    notes: existing?.notes || null,
    lead_source: contact?.source || existing?.lead_source || '1North',
    external_provider:'leadconnector',
    external_id:externalContactId,
    external_payload:{ ...(existing?.external_payload || {}), webhook:payload },
    updated_at:new Date().toISOString(),
  };

  let client:any;
  if (existing?.id) {
    const u = await db.from('clients').update(row).eq('id',existing.id).select('*').single();
    if (u.error) return json({ error:u.error.message },500);
    client=u.data;
  } else {
    const i = await db.from('clients').insert(row).select('*').single();
    if (i.error) return json({ error:i.error.message },500);
    client=i.data;
  }

  const syncRow:any = {
    provider:'leadconnector',
    location_id:String(payload?.locationId || contact?.locationId || opportunity?.locationId || locationId || '') || null,
    external_contact_id:externalContactId,
    external_opportunity_id:opportunity?.id || null,
    external_pipeline_id:opportunity?.pipelineId || null,
    external_stage_id:opportunity?.pipelineStageId || opportunity?.stageId || null,
    phone:phone || null,
    contact_name:client.name,
    email:email || null,
    city:client.city || null,
    lead_source:client.lead_source || '1North',
    assigned_to_external:opportunity?.assignedTo || contact?.assignedTo || null,
    opportunity_status:opportunity?.status || null,
    opportunity_value:Number(opportunity?.monetaryValue || 0) || null,
    payload,
    last_event_type:type,
    last_event_at:new Date().toISOString(),
    client_id:client.id,
    imported_at:new Date().toISOString(),
    sync_error:null,
    updated_at:new Date().toISOString(),
  };
  const up = await db.from('crm_leadconnector_sync').upsert(syncRow,{ onConflict:'provider,location_id,external_contact_id' });
  if (up.error) return json({ error:up.error.message },500);
  return json({ ok:true, clientId:client.id, type });
});