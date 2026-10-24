import { requireSupabase } from '../lib/supabase';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo da conta.'));
    reader.readAsDataURL(file);
  });
}

export async function analyzeEnergyBill(file) {
  if (!file) throw new Error('Selecione uma foto ou PDF da conta de energia.');
  if (!(file.type?.startsWith('image/') || file.type === 'application/pdf')) {
    throw new Error('Envie uma imagem ou PDF da conta de energia.');
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('O arquivo deve ter no máximo 8 MB.');
  const dataBase64 = await readAsBase64(file);
  const { data, error } = await requireSupabase().functions.invoke('analyze-energy-bill', {
    body: { file_name: file.name, mime_type: file.type, data_base64: dataBase64 },
  });
  if (error) throw new Error(error.message || 'Não foi possível analisar a conta.');
  if (!data?.ok || !data?.extracted) throw new Error(data?.message || 'A IA não encontrou dados suficientes na conta.');
  return data.extracted;
}
