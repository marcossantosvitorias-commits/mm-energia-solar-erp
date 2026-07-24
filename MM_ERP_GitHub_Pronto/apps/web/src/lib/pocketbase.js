import PocketBase from 'pocketbase';

const pocketBaseUrl = import.meta.env.VITE_POCKETBASE_URL?.trim();

export const isPocketBaseConfigured = Boolean(pocketBaseUrl);
export const pb = new PocketBase(pocketBaseUrl || 'http://127.0.0.1:8090');

pb.autoCancellation(false);
