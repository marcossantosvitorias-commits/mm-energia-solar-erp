import { requireSupabase } from '../lib/supabase';
import { getServiceOrder, listServiceOrderChecklist, updateChecklistItem } from './serviceOrderService.js';
import { uploadServiceOrderPhoto } from './serviceOrderMediaService.js';

const QUEUE_KEY = 'mm-erp-field-queue-v1';
const CACHE_PREFIX = 'mm-erp-field-order:';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const readQueue = () => {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
};
const writeQueue = (rows) => localStorage.setItem(QUEUE_KEY, JSON.stringify(rows));

export function isOnline() { return navigator.onLine; }
export function getPendingFieldActions() { return readQueue(); }

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS não disponível neste aparelho.'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      () => reject(new Error('Não foi possível obter a localização. Ative o GPS e permita o acesso.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}

export async function loadMobileInstallation(orderId) {
  try {
    const [order, checklist] = await Promise.all([getServiceOrder(orderId), listServiceOrderChecklist(orderId)]);
    const payload = { order, checklist, cachedAt: new Date().toISOString() };
    localStorage.setItem(`${CACHE_PREFIX}${orderId}`, JSON.stringify(payload));
    return { ...payload, offline: false };
  } catch (error) {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${orderId}`);
    if (!cached) throw error;
    return { ...JSON.parse(cached), offline: true };
  }
}

async function sendEvent(action) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('register_service_order_field_event', {
    p_service_order_id: action.orderId,
    p_event_type: action.eventType,
    p_event_data: action.data || {},
    p_latitude: action.position?.latitude || null,
    p_longitude: action.position?.longitude || null,
    p_accuracy_m: action.position?.accuracy || null,
    p_client_event_id: action.clientEventId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function registerFieldEvent(orderId, eventType, data = {}, position = null) {
  const action = { id: uid(), clientEventId: uid(), kind: 'event', orderId, eventType, data, position, createdAt: new Date().toISOString() };
  if (!isOnline()) {
    const queue = readQueue(); queue.push(action); writeQueue(queue);
    return { queued: true, action };
  }
  try { return { queued: false, data: await sendEvent(action) }; }
  catch {
    const queue = readQueue(); queue.push(action); writeQueue(queue);
    return { queued: true, action };
  }
}

export async function saveChecklistOffline(orderId, item, completed, notes = null) {
  const action = { id: uid(), kind: 'checklist', orderId, itemId: item.id, completed, notes, createdAt: new Date().toISOString() };
  if (!isOnline()) {
    const queue = readQueue(); queue.push(action); writeQueue(queue);
    return { queued: true, item: { ...item, completed, notes } };
  }
  try { return { queued: false, item: await updateChecklistItem(item.id, completed, notes) }; }
  catch {
    const queue = readQueue(); queue.push(action); writeQueue(queue);
    return { queued: true, item: { ...item, completed, notes } };
  }
}

function dataUrlToFile(dataUrl, name, type) {
  const [header, body] = dataUrl.split(',');
  const mime = type || header.match(/data:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name || `foto-${Date.now()}.jpg`, { type: mime });
}

export async function saveFieldPhoto(orderId, file, metadata = {}, position = null) {
  if (!file) throw new Error('Tire ou selecione uma foto.');
  if (isOnline()) {
    try {
      const photo = await uploadServiceOrderPhoto(orderId, file, { ...metadata, ...position });
      await registerFieldEvent(orderId, 'photo', { stage: metadata.stage, caption: metadata.caption, photo_id: photo.id }, position);
      return { queued: false, photo };
    } catch { /* cai para fila offline */ }
  }
  const dataUrl = await fileToDataUrl(file);
  const action = {
    id: uid(), kind: 'photo', orderId, dataUrl, fileName: file.name,
    fileType: file.type, metadata, position, createdAt: new Date().toISOString(),
  };
  const queue = readQueue(); queue.push(action); writeQueue(queue);
  return { queued: true, previewUrl: dataUrl };
}

export async function syncPendingFieldActions() {
  if (!isOnline()) return { synced: 0, pending: readQueue().length };
  const queue = readQueue();
  const remaining = [];
  let synced = 0;
  for (const action of queue) {
    try {
      if (action.kind === 'event') await sendEvent(action);
      if (action.kind === 'checklist') await updateChecklistItem(action.itemId, action.completed, action.notes);
      if (action.kind === 'photo') {
        const file = dataUrlToFile(action.dataUrl, action.fileName, action.fileType);
        const photo = await uploadServiceOrderPhoto(action.orderId, file, { ...action.metadata, ...action.position });
        await sendEvent({
          orderId: action.orderId, eventType: 'photo', clientEventId: action.id,
          data: { stage: action.metadata?.stage, caption: action.metadata?.caption, photo_id: photo.id },
          position: action.position,
        });
      }
      synced += 1;
    } catch { remaining.push(action); }
  }
  writeQueue(remaining);
  return { synced, pending: remaining.length };
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler a foto.'));
    reader.readAsDataURL(file);
  });
}
