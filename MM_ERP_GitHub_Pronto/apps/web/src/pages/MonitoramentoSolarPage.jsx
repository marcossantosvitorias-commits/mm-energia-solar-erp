import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  FileSpreadsheet,
  Gauge,
  Search,
  Sun,
  Upload,
  WifiOff,
  Zap,
} from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import {
  importSolarmanPlants,
  listImportedSolarPlants,
} from '../services/solarMonitoringImportService.js';
import './monitoramento-solar.css';

const PROVIDERS = [
  { id: 'solarman', name: 'SOLARMAN Business' },
  { id: 'fronius', name: 'Fronius Solar.web' },
  { id: 'growatt', name: 'Growatt Shine' },
  { id: 'apsystems', name: 'APsystems EMA' },
  { id: 'tsun', name: 'TSUN Smart' },
];

function MonitoramentoSolarPage() {
  const fileInputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [plants, setPlants] = useState([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('Importe o relatório CSV do SOLARMAN para atualizar todas as usinas sem pagar OpenAPI.');

  const loadPlants = async () => {
    try {
      const importedPlants = await listImportedSolarPlants();
      setPlants(importedPlants);
      if (importedPlants.length) {
        setMessage(`${importedPlants.length} usinas carregadas do último relatório importado.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível carregar as usinas salvas.');
    }
  };

  useEffect(() => {
    loadPlants();
  }, []);

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.txt')) {
      setMessage('Selecione o relatório exportado em CSV. Arquivos Excel devem ser salvos como CSV antes da importação.');
      return;
    }

    setImporting(true);
    setMessage(`Importando ${file.name}...`);
    try {
      const importedCount = await importSolarmanPlants(file);
      const importedPlants = await listImportedSolarPlants();
      setPlants(importedPlants);
      setMessage(`${importedCount} usinas foram importadas e atualizadas com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível importar o relatório.');
    } finally {
      setImporting(false);
    }
  };

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
  const formatUpdatedAt = (value) => {
    if (!value) return 'não informado';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
  };

  return (
    <FinanceLayout
      title="Central de monitoramento solar"
      subtitle="Importe o relatório do SOLARMAN e acompanhe todas as usinas em um único painel."
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        className="monitor-file-input"
        onChange={handleImport}
      />

      <section className="monitor-hero">
        <div>
          <span className="monitor-badge"><Sun size={15} /> Sem custo de OpenAPI</span>
          <h2>Importar relatório SOLARMAN</h2>
          <p>{message}</p>
        </div>
        <button
          className="monitor-sync"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          <Upload size={18} />
          {importing ? 'Importando...' : 'Selecionar relatório CSV'}
        </button>
      </section>

      <section className="monitor-import-guide">
        <FileSpreadsheet size={26} />
        <div>
          <strong>Como atualizar as usinas</strong>
          <span>No SOLARMAN Business, exporte a lista ou relatório das usinas em formato CSV. Depois selecione o arquivo aqui. As usinas existentes serão atualizadas e as novas serão adicionadas.</span>
        </div>
      </section>

      <section className="monitor-kpis">
        <article><span><Cloud size={20} /></span><div><small>Usinas importadas</small><strong>{totals.plants}</strong></div></article>
        <article><span><CheckCircle2 size={20} /></span><div><small>Online</small><strong>{totals.online}</strong></div></article>
        <article><span><AlertTriangle size={20} /></span><div><small>Alertas</small><strong>{totals.alerts}</strong></div></article>
        <article><span><Zap size={20} /></span><div><small>Geração hoje</small><strong>{totals.today.toFixed(1)} kWh</strong></div></article>
      </section>

      <section className="monitor-panel">
        <div className="monitor-toolbar">
          <div className="monitor-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou instalação" /></div>
          <select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}>
            <option value="all">Todas as marcas</option>
            {PROVIDERS.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
          </select>
        </div>

        {!importing && visiblePlants.length === 0 ? (
          <div className="monitor-empty">
            <FileSpreadsheet size={38} />
            <strong>Nenhuma usina importada</strong>
            <span>Selecione o relatório CSV exportado do SOLARMAN Business.</span>
            <button type="button" onClick={() => fileInputRef.current?.click()}><Upload size={17} /> Importar relatório</button>
          </div>
        ) : null}

        <div className="plant-grid">
          {visiblePlants.map((plant) => (
            <article key={`${plant.provider}-${plant.id}`} className="plant-card">
              <div className="plant-card-head">
                <div className="plant-avatar"><Sun size={25} /></div>
                <div><h3>{plant.client}</h3><span>{providerName(plant.provider)}</span></div>
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
              <footer><Gauge size={15} /> Atualizado em {formatUpdatedAt(plant.updatedAt)}</footer>
            </article>
          ))}
        </div>
      </section>
    </FinanceLayout>
  );
}

export default MonitoramentoSolarPage;
