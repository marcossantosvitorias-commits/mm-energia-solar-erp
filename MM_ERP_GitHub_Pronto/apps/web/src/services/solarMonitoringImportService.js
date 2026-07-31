import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase.js';

const HEADER_ALIASES = {
  id: ['id', 'station id', 'usina id', 'codigo'],
  client: ['nome da planta', 'station name', 'nome da usina', 'usina', 'cliente', 'name'],
  power: ['producao kw', 'generation power', 'potencia atual', 'power', 'potencia'],
  today: ['producao diaria kwh', 'generation today', 'day generation', 'geracao hoje', 'today'],
  capacity: ['capacidade kwp', 'installed capacity', 'capacidade instalada', 'capacity', 'capacidade'],
  status: ['comunicacao', 'status na rede', 'network status', 'status', 'estado'],
  alerts: ['alerta', 'alert count', 'alarm count', 'alertas', 'alarmes'],
  updatedAt: ['ultima atualizacao', 'update time', 'updated at', 'data'],
};

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, ' ')
  .trim()
  .toLowerCase();

const parseNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? '').trim().replace(/\s/g, '');
  if (!raw) return 0;
  const normalized = raw.includes(',') && raw.includes('.')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(',', '.');
  const number = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
};

const findColumn = (headers, aliases) => {
  const normalizedAliases = aliases.map(normalize);
  return headers.findIndex((header) => normalizedAliases.includes(normalize(header)));
};

const normalizeCapacity = (value) => {
  const capacity = parseNumber(value);
  return capacity >= 1000 ? capacity / 1000 : capacity;
};

const normalizePowerWatts = (value, header) => {
  const power = parseNumber(value);
  return normalize(header).includes('kw') ? power * 1000 : power;
};

const rowsToPlants = (matrix) => {
  const rows = matrix.filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim()));
  if (rows.length < 2) throw new Error('O relatório está vazio ou não possui linhas de usinas.');

  const headers = rows[0].map((header) => String(header ?? '').trim());
  const columns = Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([key, aliases]) => [key, findColumn(headers, aliases)]),
  );

  if (columns.client < 0) {
    throw new Error('Não encontrei a coluna “Nome da planta” no relatório SOLARMAN.');
  }

  const importedAt = new Date().toISOString();
  return rows.slice(1).map((cells, rowIndex) => {
    const client = String(cells[columns.client] ?? '').trim();
    if (!client) return null;

    const communication = columns.status >= 0 ? normalize(cells[columns.status]) : '';
    const alertText = columns.alerts >= 0 ? normalize(cells[columns.alerts]) : '';
    const alertCount = columns.alerts >= 0 ? parseNumber(cells[columns.alerts]) : 0;
    const externalId = columns.id >= 0 ? String(cells[columns.id] ?? '').trim() : '';
    const statusOffline = ['offline', 'desligada', 'desligado', 'inativo', 'desconectada', 'disconnected']
      .some((word) => communication.includes(word));
    const statusOnline = ['normal', 'conectada', 'conectado', 'online', 'parcialmente offline']
      .some((word) => communication.includes(word));

    return {
      external_id: externalId || `solarman-${normalize(client).replace(/[^a-z0-9]+/g, '-')}-${rowIndex + 1}`,
      client_name: client,
      provider: 'solarman',
      current_power_w: columns.power >= 0
        ? normalizePowerWatts(cells[columns.power], headers[columns.power])
        : 0,
      generation_today_kwh: columns.today >= 0 ? parseNumber(cells[columns.today]) : 0,
      installed_capacity_kwp: columns.capacity >= 0 ? normalizeCapacity(cells[columns.capacity]) : 0,
      is_online: statusOnline && !statusOffline,
      has_alert: alertCount > 0 || (!['', 'normal', 'sem alerta', 'no alarm'].includes(alertText)),
      source_updated_at: columns.updatedAt >= 0 && cells[columns.updatedAt]
        ? String(cells[columns.updatedAt])
        : null,
      imported_at: importedAt,
      raw_data: Object.fromEntries(headers.map((header, index) => [header || `coluna_${index + 1}`, cells[index] ?? ''])),
    };
  }).filter(Boolean);
};

export async function parseSolarmanReport(file) {
  const extension = file.name.toLowerCase().split('.').pop();
  if (!['xlsx', 'xls', 'csv', 'txt'].includes(extension)) {
    throw new Error('Selecione um relatório SOLARMAN em Excel (.xlsx/.xls) ou CSV.');
  }

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('O arquivo não possui nenhuma planilha.');

  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  });

  return rowsToPlants(matrix);
}

export async function importSolarmanPlants(file) {
  const rows = await parseSolarmanReport(file);
  if (!rows.length) throw new Error('Nenhuma usina válida foi encontrada no relatório.');

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    throw new Error('Sua sessão expirou. Entre novamente no ERP antes de importar.');
  }

  const payload = rows.map((row) => ({ ...row, user_id: userData.user.id }));
  const { error } = await supabase
    .from('solar_monitoring_plants')
    .upsert(payload, { onConflict: 'user_id,provider,external_id' });

  if (error) throw new Error(error.message || 'Não foi possível salvar as usinas no Supabase.');
  return rows.length;
}

export async function listImportedSolarPlants() {
  const { data, error } = await supabase
    .from('solar_monitoring_plants')
    .select('*')
    .order('client_name', { ascending: true });

  if (error) throw new Error(error.message || 'Não foi possível carregar as usinas importadas.');

  return (data || []).map((plant) => ({
    id: plant.external_id,
    client: plant.client_name,
    provider: plant.provider,
    power: Number(plant.current_power_w || 0),
    today: Number(plant.generation_today_kwh || 0),
    capacity: Number(plant.installed_capacity_kwp || 0),
    online: Boolean(plant.is_online),
    alert: Boolean(plant.has_alert),
    updatedAt: plant.source_updated_at || plant.imported_at,
  }));
}
