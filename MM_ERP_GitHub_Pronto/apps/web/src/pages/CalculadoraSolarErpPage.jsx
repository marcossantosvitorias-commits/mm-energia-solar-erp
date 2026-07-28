import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, ExternalLink, MessageCircle, RefreshCw, Search } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import {
  listSolarSimulations,
  submitSolarSimulation,
  updateSolarSimulationStatus,
} from '../services/solarSimulationService.js';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const initialForm = {
  name: '',
  phone: '',
  email: '',
  city: 'Bauru',
  state: 'SP',
  utilityCompany: 'CPFL Piratininga',
  connectionType: 'bifasica',
  monthlyBill: '',
  tariffPerKwh: 0.95,
  panelPowerW: 620,
  irradiation: 5.2,
  performanceRatio: 0.78,
  targetOffsetPercent: 95,
  source: 'erp',
};

const statusOptions = ['', 'Novo', 'Contatado', 'Convertido', 'Descartado'];

export default function CalculadoraSolarErpPage() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [simulations, setSimulations] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoadingList(true);
    setError('');
    try {
      setSimulations(await listSolarSimulations({ search, status }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [search, status]);

  const update = ({ target: { name, value } }) => setForm((current) => ({ ...current, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await submitSolarSimulation(form);
      setResult(data);
      setForm((current) => ({ ...initialForm, city: current.city, utilityCompany: current.utilityCompany }));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (id, nextStatus) => {
    try {
      await updateSolarSimulationStatus(id, nextStatus);
      setSimulations((items) => items.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)));
    } catch (err) {
      setError(err.message);
    }
  };

  const summary = useMemo(() => ({
    total: simulations.length,
    newLeads: simulations.filter((item) => item.status === 'Novo').length,
    converted: simulations.filter((item) => item.status === 'Convertido').length,
    pipeline: simulations.reduce((sum, item) => sum + Number(item.estimated_investment_min || 0), 0),
  }), [simulations]);

  return (
    <FinanceLayout
      title="Calculadora Solar"
      subtitle="Dimensione sistemas, crie propostas automaticamente e acompanhe as simulações recebidas pelo site."
    >
      <section style={styles.summaryGrid}>
        <SummaryCard label="Simulações exibidas" value={summary.total} />
        <SummaryCard label="Novos leads" value={summary.newLeads} />
        <SummaryCard label="Convertidos" value={summary.converted} />
        <SummaryCard label="Potencial mínimo" value={money.format(summary.pipeline)} />
      </section>

      {error && <div style={styles.error}>{error}</div>}

      <section style={styles.twoColumns}>
        <form onSubmit={handleSubmit} style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <span style={styles.eyebrow}>NOVA SIMULAÇÃO</span>
              <h2 style={styles.title}><Calculator size={22} /> Dimensionar sistema</h2>
            </div>
            <a href="/simulacao-solar" target="_blank" rel="noreferrer" style={styles.secondaryButton}>
              Página pública <ExternalLink size={15} />
            </a>
          </div>

          <div style={styles.formGrid}>
            <Field label="Nome do cliente" name="name" value={form.name} onChange={update} required />
            <Field label="WhatsApp" name="phone" value={form.phone} onChange={update} required />
            <Field label="E-mail" name="email" type="email" value={form.email} onChange={update} />
            <Field label="Cidade" name="city" value={form.city} onChange={update} required />
            <Field label="Concessionária" name="utilityCompany" value={form.utilityCompany} onChange={update} />
            <Select label="Ligação" name="connectionType" value={form.connectionType} onChange={update}>
              <option value="monofasica">Monofásica</option>
              <option value="bifasica">Bifásica</option>
              <option value="trifasica">Trifásica</option>
            </Select>
            <Field label="Conta mensal (R$)" name="monthlyBill" type="number" min="1" step="0.01" value={form.monthlyBill} onChange={update} required />
            <Field label="Tarifa (R$/kWh)" name="tariffPerKwh" type="number" min="0.01" step="0.01" value={form.tariffPerKwh} onChange={update} />
            <Field label="Potência do módulo (W)" name="panelPowerW" type="number" min="1" step="1" value={form.panelPowerW} onChange={update} />
            <Field label="Irradiação" name="irradiation" type="number" min="0.1" step="0.1" value={form.irradiation} onChange={update} />
            <Field label="Performance (%)" name="performanceRatio" type="number" min="0.1" max="1" step="0.01" value={form.performanceRatio} onChange={update} />
            <Field label="Compensação (%)" name="targetOffsetPercent" type="number" min="1" max="100" step="1" value={form.targetOffsetPercent} onChange={update} />
          </div>

          <button type="submit" disabled={loading} style={styles.primaryButton}>
            {loading ? 'Calculando e criando proposta...' : 'Calcular e criar proposta'}
          </button>
        </form>

        <aside style={styles.card}>
          <span style={styles.eyebrow}>RESULTADO MAIS RECENTE</span>
          {!result ? (
            <div style={styles.empty}>Preencha os dados para calcular o sistema e gerar a proposta no Kanban.</div>
          ) : (
            <>
              <h2 style={styles.resultTitle}>{result.panel_count} módulos de {result.panel_power_w} W</h2>
              <div style={styles.metricGrid}>
                <Metric label="Potência" value={`${decimal.format(result.system_power_kw)} kWp`} />
                <Metric label="Geração" value={`${decimal.format(result.monthly_generation_kwh)} kWh/mês`} />
                <Metric label="Consumo estimado" value={`${decimal.format(result.estimated_consumption_kwh)} kWh/mês`} />
                <Metric label="Economia mensal" value={money.format(result.estimated_monthly_savings)} />
                <Metric label="Economia anual" value={money.format(result.estimated_annual_savings)} />
                <Metric label="Investimento inicial" value={`${money.format(result.estimated_investment_min)} a ${money.format(result.estimated_investment_max)}`} />
              </div>
              <div style={styles.success}>Proposta criada automaticamente e enviada ao fluxo comercial.</div>
            </>
          )}
        </aside>
      </section>

      <section style={{ ...styles.card, marginTop: 22 }}>
        <div style={styles.cardHeader}>
          <div>
            <span style={styles.eyebrow}>CRM DA CALCULADORA</span>
            <h2 style={styles.title}>Simulações recebidas</h2>
          </div>
          <button type="button" onClick={load} style={styles.secondaryButton}><RefreshCw size={15} /> Atualizar</button>
        </div>

        <div style={styles.filters}>
          <label style={styles.searchBox}><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, telefone ou cidade" /></label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}>
            {statusOptions.map((item) => <option key={item || 'all'} value={item}>{item || 'Todos os status'}</option>)}
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead><tr><Th>Data</Th><Th>Cliente</Th><Th>Conta</Th><Th>Sistema</Th><Th>Economia</Th><Th>Origem</Th><Th>Status</Th><Th>Ação</Th></tr></thead>
            <tbody>
              {loadingList ? (
                <tr><td colSpan="8" style={styles.tableEmpty}>Carregando simulações...</td></tr>
              ) : simulations.length === 0 ? (
                <tr><td colSpan="8" style={styles.tableEmpty}>Nenhuma simulação encontrada.</td></tr>
              ) : simulations.map((item) => (
                <tr key={item.id}>
                  <Td>{dateTime.format(new Date(item.created_at))}</Td>
                  <Td><strong>{item.name}</strong><div style={styles.muted}>{item.phone} · {item.city || 'Cidade não informada'}</div></Td>
                  <Td>{money.format(item.monthly_bill)}</Td>
                  <Td>{decimal.format(item.system_power_kw)} kWp<div style={styles.muted}>{item.panel_count} módulos</div></Td>
                  <Td>{money.format(item.estimated_monthly_savings)}/mês</Td>
                  <Td>{item.utm_source || item.source || 'Direto'}</Td>
                  <Td>
                    <select value={item.status} onChange={(e) => changeStatus(item.id, e.target.value)} style={styles.compactSelect}>
                      {statusOptions.slice(1).map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </Td>
                  <Td>
                    <a href={`https://wa.me/55${String(item.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${item.name}! Sou da MM Energia Solar. Recebemos sua simulação de energia solar e gostaria de dar continuidade ao atendimento.`)}`} target="_blank" rel="noreferrer" style={styles.whatsappButton}><MessageCircle size={15} /> WhatsApp</a>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </FinanceLayout>
  );
}

function Field({ label, ...props }) {
  return <label style={styles.label}>{label}<input {...props} style={styles.input} /></label>;
}
function Select({ label, children, ...props }) {
  return <label style={styles.label}>{label}<select {...props} style={styles.input}>{children}</select></label>;
}
function Metric({ label, value }) {
  return <div style={styles.metric}><span>{label}</span><strong>{value}</strong></div>;
}
function SummaryCard({ label, value }) {
  return <div style={styles.summaryCard}><span>{label}</span><strong>{value}</strong></div>;
}
function Th({ children }) { return <th style={styles.th}>{children}</th>; }
function Td({ children }) { return <td style={styles.td}>{children}</td>; }

const styles = {
  twoColumns: { display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(320px,.65fr)', gap: 22, alignItems: 'start' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 22, boxShadow: '0 8px 30px rgba(15,23,42,.06)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' },
  eyebrow: { color: '#64748b', fontSize: 11, fontWeight: 900, letterSpacing: 1.2 },
  title: { display: 'flex', alignItems: 'center', gap: 8, margin: '5px 0 0', fontSize: 22, color: '#0f172a' },
  resultTitle: { fontSize: 28, margin: '18px 0', color: '#0f172a' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 },
  label: { fontSize: 13, fontWeight: 800, color: '#334155' },
  input: { width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', color: '#0f172a', fontSize: 14 },
  primaryButton: { width: '100%', marginTop: 18, border: 0, borderRadius: 11, padding: '14px 18px', background: '#f5c400', color: '#172033', fontWeight: 900, cursor: 'pointer' },
  secondaryButton: { display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid #cbd5e1', borderRadius: 9, padding: '9px 12px', background: '#fff', color: '#334155', textDecoration: 'none', fontWeight: 800, cursor: 'pointer' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14, marginBottom: 22 },
  summaryCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 17 },
  metricGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 },
  metric: { padding: 13, borderRadius: 11, background: '#f8fafc', border: '1px solid #e2e8f0' },
  success: { marginTop: 16, padding: 13, borderRadius: 10, background: '#dcfce7', color: '#166534', fontWeight: 800 },
  empty: { minHeight: 260, display: 'grid', placeItems: 'center', textAlign: 'center', color: '#64748b', padding: 20 },
  filters: { display: 'grid', gridTemplateColumns: 'minmax(240px,1fr) 220px', gap: 12, marginBottom: 16 },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 10 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 980 },
  th: { textAlign: 'left', padding: '11px 10px', borderBottom: '1px solid #cbd5e1', color: '#64748b', fontSize: 12 },
  td: { padding: '12px 10px', borderBottom: '1px solid #e2e8f0', color: '#334155', fontSize: 13 },
  tableEmpty: { textAlign: 'center', padding: 28, color: '#64748b' },
  compactSelect: { padding: '8px 9px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' },
  whatsappButton: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, background: '#16a34a', color: '#fff', textDecoration: 'none', fontWeight: 800 },
  muted: { marginTop: 3, color: '#64748b', fontSize: 11 },
  error: { marginBottom: 16, padding: 13, borderRadius: 10, background: '#fee2e2', color: '#991b1b', fontWeight: 800 },
};
