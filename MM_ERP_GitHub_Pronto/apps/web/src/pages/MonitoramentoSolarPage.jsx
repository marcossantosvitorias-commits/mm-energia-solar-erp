import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  ExternalLink,
  Gauge,
  PlugZap,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  WifiOff,
  Zap,
} from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { checkSolarMonitoring, syncSolarmanPlants } from '../services/solarMonitoringApi.js';
import './monitoramento-solar.css';

const PROVIDERS = [
  { id: 'fronius', name: 'Fronius Solar.web', api: 'Próxima integração', tone: 'green' },
  { id: 'solarman', name: 'SOLARMAN Business', api: 'Conector de servidor pronto', tone: 'blue' },
  { id: 'growatt', name: 'Growatt Shine', api: 'Próxima integração', tone: 'orange' },
  { id: 'apsystems', name: 'APsystems EMA', api: 'Próxima integração', tone: 'violet' },
  { id: 'tsun', name: 'TSUN Smart', api: 'Próxima integração', tone: 'cyan' },
];

const DEMO_PLANTS = [
  { id: 'demo-1', client: 'Adilson - casa', provider: 'solarman', power: 0, today: 28.53, capacity: 12.32, online: false, alert: false, updatedAt: '18:22' },
  { id: 'demo-2', client: 'Adilson - Clebinho', provider: 'solarman', power: 0, today: 39.77, capacity: 8.96, online: false, alert: false, updatedAt: '18:17' },
  { id: 'demo-3', client: 'Adriano e Fabiana', provider: 'growatt', power: 16, today: 19.70, capacity: 4.88, online: true, alert: false, updatedAt: '17:57' },
  { id: 'demo-4', client: 'Ana Paula', provider: 'fronius', power: 28, today: 26.30, capacity: 7.20, online: true, alert: false, updatedAt: '17:52' },
];

function MonitoramentoSolarPage() {
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [plants, setPlants] = useState(DEMO_PLANTS);
  const [syncing, setSyncing] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState('Modo demonstração: aguardando credenciais oficiais da SOLARMAN.');

  useEffect(() => {
    let active = true;
    checkSolarMonitoring()
      .then((status) => {
        if (!active) return;
        setConfigured(Boolean(status.configured));
        if (status.configured) setMessage('SOLARMAN configurada no servidor. Clique em Sincronizar agora.');
      })
      .catch(() => {
        if (active) setMessage('Função de servidor criada, mas ainda não foi publicada no Supabase.');
      });
    return () => { active = false; };
  }, []);

  const visiblePlants = useMemo(() => plants.filter((plant) => {
    const matchesText = plant.client.toLowerCase().includes(query.toLowerCase());
    const matchesProvider = providerFilter === 'all' || plant.provider === providerFilter;
    return matchesText && matchesProvider;
  }), [plants, query, providerFilter]);

  const totals = useMemo(() => ({
    plants: plants.length,
    online: plants.filter((plant) => plant.online).length,
    alerts: plants.filter((plant) => plant.alert).length,
    today: plants.reduce((sum, plant) => sum + Number(plant.today || 0), 0),
  }), [plants]);

  const providerName = (id) => PROVIDERS.find((provider) => provider.id === id)?.name || id;

  const syncNow = async () => {
    setSyncing(true);
    try {
      const solarmanPlants = await syncSolarmanPlants();
      const otherProviders = plants.filter((plant) => plant.provider !== 'solarman' && !plant.id.startsWith('demo-'));
      setPlants([...solarmanPlants, ...otherProviders]);
      setConfigured(true);
      setMessage(`${solarmanPlants.length} usinas SOLARMAN sincronizadas com segurança.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível sincronizar agora.');
    } finally {
      setSyncing(false);
    }
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
          <p>{message}</p>
        </div>
        <button className="monitor-sync" type="button" onClick={syncNow} disabled={syncing || !configured}>
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
          <div><h3>Integrações disponíveis</h3><p>As senhas e chaves ficam somente no servidor. Nada sensível é salvo no navegador.</p></div>
        </div>
        <div className="provider-grid">
          {PROVIDERS.map((provider) => {
            const connected = provider.id === 'solarman' && configured;
            return (
              <article key={provider.id} className={`provider-card ${provider.tone}`}>
                <div className="provider-icon"><PlugZap size={23} /></div>
                <div className="provider-copy">
                  <strong>{provider.name}</strong>
                  <span>{provider.api}</span>
                  <small className={connected ? 'connected' : ''}>{connected ? 'Conectada no servidor' : provider.id === 'solarman' ? 'Aguardando credenciais' : 'Em preparação'}</small>
                </div>
                <div className="provider-actions">
                  <span title="Credenciais protegidas no servidor"><ShieldCheck size={18} /></span>
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
          {visiblePlants.map((plant) => (
            <article key={`${plant.provider}-${plant.id}`} className="plant-card">
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
                <div><small>Potência</small><strong>{Number(plant.power || 0).toFixed(0)} W</strong></div>
                <div><small>Hoje</small><strong>{Number(plant.today || 0).toFixed(2)} kWh</strong></div>
                <div><small>Capacidade</small><strong>{Number(plant.capacity || 0).toFixed(2)} kWp</strong></div>
              </div>
              <footer><Gauge size={15} /> Atualizado em {plant.updatedAt}</footer>
            </article>
          ))}
        </div>
      </section>
    </FinanceLayout>
  );
}

export default MonitoramentoSolarPage;
