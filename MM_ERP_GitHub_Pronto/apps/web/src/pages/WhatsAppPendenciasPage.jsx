import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const formatPhone = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  if (digits.length === 12 && digits.startsWith('55')) return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  return phone || 'Sem telefone';
};

const waitingLabel = (hours) => {
  const h = Number(hours || 0);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `${Math.round(h)} h`;
  const days = Math.floor(h / 24);
  const rest = Math.round(h % 24);
  return `${days} d${rest ? ` ${rest} h` : ''}`;
};

function WhatsAppPendenciasPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
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
      if (filter === 'closed') query = query.eq('status', 'closed');
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      setItems(data || []);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar as conversas.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [item.contact_name, item.phone, item.last_message_preview]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(term)));
  }, [items, search]);

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
    const { error: updateError } = await supabase.from('whatsapp_conversations').update({ priority, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (updateError) return setError(updateError.message);
    await load();
  };

  return <FinanceLayout title="WhatsApp / Pendências" subtitle="Clientes que precisam de resposta humana, sem substituir o chatbot da agência.">
    {error && <p className="finance-notice">{error}</p>}

    <section className="finance-panel">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`finance-button ${filter === 'pending' ? '' : 'secondary'}`} type="button" onClick={() => setFilter('pending')}>Aguardando você</button>
          <button className={`finance-button ${filter === 'waiting_customer' ? '' : 'secondary'}`} type="button" onClick={() => setFilter('waiting_customer')}>Aguardando cliente</button>
          <button className={`finance-button ${filter === 'all' ? '' : 'secondary'}`} type="button" onClick={() => setFilter('all')}>Todas</button>
        </div>
        <button className="finance-button secondary" type="button" onClick={load}>Atualizar</button>
      </div>
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por nome, telefone ou mensagem..."
        style={{ width: '100%', marginTop: 14, minHeight: 42, border: '1px solid #d8e0e8', borderRadius: 10, padding: '0 12px' }}
      />
    </section>

    {loading ? <div className="finance-empty">Carregando conversas...</div> : (
      <section className="finance-panel">
        <h2>{filter === 'pending' ? `${visible.length} cliente(s) aguardando resposta` : `${visible.length} conversa(s)`}</h2>
        {!visible.length && <div className="finance-empty">Nenhuma conversa nessa fila ainda. Assim que o webhook da agência começar a enviar mensagens, elas aparecerão aqui.</div>}
        {visible.map((item) => {
          const url = `https://wa.me/${String(item.phone || '').replace(/\D/g, '')}`;
          const hours = item.waiting_hours ?? (item.last_inbound_at ? (Date.now() - new Date(item.last_inbound_at).getTime()) / 3600000 : 0);
          return <div className="finance-list-item" key={item.id} style={{ alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 220, flex: '1 1 360px' }}>
              <strong>{item.contact_name || formatPhone(item.phone)}</strong>
              <span>{item.contact_name ? formatPhone(item.phone) : ''}</span>
              <span style={{ marginTop: 6 }}>{item.last_message_preview || 'Mensagem sem texto'}</span>
              {item.needs_reply && <span style={{ marginTop: 5, fontWeight: 700 }}>Aguardando há {waitingLabel(hours)}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`finance-badge ${item.priority === 'urgent' || item.priority === 'high' ? 'vencida' : 'pendente'}`}>{item.priority === 'urgent' ? 'Urgente' : item.priority === 'high' ? 'Alta' : 'Normal'}</span>
              <a className="finance-button inline-button" href={url} target="_blank" rel="noreferrer">Abrir WhatsApp</a>
              {item.needs_reply && <button className="finance-button secondary" type="button" onClick={() => markAnswered(item)}>Marcar respondido</button>}
              <select value={item.priority || 'normal'} onChange={(event) => markPriority(item, event.target.value)} style={{ minHeight: 38, borderRadius: 9, border: '1px solid #d8e0e8', padding: '0 8px' }}>
                <option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option>
              </select>
            </div>
          </div>;
        })}
      </section>
    )}
  </FinanceLayout>;
}

export default WhatsAppPendenciasPage;
