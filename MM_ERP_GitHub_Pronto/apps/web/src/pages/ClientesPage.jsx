import React, { useEffect, useMemo, useState } from 'react';
import { History, Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import SaoPauloCitySelect from '../components/SaoPauloCitySelect.jsx';
import {
  createClient,
  createClientInteraction,
  deleteClient,
  deleteClientInteraction,
  listClientInteractions,
  listClients,
  updateClient,
} from '../services/clientService.js';

const emptyForm = {
  name: '', document: '', phone: '', email: '', address: '', zipCode: '',
  city: 'Bauru', state: 'SP', customerType: 'residencial', status: 'lead',
  monthlyBill: '', notes: '',
};

const emptyInteraction = { type: 'whatsapp', description: '', nextActionAt: '' };

const stageLabels = {
  lead: 'Lead novo', qualificado: 'Qualificado', proposta: 'Proposta enviada',
  negociacao: 'Em negociação', cliente: 'Cliente', perdido: 'Perdido',
};

const interactionLabels = {
  contato: 'Contato', whatsapp: 'WhatsApp', ligacao: 'Ligação', visita: 'Visita',
  proposta: 'Proposta', financiamento: 'Financiamento', observacao: 'Observação',
};

const formatCurrency = (value) => Number(value || 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL',
});

const formatDateTime = (value) => value
  ? new Date(value).toLocaleString('pt-BR')
  : '-';

