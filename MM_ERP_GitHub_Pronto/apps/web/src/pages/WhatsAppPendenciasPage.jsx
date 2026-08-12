import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Clock3, ExternalLink,
  MessageCircle, Phone, RefreshCw, Search, UserRound,
} from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import './WhatsAppPendenciasPage.css';

const formatPhone = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  if (digits.length === 12 && digits.startsWith('55')) return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  return phone || 'Sem telefone';
};

const formatTime = (value) => value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
const formatDate = (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '';

const waitingLabel = (hours) => {
  const h = Number(hours || 0);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `${Math.round(h)} h`;
  const days = Math.floor(h / 24);
  const rest = Math.round(h % 24);
  return `${days} d${rest ? ` ${rest} h` : ''}`;
};

const openWhatsAppBusiness = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return;
  const isAndroid = /Android/i.test(navigator.userAgent || '');
  if (isAndroid) {
    window.location.href = `intent://send?phone=${digits}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
    return;
  }
  window.open(`https://wa.me/${digits}`, '_blank', 'noopener,noreferrer');
};

const initials = (name, phone) => {
  const source = (name || formatPhone(phone) || '?').trim();
  const words = source.split(/\s+/).filter(Boolean);
  return words.length > 1 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : source.slice(0, 2).toUpperCase();
};

function WhatsAppPendenciasPage() {
  const [items, setItems] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado.');
      const source = filter === 'pending' ? 'whatsapp_pending_replies' : 'whatsapp_conversations';
      let query = supabase.from(source).select('*').order('last_message_at', { ascending: false }).limit(200);
      if (filter === 'waiting_customer') query = query.eq('status', 'waiting_customer');
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      const rows = data || [];
      setItems(rows);
      setSelected((current) => rows.find((row) => row.id === current?.id) || current || rows[0] || null);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar as conversas.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadMessages = useCallback(async (conversation) => {
    if (!conversation?.id || !supabase) return;
    setMessagesLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('occurred_at', { ascending: true })
        .limit(500);
      if (queryError) throw queryError;
      setMessages(data || []);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar o histórico da conversa.');
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (selected) loadMessages(selected); else setMessages([]); }, [selected?.id, loadMessages]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [item.contact_name, item.phone, item.last_message_preview]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(term)));
  }, [items, search]);

  const selectConversation = (item) => setSelected(item);

  const markAnswered = async (item) => {
    const { error: updateError } = await supabase.from('whatsapp_conversations').update({
      needs_reply: false,
      status: 'waiting_customer',
      unread_count: 0,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id);
    if (updateError) return setError(updateError.message);
    await load();
  };

  const markPriority = async (item, priority) => {
    const { error: updateError } = await supabase
      .from('whatsapp_conversations')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (updateError) return setError(updateError.message);
    setSelected((current) => current?.id === item.id ? { ...current, priority } : current);
    await load();
  };

  const selectedHours = selected?.waiting_hours ?? (selected?.last_inbound_at ? (Date.now() - new Date(selected.last_inbound_at).getTime()) / 3600000 : 0);

  return (
    <FinanceLayout title="WhatsApp / Atendimento" subtitle="Central profissional para acompanhar conversas, prioridades e clientes aguardando resposta.">
      {error && <p className="finance-notice">{error}</p>}

      <div className={`wa-inbox ${selected ? 'chat-open' : ''}`}>
        <aside className="wa-sidebar">
          <div className="wa-toolbar">
            <div className="wa-toolbar-top">
              <div className="wa-title"><MessageCircle size={20} /> Conversas <span className="wa-count">{visible.length}</span></div>
              <button className="wa-icon-btn" type="button" onClick={load} title="Atualizar"><RefreshCw size={17} /></button>
            </div>
            <div className="wa-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversa..." /></div>
            <div className="wa-filters">
              <button className={`wa-filter ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Aguardando você</button>
              <button className={`wa-filter ${filter === 'waiting_customer' ? 'active' : ''}`} onClick={() => setFilter('waiting_customer')}>Aguardando cliente</button>
              <button className={`wa-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todas</button>
            </div>
          </div>

          <div className="wa-list">
            {loading && <div className="wa-loading">Carregando conversas...</div>}
            {!loading && !visible.length && <div className="wa-loading">Nenhuma conversa nessa fila.</div>}
            {!loading && visible.map((item) => {
              const hours = item.waiting_hours ?? (item.last_inbound_at ? (Date.now() - new Date(item.last_inbound_at).getTime()) / 3600000 : 0);
              return (
                <button key={item.id} className={`wa-conversation ${selected?.id === item.id ? 'active' : ''}`} type="button" onClick={() => selectConversation(item)}>
                  <div className="wa-avatar">{initials(item.contact_name, item.phone)}</div>
                  <div className="wa-conv-body">
                    <div className="wa-conv-row"><span className="wa-name">{item.contact_name || formatPhone(item.phone)}</span><span className="wa-time">{formatTime(item.last_message_at)}</span></div>
                    <div className="wa-preview">{item.last_message_preview || 'Mensagem sem texto'}</div>
                    {item.needs_reply && <div className="wa-attention"><Clock3 size={12} /> Aguardando {waitingLabel(hours)}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="wa-chat">
          {!selected ? (
            <div className="wa-chat-empty"><div><MessageCircle size={46} /><h3>Selecione uma conversa</h3><p>O histórico completo aparecerá aqui.</p></div></div>
          ) : (
            <>
              <header className="wa-chat-header">
                <div className="wa-contact">
                  <button className="wa-icon-btn wa-mobile-back" type="button" onClick={() => setSelected(null)}><ArrowLeft size={18} /></button>
                  <div className="wa-avatar">{initials(selected.contact_name, selected.phone)}</div>
                  <div className="wa-contact-meta"><strong>{selected.contact_name || formatPhone(selected.phone)}</strong><span>{formatPhone(selected.phone)}</span></div>
                </div>
                <div className="wa-header-actions">
                  <button className="wa-primary-btn" type="button" onClick={() => openWhatsAppBusiness(selected.phone)}><ExternalLink size={16} /><span>Abrir no Business</span></button>
                </div>
              </header>

              <div className="wa-messages">
                {messagesLoading && <div className="wa-loading">Carregando histórico...</div>}
                {!messagesLoading && !messages.length && <div className="wa-loading">Ainda não há mensagens salvas desta conversa.</div>}
                {!messagesLoading && messages.map((message, index) => {
                  const previous = messages[index - 1];
                  const showDay = !previous || formatDate(previous.occurred_at) !== formatDate(message.occurred_at);
                  return (
                    <React.Fragment key={message.id}>
                      {showDay && <div className="wa-day"><span>{formatDate(message.occurred_at)}</span></div>}
                      <div className={`wa-msg-row ${message.direction === 'outbound' ? 'outbound' : 'inbound'}`}>
                        <div className="wa-bubble">
                          {message.body || `[${message.message_type || 'mensagem'}]`}
                          <div className="wa-msg-meta"><span>{message.sender_type === 'agent' ? 'Atendente' : message.sender_type === 'bot' ? 'Bot' : 'Cliente'}</span><span>{formatTime(message.occurred_at)}</span></div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </>
          )}
        </main>

        <aside className="wa-details">
          {selected && (
            <>
              <h3>Detalhes do atendimento</h3>
              <div className="wa-detail-card"><div className="wa-detail-label">Cliente</div><div className="wa-detail-value">{selected.contact_name || 'Nome não identificado'}</div><div className="wa-detail-value" style={{ fontWeight: 500 }}>{formatPhone(selected.phone)}</div></div>
              <div className="wa-detail-card">
                <div className="wa-detail-label">Situação</div>
                <div className={`wa-status ${selected.needs_reply ? 'pending' : 'ok'}`}>{selected.needs_reply ? <><AlertTriangle size={15} /> Aguardando sua resposta</> : <><CheckCircle2 size={15} /> Em acompanhamento</>}</div>
                {selected.needs_reply && <div className="wa-detail-value">Há {waitingLabel(selectedHours)}</div>}
              </div>
              <div className="wa-detail-card"><div className="wa-detail-label">Prioridade</div><select className="wa-select" value={selected.priority || 'normal'} onChange={(e) => markPriority(selected, e.target.value)}><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></div>
              <div className="wa-detail-card"><div className="wa-detail-label">Origem</div><div className="wa-detail-value">{selected.source === 'meta_cloud_api' ? 'WhatsApp Business / Meta' : selected.source || 'WhatsApp'}</div></div>
              <div className="wa-detail-actions">
                <button className="wa-primary-btn" type="button" onClick={() => openWhatsAppBusiness(selected.phone)}><Phone size={16} /> Abrir WhatsApp Business</button>
                {selected.needs_reply && <button className="wa-secondary-btn" type="button" onClick={() => markAnswered(selected)}><CheckCircle2 size={16} /> Marcar como respondido</button>}
              </div>
            </>
          )}
        </aside>
      </div>
    </FinanceLayout>
  );
}

export default WhatsAppPendenciasPage;
