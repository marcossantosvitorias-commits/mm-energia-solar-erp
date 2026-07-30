import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, PackageCheck, Save, ShieldCheck, Smartphone, Wrench } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import {
  completeInstallationPreparation,
  getInstallationPreparation,
  reserveAllMaterials,
  saveInstallationPreparation,
  setMaterialReserved,
} from '../services/installationPreparationService.js';

const materialStatuses = ['Pendente', 'Em separação', 'Parcial', 'Reservado', 'Liberado'];
const toLocalInput = (value) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

export default function PreparacaoInstalacaoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInstallationPreparation(id);
      setOrder(data.order);
      setItems(data.items);
      setChecklist(data.checklist);
      setForm({
        scheduledAt: toLocalInput(data.order.scheduledAt),
        installationAddress: data.order.installationAddress || '',
        city: data.order.city || '',
        state: data.order.state || 'SP',
        assignedTeam: data.order.assignedTeam || '',
        responsibleName: data.order.responsibleName || '',
        materialStatus: data.order.materialStatus || 'Pendente',
        roofType: data.order.roofType || '',
        accessNotes: data.order.accessNotes || '',
        electricalBoardNotes: data.order.electricalBoardNotes || '',
        preparationNotes: data.order.preparationNotes || '',
      });
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const progress = useMemo(() => {
    const reserved = items.filter((item) => item.reserved).length;
    const requiredChecklist = checklist.filter((item) => item.required);
    const checked = requiredChecklist.filter((item) => item.completed).length;
    return {
      reserved,
      totalMaterials: items.length,
      checked,
      totalChecklist: requiredChecklist.length,
      ready: items.length > 0 && reserved === items.length && Boolean(form?.scheduledAt) && Boolean(form?.assignedTeam) && Boolean(form?.installationAddress),
    };
  }, [items, checklist, form]);

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updated = await saveInstallationPreparation(id, {
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      });
      setOrder(updated);
      setMessage('Preparação da instalação salva.');
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  const toggleMaterial = async (item) => {
    try {
      const updated = await setMaterialReserved(item.id, !item.reserved);
      setItems((rows) => rows.map((row) => row.id === updated.id ? updated : row));
    } catch (error) { setMessage(error.message); }
  };

  const reserveAll = async () => {
    try {
      setItems(await reserveAllMaterials(id));
      setForm((current) => ({ ...current, materialStatus: 'Reservado' }));
      setMessage('Todos os materiais foram marcados como reservados.');
    } catch (error) { setMessage(error.message); }
  };

  const release = async () => {
    if (!progress.ready) {
      setMessage('Informe data, endereço e equipe e reserve todos os materiais antes de liberar.');
      return;
    }
    setSaving(true);
    try {
      await save();
      const updated = await completeInstallationPreparation(id);
      setOrder(updated);
      setForm((current) => ({ ...current, materialStatus: 'Liberado' }));
      setMessage('Instalação liberada. A OS está pronta para execução.');
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  if (loading) return <FinanceLayout title="Preparação da instalação" subtitle="Carregando dados da Ordem de Serviço..."><section className="finance-card">Carregando...</section></FinanceLayout>;
  if (!order || !form) return <FinanceLayout title="Preparação da instalação" subtitle="Não foi possível abrir a Ordem de Serviço."><section className="finance-card">{message || 'OS não encontrada.'}</section></FinanceLayout>;

  return <FinanceLayout title={`Preparação da OS #${order.orderNumber}`} subtitle={`Organize equipe, materiais e condições técnicas para a instalação de ${order.customerName}.`}>
    <div className="finance-actions" style={{ marginBottom: 16 }}>
      <button className="finance-button secondary" onClick={() => navigate('/app/ordens-servico')}><ArrowLeft size={18} /> Voltar às OS</button>
      <button className="finance-button" onClick={() => navigate(`/app/ordens-servico/${id}/campo`)}><Smartphone size={18} /> Abrir modo de campo</button>
    </div>
    {message && <p className="finance-notice">{message}</p>}

    <section className="finance-kpi-grid" style={{ marginBottom: 18 }}>
      <Kpi label="Materiais reservados" value={`${progress.reserved}/${progress.totalMaterials}`} />
      <Kpi label="Checklist obrigatório" value={`${progress.checked}/${progress.totalChecklist}`} />
      <Kpi label="Situação dos materiais" value={form.materialStatus} />
      <Kpi label="Liberação" value={order.preparationCompletedAt ? 'Concluída' : 'Pendente'} />
    </section>

    <section className="finance-panel" style={{ marginBottom: 18 }}>
      <div className="finance-panel-header"><div><h2><CalendarDays size={21} /> Planejamento</h2><p>Defina quando, onde e quem realizará a instalação.</p></div></div>
      <div className="finance-form">
        <Field label="Data prevista" type="datetime-local" value={form.scheduledAt} onChange={(value) => setForm({ ...form, scheduledAt: value })} />
        <Field label="Equipe responsável" value={form.assignedTeam} onChange={(value) => setForm({ ...form, assignedTeam: value })} placeholder="Ex.: Marcos + ajudante" />
        <Field label="Responsável no local" value={form.responsibleName} onChange={(value) => setForm({ ...form, responsibleName: value })} />
        <label className="finance-field"><span>Situação dos materiais</span><select value={form.materialStatus} onChange={(e) => setForm({ ...form, materialStatus: e.target.value })}>{materialStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        <Field label="Endereço da instalação" value={form.installationAddress} onChange={(value) => setForm({ ...form, installationAddress: value })} />
        <Field label="Cidade" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
        <Field label="UF" value={form.state} onChange={(value) => setForm({ ...form, state: value })} />
        <Field label="Tipo de telhado" value={form.roofType} onChange={(value) => setForm({ ...form, roofType: value })} placeholder="Cerâmico, fibrocimento, metálico..." />
        <Text label="Acesso ao telhado e ao imóvel" value={form.accessNotes} onChange={(value) => setForm({ ...form, accessNotes: value })} />
        <Text label="Quadro elétrico e ponto de conexão" value={form.electricalBoardNotes} onChange={(value) => setForm({ ...form, electricalBoardNotes: value })} />
        <Text label="Observações da preparação" value={form.preparationNotes} onChange={(value) => setForm({ ...form, preparationNotes: value })} />
      </div>
      <div className="finance-actions"><button className="finance-button" disabled={saving} onClick={save}><Save size={18} /> Salvar preparação</button></div>
    </section>

    <section className="finance-panel" style={{ marginBottom: 18 }}>
      <div className="finance-panel-header"><div><h2><PackageCheck size={21} /> Separação de materiais</h2><p>Itens da proposta são carregados automaticamente para conferência.</p></div><button className="finance-button secondary" onClick={reserveAll}>Reservar todos</button></div>
      <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Reservado</th><th>Material</th><th>Categoria</th><th>Quantidade</th><th>Observação</th></tr></thead><tbody>
        {items.length ? items.map((item) => <tr key={item.id}><td><input type="checkbox" checked={item.reserved} onChange={() => toggleMaterial(item)} /></td><td><strong>{item.description}</strong></td><td>{item.category || '-'}</td><td>{item.quantity} {item.unit}</td><td>{item.notes || '-'}</td></tr>) : <tr><td colSpan="5">Nenhum material cadastrado. Adicione os itens na Ordem de Serviço.</td></tr>}
      </tbody></table></div>
    </section>

    <section className="finance-panel" style={{ marginBottom: 18 }}>
      <div className="finance-panel-header"><div><h2><Wrench size={21} /> Resumo técnico da proposta</h2><p>Informações importadas da venda confirmada.</p></div></div>
      <div className="finance-kpi-grid">
        <Kpi label="Módulos" value={`${order.proposal?.panel_count || 0} × ${order.proposal?.panel_power_w || 0} W`} />
        <Kpi label="Potência" value={`${order.proposal?.system_power_kw || 0} kWp`} />
        <Kpi label="Geração mensal" value={`${order.proposal?.monthly_generation_kwh || 0} kWh`} />
        <Kpi label="Inversor" value={order.proposal?.inverter_model || 'Não informado'} />
      </div>
    </section>

    <section className="finance-panel">
      <div className="finance-panel-header"><div><h2><ShieldCheck size={21} /> Liberação da instalação</h2><p>Confirme que a equipe, a data, o endereço e todos os materiais estão definidos.</p></div></div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <Status ok={Boolean(form.scheduledAt)} text="Data da instalação definida" />
        <Status ok={Boolean(form.assignedTeam)} text="Equipe responsável definida" />
        <Status ok={Boolean(form.installationAddress)} text="Endereço confirmado" />
        <Status ok={items.length > 0 && progress.reserved === items.length} text="Todos os materiais reservados" />
      </div>
      <div className="finance-actions">
        <button className="finance-button" disabled={saving || Boolean(order.preparationCompletedAt)} onClick={release}><CheckCircle2 size={19} /> {order.preparationCompletedAt ? 'Instalação já liberada' : 'Liberar instalação'}</button>
        {order.preparationCompletedAt && <button className="finance-button secondary" onClick={() => navigate(`/app/ordens-servico/${id}/campo`)}><Smartphone size={19} /> Executar no celular</button>}
      </div>
    </section>
  </FinanceLayout>;
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) { return <label className="finance-field"><span>{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>; }
function Text({ label, value, onChange }) { return <label className="finance-field finance-field-wide"><span>{label}</span><textarea rows="3" value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
function Kpi({ label, value }) { return <div className="finance-kpi"><span>{label}</span><strong>{value}</strong></div>; }
function Status({ ok, text }) { return <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><CheckCircle2 size={18} style={{ opacity: ok ? 1 : 0.3 }} /><span>{text}</span></div>; }