export default function ClientesPage() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [interaction, setInteraction] = useState(emptyInteraction);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setClients(await listClients());
    } catch (error) {
      setMessage(error?.message || 'Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredClients = useMemo(() => {
    const term = query.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesStage = stage === 'todos' || client.status === stage;
      const matchesSearch = !term || [client.name, client.phone, client.email, client.city, client.document]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      return matchesStage && matchesSearch;
    });
  }, [clients, query, stage]);

  const funnel = useMemo(() => Object.keys(stageLabels).reduce((result, key) => ({
    ...result,
    [key]: clients.filter((client) => client.status === key).length,
  }), {}), [clients]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value, ...(name === 'city' ? { state: 'SP' } : {}) }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!form.name.trim() || !form.phone.trim()) {
      setMessage('Informe pelo menos o nome e o telefone do cliente.');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, state: 'SP', monthlyBill: Number(form.monthlyBill || 0) };
      if (editingId) {
        await updateClient(editingId, payload);
        setMessage('Cliente atualizado com sucesso.');
      } else {
        await createClient(payload);
        setMessage('Cliente cadastrado com sucesso.');
      }
      resetForm();
      await load();
    } catch (error) {
      setMessage(error?.message || 'Não foi possível salvar o cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client) => {
    setEditingId(client.id);
    setForm({ ...emptyForm, ...client, state: 'SP', monthlyBill: client.monthlyBill || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (client) => {
    if (!window.confirm(`Excluir o cadastro de ${client.name}?`)) return;
    try {
      await deleteClient(client.id);
      if (selectedClient?.id === client.id) setSelectedClient(null);
      setMessage('Cliente excluído.');
      await load();
    } catch (error) {
      setMessage(error?.message || 'Não foi possível excluir o cliente.');
    }
  };

  const openHistory = async (client) => {
    setSelectedClient(client);
    setLoadingHistory(true);
    try {
      setInteractions(await listClientInteractions(client.id));
    } catch (error) {
      setMessage(error?.message || 'Não foi possível carregar o histórico.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveInteraction = async (event) => {
    event.preventDefault();
    if (!selectedClient || !interaction.description.trim()) return;
    try {
      await createClientInteraction(selectedClient.id, interaction);
      setInteraction(emptyInteraction);
      setInteractions(await listClientInteractions(selectedClient.id));
      setMessage('Interação adicionada ao histórico.');
    } catch (error) {
      setMessage(error?.message || 'Não foi possível salvar a interação.');
    }
  };

  const removeInteraction = async (id) => {
    if (!window.confirm('Excluir esta interação?')) return;
    try {
      await deleteClientInteraction(id);
      setInteractions((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setMessage(error?.message || 'Não foi possível excluir a interação.');
    }
  };

  return (
    <FinanceLayout title="Clientes e leads" subtitle="CRM comercial centralizado no Supabase, com funil e histórico de contatos.">
      {message ? <p className="finance-notice">{message}</p> : null}

      <section className="finance-grid">
        {Object.entries(stageLabels).map(([key, label]) => (
          <button type="button" className="finance-panel" key={key} onClick={() => setStage(key)}>
            <span>{label}</span>
            <strong className="dashboard-big-number">{funnel[key] || 0}</strong>
          </button>
        ))}
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div><h2>{editingId ? 'Editar cliente' : 'Novo cliente'}</h2><p>Dados disponíveis no celular e no computador.</p></div>
          <Plus size={22} />
        </div>
        <form className="finance-form" onSubmit={handleSubmit}>
          <label className="finance-field"><span>Nome completo *</span><input name="name" value={form.name} onChange={handleChange} /></label>
          <label className="finance-field"><span>Telefone / WhatsApp *</span><input name="phone" value={form.phone} onChange={handleChange} /></label>
          <label className="finance-field"><span>CPF ou CNPJ</span><input name="document" value={form.document} onChange={handleChange} /></label>
          <label className="finance-field"><span>E-mail</span><input type="email" name="email" value={form.email} onChange={handleChange} /></label>
          <label className="finance-field"><span>Endereço</span><input name="address" value={form.address} onChange={handleChange} /></label>
          <label className="finance-field"><span>CEP</span><input name="zipCode" value={form.zipCode} onChange={handleChange} /></label>
          <label className="finance-field"><span>Cidade</span><SaoPauloCitySelect name="city" value={form.city} onChange={handleChange} required /></label>
          <label className="finance-field"><span>Estado</span><input name="state" value="SP" readOnly aria-label="Estado: São Paulo" /></label>
          <label className="finance-field"><span>Tipo</span><select name="customerType" value={form.customerType} onChange={handleChange}><option value="residencial">Residencial</option><option value="comercial">Comercial</option><option value="rural">Rural</option><option value="industrial">Industrial</option></select></label>
          <label className="finance-field"><span>Etapa comercial</span><select name="status" value={form.status} onChange={handleChange}>{Object.entries(stageLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="finance-field"><span>Valor médio da conta</span><input type="number" min="0" step="0.01" name="monthlyBill" value={form.monthlyBill} onChange={handleChange} /></label>
          <label className="finance-field finance-field-wide"><span>Observações</span><textarea name="notes" value={form.notes} onChange={handleChange} /></label>
          <div className="finance-actions finance-field-wide">
            {editingId ? <button type="button" className="finance-secondary-button" onClick={resetForm}>Cancelar</button> : null}
            <button className="finance-button" disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Atualizar cliente' : 'Cadastrar cliente'}</button>
          </div>
        </form>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div><h2>Base de clientes</h2><p>{filteredClients.length} contato(s) exibido(s)</p></div>
          <div className="finance-panel-actions">
            <select className="finance-filter" value={stage} onChange={(event) => setStage(event.target.value)}><option value="todos">Todas as etapas</option>{Object.entries(stageLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
            <div className="crm-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente" /></div>
          </div>
        </div>
        <div className="finance-table-wrapper">
          <table className="finance-table">
            <thead><tr><th>Cliente</th><th>Contato</th><th>Local</th><th>Etapa</th><th>Conta média</th><th>Ações</th></tr></thead>
            <tbody>
              {loading ? <tr><td className="finance-empty-cell" colSpan="6">Carregando clientes...</td></tr> : filteredClients.length === 0 ? <tr><td className="finance-empty-cell" colSpan="6">Nenhum cliente encontrado.</td></tr> : filteredClients.map((client) => (
                <tr key={client.id}>
                  <td><strong className="crm-client-name"><UserRound size={16} /> {client.name}</strong><small>{client.document || 'Sem documento'}</small></td>
                  <td>{client.phone}<small>{client.email || 'Sem e-mail'}</small></td>
                  <td>{client.city || '-'} / {client.state || '-'}</td>
                  <td><span className={`finance-badge ${client.status === 'cliente' ? 'recebida' : 'pendente'}`}>{stageLabels[client.status] || client.status}</span></td>
                  <td>{formatCurrency(client.monthlyBill)}</td>
                  <td><div className="finance-row-actions"><button className="finance-secondary-button" onClick={() => openHistory(client)} title="Histórico"><History size={15} /></button><button className="finance-secondary-button" onClick={() => handleEdit(client)} title="Editar"><Pencil size={15} /></button><button className="finance-delete" onClick={() => handleDelete(client)} title="Excluir"><Trash2 size={15} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedClient ? (
        <section className="finance-panel">
          <div className="finance-panel-header"><div><h2>Histórico — {selectedClient.name}</h2><p>Registre contatos e próximos passos.</p></div><button className="finance-secondary-button" onClick={() => setSelectedClient(null)}>Fechar</button></div>
          <form className="finance-form" onSubmit={saveInteraction}>
            <label className="finance-field"><span>Tipo</span><select value={interaction.type} onChange={(event) => setInteraction((current) => ({ ...current, type: event.target.value }))}>{Object.entries(interactionLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="finance-field"><span>Próxima ação</span><input type="datetime-local" value={interaction.nextActionAt} onChange={(event) => setInteraction((current) => ({ ...current, nextActionAt: event.target.value }))} /></label>
            <label className="finance-field finance-field-wide"><span>Descrição *</span><textarea value={interaction.description} onChange={(event) => setInteraction((current) => ({ ...current, description: event.target.value }))} /></label>
            <div className="finance-actions finance-field-wide"><button className="finance-button">Adicionar ao histórico</button></div>
          </form>
          {loadingHistory ? <div className="finance-empty">Carregando histórico...</div> : interactions.length ? interactions.map((item) => (
            <div className="finance-list-item" key={item.id}><div><strong>{interactionLabels[item.interaction_type] || item.interaction_type}</strong><span>{item.description}</span><small>{formatDateTime(item.created_at)}{item.next_action_at ? ` • Próxima ação: ${formatDateTime(item.next_action_at)}` : ''}</small></div><button className="finance-delete" onClick={() => removeInteraction(item.id)}><Trash2 size={15} /></button></div>
          )) : <div className="finance-empty">Nenhuma interação registrada.</div>}
        </section>
      ) : null}
    </FinanceLayout>
  );
}
