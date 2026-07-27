const AGENDA_KEY = 'mm-erp-agendamentos-v1';
const PAYABLES_KEY = 'mm-erp-contas-pagar-v2';
const SENT_KEY = 'mm-erp-notificacoes-enviadas-v1';

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dateAtNoon(value) {
  return new Date(`${String(value).slice(0, 10)}T12:00:00`);
}

function daysBetween(dateValue, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = dateAtNoon(dateValue);
  const normalizedTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((normalizedTarget - today) / 86400000);
}

function appointmentDate(item) {
  return new Date(`${item.data}T${item.horario || '09:00'}:00`);
}

async function show(title, body, tag, url) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: '/logo-mm.png',
      badge: '/logo-mm.png',
      tag,
      renotify: false,
      data: { url },
      vibrate: [200, 100, 200],
    });
    return true;
  }

  new Notification(title, { body, icon: '/logo-mm.png', tag });
  return true;
}

function sentRegistry() {
  const registry = readJson(SENT_KEY, {});
  const limit = Date.now() - (14 * 86400000);
  return Object.fromEntries(Object.entries(registry).filter(([, timestamp]) => Number(timestamp) >= limit));
}

export async function requestErpNotificationPermission() {
  if (!('Notification' in window)) return { ok: false, message: 'Este aparelho não oferece notificações pelo navegador.' };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, message: 'As notificações não foram autorizadas no celular.' };
  await show('Notificações ativadas', 'O MM ERP avisará sobre boletos e compromissos.', 'mm-erp-enabled', '/app/dashboard');
  return { ok: true, message: 'Notificações ativadas neste celular.' };
}

export async function checkErpReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const sent = sentRegistry();
  const now = new Date();
  let changed = false;

  const payables = readJson(PAYABLES_KEY, []);
  for (const item of payables) {
    if (item.status !== 'pendente' || !item.vencimento) continue;
    const days = daysBetween(item.vencimento, now);
    if (![3, 1, 0].includes(days) && days >= 0) continue;

    const kind = days < 0 ? 'vencido' : `d${days}`;
    const tag = `boleto-${item.id}-${kind}-${now.toISOString().slice(0, 10)}`;
    if (sent[tag]) continue;

    const title = days < 0 ? 'Boleto vencido' : days === 0 ? 'Boleto vence hoje' : `Boleto vence em ${days} dia${days > 1 ? 's' : ''}`;
    const supplier = item.fornecedor ? ` — ${item.fornecedor}` : '';
    if (await show(title, `${item.descricao || 'Conta a pagar'}${supplier}: ${money(item.valor)}.`, tag, '/app')) {
      sent[tag] = Date.now();
      changed = true;
    }
  }

  const appointments = readJson(AGENDA_KEY, []);
  for (const item of appointments) {
    if (!item.data || !item.horario || item.status === 'Cancelado' || item.status === 'Concluído') continue;
    const date = appointmentDate(item);
    const minutes = Math.round((date - now) / 60000);
    const windows = [
      { id: '24h', min: 1380, max: 1500, title: 'Compromisso amanhã' },
      { id: '1h', min: 45, max: 75, title: 'Compromisso em 1 hora' },
      { id: 'agora', min: -5, max: 10, title: 'Compromisso agora' },
    ];
    const windowMatch = windows.find((entry) => minutes >= entry.min && minutes <= entry.max);
    if (!windowMatch) continue;

    const tag = `agenda-${item.id}-${windowMatch.id}`;
    if (sent[tag]) continue;
    const body = `${item.tipo || 'Agendamento'} com ${item.cliente}${item.endereco ? ` — ${item.endereco}` : ''}.`;
    if (await show(windowMatch.title, body, tag, '/app/agenda')) {
      sent[tag] = Date.now();
      changed = true;
    }
  }

  if (changed) writeJson(SENT_KEY, sent);
}

export function startErpReminderChecks() {
  const run = () => checkErpReminders().catch(() => {});
  run();
  const timer = window.setInterval(run, 5 * 60 * 1000);
  window.addEventListener('focus', run);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') run();
  });
  return () => window.clearInterval(timer);
}
