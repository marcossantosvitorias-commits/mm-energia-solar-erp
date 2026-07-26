const KNOWN_KEYS = [
  'mm-erp-clients',
  'mm-erp-movimentacoes-v2',
  'mm-erp-contas-pagar-v2',
  'mm-erp-contas-receber-v2',
  'mm-erp-marcos-v2',
  'mm-erp-equipamentos-v1',
  'mm-erp-equipamentos-v2',
  'mm-erp-contratos-v1',
  'mm-erp-cotacoes-belenus-config-v1',
  'mm-erp-tributos-v2',
  'mm-erp-belcred-simulacoes',
  'mm-erp-belenus-cotacoes',
  'mm-erp-bling-contatos-v1',
  'mm-erp-pedidos-compra-v1',
  'mm-erp-pedidos-venda-v1',
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

export function clearLocalErpData() {
  const removed = [];
  const keys = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith('mm-erp-')) keys.push(key);
  }
  keys.forEach((key) => {
    window.localStorage.removeItem(key);
    removed.push(key);
  });
  return removed;
}

export { KNOWN_KEYS };
