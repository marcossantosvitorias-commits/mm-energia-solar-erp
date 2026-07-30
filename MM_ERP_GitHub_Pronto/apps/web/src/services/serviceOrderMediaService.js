import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

function ensureDatabase() {
  if (!isSupabaseConfigured || !supabase) throw new Error('O Supabase não está configurado nesta publicação.');
}

export async function uploadServiceOrderPhoto(serviceOrderId, file, metadata = {}) {
  ensureDatabase();
  if (!file) throw new Error('Selecione uma foto.');
  const extension = file.name?.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${serviceOrderId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('service-orders').upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type || undefined,
  });
  if (uploadError) throw uploadError;

  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('service_order_photos').insert({
    service_order_id: serviceOrderId,
    stage: metadata.stage || 'Durante',
    storage_path: path,
    caption: metadata.caption?.trim() || null,
    latitude: metadata.latitude || null,
    longitude: metadata.longitude || null,
    uploaded_by: authData?.user?.id || null,
  }).select('*').single();
  if (error) {
    await supabase.storage.from('service-orders').remove([path]);
    throw error;
  }
  return data;
}

export async function getServiceOrderPhotoUrl(storagePath, expiresIn = 3600) {
  ensureDatabase();
  const { data, error } = await supabase.storage.from('service-orders').createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteServiceOrderPhoto(photo) {
  ensureDatabase();
  const { error: storageError } = await supabase.storage.from('service-orders').remove([photo.storage_path]);
  if (storageError) throw storageError;
  const { error } = await supabase.from('service_order_photos').delete().eq('id', photo.id);
  if (error) throw error;
}
