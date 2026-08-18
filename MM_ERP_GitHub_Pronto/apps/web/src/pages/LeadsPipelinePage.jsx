import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, ChevronDown, CircleDollarSign, Filter, GripVertical,
  LayoutGrid, List, MessageCircle, MoreVertical, Phone, Plus, Search,
  SlidersHorizontal, UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { createClient, listClients, updateClient } from '../services/clientService.js';
import { syncLeadConnector } from '../services/leadConnectorService.js';
import './LeadsPipelinePage.css';

const STAGES = [
  { key: 'lead', label: 'Lead novo', accent: 'gold' },
  { key: 'qualificado', label: 'Qualificado', accent: 'green' },
  { key: 'proposta', label: 'Proposta enviada', accent: 'blue' },
  { key: 'negociacao', label: 'Em negociação', accent: 'purple' },
  { key: 'cliente', label: 'Fechado / Ganho', accent: 'emerald' },
  { key: 'perdido', label: 'Perdido', accent: 'red' },
];

const PIPELINES = [
  { value: 'vendas', label: 'Funil de Vendas' },
  { value: 'resgate', label: 'Funil de Resgate' },
];

const formatCurrency = (value) => Number(value || 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
});

const emptyOpportunity = {
  name: '', phone: '', email: '', city: 'Bauru', state: 'SP',
  customerType: 'residencial', status: 'lead', monthlyBill: '', notes: '',
  document: '', address: '', zipCode: '',
};

function LeadCard({ lead, onDragStart, onOpenWhatsApp }) {
  const sourceLabel = lead.leadSource || (lead.externalProvider === 'leadconnector' ? '1North' : 'ERP / WhatsApp');
  return (
    <article
      className="lead-kanban-card"
      draggable
      onDragStart={(event) => onDragStart(event, lead)}
      title="Arraste para mudar a etapa"
    >
      <div className="lead-card-head">
        <div>
          <strong>{lead.name}</strong>
          <span>{lead.city ? `${lead.city}${lead.state ? ` / ${lead.state}` : ''}` : 'Local não informado'}</span>
        </div>
        <GripVertical size={17} className="lead-grip" />
      </div>

      <div className="lead-card-info">
        <span>Fonte:</span><b>{sourceLabel}</b>
        <span>Valor:</span><b>{formatCurrency(lead.monthlyBill)}</b>
      </div>

      <div className="lead-card-actions">
        <button type="button" title="WhatsApp" onClick={() => onOpenWhatsApp(lead.phone)}><MessageCircle size={16} /></button>
        <a href={lead.phone ? `tel:${lead.phone}` : undefined} title="Ligar"><Phone size={16} /></a>
        <button type="button" title="Cliente"><UserRound size={16} /></button>
        <button type="button" title="Próxima ação"><CalendarDays size={16} /></button>
      </div>
    </article>
  );
}

