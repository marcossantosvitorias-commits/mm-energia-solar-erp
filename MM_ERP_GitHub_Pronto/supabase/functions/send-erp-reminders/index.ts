import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:mmenergiasolar@hotmail.com';
const cronSecret = Deno.env.get('CRON_SECRET') || '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

type Alert = {
  key: string;
  type: string;
  referenceId: string;
  title: string;
  body: string;
  url: string;
};

const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL',
});

function dayDiff(date: string, now: Date) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(`${String(date).slice(0, 10)}T12:00:00`);
  const normalized = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((normalized.getTime() - today.getTime()) / 86400000);
}

async function buildAlerts(now: Date): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const today = now.toISOString().slice(0, 10);

  const { data: payables, error: payablesError } = await supabase
    .from('accounts_payable')
    .select('id, description, supplier, amount, due_date, status')
    .eq('status', 'pendente')
    .lte('due_date', new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10));
  if (payablesError) throw payablesError;

  for (const item of payables || []) {
    const days = dayDiff(item.due_date, now);
    if (![3, 1, 0].includes(days) && days >= 0) continue;
    const kind = days < 0 ? 'overdue' : `d${days}`;
    const title = days < 0 ? 'Boleto vencido' : days === 0 ? 'Boleto vence hoje' : `Boleto vence em ${days} dia${days > 1 ? 's' : ''}`;
    const supplier = item.supplier ? ` — ${item.supplier}` : '';
    alerts.push({
      key: `payable-${item.id}-${kind}-${today}`,
      type: 'payable',
      referenceId: item.id,
      title,
      body: `${item.description || 'Conta a pagar'}${supplier}: ${money(item.amount)}.`,
      url: '/app',
    });
  }

  const start = new Date(now.getTime() - 10 * 60000).toISOString();
  const end = new Date(now.getTime() + 25 * 60 * 60000).toISOString();
  const { data: appointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select('id, client_name, appointment_type, appointment_at, address, status')
    .not('status', 'in', '(Cancelado,Concluído)')
    .gte('appointment_at', start)
    .lte('appointment_at', end);
  if (appointmentsError) throw appointmentsError;

  for (const item of appointments || []) {
    const appointmentAt = new Date(item.appointment_at);
    const minutes = Math.round((appointmentAt.getTime() - now.getTime()) / 60000);
    const windows = [
      { id: '24h', min: 1380, max: 1500, title: 'Compromisso amanhã' },
      { id: '1h', min: 45, max: 75, title: 'Compromisso em 1 hora' },
      { id: 'now', min: -5, max: 10, title: 'Compromisso agora' },
    ];
    const match = windows.find((entry) => minutes >= entry.min && minutes <= entry.max);
    if (!match) continue;
    alerts.push({
      key: `appointment-${item.id}-${match.id}`,
      type: 'appointment',
      referenceId: item.id,
      title: match.title,
      body: `${item.appointment_type || 'Agendamento'} com ${item.client_name}${item.address ? ` — ${item.address}` : ''}.`,
      url: '/app/agenda',
    });
  }

  const reminderStart = new Date(now.getTime() - 7 * 86400000).toISOString();
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name, phone, next_contact_at, reminder_note, reminder_done')
    .eq('reminder_done', false)
    .not('next_contact_at', 'is', null)
    .gte('next_contact_at', reminderStart)
    .lte('next_contact_at', now.toISOString());
  if (clientsError) throw clientsError;

  for (const item of clients || []) {
    const reminderAt = new Date(item.next_contact_at);
    if (Number.isNaN(reminderAt.getTime())) continue;
    alerts.push({
      key: `client-${item.id}-${reminderAt.toISOString()}`,
      type: 'client_follow_up',
      referenceId: item.id,
      title: `Retorno de cliente — ${item.name}`,
      body: item.reminder_note || `Entrar em contato com ${item.name}${item.phone ? ` — ${item.phone}` : ''}.`,
      url: '/app/clientes',
    });
  }

  return alerts;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok');

  const cronHeader = request.headers.get('x-cron-secret') || '';
  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.replace(/^Bearer\s+/i, '');
  const authorizedByCronSecret = Boolean(cronSecret) && cronHeader === cronSecret;
  const authorizedBySupabaseCron = Boolean(anonKey) && bearer === anonKey;
  if (!authorizedByCronSecret && !authorizedBySupabaseCron) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const now = new Date();
    const alerts = await buildAlerts(now);
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('active', true);
    if (error) throw error;

    let sent = 0;
    let skipped = 0;
    let deactivated = 0;

    for (const subscription of subscriptions || []) {
      for (const alert of alerts) {
        const { data: existing } = await supabase
          .from('notification_deliveries')
          .select('id')
          .eq('notification_key', alert.key)
          .eq('subscription_id', subscription.id)
          .maybeSingle();
        if (existing) { skipped += 1; continue; }

        try {
          await webpush.sendNotification({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          }, JSON.stringify({
            title: alert.title,
            body: alert.body,
            icon: '/logo-mm.png',
            badge: '/logo-mm.png',
            tag: alert.key,
            url: alert.url,
          }), { TTL: 3600, urgency: 'high' });

          await supabase.from('notification_deliveries').insert({
            notification_key: alert.key,
            subscription_id: subscription.id,
            notification_type: alert.type,
            reference_id: alert.referenceId,
          });
          sent += 1;
        } catch (pushError) {
          const statusCode = Number((pushError as { statusCode?: number }).statusCode || 0);
          if ([404, 410].includes(statusCode)) {
            await supabase.from('push_subscriptions').update({ active: false }).eq('id', subscription.id);
            deactivated += 1;
          } else {
            console.error('Push error', pushError);
          }
        }
      }
    }

    await supabase.rpc('cleanup_notification_deliveries');
    return new Response(JSON.stringify({ ok: true, alerts: alerts.length, sent, skipped, deactivated }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});
