import { isPocketBaseConfigured, pb } from '../lib/pocketbase.js';

const STORAGE_KEY = 'mm-erp-clients';

function readLocalClients() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalClients(clients) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

export async function listClients() {
  if (isPocketBaseConfigured) {
    return pb.collection('clients').getFullList({ sort: '-created' });
  }

  return readLocalClients().sort((a, b) => new Date(b.created) - new Date(a.created));
}

export async function createClient(data) {
  if (isPocketBaseConfigured) {
    return pb.collection('clients').create(data);
  }

  const clients = readLocalClients();
  const client = {
    id: crypto.randomUUID(),
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    ...data,
  };

  writeLocalClients([client, ...clients]);
  return client;
}

export async function updateClient(id, data) {
  if (isPocketBaseConfigured) {
    return pb.collection('clients').update(id, data);
  }

  const clients = readLocalClients();
  const updated = clients.map((client) =>
    client.id === id
      ? { ...client, ...data, updated: new Date().toISOString() }
      : client,
  );

  writeLocalClients(updated);
  return updated.find((client) => client.id === id);
}

export async function deleteClient(id) {
  if (isPocketBaseConfigured) {
    await pb.collection('clients').delete(id);
    return;
  }

  writeLocalClients(readLocalClients().filter((client) => client.id !== id));
}