export default function LeadsPipelinePage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing1North, setSyncing1North] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [pipeline, setPipeline] = useState('vendas');
  const [view, setView] = useState('kanban');
  const [showOnlyWithPhone, setShowOnlyWithPhone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyOpportunity);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState('');

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      setClients(await listClients());
    } catch (error) {
      setMessage(error?.message || 'Não foi possível carregar os leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const leads = useMemo(() => {
    const term = query.trim().toLowerCase();
    return clients.filter((lead) => {
      const matchesSearch = !term || [lead.name, lead.phone, lead.email, lead.city, lead.leadSource]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
      const matchesPhone = !showOnlyWithPhone || Boolean(lead.phone);
      return matchesSearch && matchesPhone;
    });
  }, [clients, query, showOnlyWithPhone]);

  const grouped = useMemo(() => STAGES.reduce((acc, stage) => ({
    ...acc,
    [stage.key]: leads.filter((lead) => lead.status === stage.key),
  }), {}), [leads]);

  const totalValue = useMemo(() => leads.reduce((sum, lead) => sum + Number(lead.monthlyBill || 0), 0), [leads]);

  const moveLead = async (lead, status) => {
    if (!lead || lead.status === status) return;
    const previous = clients;
    setClients((current) => current.map((item) => item.id === lead.id ? { ...item, status } : item));
    setMessage('');
    try {
      await updateClient(lead.id, { ...lead, status });
    } catch (error) {
      setClients(previous);
      setMessage(error?.message || 'Não foi possível mover a oportunidade.');
    }
  };

  const onDragStart = (event, lead) => {
    setDraggingId(lead.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', lead.id);
  };

  const onDrop = async (event, stage) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || draggingId;
    const lead = clients.find((item) => String(item.id) === String(id));
    setDragOverStage('');
    setDraggingId(null);
    await moveLead(lead, stage);
  };

  const openWhatsApp = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return;
    window.open(`https://wa.me/${digits}`, '_blank', 'noopener,noreferrer');
  };

  const importFrom1North = async () => {
    setSyncing1North(true);
    setMessage('Conectando à 1North e verificando os leads...');
    try {
      const result = await syncLeadConnector();
      setMessage(`1North sincronizada: ${result.created || 0} novo(s), ${result.updated || 0} atualizado(s), ${result.skipped || 0} ignorado(s) e ${result.errors || 0} erro(s).`);
      await load();
    } catch (error) {
      setMessage(error?.message || 'Não foi possível importar os leads da 1North.');
    } finally {
      setSyncing1North(false);
    }
  };

  const saveOpportunity = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setMessage('Informe nome e telefone para adicionar a oportunidade.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await createClient({ ...form, monthlyBill: Number(form.monthlyBill || 0), state: 'SP' });
      setForm(emptyOpportunity);
      setShowModal(false);
      setMessage('Oportunidade adicionada ao funil.');
      await load();
    } catch (error) {
      setMessage(error?.message || 'Não foi possível adicionar a oportunidade.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FinanceLayout title="Leads" subtitle="Pipeline comercial da MM Energia Solar — acompanhe e mova as oportunidades por etapa.">
      <div className="leads-toolbar-top">
        <div className="leads-tabs">
          <button className="active" type="button">Leads</button>
          <button type="button" onClick={() => navigate('/app/fluxos')}>Previsão</button>
          <button type="button">Pipelines</button>
          <button type="button">Ações em massa</button>
        </div>
      </div>

      {message ? <div className="finance-notice">{message}</div> : null}

      <section className="leads-commandbar">
        <label className="pipeline-select-wrap">
          <select value={pipeline} onChange={(event) => setPipeline(event.target.value)}>
            {PIPELINES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <ChevronDown size={17} />
        </label>
        <span className="lead-count-pill">{leads.length} leads</span>
        <span className="lead-total-pill"><CircleDollarSign size={15} /> {formatCurrency(totalValue)}</span>

        <div className="leads-command-spacer" />
        <div className="view-toggle">
          <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')} type="button"><LayoutGrid size={17} /></button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} type="button"><List size={17} /></button>
        </div>
        <button className="leads-outline-button" type="button" onClick={importFrom1North} disabled={syncing1North}>{syncing1North ? 'Sincronizando 1North...' : 'Importar da 1North'}</button>
        <button className="leads-primary-button" type="button" onClick={() => setShowModal(true)}><Plus size={17} /> Adicionar oportunidade</button>
        <button className="leads-icon-button" type="button"><MoreVertical size={18} /></button>
      </section>

      <section className="leads-filterbar">
        <button className={showOnlyWithPhone ? 'active' : ''} type="button" onClick={() => setShowOnlyWithPhone((value) => !value)}><Filter size={16} /> Filtros avançados {showOnlyWithPhone ? '(1)' : ''}</button>
        <button type="button"><SlidersHorizontal size={16} /> Classificar</button>
        <div className="leads-filter-spacer" />
        <div className="leads-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar leads" /></div>
      </section>

      {loading ? <div className="lead-loading">Carregando oportunidades...</div> : view === 'kanban' ? (
        <section className="lead-board" aria-label="Funil de vendas">
          {STAGES.map((stage) => {
            const stageLeads = grouped[stage.key] || [];
            return (
              <div
                className={`lead-column ${dragOverStage === stage.key ? 'drag-over' : ''}`}
                key={stage.key}
                onDragOver={(event) => { event.preventDefault(); setDragOverStage(stage.key); }}
                onDragLeave={() => setDragOverStage('')}
                onDrop={(event) => onDrop(event, stage.key)}
              >
                <header className={`lead-column-header accent-${stage.accent}`}>
                  <div><strong>{stage.label}</strong><span>{stageLeads.length} oportunidade{stageLeads.length === 1 ? '' : 's'}</span></div>
                  <b>{formatCurrency(stageLeads.reduce((sum, lead) => sum + Number(lead.monthlyBill || 0), 0))}</b>
                </header>
                <div className="lead-column-body">
                  {stageLeads.map((lead) => <LeadCard key={lead.id} lead={lead} onDragStart={onDragStart} onOpenWhatsApp={openWhatsApp} />)}
                  {!stageLeads.length ? <div className="lead-empty-stage">Arraste uma oportunidade para cá</div> : null}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="finance-panel lead-list-panel">
          <div className="finance-table-wrapper">
            <table className="finance-table">
              <thead><tr><th>Lead</th><th>Contato</th><th>Cidade</th><th>Fonte</th><th>Etapa</th><th>Conta média</th></tr></thead>
              <tbody>{leads.map((lead) => <tr key={lead.id}><td><strong>{lead.name}</strong></td><td>{lead.phone || '-'}</td><td>{lead.city || '-'}</td><td>{lead.leadSource || (lead.externalProvider === 'leadconnector' ? '1North' : 'ERP / WhatsApp')}</td><td>{STAGES.find((stage) => stage.key === lead.status)?.label || lead.status}</td><td>{formatCurrency(lead.monthlyBill)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      {showModal ? (
        <div className="lead-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
          <div className="lead-modal" role="dialog" aria-modal="true" aria-label="Adicionar oportunidade">
            <div className="lead-modal-head"><div><h2>Adicionar oportunidade</h2><p>O lead entra direto no funil comercial.</p></div><button type="button" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={saveOpportunity} className="lead-modal-form">
              <label><span>Nome *</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoFocus /></label>
              <label><span>WhatsApp *</span><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label><span>E-mail</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
              <label><span>Cidade</span><input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} /></label>
              <label><span>Etapa</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{STAGES.map((stage) => <option value={stage.key} key={stage.key}>{stage.label}</option>)}</select></label>
              <label><span>Valor médio da conta</span><input type="number" min="0" step="0.01" value={form.monthlyBill} onChange={(event) => setForm((current) => ({ ...current, monthlyBill: event.target.value }))} /></label>
              <label className="wide"><span>Observações</span><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
              <div className="lead-modal-actions"><button type="button" className="leads-outline-button" onClick={() => setShowModal(false)}>Cancelar</button><button className="leads-primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Adicionar oportunidade'}</button></div>
            </form>
          </div>
        </div>
      ) : null}
    </FinanceLayout>
  );
}
