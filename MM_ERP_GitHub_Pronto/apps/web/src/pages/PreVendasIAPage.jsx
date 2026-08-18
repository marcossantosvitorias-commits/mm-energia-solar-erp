import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Flame, PauseCircle, PlayCircle, Save, Sparkles, UserRoundCheck } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PreVendasIAPage() {
  const [settings, setSettings] = useState({ enabled:false, assistant_name:'Assistente MM', min_hot_score:70, min_warm_score:40, prompt:'' });
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [testingId, setTestingId] = useState('');

  const load = async () => {
    if (!isSupabaseConfigured || !supabase) { setMessage('Supabase não configurado.'); setLoading(false); return; }
    try {
      const [{ data: cfg, error: cfgError }, { data: rows, error: rowsError }] = await Promise.all([
        supabase.from('whatsapp_ai_settings').select('*').eq('id', 1).single(),
        supabase.from('whatsapp_conversations').select('id,contact_name,phone,city,estimated_monthly_bill,lead_stage,lead_temperature,ai_score,ai_enabled,ai_paused,ai_handoff,last_message_at').order('last_message_at', { ascending:false }).limit(40),
      ]);
      if (cfgError) throw cfgError;
      if (rowsError) throw rowsError;
      setSettings(cfg);
      setConversations(rows || []);
    } catch (error) { setMessage(error?.message || 'Não foi possível carregar o Pré-vendas IA.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { const id = setTimeout(load, 0); return () => clearTimeout(id); }, []);

  const stats = useMemo(() => ({
    total: conversations.length,
    hot: conversations.filter((c) => c.ai_score >= Number(settings.min_hot_score || 70)).length,
    handoff: conversations.filter((c) => c.ai_handoff).length,
    active: conversations.filter((c) => c.ai_enabled && !c.ai_paused && !c.ai_handoff).length,
  }), [conversations, settings.min_hot_score]);

  const saveSettings = async () => {
    setSaving(true); setMessage('');
    const { error } = await supabase.from('whatsapp_ai_settings').update({
      enabled: Boolean(settings.enabled), assistant_name: settings.assistant_name || 'Assistente MM',
      min_hot_score: Number(settings.min_hot_score || 70), min_warm_score: Number(settings.min_warm_score || 40),
      prompt: settings.prompt, updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setSaving(false);
    setMessage(error ? error.message : settings.enabled ? 'Pré-vendas IA ativado.' : 'Pré-vendas IA pausado.');
  };

  const toggleConversation = async (row) => {
    const nextPaused = !row.ai_paused;
    const { error } = await supabase.from('whatsapp_conversations').update({ ai_paused: nextPaused, updated_at:new Date().toISOString() }).eq('id', row.id);
    if (error) setMessage(error.message); else setConversations((current) => current.map((item) => item.id === row.id ? { ...item, ai_paused: nextPaused } : item));
  };

  const testAI = async (row) => {
    setTestingId(row.id); setMessage('');
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-ai-presales', { body:{ conversation_id:row.id, force:true, send:false } });
      if (error) throw error;
      setMessage(data?.reply ? `Teste IA: ${data.reply} • Score ${data.score ?? 0}` : JSON.stringify(data));
      await load();
    } catch (error) { setMessage(error?.message || 'Falha ao testar a IA. Verifique a chave da OpenAI no Supabase.'); }
    finally { setTestingId(''); }
  };

  return <FinanceLayout title="Pré-vendas IA" subtitle="Atendimento automático, qualificação e entrega dos melhores leads para o time comercial.">
    {message && <p className="finance-notice">{message}</p>}

    <section className="finance-grid">
      <article className="finance-panel"><span>Status global</span><strong className="dashboard-big-number" style={{color:settings.enabled?'#15803d':'#b45309'}}>{settings.enabled?'IA ATIVA':'IA PAUSADA'}</strong></article>
      <article className="finance-panel"><span>Conversas recentes</span><strong className="dashboard-big-number">{stats.total}</strong></article>
      <article className="finance-panel"><span>Leads quentes</span><strong className="dashboard-big-number">{stats.hot}</strong></article>
      <article className="finance-panel"><span>Aguardando humano</span><strong className="dashboard-big-number">{stats.handoff}</strong></article>
    </section>

    <section className="finance-panel" style={{marginTop:18}}>
      <div className="finance-panel-header"><div><h2><Bot size={20} style={{verticalAlign:'middle',marginRight:8}}/>Configuração da assistente</h2><p>A IA começa desligada. Ative somente depois de testar conversas reais.</p></div><button className="finance-button" type="button" onClick={() => setSettings((s) => ({...s,enabled:!s.enabled}))}>{settings.enabled?<PauseCircle size={17}/>:<PlayCircle size={17}/>} {settings.enabled?'Pausar IA':'Ativar IA'}</button></div>
      <div className="finance-form">
        <label className="finance-field"><span>Nome da assistente</span><input value={settings.assistant_name || ''} onChange={(e)=>setSettings((s)=>({...s,assistant_name:e.target.value}))}/></label>
        <label className="finance-field"><span>Score para lead quente</span><input type="number" min="0" max="100" value={settings.min_hot_score} onChange={(e)=>setSettings((s)=>({...s,min_hot_score:e.target.value}))}/></label>
        <label className="finance-field"><span>Score para lead morno</span><input type="number" min="0" max="100" value={settings.min_warm_score} onChange={(e)=>setSettings((s)=>({...s,min_warm_score:e.target.value}))}/></label>
        <label className="finance-field finance-field-wide"><span>Instruções da IA</span><textarea rows="9" value={settings.prompt || ''} onChange={(e)=>setSettings((s)=>({...s,prompt:e.target.value}))}/></label>
        <div className="finance-actions finance-field-wide"><button className="finance-button" type="button" disabled={saving} onClick={saveSettings}><Save size={16}/> {saving?'Salvando...':'Salvar configurações'}</button></div>
      </div>
    </section>

    <section className="finance-panel" style={{marginTop:18}}>
      <div className="finance-panel-header"><div><h2><Sparkles size={20} style={{verticalAlign:'middle',marginRight:8}}/>Fila da IA</h2><p>Teste a resposta sem enviar ao cliente e pause a IA individualmente quando quiser assumir.</p></div></div>
      <div className="finance-table-wrapper"><table className="finance-table"><thead><tr><th>Lead</th><th>Conta</th><th>Score</th><th>Etapa</th><th>IA</th><th>Ações</th></tr></thead><tbody>
        {loading ? <tr><td colSpan="6" className="finance-empty-cell">Carregando...</td></tr> : conversations.length === 0 ? <tr><td colSpan="6" className="finance-empty-cell">Nenhuma conversa encontrada.</td></tr> : conversations.map((row)=><tr key={row.id}>
          <td><strong>{row.contact_name || row.phone}</strong><small>{row.city || 'Cidade não informada'}</small></td>
          <td>{row.estimated_monthly_bill ? money(row.estimated_monthly_bill) : '-'}</td>
          <td><strong style={{display:'flex',alignItems:'center',gap:5}}>{row.ai_score >= Number(settings.min_hot_score || 70) && <Flame size={15}/>} {row.ai_score || 0}</strong></td>
          <td>{row.ai_handoff ? <span className="finance-badge recebida"><UserRoundCheck size={13}/> Assumir</span> : row.lead_stage || 'Novo'}</td>
          <td>{row.ai_handoff ? 'Entregue ao humano' : row.ai_paused || !row.ai_enabled ? 'Pausada' : 'Disponível'}</td>
          <td><div className="finance-row-actions"><button className="finance-secondary-button" type="button" disabled={testingId===row.id} onClick={()=>testAI(row)}>{testingId===row.id?'Testando...':'Testar IA'}</button><button className="finance-secondary-button" type="button" onClick={()=>toggleConversation(row)}>{row.ai_paused?'Retomar':'Pausar'}</button></div></td>
        </tr>)}
      </tbody></table></div>
    </section>
  </FinanceLayout>;
}
