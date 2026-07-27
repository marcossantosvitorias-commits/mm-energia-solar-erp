import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  ExternalLink,
  Gauge,
  Link2,
  PlugZap,
  RefreshCw,
  Search,
  Settings2,
  Sun,
  Unplug,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import './monitoramento-solar.css';

const PROVIDERS = [
  { id: 'fronius', name: 'Fronius Solar.web', api: 'API oficial', status: 'ready', tone: 'green' },
  { id: 'solarman', name: 'SOLARMAN Business', api: 'API para parceiros', status: 'ready', tone: 'blue' },
  { id: 'growatt', name: 'Growatt Shine', api: 'API para parceiros', status: 'ready', tone: 'orange' },
  { id: 'apsystems', name: 'APsystems EMA', api: 'API para integradores', status: 'ready', tone: 'violet' },
  { id: 'tsun', name: 'TSUN Smart', api: 'API para parceiros', status: 'ready', tone: 'cyan' },
];

const DEMO_PLANTS = [
  { id: 1, client: 'Adilson - casa', provider: 'solarman', power: 0, today: 28.53, capacity: 12.32, online: false, alert: false, updatedAt: '18:22' },
  { id: 2, client: 'Adilson - Clebinho', provider: 'solarman', power: 0, today: 39.77, capacity: 8.96, online: false, alert: false, updatedAt: '18:17' },
  { id: 3, client: 'Adriano e Fabiana', provider: 'growatt', power: 16, today: 19.70, capacity: 4.88, online: true, alert: false, updatedAt: '17:57' },
  { id: 4, client: 'Ana Paula', provider: 'fronius', power: 28, today: 26.30, capacity: 7.20, online: true, alert: false, updatedAt: '17:52' },
];

const getSavedConnections = () => {
  try {
    return JSON.parse(localStorage.getItem('mm-erp-monitor-connections') || '{}');
  } catch {
    return {};
  }
};

