import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, PackagePlus, Plus, Search, Wrench } from 'lucide-react';
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
const dateTime = (value) => value ? new Date(value).toLocaleString('pt-BR') : 'Não agendada';

export default function OrdensServicoPage() {
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

  const load = async () => {
    setLoading(true);
    try {
      const [orderRows, clientRows] = await Promise.all([listServiceOrders(), listClients()]);
      setOrders(orderRows);
      setClients(clientRows);
    } catch (error) {
      setMessage(error?.message || 'Não foi possível carregar as Ordens de Serviço.');
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
    } catch (error) {
      setMessage(error?.message || 'Não foi possível abrir os detalhes da OS.');
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
      setMessage('Ordem de Serviço criada com sucesso.');
      await load();
    } catch (error) {
      setMessage(error?.message || 'Não foi possível criar a OS.');
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
      setMessage(error?.message || 'Não foi possível atualizar o status.');
    }
  };

  const toggleChecklist = async (row) => {
    try {
      const updated = await updateChecklistItem(row.id, !row.completed, row.notes || null);
      setChecklist((rows) => rows.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      setMessage(error?.message || 'Não foi possível atualizar o checklist.');
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
      setMessage(error?.message || 'Não foi possível adicionar o material.');
    }
  };

  const handleCompleted = (updated) => {
    setSelected(updated);
    setOrders((rows) => rows.map((row) => row.id === updated.id ? updated : row));
  };

  return (
    <FinanceLayout title="Ordens de Serviço" subtitle="Acompanhe instalações, materiais, equipe, fotos, assinatura e checklist técnico.">
      {message && <div className="finance-card" style={{ marginBottom: 16 }}><strong>{message}</strong></div>}

      <section className="finance-grid" style={{ marginBottom: 18 }}>
        {[['OS ativas', indicators.ativas], ['Agendadas', indicators.agendadas], ['Em instalação', indicators.instalando], ['Concluídas', indicators.concluidas]].map(([label, value]) => (
          <article className="finance-card" key={label}><span>{label}</span><h2>{value}</h2></article>
        ))}
      </section>

      <section className="finance-card" style={{ marginBottom: 18 }}>
        <h2><Plus size={20} /> Nova Ordem de Serviço</h2>
        <form onSubmit={submitOrder} className="finance-form-grid">
          <label>Cliente do CRM<select value={form.clientId} onChange={(e) => handleClient(e.target.value)}><option value="">Selecionar cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
          <label>Nome do cliente<input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label>
          <label>Telefone<input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} /></label>
          <label>Data da instalação<input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></label>
          <label>Endereço<input value={form.installationAddress} onChange={(e) => setForm({ ...form, installationAddress: e.target.value })} /></label>
          <label>Cidade<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
          <label>Equipe<input value={form.assignedTeam} onChange={(e) => setForm({ ...form, assignedTeam: e.target.value })} placeholder="Ex.: Marcos + ajudante" /></label>
          <label>Observações<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Criar OS'}</button>
        </form>
      </section>

      <section className="finance-card">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente, cidade, equipe ou número" style={{ flex: 1, minWidth: 220 }} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos os status</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        {loading ? <p>Carregando...</p> : (
          <div className="finance-table-wrap"><table><thead><tr><th>OS</th><th>Cliente</th><th>Agendamento</th><th>Status</th><th>Equipe</th><th></th></tr></thead><tbody>
            {filtered.map((order) => <tr key={order.id}><td>#{order.orderNumber}</td><td><strong>{order.customerName}</strong><br /><small>{order.city}/{order.state}</small></td><td>{dateTime(order.scheduledAt)}</td><td>{order.status}</td><td>{order.assignedTeam || '-'}</td><td><button type="button" onClick={() => openOrder(order)}>Abrir</button></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      {selected && <section className="finance-card" style={{ marginTop: 18 }}>
        <h2><Wrench size={20} /> OS #{selected.orderNumber} — {selected.customerName}</h2>
        <p>{selected.installationAddress || 'Endereço não informado'} · {selected.city}/{selected.state}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <select value={selected.status} onChange={(e) => changeStatus(e.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
          <strong>Custo dos materiais: {money(items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0), 0))}</strong>
        </div>

        <h3><ClipboardList size={18} /> Checklist</h3>
        <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
          {checklist.map((row) => <label key={row.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={row.completed} onChange={() => toggleChecklist(row)} /><span><strong>{row.section}:</strong> {row.item}</span>{row.completed && <CheckCircle2 size={17} />}</label>)}
        </div>

        <h3><PackagePlus size={18} /> Materiais</h3>
        <form onSubmit={submitItem} className="finance-form-grid" style={{ marginBottom: 14 }}>
          <label>Descrição<input required value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} /></label>
          <label>Categoria<input value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} /></label>
          <label>Quantidade<input type="number" min="0.001" step="0.001" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} /></label>
          <label>Custo unitário<input type="number" min="0" step="0.01" value={itemForm.unitCost} onChange={(e) => setItemForm({ ...itemForm, unitCost: e.target.value })} /></label>
          <label><input type="checkbox" checked={itemForm.reserved} onChange={(e) => setItemForm({ ...itemForm, reserved: e.target.checked })} /> Material reservado</label>
          <button type="submit">Adicionar material</button>
        </form>
        <div className="finance-table-wrap"><table><thead><tr><th>Material</th><th>Categoria</th><th>Qtd.</th><th>Custo</th><th>Reserva</th></tr></thead><tbody>
          {items.map((item) => <tr key={item.id}><td>{item.description}</td><td>{item.category || '-'}</td><td>{item.quantity} {item.unit}</td><td>{money(item.unit_cost)}</td><td>{item.reserved ? 'Sim' : 'Não'}</td></tr>)}
        </tbody></table></div>

        <ServiceOrderMediaPanel order={selected} onCompleted={handleCompleted} onMessage={setMessage} />
      </section>}
    </FinanceLayout>
  );
}
