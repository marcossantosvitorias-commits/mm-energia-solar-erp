import { listClients } from './clientService.js';

const NOTIFIED_KEY = 'mm-erp-reminder-notified-v1';

function readNotified() {
  try {
    return JSON.parse(window.localStorage.getItem(NOTIFIED_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeNotified(value) {
  window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(value));
}

export async function ensureReminderServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/mm-erp-sw.js');
  } catch {
    return null;
  }
}

export async function requestReminderNotifications() {
  if (!('Notification' in window)) {
    return { ok: false, message: 'Este navegador não oferece notificações.' };
  }

  await ensureReminderServiceWorker();
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    return { ok: true, message: 'Notificações ativadas neste celular.' };
  }
  if (permission === 'denied') {
    return { ok: false, message: 'As notificações estão bloqueadas nas configurações do navegador.' };
  }
  return { ok: false, message: 'Permissão de notificação não concedida.' };
}

async function showReminder(client) {
  const title = `Retorno de cliente — ${client.name}`;
  const body = client.reminderNote || `Entrar em contato com ${client.name}${client.phone ? ` • ${client.phone}` : ''}.`;
  const options = {
    body,
    tag: `crm-reminder-${client.id}`,
    renotify: true,
    data: { url: '/app/clientes', clientId: client.id },
  };

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
  }

  // Fallback para navegadores sem service worker ativo.
  // eslint-disable-next-line no-new
  new Notification(title, options);
}

export async function checkDueReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return [];

  const clients = await listClients();
  const now = Date.now();
  const due = clients.filter((client) => {
    if (!client.nextContactAt || client.reminderDone) return false;
    const time = new Date(client.nextContactAt).getTime();
    return Number.isFinite(time) && time <= now;
  });

  const notified = readNotified();
  for (const client of due) {
    const signature = String(client.nextContactAt);
    if (notified[client.id] === signature) continue;
    await showReminder(client);
    notified[client.id] = signature;
  }
  writeNotified(notified);
  return due;
}

export function clearReminderNotificationMarker(clientId) {
  const notified = readNotified();
  delete notified[clientId];
  writeNotified(notified);
}
