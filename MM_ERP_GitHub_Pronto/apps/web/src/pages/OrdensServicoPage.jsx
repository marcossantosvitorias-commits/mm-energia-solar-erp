import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck,
  Clock3, MapPin, PackagePlus, Plus, Search, Settings2, UserRound, Wrench,
} from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import ServiceOrderMediaPanel from '../components/service-orders/ServiceOrderMediaPanel.jsx';
import { listClients } from '../services/clientService.js';
import {
  addServiceOrderItem,
  createServiceOrder,
  listServiceOrderChecklist,
  listServiceOrderItems,
  listServiceOrders,
  updateChecklistItem,
  updateServiceOrderStatus,
} from '../services/serviceOrderService.js';
import './OrdensServicoPage.css';

const statuses = [
  'Aguardando materiais', 'Agendada', 'Equipe em deslocamento', 'Instalação iniciada',
  'Testes elétricos', 'Documentação', 'Homologação', 'Concluída', 'Cancelada',
];

const emptyOrder = {
  clientId: '', customerName: '', customerPhone: '', serviceType: 'Instalação fotovoltaica',
  scheduledAt: '', installationAddress: '', city: 'Bauru', state: 'SP', assignedTeam: '', notes: '',
};

const emptyItem = { description: '', category: '', quantity: 1, unit: 'un', unitCost: 0, reserved: false };
const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = (value) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Não agendada';

function friendlyError(error, fallback) {
  const raw = String(error?.message || '');
  if (raw.includes('does not exist')) return 'A tela encontrou uma incompatibilidade de dados. Atualize a página e tente novamente.';
  return raw || fallback;
}

function statusClass(status) {
  if (status === 'Concluída') return 'done';
  if (['Aguardando materiais', 'Agendada'].includes(status)) return 'warning';
  return '';
}

