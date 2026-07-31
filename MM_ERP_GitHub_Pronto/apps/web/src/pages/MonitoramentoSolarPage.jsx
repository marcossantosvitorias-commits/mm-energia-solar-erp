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

function MonitoramentoSolarPage() {
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [plants, setPlants] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState('Verificando a conexão com a SOLARMAN...');

  const syncNow = async () => {
    setSyncing(true);
    setMessage('Buscando todas as usinas e organizações da conta SOLARMAN...');
    try {
      const solarmanPlants = await syncSolarmanPlants();
      const otherProviders = plants.filter((plant) => plant.provider !== 'solarman');
      setPlants([...solarmanPlants, ...otherProviders]);
      setConfigured(true);
      setMessage(`${solarmanPlants.length} usinas SOLARMAN sincronizadas com segurança.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível sincronizar agora.');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    let active = true;

    checkSolarMonitoring()
      .then(async (status) => {
        if (!active) return;
        const isConfigured = Boolean(status.configured);
        setConfigured(isConfigured);

        if (!isConfigured) {
          setMessage('Credenciais oficiais da SOLARMAN ainda não foram configuradas no servidor.');
          return;
        }

        setMessage('SOLARMAN conectada. Sincronizando todas as usinas...');
        setSyncing(true);
        try {
          const solarmanPlants = await syncSolarmanPlants();
          if (!active) return;
          setPlants(solarmanPlants);
          setMessage(`${solarmanPlants.length} usinas SOLARMAN sincronizadas com segurança.`);
        } catch (error) {
          if (active) setMessage(error instanceof Error ? error.message : 'Não foi possível sincronizar agora.');
        } finally {
          if (active) setSyncing(false);
        }
      })
      .catch(() => {
        if (active) setMessage('A função de monitoramento ainda não foi publicada no Supabase.');
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
        <article><span><Cloud size={20} /></span><div><small>Usinas sincronizadas</small><strong>{totals.plants}</strong></div></article>
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

        {!syncing && visiblePlants.length === 0 ? (
          <div className="monitor-empty">
            <Sun size={34} />
            <strong>Nenhuma usina sincronizada</strong>
            <span>{configured ? 'Clique em Sincronizar agora para consultar a conta SOLARMAN.' : 'Configure as credenciais da SOLARMAN no servidor.'}</span>
          </div>
        ) : null}

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
