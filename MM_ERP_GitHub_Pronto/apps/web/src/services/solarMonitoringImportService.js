import { supabase } from '../lib/supabase.js';

const HEADER_ALIASES = {
  id: ['id', 'station id', 'stationid', 'usina id', 'codigo', 'código'],
  client: ['station name', 'stationname', 'nome da usina', 'nome usina', 'usina', 'cliente', 'name'],
  power: ['generation power', 'generationpower', 'potencia atual', 'potência atual', 'power', 'potencia', 'potência'],
  today: ['generation today', 'generationtoday', 'day generation', 'daygeneration', 'geracao hoje', 'geração hoje', 'today'],
  capacity: ['installed capacity', 'installedcapacity', 'capacidade instalada', 'capacity', 'capacidade'],
  status: ['network status', 'networkstatus', 'status', 'estado'],
  alerts: ['alert count', 'alertcount', 'alarm count', 'alarmcount', 'alertas', 'alarmes'],
  updatedAt: ['update time', 'updatetime', 'updated at', 'updatedat', 'ultima atualizacao', 'última atualização', 'data'],
};

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const parseNumber = (value) => {
  const raw = String(value ?? '').trim().replace(/\s/g, '');
  if (!raw) return 0;
  const normalized = raw.includes(',') && raw.includes('.')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(',', '.');
  const number = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
};

const splitCsvLine = (line, separator) => {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === separator && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
};

const findColumn = (headers, aliases) => headers.findIndex((header) => aliases.includes(normalize(header)));

export async function parseSolarmanCsv(file) {
  const text = (await file.text()).replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('O relatório está vazio ou não possui linhas de usinas.');

  const firstLine = lines[0];
  const separator = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  const headers = splitCsvLine(firstLine, separator);
  const columns = Object.fromEntries(Object.entries(HEADER_ALIASES).map(([key, aliases]) => [key, findColumn(headers, aliases)]));

  if (columns.client < 0) {
    throw new Error('Não encontrei a coluna com o nome da usina. Exporte o relatório de usinas do SOLARMAN em CSV.');
  }

  const importedAt = new Date().toISOString();
  return lines.slice(1).map((line, rowIndex) => {
    const cells = splitCsvLine(line, separator);
    const client = String(cells[columns.client] ?? '').trim();
    if (!client) return null;
    const status = columns.status >= 0 ? normalize(cells[columns.status]) : '';
    const alertCount = columns.alerts >= 0 ? parseNumber(cells[columns.alerts]) : 0;
    const externalId = columns.id >= 0 ? String(cells[columns.id] ?? '').trim() : '';
    return {
      external_id: externalId || `solarman-${normalize(client).replace(/[^a-z0-9]+/g, '-')}-${rowIndex + 1}`,
      client_name: client,
      provider: 'solarman',
      current_power_w: columns.power >= 0 ? parseNumber(cells[columns.power]) : 0,
      generation_today_kwh: columns.today >= 0 ? parseNumber(cells[columns.today]) : 0,
      installed_capacity_kwp: columns.capacity >= 0 ? parseNumber(cells[columns.capacity]) : 0,
      is_online: status ? !['offline', 'desligado', 'inativo', 'disconnected'].includes(status) : false,
      has_alert: alertCount > 0 || ['alerta', 'alarm', 'falha', 'warning'].some((word) => status.includes(word)),
      source_updated_at: columns.updatedAt >= 0 && cells[columns.updatedAt] ? String(cells[columns.updatedAt]) : null,
      imported_at: importedAt,
      raw_data: Object.fromEntries(headers.map((header, index) => [header || `coluna_${index + 1}`, cells[index] ?? ''])),
    };
  }).filter(Boolean);
}

export async function importSolarmanPlants(file) {
  const rows = await parseSolarmanCsv(file);
  if (!rows.length) throw new Error('Nenhuma usina válida foi encontrada no relatório.');

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  const payload = rows.map((row) => ({ ...row, user_id: userId || null }));
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
