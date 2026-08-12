export const ERP_ACCESS_OPTIONS = [
  { key: 'precos', label: 'Preços dos kits' },
  { key: 'clientes', label: 'Clientes e leads' },
  { key: 'whatsapp', label: 'WhatsApp / Pendências' },
  { key: 'calculadora', label: 'Calculadora Solar' },
  { key: 'propostas', label: 'Propostas comerciais' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'contratos', label: 'Contratos' },
  { key: 'cotacoes_belenus', label: 'Cotações Belenus' },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'fluxos', label: 'Fluxos e Kanbans' },
  { key: 'radar', label: 'Radar Solar' },
  { key: 'ordens_servico', label: 'Ordens de serviço' },
  { key: 'monitoramento', label: 'Monitoramento solar' },
  { key: 'equipamentos', label: 'Equipamentos' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'belcred', label: 'Simulador BelCred' },
  { key: 'tributos', label: 'Tributação' },
  { key: 'bling', label: 'Integração Bling' },
];

export function accessKeyForPath(pathname = '') {
  if (pathname.startsWith('/app/precos')) return 'precos';
  if (pathname.startsWith('/app/clientes')) return 'clientes';
  if (pathname.startsWith('/app/whatsapp')) return 'whatsapp';
  if (pathname.startsWith('/app/calculadora-solar')) return 'calculadora';
  if (pathname.startsWith('/app/propostas')) return 'propostas';
  if (pathname.startsWith('/app/agenda')) return 'agenda';
  if (pathname.startsWith('/app/contratos')) return 'contratos';
  if (pathname.startsWith('/app/cotacoes-belenus')) return 'cotacoes_belenus';
  if (pathname.startsWith('/app/dashboard')) return 'dashboard';
  if (pathname.startsWith('/app/fluxos')) return 'fluxos';
  if (pathname.startsWith('/app/prospeccao-solar')) return 'radar';
  if (pathname.startsWith('/app/ordens-servico') || pathname.startsWith('/app/pos-venda')) return 'ordens_servico';
  if (pathname.startsWith('/app/monitoramento')) return 'monitoramento';
  if (pathname.startsWith('/app/equipamentos')) return 'equipamentos';
  if (pathname.startsWith('/app/belcred')) return 'belcred';
  if (pathname.startsWith('/app/tributos')) return 'tributos';
  if (pathname.startsWith('/app/bling')) return 'bling';
  if (pathname === '/app') return 'financeiro';
  return null;
}