function MonitoramentoSolarPage() {
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [connections, setConnections] = useState(getSavedConnections);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [form, setForm] = useState({ label: '', clientId: '', clientSecret: '', apiKey: '', baseUrl: '' });
  const [syncing, setSyncing] = useState(false);

  const plants = useMemo(() => DEMO_PLANTS.filter((plant) => {
    const matchesText = plant.client.toLowerCase().includes(query.toLowerCase());
    const matchesProvider = providerFilter === 'all' || plant.provider === providerFilter;
    return matchesText && matchesProvider;
  }), [query, providerFilter]);

  const totals = useMemo(() => ({
    plants: DEMO_PLANTS.length,
    online: DEMO_PLANTS.filter((plant) => plant.online).length,
    alerts: DEMO_PLANTS.filter((plant) => plant.alert).length,
    today: DEMO_PLANTS.reduce((sum, plant) => sum + plant.today, 0),
  }), []);

  const providerName = (id) => PROVIDERS.find((provider) => provider.id === id)?.name || id;

  const openConnection = (provider) => {
    setSelectedProvider(provider);
    setForm(connections[provider.id] || { label: '', clientId: '', clientSecret: '', apiKey: '', baseUrl: '' });
  };

  const saveConnection = (event) => {
    event.preventDefault();
    const next = { ...connections, [selectedProvider.id]: { ...form, configuredAt: new Date().toISOString() } };
    setConnections(next);
    localStorage.setItem('mm-erp-monitor-connections', JSON.stringify(next));
    setSelectedProvider(null);
  };

  const disconnect = (providerId) => {
    const next = { ...connections };
    delete next[providerId];
    setConnections(next);
    localStorage.setItem('mm-erp-monitor-connections', JSON.stringify(next));
  };

  const syncNow = async () => {
    setSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSyncing(false);
  };

  return (
    <FinanceLayout
      title="Central de monitoramento solar"
      subtitle="Todos os sistemas fotovoltaicos em um único painel, sem precisar abrir vários aplicativos."
    >
      <section className="monitor-hero">
        <div>
          <span className="monitor-badge"><Sun size={15} /> ERP 2.0 Preview</span>
          <h2>Visão unificada das usinas</h2>
          <p>A estrutura está pronta para receber as APIs oficiais. As credenciais ficam configuradas por fabricante e a produção continua isolada.</p>
        </div>
        <button className="monitor-sync" type="button" onClick={syncNow} disabled={syncing}>
          <RefreshCw size={18} className={syncing ? 'spinning' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
      </section>

      <section className="monitor-kpis">
        <article><span><Cloud size={20} /></span><div><small>Usinas</small><strong>{totals.plants}</strong></div></article>
        <article><span><CheckCircle2 size={20} /></span><div><small>Online</small><strong>{totals.online}</strong></div></article>
        <article><span><AlertTriangle size={20} /></span><div><small>Alertas</small><strong>{totals.alerts}</strong></div></article>
        <article><span><Zap size={20} /></span><div><small>Geração hoje</small><strong>{totals.today.toFixed(1)} kWh</strong></div></article>
      </section>

      <section className="monitor-panel">
        <div className="monitor-panel-head">
          <div><h3>Integrações disponíveis</h3><p>Conecte somente plataformas com acesso oficial ou credencial de parceiro.</p></div>
        </div>
        <div className="provider-grid">
          {PROVIDERS.map((provider) => {
            const connected = Boolean(connections[provider.id]);
            return (
              <article key={provider.id} className={`provider-card ${provider.tone}`}>
                <div className="provider-icon"><PlugZap size={23} /></div>
                <div className="provider-copy">
                  <strong>{provider.name}</strong>
                  <span>{provider.api}</span>
                  <small className={connected ? 'connected' : ''}>{connected ? 'Credenciais configuradas' : 'Aguardando credenciais'}</small>
                </div>
                <div className="provider-actions">
                  <button type="button" onClick={() => openConnection(provider)}><Settings2 size={16} /> {connected ? 'Editar' : 'Conectar'}</button>
                  {connected && <button className="icon-danger" type="button" aria-label="Desconectar" onClick={() => disconnect(provider.id)}><Unplug size={16} /></button>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="monitor-panel">
        <div className="monitor-toolbar">
          <div className="monitor-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou instalação" /></div>
          <select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}>
            <option value="all">Todas as marcas</option>
            {PROVIDERS.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
          </select>
        </div>

        <div className="plant-grid">
          {plants.map((plant) => (
            <article key={plant.id} className="plant-card">
              <div className="plant-card-head">
                <div className="plant-avatar"><Sun size={25} /></div>
                <div><h3>{plant.client}</h3><span>{providerName(plant.provider)}</span></div>
                <button type="button" title="Abrir detalhes"><ExternalLink size={17} /></button>
              </div>
              <div className="plant-status">
                <span className={plant.online ? 'online' : 'offline'}>{plant.online ? <Activity size={15} /> : <WifiOff size={15} />}{plant.online ? 'Online' : 'Desligado'}</span>
                <span className={plant.alert ? 'warning' : 'healthy'}>{plant.alert ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}{plant.alert ? 'Com alerta' : 'Sem alertas'}</span>
              </div>
              <div className="plant-metrics">
                <div><small>Potência</small><strong>{plant.power} W</strong></div>
                <div><small>Hoje</small><strong>{plant.today} kWh</strong></div>
                <div><small>Capacidade</small><strong>{plant.capacity} kWp</strong></div>
              </div>
              <footer><Gauge size={15} /> Atualizado às {plant.updatedAt}</footer>
            </article>
          ))}
        </div>
      </section>

      {selectedProvider && (
        <div className="monitor-modal-backdrop" role="presentation" onMouseDown={() => setSelectedProvider(null)}>
          <section className="monitor-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span>Configurar integração</span><h3>{selectedProvider.name}</h3></div><button type="button" onClick={() => setSelectedProvider(null)}><X size={20} /></button></header>
            <form onSubmit={saveConnection}>
              <label>Nome da conexão<input required value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} placeholder="Ex.: Conta MM Energia Solar" /></label>
              <label>Client ID / Usuário<input value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} autoComplete="off" /></label>
              <label>Client Secret / Senha<input type="password" value={form.clientSecret} onChange={(event) => setForm({ ...form, clientSecret: event.target.value })} autoComplete="new-password" /></label>
              <label>API Key / Token<input type="password" value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} autoComplete="new-password" /></label>
              <label>URL da API (quando fornecida pelo fabricante)<input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} placeholder="https://..." /></label>
              <div className="monitor-security-note"><Link2 size={17} /><p>Nesta Preview as configurações ficam somente neste navegador. Na integração real, segredos serão armazenados no servidor/Supabase Vault, nunca no código do site.</p></div>
              <div className="monitor-modal-actions"><button type="button" onClick={() => setSelectedProvider(null)}>Cancelar</button><button type="submit">Salvar configuração</button></div>
            </form>
          </section>
        </div>
      )}
    </FinanceLayout>
  );
}

export default MonitoramentoSolarPage;
