import React, { useMemo, useState } from 'react';
import { CalendarDays, Clock3, MapPin, MessageCircle, Plus, Trash2, UserRound } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import './AgendaPage.css';

const STORAGE_KEY = 'mm-erp-agendamentos-v1';

const carregar = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};

const somenteNumeros = (valor = '') => valor.replace(/\D/g, '');

const numeroComPais = (valor = '') => {
  const numeros = somenteNumeros(valor);
  return numeros.startsWith('55') ? numeros : `55${numeros}`;
};

function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState(carregar);
  const [form, setForm] = useState({ cliente: '', telefone: '', tipo: 'Visita técnica', data: '', horario: '', endereco: '', observacoes: '' });

  const salvarLista = (lista) => {
    setAgendamentos(lista);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  };

  const adicionar = (event) => {
    event.preventDefault();
    const novo = { ...form, id: crypto.randomUUID(), status: 'Agendado', criadoEm: new Date().toISOString() };
    salvarLista([...agendamentos, novo]);
    setForm({ cliente: '', telefone: '', tipo: 'Visita técnica', data: '', horario: '', endereco: '', observacoes: '' });
  };

  const remover = (id) => salvarLista(agendamentos.filter((item) => item.id !== id));

  const abrirWhatsApp = (item) => {
    const telefone = numeroComPais(item.telefone);
    const data = item.data ? new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-BR') : '';
    const texto = `Olá, ${item.cliente}! Confirmando nosso agendamento com a MM Energia Solar:\n\n📅 ${data}\n⏰ ${item.horario}\n📍 ${item.tipo}${item.endereco ? `\nEndereço: ${item.endereco}` : ''}\n\nPode confirmar, por favor?`;
    const linkPadrao = `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`;
    const android = /Android/i.test(navigator.userAgent);

    if (android) {
      const intentBusiness = `intent://send?phone=${telefone}&text=${encodeURIComponent(texto)}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=${encodeURIComponent(linkPadrao)};end`;
      window.location.href = intentBusiness;
      return;
    }

    window.open(linkPadrao, '_blank', 'noopener,noreferrer');
  };

  const ordenados = useMemo(() => [...agendamentos].sort((a, b) => `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`)), [agendamentos]);

  return (
    <FinanceLayout title="Agenda de reuniões e visitas" subtitle="Cadastre compromissos e confirme cada agendamento diretamente pelo WhatsApp.">
      <section className="agenda-grid">
        <form className="agenda-card agenda-form" onSubmit={adicionar}>
          <div className="agenda-card-title"><Plus size={20} /><div><h2>Novo agendamento</h2><p>Preencha os dados do cliente e da visita.</p></div></div>

          <label>Cliente<input required value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Nome do cliente" /></label>
          <label>WhatsApp<input required inputMode="tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(14) 99999-9999" /></label>
          <label>Tipo<select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option>Visita técnica</option><option>Reunião comercial</option><option>Apresentação de proposta</option><option>Vistoria</option><option>Pós-venda</option><option>Manutenção</option></select></label>
          <div className="agenda-row"><label>Data<input required type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></label><label>Horário<input required type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} /></label></div>
          <label>Endereço<input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número, bairro e cidade" /></label>
          <label>Observações<textarea rows="3" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Ex.: levar proposta, verificar padrão de entrada..." /></label>
          <button className="agenda-primary" type="submit"><CalendarDays size={18} /> Salvar agendamento</button>
        </form>

        <div className="agenda-card agenda-lista">
          <div className="agenda-card-title"><CalendarDays size={20} /><div><h2>Próximos compromissos</h2><p>{ordenados.length} agendamento(s) salvo(s).</p></div></div>
          {ordenados.length === 0 ? <div className="agenda-empty"><CalendarDays size={42} /><strong>Nenhum compromisso agendado</strong><span>Use o formulário ao lado para criar o primeiro.</span></div> : ordenados.map((item) => (
            <article className="agenda-item" key={item.id}>
              <div className="agenda-item-head"><div><strong>{item.cliente}</strong><span>{item.tipo}</span></div><span className="agenda-status">Agendado</span></div>
              <div className="agenda-meta"><span><CalendarDays size={15} />{new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-BR')}</span><span><Clock3 size={15} />{item.horario}</span><span><UserRound size={15} />{item.telefone}</span>{item.endereco && <span><MapPin size={15} />{item.endereco}</span>}</div>
              {item.observacoes && <p className="agenda-nota">{item.observacoes}</p>}
              <div className="agenda-actions"><button className="agenda-whatsapp" onClick={() => abrirWhatsApp(item)}><MessageCircle size={17} /> Confirmar no WhatsApp Business</button><button className="agenda-delete" onClick={() => remover(item.id)} aria-label="Excluir"><Trash2 size={17} /></button></div>
            </article>
          ))}
        </div>
      </section>
    </FinanceLayout>
  );
}

export default AgendaPage;
