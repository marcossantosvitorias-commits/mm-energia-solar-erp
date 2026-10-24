import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, ExternalLink, FileCheck2, MessageCircle, RefreshCw, Search, Sparkles, Upload, X } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import SaoPauloCitySelect from '../components/SaoPauloCitySelect.jsx';
import MonthlyGenerationChart from '../components/solar/MonthlyGenerationChart.jsx';
import { listSolarSimulations, submitSolarSimulation, updateSolarSimulationStatus } from '../services/solarSimulationService.js';
import { analyzeEnergyBill } from '../services/energyBillAiService.js';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const annualMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const initialForm = { name: '', phone: '', email: '', city: 'Bauru', state: 'SP', utilityCompany: 'CPFL Piratininga', connectionType: 'bifasica', proposalMode: 'venda', subscriptionDiscountPercent: 15, marginPercent: 25, taxPercent: 4, monthlyBill: '', tariffPerKwh: 0.95, panelPowerW: 620, irradiation: 5.2, performanceRatio: 0.78, targetOffsetPercent: 95, source: 'erp-venda' };
const statusOptions = ['', 'Novo', 'Contatado', 'Convertido', 'Descartado'];

export default function CalculadoraSolarErpPage() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [simulations, setSimulations] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [analyzingBill, setAnalyzingBill] = useState(false);
  const [billAnalysis, setBillAnalysis] = useState(null);
  const [annualBills, setAnnualBills] = useState(() => Array(12).fill(''));
  const [error, setError] = useState('');

  const load = async () => { setLoadingList(true); setError(''); try { setSimulations(await listSolarSimulations({ search, status })); } catch (err) { setError(err.message); } finally { setLoadingList(false); } };
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [search, status]);
  const update = ({ target: { name, value } }) => setForm((current) => ({ ...current, [name]: value, ...(name === 'proposalMode' ? { source: value === 'assinatura' ? 'erp-assinatura' : 'erp-venda' } : {}) }));
  const annualSummary = useMemo(() => {
    const values = annualBills.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    return { total, filled: values.length, average: values.length ? total / values.length : 0 };
  }, [annualBills]);
  const updateAnnualBill = (index, value) => setAnnualBills((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));

  const handleBillUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAnalyzingBill(true);
    setError('');
    try {
      const extracted = await analyzeEnergyBill(file);
      setBillAnalysis(extracted);
      setForm((current) => ({
        ...current,
        name: extracted.customer_name || current.name,
        city: extracted.city || current.city,
        state: extracted.state || current.state,
        utilityCompany: extracted.utility_company || current.utilityCompany,
        tariffPerKwh: extracted.tariff_per_kwh || current.tariffPerKwh,
        connectionType: ['monofasica', 'bifasica', 'trifasica'].includes(extracted.connection_type) ? extracted.connection_type : current.connectionType,
      }));
      const extractedBill = extracted.energy_bill_without_fines || extracted.total_bill;
      if (Number(extractedBill) > 0) setAnnualBills((current) => current.map((value, index) => index === new Date().getMonth() ? String(extractedBill) : value));
    } catch (err) { setError(err.message || 'Não foi possível analisar a conta.'); }
    finally { setAnalyzingBill(false); }
  };

  const handleSubmit = async (event) => {
    event.preventDefault(); setLoading(true); setError('');
    if (!annualSummary.average) { setLoading(false); setError('Informe pelo menos um mês do histórico de gastos.'); return; }
    try { const data = await submitSolarSimulation({ ...form, monthlyBill: annualSummary.average }); setResult(data); setForm((current) => ({ ...initialForm, city: current.city, utilityCompany: current.utilityCompany })); setAnnualBills(Array(12).fill('')); setBillAnalysis(null); await load(); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const changeStatus = async (id, nextStatus) => { try { await updateSolarSimulationStatus(id, nextStatus); setSimulations((items) => items.map((item) => item.id === id ? { ...item, status: nextStatus } : item)); } catch (err) { setError(err.message); } };
  const summary = useMemo(() => ({ total: simulations.length, newLeads: simulations.filter((item) => item.status === 'Novo').length, converted: simulations.filter((item) => item.status === 'Convertido').length, pipeline: simulations.reduce((sum, item) => sum + Number(item.estimated_investment_min || 0), 0) }), [simulations]);
  const commercialPreview = useMemo(() => {
    if (!result) return null;
    const baseMin = Number(result.estimated_investment_min || 0);
    const baseMax = Number(result.estimated_investment_max || 0);
    const margin = Math.min(80, Math.max(0, Number(form.marginPercent || 0))) / 100;
    const tax = Math.min(80, Math.max(0, Number(form.taxPercent || 0))) / 100;
    const divisor = Math.max(0.05, 1 - margin - tax);
    const saleMin = baseMin / divisor;
    const saleMax = baseMax / divisor;
    const annualSavings = Number(result.estimated_annual_savings || 0);
    const paybackYears = annualSavings > 0 ? saleMin / annualSavings : 0;
    const subscriptionMonthly = Number(result.estimated_monthly_savings || 0) * (1 - Math.min(90, Math.max(0, Number(form.subscriptionDiscountPercent || 0))) / 100);
    const customerSavings = Math.max(0, Number(result.estimated_monthly_savings || 0) - subscriptionMonthly);
    return { saleMin, saleMax, paybackYears, subscriptionMonthly, customerSavings, accumulated25: customerSavings * 12 * 25 };
  }, [result, form.marginPercent, form.taxPercent, form.subscriptionDiscountPercent]);

  return <FinanceLayout title="Calculadora Solar" subtitle="Dimensione sistemas, veja a geração mês a mês e crie propostas automaticamente.">
    <section style={styles.summaryGrid}><SummaryCard label="Simulações exibidas" value={summary.total} /><SummaryCard label="Novos leads" value={summary.newLeads} /><SummaryCard label="Convertidos" value={summary.converted} /><SummaryCard label="Potencial mínimo" value={money.format(summary.pipeline)} /></section>
    {error && <div style={styles.error}>{error}</div>}
    <section className="erp-calculator-columns" style={{ ...styles.twoColumns, gridTemplateColumns: result ? 'minmax(0,1.2fr) minmax(360px,.8fr)' : '1fr' }}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <div style={styles.cardHeader}><div><span style={styles.eyebrow}>NOVA SIMULAÇÃO</span><h2 style={styles.title}><Calculator size={22} /> Dimensionar sistema</h2></div><a href={`${import.meta.env.BASE_URL}simulacao-solar`} target="_blank" rel="noreferrer" style={styles.secondaryButton}>Página pública <ExternalLink size={15} /></a></div>
        <div style={styles.billBox}><div><strong><Sparkles size={17} /> Analisar conta com IA</strong><small>Envie uma foto ou PDF. A IA extrai os dados e preenche a simulação para você conferir.</small></div><label style={styles.uploadButton}><Upload size={16} /> {analyzingBill ? 'Analisando...' : 'Anexar conta'}<input type="file" accept="image/*,application/pdf" onChange={handleBillUpload} disabled={analyzingBill} style={{ display: 'none' }} /></label></div>
        {billAnalysis && <div style={styles.billResult}><FileCheck2 size={17} /><span><strong>Dados extraídos para conferência</strong><small>{billAnalysis.utility_company || 'Concessionária não identificada'} · {billAnalysis.energy_consumption_kwh ? `${billAnalysis.energy_consumption_kwh} kWh` : 'consumo não identificado'} · confiança {billAnalysis.confidence || 'não informada'}{billAnalysis.warnings?.length ? ` · ${billAnalysis.warnings.length} aviso(s)` : ''}</small></span></div>}
        <div style={styles.formGrid}>
          <Field label="Nome do cliente" name="name" value={form.name} onChange={update} required /><Field label="WhatsApp" name="phone" value={form.phone} onChange={update} required /><Field label="E-mail" name="email" type="email" value={form.email} onChange={update} /><CityField label="Cidade" name="city" value={form.city} onChange={update} required /><Field label="Concessionária" name="utilityCompany" value={form.utilityCompany} onChange={update} />
          <Select label="Ligação" name="connectionType" value={form.connectionType} onChange={update}><option value="monofasica">Monofásica</option><option value="bifasica">Bifásica</option><option value="trifasica">Trifásica</option></Select>
          <Select label="Modelo comercial" name="proposalMode" value={form.proposalMode} onChange={update}><option value="venda">Venda do sistema</option><option value="assinatura">Energia por assinatura</option></Select>
          {form.proposalMode === 'assinatura' && <Field label="Desconto ao cliente (%)" name="subscriptionDiscountPercent" type="number" min="0" max="90" step="1" value={form.subscriptionDiscountPercent} onChange={update} />}
          <Field label="Margem desejada (%)" name="marginPercent" type="number" min="0" max="80" step="1" value={form.marginPercent} onChange={update} /><Field label="Imposto sobre venda (%)" name="taxPercent" type="number" min="0" max="80" step="1" value={form.taxPercent} onChange={update} />
          <AnnualHistoryField values={annualBills} summary={annualSummary} onChange={updateAnnualBill} /><Field label="Tarifa (R$/kWh)" name="tariffPerKwh" type="number" min="0.01" step="0.01" value={form.tariffPerKwh} onChange={update} /><Field label="Potência do módulo (W)" name="panelPowerW" type="number" min="1" step="1" value={form.panelPowerW} onChange={update} /><Field label="Irradiação média" name="irradiation" type="number" min="0.1" step="0.1" value={form.irradiation} onChange={update} /><Field label="Performance" name="performanceRatio" type="number" min="0.1" max="1" step="0.01" value={form.performanceRatio} onChange={update} /><Field label="Compensação (%)" name="targetOffsetPercent" type="number" min="1" max="100" step="1" value={form.targetOffsetPercent} onChange={update} />
        </div>
        <button type="submit" disabled={loading} style={styles.primaryButton}>{loading ? 'Calculando e criando proposta...' : 'Calcular e criar proposta'}</button>
      </form>
      {result && <aside style={styles.card}>
        <div style={styles.cardHeader}><span style={styles.eyebrow}>RESULTADO MAIS RECENTE</span><button type="button" onClick={() => setResult(null)} style={styles.closeButton}><X size={18} /></button></div>
        <h2 style={styles.resultTitle}>{result.panel_count} módulos de {result.panel_power_w} W</h2>
        <div style={styles.metricGrid}><Metric label="Potência" value={`${decimal.format(result.system_power_kw)} kWp`} /><Metric label="Geração média" value={`${decimal.format(result.monthly_generation_kwh)} kWh/mês`} /><Metric label="Consumo estimado" value={`${decimal.format(result.estimated_consumption_kwh)} kWh/mês`} /><Metric label="Economia mensal" value={money.format(result.estimated_monthly_savings)} /><Metric label="Economia anual" value={money.format(result.estimated_annual_savings)} /><Metric label="Investimento base" value={`${money.format(result.estimated_investment_min)} a ${money.format(result.estimated_investment_max)}`} /></div>
        <MonthlyGenerationChart monthlyAverage={result.monthly_generation_kwh} consumption={result.estimated_consumption_kwh} compact />
        {commercialPreview && <div style={styles.commercialBox}>
          <strong>{form.proposalMode === 'assinatura' ? 'Prévia da energia por assinatura' : 'Prévia comercial da venda'}</strong>
          {form.proposalMode === 'assinatura' ? <div style={styles.commercialGrid}><Metric label="Mensalidade estimada" value={money.format(commercialPreview.subscriptionMonthly)} /><Metric label="Economia mensal do cliente" value={money.format(commercialPreview.customerSavings)} /><Metric label="Economia em 25 anos" value={money.format(commercialPreview.accumulated25)} /></div> : <div style={styles.commercialGrid}><Metric label="Preço sugerido" value={`${money.format(commercialPreview.saleMin)} a ${money.format(commercialPreview.saleMax)}`} /><Metric label="Payback estimado" value={`${commercialPreview.paybackYears.toFixed(1).replace('.', ',')} anos`} /></div>}
          <small>Prévia comercial baseada nos dados informados; confirme custos, tarifa, regras da distribuidora e condições do contrato antes de enviar.</small>
        </div>}
        <div style={styles.success}>Proposta criada automaticamente com o gráfico de janeiro a dezembro.</div>
      </aside>}
    </section>
    <section style={{ ...styles.card, marginTop: 22 }}>
      <div style={styles.cardHeader}><div><span style={styles.eyebrow}>CRM DA CALCULADORA</span><h2 style={styles.title}>Simulações recebidas</h2></div><button type="button" onClick={load} style={styles.secondaryButton}><RefreshCw size={15} /> Atualizar</button></div>
      <div style={styles.filters}><label style={styles.searchBox}><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, telefone ou cidade" /></label><select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}>{statusOptions.map((item) => <option key={item || 'all'} value={item}>{item || 'Todos os status'}</option>)}</select></div>
      <div style={{ overflowX: 'auto' }}><table style={styles.table}><thead><tr><Th>Data</Th><Th>Cliente</Th><Th>Média mensal</Th><Th>Sistema</Th><Th>Economia</Th><Th>Status</Th><Th>Ação</Th></tr></thead><tbody>{loadingList ? <tr><td colSpan="7" style={styles.tableEmpty}>Carregando...</td></tr> : simulations.length === 0 ? <tr><td colSpan="7" style={styles.tableEmpty}>Nenhuma simulação encontrada.</td></tr> : simulations.map((item) => <tr key={item.id}><Td>{dateTime.format(new Date(item.created_at))}</Td><Td><strong>{item.name}</strong><div style={styles.muted}>{item.phone} · {item.city || 'Cidade não informada'}</div></Td><Td>{money.format(item.monthly_bill)}</Td><Td>{decimal.format(item.system_power_kw)} kWp<div style={styles.muted}>{item.panel_count} módulos</div></Td><Td>{money.format(item.estimated_monthly_savings)}/mês</Td><Td><select value={item.status} onChange={(e) => changeStatus(item.id, e.target.value)} style={styles.compactSelect}>{statusOptions.slice(1).map((option) => <option key={option}>{option}</option>)}</select></Td><Td><a href={`https://wa.me/55${String(item.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={styles.whatsappButton}><MessageCircle size={15} /> WhatsApp</a></Td></tr>)}</tbody></table></div>
    </section>
  </FinanceLayout>;
}

function Field({ label, ...props }) { return <label style={styles.label}>{label}<input {...props} style={styles.input} /></label>; }
function AnnualHistoryField({ values, summary, onChange }) { return <div style={styles.annualBox}><div style={styles.annualHeader}><div><strong>Histórico anual de gastos (R$)</strong><small>Preencha os meses disponíveis para calcular a média usada no dimensionamento.</small></div><div style={styles.annualSummary}><span>Total: <strong>{money.format(summary.total)}</strong></span><span>Média: <strong>{money.format(summary.average)}</strong></span></div></div><div style={styles.annualGrid}>{values.map((value, index) => <label key={annualMonths[index]} style={styles.monthField}><span>{annualMonths[index]}</span><input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(index, event.target.value)} placeholder="0,00" /></label>)}</div><small>{summary.filled}/12 meses preenchidos. A média atual é calculada sobre os meses informados; preencha os 12 para maior precisão.</small></div>; }
function CityField({ label, ...props }) { return <label style={styles.label}>{label}<SaoPauloCitySelect {...props} style={styles.input} /></label>; }
function Select({ label, children, ...props }) { return <label style={styles.label}>{label}<select {...props} style={styles.input}>{children}</select></label>; }
function Metric({ label, value }) { return <div style={styles.metric}><span>{label}</span><strong>{value}</strong></div>; }
function SummaryCard({ label, value }) { return <div style={styles.summaryCard}><span>{label}</span><strong>{value}</strong></div>; }
function Th({ children }) { return <th style={styles.th}>{children}</th>; }
function Td({ children }) { return <td style={styles.td}>{children}</td>; }

const styles = { twoColumns:{display:'grid',gap:22,alignItems:'start'},card:{background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,padding:22,boxShadow:'0 8px 30px rgba(15,23,42,.06)'},cardHeader:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,marginBottom:18,flexWrap:'wrap'},eyebrow:{color:'#64748b',fontSize:11,fontWeight:900,letterSpacing:1.2},title:{display:'flex',alignItems:'center',gap:8,margin:'5px 0 0',fontSize:22,color:'#0f172a'},resultTitle:{fontSize:28,margin:'8px 0 18px',color:'#0f172a'},formGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14},label:{fontSize:13,fontWeight:800,color:'#334155'},input:{width:'100%',boxSizing:'border-box',marginTop:6,padding:'11px 12px',border:'1px solid #cbd5e1',borderRadius:10,background:'#fff',fontSize:14},primaryButton:{width:'100%',marginTop:18,border:0,borderRadius:11,padding:'14px 18px',background:'#f5c400',fontWeight:900},secondaryButton:{display:'inline-flex',alignItems:'center',gap:7,border:'1px solid #cbd5e1',borderRadius:9,padding:'9px 12px',background:'#fff',color:'#334155',textDecoration:'none',fontWeight:800},summaryGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:14,marginBottom:22},summaryCard:{display:'grid',gap:6,background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,padding:17},metricGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:11},metric:{padding:13,borderRadius:11,background:'#f8fafc',border:'1px solid #e2e8f0'},billBox:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,marginBottom:18,padding:14,borderRadius:12,background:'#fefce8',border:'1px solid #fde68a'},billResult:{display:'flex',alignItems:'flex-start',gap:9,marginBottom:18,padding:12,borderRadius:10,background:'#ecfdf5',border:'1px solid #a7f3d0',color:'#166534'},uploadButton:{display:'inline-flex',alignItems:'center',gap:7,padding:'10px 13px',borderRadius:9,background:'#f5c400',color:'#0f172a',fontWeight:900,cursor:'pointer',whiteSpace:'nowrap'},annualBox:{gridColumn:'1 / -1',display:'grid',gap:10,padding:14,borderRadius:12,background:'#f8fafc',border:'1px solid #e2e8f0'},annualHeader:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,flexWrap:'wrap'},annualSummary:{display:'flex',gap:14,color:'#475569',fontSize:12},annualGrid:{display:'grid',gridTemplateColumns:'repeat(6,minmax(80px,1fr))',gap:9},monthField:{display:'grid',gap:4,color:'#64748b',fontSize:11,fontWeight:800},monthFieldInput:{width:'100%'},annualBoxSmall:{color:'#64748b'},success:{marginTop:16,padding:13,borderRadius:10,background:'#dcfce7',color:'#166534',fontWeight:800},commercialBox:{display:'grid',gap:10,marginTop:16,padding:14,borderRadius:12,background:'#eff6ff',border:'1px solid #bfdbfe',color:'#1e3a8a'},commercialGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:10},filters:{display:'grid',gridTemplateColumns:'minmax(240px,1fr) 220px',gap:12,marginBottom:16},searchBox:{display:'flex',alignItems:'center',gap:8,padding:'0 12px',border:'1px solid #cbd5e1',borderRadius:10},table:{width:'100%',borderCollapse:'collapse',minWidth:900},th:{textAlign:'left',padding:'11px 10px',borderBottom:'1px solid #cbd5e1',color:'#64748b',fontSize:12},td:{padding:'12px 10px',borderBottom:'1px solid #e2e8f0',color:'#334155',fontSize:13},tableEmpty:{textAlign:'center',padding:28,color:'#64748b'},compactSelect:{padding:'8px 9px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff'},whatsappButton:{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 10px',borderRadius:8,background:'#16a34a',color:'#fff',textDecoration:'none',fontWeight:800},muted:{marginTop:3,color:'#64748b',fontSize:11},error:{marginBottom:16,padding:13,borderRadius:10,background:'#fee2e2',color:'#991b1b',fontWeight:800},closeButton:{border:0,background:'#f1f5f9',borderRadius:8,padding:7,cursor:'pointer'} };
