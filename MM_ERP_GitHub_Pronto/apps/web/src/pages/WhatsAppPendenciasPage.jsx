import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, CheckCircle2, Clock3, Download, ExternalLink, FileText, Flame,
  Image as ImageIcon, MessageCircle, Mic, RefreshCw, Save, Search, Send, UserRound, Video,
} from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import './WhatsAppPendenciasPage.css';

const STAGES = [
  ['new', 'Novo lead'], ['qualifying', 'Qualificando'], ['qualified', 'Qualificado'],
  ['proposal', 'Proposta enviada'], ['follow_up', 'Follow-up'], ['won', 'Vendido'],
  ['lost', 'Perdido'], ['not_lead', 'Não é lead'],
];
const TEMPERATURES = [['cold', 'Frio'], ['warm', 'Morno'], ['hot', 'Quente']];
const PRIORITIES = [['low', 'Baixa'], ['normal', 'Normal'], ['high', 'Alta'], ['urgent', 'Urgente']];
const CUSTOMER_PROFILES = [
  ['', 'Não informado'], ['residential', 'Residencial'], ['commercial', 'Comercial'],
  ['rural', 'Rural'], ['condominium', 'Condomínio'], ['other', 'Outro'],
];
const CREDIT_STATUSES = [
  ['', 'Não verificado'], ['approved', 'Crédito aprovado'], ['pending', 'Em análise'],
  ['no_credit', 'Sem crédito'], ['cash', 'Pagamento à vista'], ['not_interested', 'Não quer financiamento'],
];
const LEAD_SOURCES = [
  ['', 'Não informado'], ['meta_ads', 'Anúncio Meta'], ['google_ads', 'Google Ads'], ['organic', 'Orgânico'],
  ['referral', 'Indicação'], ['prospecting', 'Prospecção'], ['existing_client', 'Cliente existente'], ['other', 'Outro'],
];
const YES_NO_UNKNOWN = [['', 'Não informado'], ['yes', 'Sim'], ['no', 'Não']];

const formatPhone = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  if (digits.length === 12 && digits.startsWith('55')) return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  return phone || 'Sem telefone';
};
const formatDateTime = (value) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '';
const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const waitingLabel = (value) => {
  if (!value) return 'agora';
  const hours = Math.max(0, (Date.now() - new Date(value).getTime()) / 3600000);
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) return `${Math.round(hours)} h`;
  return `${Math.floor(hours / 24)} d`;
};
const openWhatsAppBusiness = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return;
  if (/Android/i.test(navigator.userAgent || '')) {
    window.location.href = `intent://send?phone=${digits}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
    return;
  }
  window.open(`https://wa.me/${digits}`, '_blank', 'noopener,noreferrer');
};

function WhatsAppMedia({ message }) {
  const [src, setSrc] = useState(message.media_url || '');
  const [loading, setLoading] = useState(Boolean(message.media_id && !message.media_url));
  const [failed, setFailed] = useState(false);
  const objectUrlRef = useRef('');
  const type = String(message.message_type || '').toLowerCase();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (message.media_url || !message.media_id || !supabase) return;
      setLoading(true);
      setFailed(false);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const base = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!token || !base) throw new Error('Sessão indisponível');
        const response = await fetch(`${base}/functions/v1/whatsapp-media?message_id=${encodeURIComponent(message.id)}`, {
          headers: { Authorization: `Bearer ${token}`, ...(anonKey ? { apikey: anonKey } : {}) },
        });
        if (!response.ok) throw new Error('Mídia indisponível');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        if (!cancelled) setSrc(url);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    };
  }, [message.id, message.media_id, message.media_url]);

  const caption = message.media_caption || (message.body && type !== 'text' ? message.body : '');
  if (loading) return <div className="wa-media-loading">Carregando mídia...</div>;
  if (src && ['image', 'sticker'].includes(type)) return <div className="wa-media-wrap"><img className="wa-media-image" src={src} alt={caption || 'Imagem recebida'} loading="lazy" />{caption && <div className="wa-media-caption">{caption}</div>}</div>;
  if (src && ['audio', 'voice'].includes(type)) return <div className="wa-media-wrap wa-audio-wrap"><div className="wa-media-label"><Mic size={16} /> Áudio</div><audio className="wa-media-audio" controls preload="metadata" src={src} /></div>;
  if (src && type === 'video') return <div className="wa-media-wrap"><video className="wa-media-video" controls preload="metadata" src={src} />{caption && <div className="wa-media-caption">{caption}</div>}</div>;
  if (src && ['document', 'file'].includes(type)) return <a className="wa-document" href={src} target="_blank" rel="noreferrer" download={message.media_filename || undefined}><FileText size={20} /><span>{message.media_filename || 'Abrir documento'}</span><Download size={16} /></a>;
  const Icon = ['audio', 'voice'].includes(type) ? Mic : type === 'video' ? Video : ['image', 'sticker'].includes(type) ? ImageIcon : FileText;
  return <div className={`wa-media-placeholder ${failed ? 'failed' : ''}`}><Icon size={18} /><span>{failed ? 'Não foi possível carregar esta mídia' : message.media_filename || `Mensagem ${type || 'multimídia'}`}</span></div>;
}

