const KNOWN_KEYS = [
  'mm-erp-clients',
  'mm-erp-movimentacoes-v2',
  'mm-erp-contas-pagar-v2',
  'mm-erp-contas-receber-v2',
  'mm-erp-equipamentos-v2',
  'mm-erp-tributos-v2',
  'mm-erp-belcred-simulacoes',
  'mm-erp-belenus-cotacoes',
];

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function collectLocalErpData() {
  const data = {};

  KNOWN_KEYS.forEach((key) => {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) data[key] = safeParse(raw);
  });

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || data[key] !== undefined) continue;
    if (key.startsWith('mm-erp-')) data[key] = safeParse(window.localStorage.getItem(key));
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    origin: window.location.origin,
    data,
  };
}

export function downloadLocalErpBackup() {
  const backup = collectLocalErpData();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  anchor.href = url;
  anchor.download = `backup-mm-erp-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return backup;
}

export function restoreLocalErpBackup(backup) {
  if (!backup || backup.version !== 1 || !backup.data || typeof backup.data !== 'object') {
    throw new Error('Arquivo de backup inválido.');
  }

  Object.entries(backup.data).forEach(([key, value]) => {
    window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  });

  return Object.keys(backup.data).length;
}

export function markMigrationCompleted(summary) {
  window.localStorage.setItem('mm-erp-supabase-migration-v1', JSON.stringify({
    completedAt: new Date().toISOString(),
    summary,
  }));
}

export function getMigrationStatus() {
  return safeParse(window.localStorage.getItem('mm-erp-supabase-migration-v1'));
}

export { KNOWN_KEYS };