export default function OrdensServicoPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyOrder);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [status, setStatus] = useState('todos');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [orderRows, clientRows] = await Promise.all([listServiceOrders(), listClients()]);
      setOrders(orderRows);
      setClients(clientRows);
    } catch (error) {
      setMessage(friendlyError(error, 'Não foi possível carregar as Ordens de Serviço.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openOrder = async (order) => {
    setSelected(order);
    setMessage('');
    try {
      const [checklistRows, itemRows] = await Promise.all([
        listServiceOrderChecklist(order.id),
        listServiceOrderItems(order.id),
      ]);
      setChecklist(checklistRows);
      setItems(itemRows);
      setTimeout(() => document.getElementById('os-detalhes')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (error) {
      setMessage(friendlyError(error, 'Não foi possível abrir os detalhes da OS.'));
    }
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = status === 'todos' || order.status === status;
      const matchesTerm = !term || [order.orderNumber, order.customerName, order.customerPhone, order.city, order.assignedTeam]
        .filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
      return matchesStatus && matchesTerm;
    });
  }, [orders, query, status]);

  const indicators = useMemo(() => ({
    ativas: orders.filter((order) => !['Concluída', 'Cancelada'].includes(order.status)).length,
    agendadas: orders.filter((order) => order.status === 'Agendada').length,
    instalando: orders.filter((order) => ['Equipe em deslocamento', 'Instalação iniciada', 'Testes elétricos'].includes(order.status)).length,
    concluidas: orders.filter((order) => order.status === 'Concluída').length,
  }), [orders]);

  const handleClient = (clientId) => {
    const client = clients.find((row) => row.id === clientId);
    setForm((current) => ({
      ...current,
      clientId,
      customerName: client?.name || '',
      customerPhone: client?.phone || '',
      installationAddress: client?.address || '',
      city: client?.city || 'Bauru',
      state: client?.state || 'SP',
    }));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await createServiceOrder({ ...form, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null });
      setForm(emptyOrder);
      setShowCreate(false);
      setMessage('Ordem de Serviço criada com sucesso.');
      await load();
    } catch (error) {
      setMessage(friendlyError(error, 'Não foi possível criar a OS.'));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (nextStatus) => {
    if (!selected) return;
    try {
      const updated = await updateServiceOrderStatus(selected.id, nextStatus);
      setSelected(updated);
      setOrders((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      setMessage(`Status atualizado para ${nextStatus}.`);
    } catch (error) {
      setMessage(friendlyError(error, 'Não foi possível atualizar o status.'));
    }
  };

  const toggleChecklist = async (row) => {
    try {
      const updated = await updateChecklistItem(row.id, !row.completed, row.notes || null);
      setChecklist((rows) => rows.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      setMessage(friendlyError(error, 'Não foi possível atualizar o checklist.'));
    }
  };

  const submitItem = async (event) => {
    event.preventDefault();
    if (!selected) return;
    try {
      const created = await addServiceOrderItem(selected.id, itemForm);
      setItems((rows) => [...rows, created]);
      setItemForm(emptyItem);
      setMessage('Material adicionado à OS.');
    } catch (error) {
      setMessage(friendlyError(error, 'Não foi possível adicionar o material.'));
    }
  };

  const handleCompleted = (updated) => {
    setSelected(updated);
    setOrders((rows) => rows.map((row) => row.id === updated.id ? updated : row));
  };

  const kpis = [
    { label: 'OS ativas', value: indicators.ativas, icon: ClipboardCheck },
    { label: 'Agendadas', value: indicators.agendadas, icon: CalendarClock },
    { label: 'Em execução', value: indicators.instalando, icon: Wrench },
    { label: 'Concluídas', value: indicators.concluidas, icon: CheckCircle2 },
  ];

  return (
    <FinanceLayout
      title="Ordens de Serviço"
      subtitle="Instalações, manutenção, materiais, fotos, checklist e assinatura em um único fluxo."
      compactHeader
    >
      <div className="service-orders-page">
        {message && <div className="service-orders-message">{message}</div>}

        <section className="service-orders-toolbar">
          <div className="service-orders-toolbar-copy">
            <h2>Controle operacional</h2>
            <p>{orders.length} ordem(ns) cadastrada(s) · encontre rapidamente o próximo atendimento.</p>
          </div>
          <button className="service-orders-primary" type="button" onClick={() => setShowCreate((value) => !value)}>
            <Plus size={18} /> Nova OS {showCreate ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </section>

        <section className="service-orders-kpis">
          {kpis.map(({ label, value, icon: Icon }) => (
            <article className="service-orders-kpi" key={label}>
              <div className="service-orders-kpi-top">
                <span>{label}</span>
                <div className="service-orders-kpi-icon"><Icon size={18} /></div>
              </div>
              <strong>{value}</strong>
            </article>
          ))}
        </section>

        {showCreate && (
          <section className="service-orders-panel">
            <div className="service-orders-panel-title">
              <div>
                <h2>Nova Ordem de Serviço</h2>
                <p className="dashboard-note">Selecione um cliente do CRM ou preencha os dados manualmente.</p>
              </div>
            </div>

            <form onSubmit={submitOrder} className="service-orders-form">
              <label className="service-orders-field wide">
                <span>Cliente do CRM</span>
                <select value={form.clientId} onChange={(e) => handleClient(e.target.value)}>
                  <option value="">Selecionar cliente</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
              </label>

              <label className="service-orders-field">
                <span>Nome do cliente</span>
                <input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </label>
              <label className="service-orders-field">
                <span>Telefone</span>
                <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
              </label>
              <label className="service-orders-field">
                <span>Tipo de serviço</span>
                <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
                  <option>Instalação fotovoltaica</option>
                  <option>Manutenção preventiva</option>
                  <option>Limpeza de módulos</option>
                  <option>Vistoria técnica</option>
                  <option>Ampliação de sistema</option>
                  <option>Correção / reparo</option>
                </select>
              </label>
              <label className="service-orders-field">
                <span>Data e hora</span>
                <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
              </label>
              <label className="service-orders-field wide">
                <span>Endereço</span>
                <input value={form.installationAddress} onChange={(e) => setForm({ ...form, installationAddress: e.target.value })} />
              </label>
              <label className="service-orders-field">
                <span>Cidade</span>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </label>
              <label className="service-orders-field">
                <span>Equipe responsável</span>
                <input value={form.assignedTeam} onChange={(e) => setForm({ ...form, assignedTeam: e.target.value })} placeholder="Ex.: Marcos + ajudante" />
              </label>
              <label className="service-orders-field wide">
                <span>Observações</span>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>

              <div className="service-orders-field wide" style={{ display: 'flex', flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                <button className="service-orders-secondary" type="button" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button className="service-orders-primary" type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Criar Ordem de Serviço'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="service-orders-panel">
          <div className="service-orders-panel-title">
            <div>
              <h2>Ordens cadastradas</h2>
              <p className="dashboard-note">Busque por cliente, cidade, equipe ou número da OS.</p>
            </div>
          </div>

          <div className="service-orders-filterbar">
            <div className="service-orders-search-wrap">
              <Search size={18} />
              <input className="service-orders-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar ordem de serviço..." />
            </div>
            <select className="service-orders-search" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="todos">Todos os status</option>
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          {loading ? <div className="service-orders-empty">Carregando ordens de serviço...</div> : (
            <div className="service-orders-list">
              {filtered.map((order) => (
                <article className="service-orders-card" key={order.id}>
                  <div className="service-orders-card-main">
                    <div className="service-orders-card-number">OS #{order.orderNumber || '—'}</div>
                    <strong>{order.customerName || 'Cliente não informado'}</strong>
                    <small>{order.customerPhone || 'Sem telefone'}</small>
                  </div>

                  <div className="service-orders-card-meta">
                    <span><CalendarClock size={14} style={{ verticalAlign: -2 }} /> {dateTime(order.scheduledAt)}</span>
                    <span><MapPin size={14} style={{ verticalAlign: -2 }} /> {order.city || 'Cidade não informada'}{order.state ? `/${order.state}` : ''}</span>
                    <span className={`service-orders-chip ${statusClass(order.status)}`}>{order.status}</span>
                  </div>

                  <div className="service-orders-card-actions">
                    <button className="service-orders-secondary" type="button" onClick={() => navigate(`/app/ordens-servico/${order.id}/preparacao`)}>
                      <Settings2 size={16} /> Preparar
                    </button>
                    <button className="service-orders-primary" type="button" onClick={() => openOrder(order)}>
                      Abrir OS
                    </button>
                  </div>
                </article>
              ))}
              {!filtered.length && <div className="service-orders-empty">Nenhuma ordem encontrada com esse filtro.</div>}
            </div>
          )}
        </section>

        {selected && (
          <section className="service-orders-panel" id="os-detalhes">
            <div className="service-orders-details-head">
              <div>
                <div className="service-orders-card-number">OS #{selected.orderNumber}</div>
                <h2>{selected.customerName}</h2>
                <p>{selected.installationAddress || 'Endereço não informado'} · {selected.city}/{selected.state}</p>
              </div>
              <div className="service-orders-details-actions">
                <button className="service-orders-secondary" type="button" onClick={() => navigate(`/app/ordens-servico/${selected.id}/preparacao`)}>
                  <Settings2 size={16} /> Preparar
                </button>
                <select className="service-orders-search" value={selected.status} onChange={(e) => changeStatus(e.target.value)} style={{ minWidth: 190 }}>
                  {statuses.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
            </div>

            <div className="service-orders-section-label"><ClipboardCheck size={18} /> Checklist técnico</div>
            <div className="service-orders-checklist">
              {checklist.map((row) => (
                <label className="service-orders-check" key={row.id}>
                  <input type="checkbox" checked={row.completed} onChange={() => toggleChecklist(row)} />
                  <span><strong>{row.section}:</strong> {row.item}</span>
                  {row.completed && <CheckCircle2 size={17} />}
                </label>
              ))}
              {!checklist.length && <div className="service-orders-empty">Nenhum item de checklist cadastrado nesta OS.</div>}
            </div>

            <div className="service-orders-section-label"><PackagePlus size={18} /> Materiais utilizados</div>
            <form onSubmit={submitItem} className="service-orders-form">
              <label className="service-orders-field wide">
                <span>Descrição do material</span>
                <input required value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Ex.: Cabo solar 6 mm²" />
              </label>
              <label className="service-orders-field">
                <span>Categoria</span>
                <input value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} />
              </label>
              <label className="service-orders-field">
                <span>Quantidade</span>
                <input type="number" min="0.001" step="0.001" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
              </label>
              <label className="service-orders-field">
                <span>Custo unitário</span>
                <input type="number" min="0" step="0.01" value={itemForm.unitCost} onChange={(e) => setItemForm({ ...itemForm, unitCost: e.target.value })} />
              </label>
              <label className="service-orders-field">
                <span>Reserva</span>
                <select value={itemForm.reserved ? 'sim' : 'nao'} onChange={(e) => setItemForm({ ...itemForm, reserved: e.target.value === 'sim' })}>
                  <option value="nao">Não reservado</option>
                  <option value="sim">Material reservado</option>
                </select>
              </label>
              <div className="service-orders-field wide" style={{ alignItems: 'flex-end' }}>
                <button className="service-orders-primary" type="submit"><Plus size={16} /> Adicionar material</button>
              </div>
            </form>

            <div className="service-orders-materials">
              {items.map((item) => (
                <div className="service-orders-material" key={item.id}>
                  <strong>{item.description}</strong>
                  <span>{item.quantity} {item.unit}</span>
                  <span>{money(Number(item.quantity || 0) * Number(item.unit_cost || 0))}</span>
                </div>
              ))}
              {!items.length && <div className="service-orders-empty">Nenhum material lançado.</div>}
            </div>

            <div className="service-orders-section-label"><UserRound size={18} /> Evidências e finalização</div>
            <ServiceOrderMediaPanel order={selected} onCompleted={handleCompleted} onMessage={setMessage} />
          </section>
        )}
      </div>
    </FinanceLayout>
  );
}