function MessageContent({ message }) {
  const type = String(message.message_type || 'text').toLowerCase();
  const hasMedia = Boolean(message.media_id || message.media_url || ['image', 'audio', 'voice', 'video', 'document', 'file', 'sticker'].includes(type));
  if (hasMedia) return <WhatsAppMedia message={message} />;
  return <>{message.body || `[${message.message_type || 'mensagem'}]`}</>;
}

function SelectField({ label, value, onChange, options }) {
  return <div className="wa-detail-card"><div className="wa-detail-label">{label}</div><select className="wa-select" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>{options.map(([optionValue, optionLabel]) => <option key={optionValue || 'blank'} value={optionValue}>{optionLabel}</option>)}</select></div>;
}

function WhatsAppPendenciasPage() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [qualification, setQualification] = useState({});
  const messagesEndRef = useRef(null);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);

  const loadConversations = useCallback(async ({ keepSelection = true } = {}) => {
    setLoading(true);
    setError('');
    try {
      if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado.');
      let query = supabase.from('whatsapp_conversations').select('*').order('last_message_at', { ascending: false }).limit(300);
      if (filter === 'pending') query = query.eq('needs_reply', true);
      if (filter === 'waiting_customer') query = query.eq('status', 'waiting_customer');
      if (filter === 'qualified') query = query.in('lead_stage', ['qualified', 'proposal', 'follow_up']);
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      const next = data || [];
      setItems(next);
      setSelectedId((current) => keepSelection && current && next.some((item) => item.id === current) ? current : (next[0]?.id || null));
    } catch (err) {
      setError(err.message || 'Não foi possível carregar as conversas.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId || !supabase) return;
    setLoadingMessages(true);
    const { data, error: queryError } = await supabase.from('whatsapp_messages').select('*').eq('conversation_id', conversationId).order('occurred_at', { ascending: true }).limit(500);
    if (queryError) setError(queryError.message); else setMessages(data || []);
    setLoadingMessages(false);
  }, []);

  useEffect(() => { loadConversations({ keepSelection: false }); }, [loadConversations]);
  useEffect(() => { if (selectedId) loadMessages(selectedId); else setMessages([]); }, [selectedId, loadMessages]);
  useEffect(() => {
    if (!selected) return;
    setQualification({
      lead_stage: selected.lead_stage || 'new',
      lead_temperature: selected.lead_temperature || 'warm',
      priority: selected.priority || 'normal',
      estimated_monthly_bill: selected.estimated_monthly_bill ?? '',
      city: selected.city || '',
      customer_profile: selected.customer_profile || '',
      property_owned: selected.property_owned === true ? 'yes' : selected.property_owned === false ? 'no' : '',
      financing_interest: selected.financing_interest === true ? 'yes' : selected.financing_interest === false ? 'no' : '',
      credit_status: selected.credit_status || '',
      lead_source: selected.lead_source || '',
      next_action: selected.next_action || '',
      follow_up_at: toLocalInput(selected.follow_up_at),
      qualification_notes: selected.qualification_notes || '',
    });
  }, [selected]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [item.contact_name, item.phone, item.last_message_preview, item.city].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)));
  }, [items, search]);

  const saveQualification = async () => {
    if (!selected) return;
    setSaving(true); setError(''); setNotice('');
    const bill = qualification.estimated_monthly_bill === '' ? null : Number(String(qualification.estimated_monthly_bill).replace(',', '.'));
    const { error: updateError } = await supabase.from('whatsapp_conversations').update({
      lead_stage: qualification.lead_stage,
      lead_temperature: qualification.lead_temperature,
      priority: qualification.priority,
      estimated_monthly_bill: Number.isFinite(bill) ? bill : null,
      city: qualification.city?.trim() || null,
      customer_profile: qualification.customer_profile || null,
      property_owned: qualification.property_owned === 'yes' ? true : qualification.property_owned === 'no' ? false : null,
      financing_interest: qualification.financing_interest === 'yes' ? true : qualification.financing_interest === 'no' ? false : null,
      credit_status: qualification.credit_status || null,
      lead_source: qualification.lead_source || null,
      next_action: qualification.next_action?.trim() || null,
      follow_up_at: qualification.follow_up_at ? new Date(qualification.follow_up_at).toISOString() : null,
      qualification_notes: qualification.qualification_notes?.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id);
    if (updateError) setError(updateError.message); else { setNotice('Qualificação salva.'); await loadConversations(); }
    setSaving(false);
  };

  const markAnswered = async () => {
    if (!selected) return;
    const { error: updateError } = await supabase.from('whatsapp_conversations').update({ needs_reply: false, status: 'waiting_customer', unread_count: 0, updated_at: new Date().toISOString() }).eq('id', selected.id);
    if (updateError) setError(updateError.message); else await loadConversations();
  };

  const sendReply = async () => {
    const body = reply.trim();
    if (!selected || !body || sending) return;
    setSending(true); setError(''); setNotice('');
    const { data, error: invokeError } = await supabase.functions.invoke('whatsapp-send', { body: { conversation_id: selected.id, body } });
    if (invokeError || data?.error) {
      if (data?.error === 'meta_token_missing') setError('O envio pelo ERP está pronto, mas falta cadastrar o token permanente e o Phone Number ID da Meta no servidor.');
      else setError(data?.details?.error?.message || data?.message || invokeError?.message || 'Não foi possível enviar a mensagem.');
    } else {
      setReply(''); setNotice('Mensagem enviada pelo ERP.');
      await Promise.all([loadMessages(selected.id), loadConversations()]);
    }
    setSending(false);
  };

  return (
    <FinanceLayout title="Central WhatsApp" subtitle="Atendimento, histórico e qualificação comercial em um só lugar.">
      {error && <div className="wa-error">{error}</div>}
      {notice && <div className="wa-success-note">{notice}</div>}
      <div className={`wa-inbox ${mobileChatOpen ? 'chat-open' : ''}`}>
        <aside className="wa-sidebar">
          <div className="wa-toolbar">
            <div className="wa-toolbar-top"><div className="wa-title"><MessageCircle size={19} /> Conversas <span className="wa-count">{visible.length}</span></div><button className="wa-icon-btn" type="button" onClick={() => loadConversations()} title="Atualizar"><RefreshCw size={16} /></button></div>
            <div className="wa-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contato ou mensagem" /></div>
            <div className="wa-filters">
              <button className={`wa-filter ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')} type="button">Aguardando você</button>
              <button className={`wa-filter ${filter === 'waiting_customer' ? 'active' : ''}`} onClick={() => setFilter('waiting_customer')} type="button">Aguardando cliente</button>
              <button className={`wa-filter ${filter === 'qualified' ? 'active' : ''}`} onClick={() => setFilter('qualified')} type="button">Qualificados</button>
              <button className={`wa-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')} type="button">Todas</button>
            </div>
          </div>
          <div className="wa-list">
            {loading && <div className="wa-loading">Carregando...</div>}
            {!loading && !visible.length && <div className="wa-loading">Nenhuma conversa nesta fila.</div>}
            {visible.map((item) => <button type="button" key={item.id} className={`wa-conversation ${selectedId === item.id ? 'active' : ''}`} onClick={() => { setSelectedId(item.id); setMobileChatOpen(true); setNotice(''); }}>
              <div className="wa-avatar">{(item.contact_name || item.phone || '?').trim().charAt(0).toUpperCase()}</div>
              <div className="wa-conv-body"><div className="wa-conv-row"><span className="wa-name">{item.contact_name || formatPhone(item.phone)}</span><span className="wa-time">{formatDateTime(item.last_message_at)}</span></div><div className="wa-preview">{item.last_message_preview || 'Mensagem sem texto'}</div><div className="wa-conv-tags"><span className={`wa-temp ${item.lead_temperature || 'warm'}`}>{item.lead_temperature === 'hot' ? 'Quente' : item.lead_temperature === 'cold' ? 'Frio' : 'Morno'}</span>{item.needs_reply && <span className="wa-attention"><Clock3 size={12} /> {waitingLabel(item.last_inbound_at)}</span>}</div></div>
            </button>)}
          </div>
        </aside>

        <main className="wa-chat">
          {!selected ? <div className="wa-chat-empty"><div><MessageCircle size={38} /><p>Selecione uma conversa para abrir o atendimento.</p></div></div> : <>
            <header className="wa-chat-header"><div className="wa-contact"><button type="button" className="wa-icon-btn wa-mobile-back" onClick={() => setMobileChatOpen(false)}><ArrowLeft size={17} /></button><div className="wa-avatar">{(selected.contact_name || selected.phone || '?').trim().charAt(0).toUpperCase()}</div><div className="wa-contact-meta"><strong>{selected.contact_name || formatPhone(selected.phone)}</strong><span>{formatPhone(selected.phone)}{selected.city ? ` • ${selected.city}` : ''}</span></div></div><div className="wa-header-actions"><button type="button" className="wa-secondary-btn" onClick={() => openWhatsAppBusiness(selected.phone)}><ExternalLink size={15} /><span>Business</span></button>{selected.needs_reply && <button type="button" className="wa-primary-btn" onClick={markAnswered}><CheckCircle2 size={15} /><span>Respondido</span></button>}</div></header>
            <div className="wa-messages">
              {loadingMessages && <div className="wa-loading">Carregando histórico...</div>}
              {!loadingMessages && !messages.length && <div className="wa-chat-empty"><div><MessageCircle size={34} /><p>Ainda não há mensagens armazenadas para este contato.</p></div></div>}
              {messages.map((message) => <div key={message.id} className={`wa-msg-row ${message.direction === 'outbound' ? 'outbound' : 'inbound'}`}><div className={`wa-bubble ${message.message_type !== 'text' ? 'has-media' : ''}`}><MessageContent message={message} /><div className="wa-msg-meta"><span>{message.direction === 'outbound' ? 'Você' : 'Cliente'}</span><span>{formatDateTime(message.occurred_at)}</span></div></div></div>)}
              <div ref={messagesEndRef} />
            </div>
            <div className="wa-composer"><textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Digite sua resposta para o cliente..." onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }} /><div className="wa-composer-row"><span>Enter envia • Shift+Enter quebra linha</span><button type="button" className="wa-send-btn" disabled={!reply.trim() || sending} onClick={sendReply}><Send size={16} /> {sending ? 'Enviando...' : 'Enviar pelo ERP'}</button></div></div>
          </>}
        </main>

        <aside className="wa-details">
          {!selected ? <div className="wa-loading">Selecione um contato.</div> : <>
            <div className="wa-detail-title"><UserRound size={18} /> Qualificação do lead</div>
            <SelectField label="Etapa comercial" value={qualification.lead_stage || 'new'} onChange={(value) => setQualification((q) => ({ ...q, lead_stage: value }))} options={STAGES} />
            <div className="wa-detail-card"><div className="wa-detail-label">Temperatura</div><div className="wa-temperature-grid">{TEMPERATURES.map(([value, label]) => <button type="button" key={value} className={`wa-temperature ${value} ${qualification.lead_temperature === value ? 'active' : ''}`} onClick={() => setQualification((q) => ({ ...q, lead_temperature: value }))}>{value === 'hot' && <Flame size={14} />}{label}</button>)}</div></div>
            <SelectField label="Prioridade" value={qualification.priority || 'normal'} onChange={(value) => setQualification((q) => ({ ...q, priority: value }))} options={PRIORITIES} />
            <div className="wa-detail-card"><div className="wa-detail-label">Conta de energia aproximada</div><div className="wa-money"><span>R$</span><input inputMode="decimal" value={qualification.estimated_monthly_bill ?? ''} onChange={(e) => setQualification((q) => ({ ...q, estimated_monthly_bill: e.target.value }))} placeholder="0,00" /></div></div>
            <div className="wa-detail-card"><div className="wa-field-grid"><label><span className="wa-detail-label">Cidade</span><input className="wa-input" value={qualification.city || ''} onChange={(e) => setQualification((q) => ({ ...q, city: e.target.value }))} placeholder="Ex.: Bauru" /></label><label><span className="wa-detail-label">Perfil</span><select className="wa-select" value={qualification.customer_profile || ''} onChange={(e) => setQualification((q) => ({ ...q, customer_profile: e.target.value }))}>{CUSTOMER_PROFILES.map(([v,l]) => <option key={v || 'blank'} value={v}>{l}</option>)}</select></label></div></div>
            <div className="wa-detail-card"><div className="wa-field-grid"><label><span className="wa-detail-label">Imóvel próprio</span><select className="wa-select" value={qualification.property_owned || ''} onChange={(e) => setQualification((q) => ({ ...q, property_owned: e.target.value }))}>{YES_NO_UNKNOWN.map(([v,l]) => <option key={v || 'blank'} value={v}>{l}</option>)}</select></label><label><span className="wa-detail-label">Quer financiamento</span><select className="wa-select" value={qualification.financing_interest || ''} onChange={(e) => setQualification((q) => ({ ...q, financing_interest: e.target.value }))}>{YES_NO_UNKNOWN.map(([v,l]) => <option key={v || 'blank'} value={v}>{l}</option>)}</select></label></div></div>
            <SelectField label="Situação do crédito" value={qualification.credit_status || ''} onChange={(value) => setQualification((q) => ({ ...q, credit_status: value }))} options={CREDIT_STATUSES} />
            <SelectField label="Origem do lead" value={qualification.lead_source || ''} onChange={(value) => setQualification((q) => ({ ...q, lead_source: value }))} options={LEAD_SOURCES} />
            <div className="wa-detail-card"><div className="wa-detail-label">Próxima ação</div><input className="wa-input" value={qualification.next_action || ''} onChange={(e) => setQualification((q) => ({ ...q, next_action: e.target.value }))} placeholder="Ex.: ligar, enviar proposta, pedir fatura" /><div className="wa-detail-label wa-label-spaced">Follow-up</div><input className="wa-input" type="datetime-local" value={qualification.follow_up_at || ''} onChange={(e) => setQualification((q) => ({ ...q, follow_up_at: e.target.value }))} /></div>
            <div className="wa-detail-card"><div className="wa-detail-label">Observações comerciais</div><textarea className="wa-notes" value={qualification.qualification_notes || ''} onChange={(e) => setQualification((q) => ({ ...q, qualification_notes: e.target.value }))} placeholder="Ex.: consumo alto, telhado bom, cliente quer financiar, visita marcada..." /></div>
            <button type="button" className="wa-save-btn" disabled={saving} onClick={saveQualification}><Save size={16} /> {saving ? 'Salvando...' : 'Salvar qualificação'}</button>
          </>}
        </aside>
      </div>
    </FinanceLayout>
  );
}

export default WhatsAppPendenciasPage;
