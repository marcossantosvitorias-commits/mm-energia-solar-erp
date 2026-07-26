import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import {
  createClient,
  deleteClient,
  listClients,
  updateClient,
} from '../services/clientService.js';

const emptyForm = {
  name: '',
  document: '',
  phone: '',
  email: '',
  address: '',
  zipCode: '',
  city: 'Bauru',
  state: 'SP',
  customerType: 'residencial',
  status: 'lead',
  monthlyBill: '',
  notes: '',
};

export default function ClientesPage() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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

  useEffect(() => {
    load();
  }, []);

  const filteredClients = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clients;

    return clients.filter((client) =>
      [client.name, client.phone, client.email, client.address, client.zipCode, client.city, client.document]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [clients, query]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
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
      const payload = {
        ...form,
        monthlyBill: Number(form.monthlyBill || 0),
      };

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
    setForm({
      ...emptyForm,
      ...client,
      monthlyBill: client.monthlyBill || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (client) => {
    const confirmed = window.confirm(`Excluir o cadastro de ${client.name}?`);
    if (!confirmed) return;

    try {
      await deleteClient(client.id);
      setMessage('Cliente excluído.');
      await load();
    } catch (error) {
      setMessage(error?.message || 'Não foi possível excluir o cliente.');
    }
  };

  return (
    <FinanceLayout
      title="Clientes e leads"
      subtitle="Cadastre contatos, acompanhe oportunidades e mantenha o histórico comercial organizado."
    >
      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>{editingId ? 'Editar cliente' : 'Novo cliente'}</h2>
            <p>Cadastro centralizado no Supabase e disponível em todos os seus dispositivos.</p>
          </div>
          <Plus size={22} />
        </div>

        <form className="finance-form" onSubmit={handleSubmit}>
          <label className="finance-field">
            <span>Nome completo *</span>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Nome do cliente" />
          </label>

          <label className="finance-field">
            <span>Telefone / WhatsApp *</span>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="(14) 99999-9999" />
          </label>

          <label className="finance-field">
            <span>CPF ou CNPJ</span>
            <input name="document" value={form.document} onChange={handleChange} placeholder="Documento" />
          </label>

          <label className="finance-field">
            <span>E-mail</span>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="cliente@email.com" />
          </label>

          <label className="finance-field finance-field-wide">
            <span>Endereço</span>
            <input name="address" value={form.address} onChange={handleChange} placeholder="Rua, número e bairro" />
          </label>

          <label className="finance-field">
            <span>CEP</span>
            <input name="zipCode" value={form.zipCode} onChange={handleChange} placeholder="00000-000" />
          </label>

          <label className="finance-field">
            <span>Cidade</span>
            <input name="city" value={form.city} onChange={handleChange} />
          </label>

          <label className="finance-field">
            <span>Estado</span>
            <input name="state" value={form.state} onChange={handleChange} maxLength={2} />
          </label>

          <label className="finance-field">
            <span>Tipo de cliente</span>
            <select name="customerType" value={form.customerType} onChange={handleChange}>
              <option value="residencial">Residencial</option>
              <option value="comercial">Comercial</option>
              <option value="rural">Rural</option>
              <option value="industrial">Industrial</option>
            </select>
          </label>

          <label className="finance-field">
            <span>Etapa comercial</span>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="lead">Lead novo</option>
              <option value="qualificado">Qualificado</option>
              <option value="proposta">Proposta enviada</option>
              <option value="negociacao">Em negociação</option>
              <option value="cliente">Cliente</option>
              <option value="perdido">Perdido</option>
            </select>
          </label>

          <label className="finance-field">
            <span>Valor médio da conta</span>
            <input type="number" min="0" step="0.01" name="monthlyBill" value={form.monthlyBill} onChange={handleChange} placeholder="0,00" />
          </label>

          <label className="finance-field finance-field-wide">
            <span>Observações</span>
            <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Informações importantes sobre o contato" />
          </label>

          <div className="finance-actions finance-field-wide">
            {editingId ? (
              <button type="button" className="finance-secondary-button" onClick={resetForm}>Cancelar edição</button>
            ) : null}
            <button className="finance-button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Atualizar cliente' : 'Cadastrar cliente'}
            </button>
          </div>
        </form>

        {message ? <p className="crm-message">{message}</p> : null}
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Base de clientes</h2>
            <p>{clients.length} contato(s) cadastrado(s)</p>
          </div>
          <div className="crm-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente" />
          </div>
        </div>

        <div className="finance-table-wrapper">
          <table className="finance-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contato</th>
                <th>Local</th>
                <th>Perfil</th>
                <th>Etapa</th>
                <th>Conta média</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="finance-empty-cell" colSpan="7">Carregando clientes...</td></tr>
              ) : filteredClients.length === 0 ? (
                <tr><td className="finance-empty-cell" colSpan="7">Nenhum cliente encontrado.</td></tr>
              ) : filteredClients.map((client) => (
                <tr key={client.id}>
                  <td><strong className="crm-client-name"><UserRound size={16} /> {client.name}</strong><small>{client.document || 'Sem documento'}</small></td>
                  <td>{client.phone}<small>{client.email || 'Sem e-mail'}</small></td>
                  <td>{client.city || '-'} / {client.state || '-'}<small>{client.address || client.zipCode ? `${client.address || ''}${client.zipCode ? ` • CEP ${client.zipCode}` : ''}` : 'Sem endereço'}</small></td>
                  <td>{client.customerType || 'residencial'}</td>
                  <td><span className={`finance-badge ${client.status === 'cliente' ? 'recebida' : 'pendente'}`}>{client.status || 'lead'}</span></td>
                  <td>{Number(client.monthlyBill || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td>
                    <div className="finance-row-actions">
                      <button className="finance-secondary-button" onClick={() => handleEdit(client)} aria-label="Editar cliente"><Pencil size={15} /></button>
                      <button className="finance-delete" onClick={() => handleDelete(client)} aria-label="Excluir cliente"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </FinanceLayout>
  );
}
