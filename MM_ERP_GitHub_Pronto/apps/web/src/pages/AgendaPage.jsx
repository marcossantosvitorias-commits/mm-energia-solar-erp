import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarDays, CheckCircle2, Clock3, MapPin, MessageCircle, Plus, Trash2, UserRound } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { createClientInteraction, listClients } from '../services/clientService.js';
import { requestErpNotificationPermission } from '../services/notificationService.js';
import './AgendaPage.css';

const EMPTY_FORM = {
  clientId: '', cliente: '', telefone: '', tipo: 'Visita técnica',
  data: '', horario: '', endereco: '', observacoes: '',
};

const somenteNumeros = (valor = '') => valor.replace(/\D/g, '');
const numeroComPais = (valor = '') => {
  const numeros = somenteNumeros(valor);
  return numeros.startsWith('55') ? numeros : `55${numeros}`;
};

function mapAppointment(row) {
  const date = new Date(row.appointment_at);
  return {
    id: row.id,
    clientId: row.client_id || '',
    cliente: row.client_name,
    telefone: row.phone || '',
    tipo: row.appointment_type,
    data: date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
    horario: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
    endereco: row.address || '',
    observacoes: row.notes || '',
    status: row.status,
  };
}

function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [retornos, setRetornos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mensagemNotificacao, setMensagemNotificacao] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function carregarAgenda() {
    if (!isSupabaseConfigured || !supabase) {
      setMensagem('A agenda exige conexão com o Supabase.');
      setCarregando(false);
      return;
    }

    setCarregando(true);
    try {
      const [clients, appointmentsResult, followUpsResult] = await Promise.all([
        listClients(),
        supabase.from('appointments').select('*').order('appointment_at', { ascending: true }),
        supabase
          .from('client_interactions')
          .select('id, client_id, interaction_type, description, next_action_at, clients(name, phone, city, state)')
          .not('next_action_at', 'is', null)
          .order('next_action_at', { ascending: true }),
      ]);
      if (appointmentsResult.error) throw appointmentsResult.error;
      if (followUpsResult.error) throw followUpsResult.error;
      setClientes(clients);
      setAgendamentos((appointmentsResult.data || []).map(mapAppointment));
      setRetornos(followUpsResult.data || []);
      setMensagem('');
    } catch (error) {
      setMensagem(`Não foi possível carregar a agenda: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarAgenda();
    const atualizarAoVoltar = () => {
      if (document.visibilityState === 'visible') carregarAgenda();
    };
    window.addEventListener('focus', carregarAgenda);
    document.addEventListener('visibilitychange', atualizarAoVoltar);

    let canal;
    if (isSupabaseConfigured && supabase) {
      canal = supabase.channel('crm-agenda-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, carregarAgenda)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'client_interactions' }, carregarAgenda)
        .subscribe();
    }
    return () => {
      window.removeEventListener('focus', carregarAgenda);
      document.removeEventListener('visibilitychange', atualizarAoVoltar);
      if (canal && supabase) supabase.removeChannel(canal);
    };
  }, []);

  function selecionarCliente(clientId) {
    const cliente = clientes.find((item) => item.id === clientId);
    setForm((atual) => ({
      ...atual,
      clientId,
      cliente: cliente?.name || '',
      telefone: cliente?.phone || '',
      endereco: cliente?.address || '',
    }));
  }

  async function adicionar(event) {
    event.preventDefault();
    if (!isSupabaseConfigured || !supabase) return;
    setSalvando(true);
    setMensagem('Salvando agendamento...');
    try {
      const appointmentAt = new Date(`${form.data}T${form.horario}:00-03:00`).toISOString();
      const { error } = await supabase.from('appointments').insert({
        client_id: form.clientId || null,
        client_name: form.cliente.trim(),
        phone: form.telefone.trim(),
        appointment_type: form.tipo,
        appointment_at: appointmentAt,
        address: form.endereco.trim() || null,
        notes: form.observacoes.trim() || null,
        status: 'Agendado',
      });
      if (error) throw error;

      if (form.clientId) {
        await createClientInteraction(form.clientId, {
          type: form.tipo === 'Apresentação de proposta' ? 'proposta' : 'visita',
          description: `${form.tipo} agendada para ${new Date(`${form.data}T12:00:00`).toLocaleDateString('pt-BR')} às ${form.horario}.${form.observacoes ? ` ${form.observacoes}` : ''}`,
          nextActionAt: appointmentAt,
        });
      }

      setForm(EMPTY_FORM);
      await carregarAgenda();
      setMensagem('Agendamento salvo e registrado no CRM.');
    } catch (error) {
      setMensagem(`Erro ao salvar: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarStatus(id, status) {
    try {
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      if (error) throw error;
      await carregarAgenda();
      setMensagem(status === 'Concluído' ? 'Compromisso concluído.' : 'Status atualizado.');
    } catch (error) {
      setMensagem(`Não foi possível atualizar: ${error.message}`);
    }
  }

  async function concluirRetorno(id) {
    try {
      const { error } = await supabase.from('client_interactions').update({ next_action_at: null }).eq('id', id);
      if (error) throw error;
      await carregarAgenda();
      setMensagem('Próxima ação marcada como concluída.');
    } catch (error) {
      setMensagem(`Não foi possível concluir: ${error.message}`);
    }
  }

  async function remover(id) {
    if (!window.confirm('Excluir este agendamento?')) return;
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      await carregarAgenda();
      setMensagem('Agendamento excluído.');
    } catch (error) {
      setMensagem(`Erro ao excluir: ${error.message}`);
    }
  }

  async function ativarNotificacoes() {
    try {
      const resultado = await requestErpNotificationPermission();
      setMensagemNotificacao(resultado.message);
    } catch (error) {
      setMensagemNotificacao(`Não foi possível ativar: ${error.message}`);
    }
  }

  function abrirWhatsApp(item) {
    const telefone = numeroComPais(item.telefone || item.clients?.phone || '');
    const data = item.data
      ? new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-BR')
      : new Date(item.next_action_at).toLocaleDateString('pt-BR');
    const horario = item.horario || new Date(item.next_action_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const cliente = item.cliente || item.clients?.name || 'cliente';
    const texto = `Olá, ${cliente}! Passando para confirmar nosso contato com a MM Energia Solar em ${data}, às ${horario}. Pode confirmar, por favor?`;
    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
  }

  const ordenados = useMemo(
    () => [...agendamentos].sort((a, b) => `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`)),
    [agendamentos],
  );

  const pendentesHoje = useMemo(() => {
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return ordenados.filter((item) => item.data === hoje && item.status !== 'Concluído').length
      + retornos.filter((item) => new Date(item.next_action_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) === hoje).length;
  }, [ordenados, retornos]);

  return (
    <FinanceLayout title="Agenda comercial" subtitle="Compromissos e próximas ações dos clientes centralizados no CRM.">
      {mensagem && <p className="agenda-nota">{mensagem}</p>}
      <section className="finance-grid">
        <article className="finance-panel"><span>Compromissos</span><strong className="dashboard-big-number">{ordenados.length}</strong></article>
        <article className="finance-panel"><span>Retornos do CRM</span><strong className="dashboard-big-number">{retornos.length}</strong></article>
        <article className="finance-panel"><span>Pendências de hoje</span><strong className="dashboard-big-number">{pendentesHoje}</strong></article>
      </section>

      <section className="agenda-grid">
        <form className="agenda-card agenda-form" onSubmit={adicionar}>
          <div className="agenda-card-title"><Plus size={20} /><div><h2>Novo agendamento</h2><p>Selecione um cliente para preencher os dados automaticamente.</p></div></div>
          <button className="agenda-primary" type="button" onClick={ativarNotificacoes}><BellRing size={18} /> Ativar notificações no celular</button>
          {mensagemNotificacao && <p className="agenda-nota">{mensagemNotificacao}</p>}
          <label>Cliente do CRM<select value={form.clientId} onChange={(e) => selecionarCliente(e.target.value)}><option value="">Agendamento sem cliente cadastrado</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.name} · {cliente.phone}</option>)}</select></label>
          <label>Nome<input required value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} /></label>
          <label>WhatsApp<input required inputMode="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></label>
          <label>Tipo<select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option>Visita técnica</option><option>Reunião comercial</option><option>Apresentação de proposta</option><option>Vistoria</option><option>Pós-venda</option><option>Manutenção</option></select></label>
          <div className="agenda-row"><label>Data<input required type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></label><label>Horário<input required type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} /></label></div>
          <label>Endereço<input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></label>
          <label>Observações<textarea rows="3" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></label>
          <button className="agenda-primary" type="submit" disabled={salvando}><CalendarDays size={18} /> {salvando ? 'Salvando...' : 'Salvar agendamento'}</button>
        </form>

        <div className="agenda-card agenda-lista">
          <div className="agenda-card-title"><CalendarDays size={20} /><div><h2>Próximos compromissos</h2><p>{carregando ? 'Carregando...' : `${ordenados.length} agendamento(s)`}</p></div></div>
          {!carregando && !ordenados.length ? <div className="agenda-empty"><CalendarDays size={42} /><strong>Nenhum compromisso</strong></div> : ordenados.map((item) => (
            <article className="agenda-item" key={item.id}>
              <div className="agenda-item-head"><div><strong>{item.cliente}</strong><span>{item.tipo}</span></div><span className="agenda-status">{item.status}</span></div>
              <div className="agenda-meta"><span><CalendarDays size={15} />{new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-BR')}</span><span><Clock3 size={15} />{item.horario}</span><span><UserRound size={15} />{item.telefone}</span>{item.endereco && <span><MapPin size={15} />{item.endereco}</span>}</div>
              {item.observacoes && <p className="agenda-nota">{item.observacoes}</p>}
              <div className="agenda-actions"><button className="agenda-whatsapp" type="button" onClick={() => abrirWhatsApp(item)}><MessageCircle size={17} /> WhatsApp</button>{item.status !== 'Concluído' && <button type="button" onClick={() => atualizarStatus(item.id, 'Concluído')}><CheckCircle2 size={17} /> Concluir</button>}<button className="agenda-delete" type="button" onClick={() => remover(item.id)}><Trash2 size={17} /></button></div>
            </article>
          ))}
        </div>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header"><div><h2>Próximas ações do CRM</h2><p>Retornos definidos no histórico comercial dos clientes.</p></div></div>
        {!retornos.length ? <div className="finance-empty">Nenhuma próxima ação pendente.</div> : retornos.map((item) => (
          <div className="finance-list-item" key={item.id}>
            <div><strong>{item.clients?.name || 'Cliente'}</strong><span>{new Date(item.next_action_at).toLocaleString('pt-BR')} · {item.description}</span></div>
            <div className="finance-actions"><button className="finance-secondary-button" type="button" onClick={() => abrirWhatsApp(item)}><MessageCircle size={15} /> WhatsApp</button><button className="finance-button" type="button" onClick={() => concluirRetorno(item.id)}><CheckCircle2 size={15} /> Concluir</button></div>
          </div>
        ))}
      </section>
    </FinanceLayout>
  );
}

export default AgendaPage;
