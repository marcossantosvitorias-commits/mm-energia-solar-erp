import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing, Bot, BrainCircuit, Clock3, Database, Flame, MessageCircleMore,
  PauseCircle, PlayCircle, Plus, Save, ShieldCheck, Sparkles, Trash2, UserRoundCheck,
} from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const EXTRACTION_OPTIONS = [
  ['estimated_monthly_bill', 'Valor médio da conta'],
  ['city', 'Cidade'], ['neighborhood', 'Bairro'], ['customer_profile', 'Residencial / comercial / rural'],
  ['property_owned', 'Imóvel próprio'], ['has_existing_proposal', 'Já recebeu proposta'],
  ['installation_timeline', 'Prazo para instalar'], ['payment_preference', 'Forma de pagamento'],
];
const DEFAULTS = {
  enabled:false, auto_send:false, assistant_name:'Assistente MM', trigger_mode:'leads', grouping_seconds:15,
  min_hot_score:70, min_warm_score:40, prompt:'', follow_up_enabled:false,
  follow_up_steps:[{ after:10, unit:'minutes' }, { after:1, unit:'hours' }], extraction_fields:EXTRACTION_OPTIONS.map(([key])=>key),
  notification_phone:'', schedule:{ mode:'24h', days:{} }, knowledge_context:'', company_info:'', safety_rules:'', transfer_rules:'', conversation_examples:'',
};

function SectionTitle({ icon:Icon, title, subtitle }) {
  return <div className="finance-panel-header"><div><h2><Icon size={20} style={{verticalAlign:'middle',marginRight:8}}/>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>;
}
function Toggle({ checked, onChange, label }) {
  return <button type="button" className="finance-secondary-button" onClick={()=>onChange(!checked)} style={{display:'inline-flex',gap:8,alignItems:'center',fontWeight:800}}>{checked?<PlayCircle size={17}/>:<PauseCircle size={17}/>} {label || (checked?'Ligado':'Desligado')}</button>;
}
function diagnosticText(row) {
  if (row.ai_last_error) return `Erro: ${row.ai_last_error}`;
  if (row.ai_last_generated_reply) return `Resposta: ${row.ai_last_generated_reply}`;
  if (row.next_action) return row.next_action;
  return 'Ainda não testado';
}

export default function PreVendasIAPage() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [testingId, setTestingId] = useState('');

  const load = async () => {
    if (!isSupabaseConfigured || !supabase) { setMessage('Supabase não configurado.'); setLoading(false); return; }
    try {
      const [{ data:cfg, error:cfgError }, { data:rows, error:rowsError }] = await Promise.all([
        supabase.from('whatsapp_ai_settings').select('*').eq('id',1).single(),
        supabase.from('whatsapp_conversations').select('id,contact_name,phone,city,estimated_monthly_bill,lead_stage,lead_temperature,ai_score,ai_enabled,ai_paused,ai_handoff,last_message_at,has_existing_proposal,installation_timeline,payment_preference,ai_last_attempt_at,ai_last_error,ai_last_generated_reply,ai_last_processed_inbound_at,ai_is_solar_lead,next_action').order('last_message_at',{ascending:false}).limit(60),
      ]);
      if (cfgError) throw cfgError;
      if (rowsError) throw rowsError;
      setSettings({ ...DEFAULTS, ...cfg, follow_up_steps:Array.isArray(cfg.follow_up_steps)?cfg.follow_up_steps:DEFAULTS.follow_up_steps, extraction_fields:Array.isArray(cfg.extraction_fields)?cfg.extraction_fields:DEFAULTS.extraction_fields, schedule:cfg.schedule || DEFAULTS.schedule });
      setConversations(rows || []);
    } catch (error) { setMessage(error?.message || 'Não foi possível carregar o Pré-vendas IA.'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ const timer=setTimeout(()=>{ load(); },0); return ()=>clearTimeout(timer); },[]);

  const stats = useMemo(()=>({
    total:conversations.length,
    hot:conversations.filter((c)=>c.ai_score>=Number(settings.min_hot_score||70)).length,
    handoff:conversations.filter((c)=>c.ai_handoff).length,
    proposals:conversations.filter((c)=>c.has_existing_proposal===true).length,
  }),[conversations,settings.min_hot_score]);

  const saveSettings = async () => {
    setSaving(true); setMessage('');
    const payload = {
      enabled:Boolean(settings.enabled), auto_send:Boolean(settings.auto_send), assistant_name:settings.assistant_name || 'Assistente MM',
      trigger_mode:settings.trigger_mode || 'leads', grouping_seconds:Number(settings.grouping_seconds || 15),
      min_hot_score:Number(settings.min_hot_score || 70), min_warm_score:Number(settings.min_warm_score || 40), prompt:settings.prompt || '',
      follow_up_enabled:Boolean(settings.follow_up_enabled), follow_up_steps:settings.follow_up_steps || [], extraction_fields:settings.extraction_fields || [],
      notification_phone:settings.notification_phone || null, schedule:settings.schedule || DEFAULTS.schedule,
      knowledge_context:settings.knowledge_context || '', company_info:settings.company_info || '', safety_rules:settings.safety_rules || '',
      transfer_rules:settings.transfer_rules || '', conversation_examples:settings.conversation_examples || '', updated_at:new Date().toISOString(),
    };
    const { error } = await supabase.from('whatsapp_ai_settings').update(payload).eq('id',1);
    setSaving(false);
    setMessage(error ? error.message : 'Configurações da IA salvas.');
  };

  const toggleConversation = async (row) => {
    const nextPaused=!row.ai_paused;
    const { error } = await supabase.from('whatsapp_conversations').update({ai_paused:nextPaused,updated_at:new Date().toISOString()}).eq('id',row.id);
    if(error) setMessage(error.message); else setConversations((current)=>current.map((item)=>item.id===row.id?{...item,ai_paused:nextPaused}:item));
  };
  const testAI = async (row) => {
    setTestingId(row.id); setMessage('');
    try {
      const { data,error }=await supabase.functions.invoke('whatsapp-ai-presales',{body:{conversation_id:row.id,force:true,send:false}});
      if(error) throw error;
      if(data?.error) throw new Error(data.message || data.error);
      setMessage(data?.reply ? `Teste IA: ${data.reply} • Score ${data.score ?? 0}` : data?.solar_lead===false ? 'Teste concluído: contato classificado como não lead solar.' : JSON.stringify(data));
      await load();
    } catch(error){
      await load();
      setMessage(error?.message || 'Falha ao testar a IA. Veja a coluna Diagnóstico para o erro detalhado.');
    }
    finally{ setTestingId(''); }
  };
  const updateFollowUp = (index,key,value) => setSettings((s)=>({...s,follow_up_steps:s.follow_up_steps.map((item,i)=>i===index?{...item,[key]:value}:item)}));
  const removeFollowUp = (index) => setSettings((s)=>({...s,follow_up_steps:s.follow_up_steps.filter((_,i)=>i!==index)}));
  const toggleExtraction = (key) => setSettings((s)=>({...s,extraction_fields:s.extraction_fields.includes(key)?s.extraction_fields.filter((item)=>item!==key):[...s.extraction_fields,key]}));

  return <FinanceLayout title="Pré-vendas IA" subtitle="Atendimento, qualificação, follow-up e transferência dos melhores leads para o comercial.">
    {message && <p className="finance-notice">{message}</p>}

    <section className="finance-grid">
      <article className="finance-panel"><span>Status</span><strong className="dashboard-big-number" style={{color:settings.enabled?'#15803d':'#b45309'}}>{settings.enabled?'IA ATIVA':'IA PAUSADA'}</strong></article>
      <article className="finance-panel"><span>Leads recentes</span><strong className="dashboard-big-number">{stats.total}</strong></article>
      <article className="finance-panel"><span>Leads quentes</span><strong className="dashboard-big-number">{stats.hot}</strong></article>
      <article className="finance-panel"><span>Já têm proposta</span><strong className="dashboard-big-number">{stats.proposals}</strong></article>
      <article className="finance-panel"><span>Aguardando humano</span><strong className="dashboard-big-number">{stats.handoff}</strong></article>
    </section>

    <section className="finance-two-columns" style={{marginTop:18,alignItems:'start'}}>
      <div style={{display:'grid',gap:18}}>
        <section className="finance-panel">
          <SectionTitle icon={MessageCircleMore} title="Conexão & Gatilhos" subtitle="Defina em quais conversas a IA pode atuar."/>
          <div className="finance-form">
            <label className="finance-field"><span>Gatilho de atendimento</span><select value={settings.trigger_mode} onChange={(e)=>setSettings((s)=>({...s,trigger_mode:e.target.value}))}><option value="leads">Somente leads</option><option value="all">Todas as conversas</option></select></label>
            <label className="finance-field"><span>Nome do atendente IA</span><input value={settings.assistant_name || ''} onChange={(e)=>setSettings((s)=>({...s,assistant_name:e.target.value}))}/></label>
            <label className="finance-field"><span>Agrupamento de mensagens (segundos)</span><input type="number" min="5" max="120" value={settings.grouping_seconds} onChange={(e)=>setSettings((s)=>({...s,grouping_seconds:e.target.value}))}/></label>
            <div className="finance-field"><span>Atendimento da IA</span><Toggle checked={settings.enabled} onChange={(v)=>setSettings((s)=>({...s,enabled:v}))} label={settings.enabled?'Ligada':'Desligada'}/></div>
            <div className="finance-field"><span>Enviar respostas automaticamente</span><Toggle checked={settings.auto_send} onChange={(v)=>setSettings((s)=>({...s,auto_send:v}))} label={settings.auto_send?'Automático':'Somente teste'}/></div>
          </div>
          {settings.auto_send && <p style={{marginTop:12,color:'#9a3412',fontWeight:800}}>Atenção: com envio automático ligado, mensagens novas poderão ser respondidas pela IA quando o status global também estiver ativo.</p>}
        </section>

        <section className="finance-panel">
          <SectionTitle icon={Clock3} title="Follow-up" subtitle="Prepare as etapas automáticas para leads que deixam de responder."/>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',marginBottom:12}}><Toggle checked={settings.follow_up_enabled} onChange={(v)=>setSettings((s)=>({...s,follow_up_enabled:v}))} label={settings.follow_up_enabled?'Follow-up ligado':'Follow-up desligado'}/><button type="button" className="finance-secondary-button" onClick={()=>setSettings((s)=>({...s,follow_up_steps:[...s.follow_up_steps,{after:1,unit:'days'}]}))}><Plus size={15}/> Adicionar etapa</button></div>
          <div style={{display:'grid',gap:10}}>{settings.follow_up_steps.map((step,index)=><div key={`${index}-${step.unit}`} style={{display:'grid',gridTemplateColumns:'38px 1fr 1fr 40px',gap:8,alignItems:'center'}}><strong>{index+1}</strong><input type="number" min="1" value={step.after} onChange={(e)=>updateFollowUp(index,'after',Number(e.target.value))}/><select value={step.unit} onChange={(e)=>updateFollowUp(index,'unit',e.target.value)}><option value="minutes">Minutos</option><option value="hours">Horas</option><option value="days">Dias</option></select><button type="button" className="finance-secondary-button" onClick={()=>removeFollowUp(index)}><Trash2 size={15}/></button></div>)}</div>
        </section>

        <section className="finance-panel">
          <SectionTitle icon={BellRing} title="Extração & Alertas" subtitle="Dados que a IA deve identificar e registrar automaticamente."/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:10}}>{EXTRACTION_OPTIONS.map(([key,label])=><label key={key} style={{display:'flex',gap:8,alignItems:'center',padding:10,border:'1px solid #e4e7ec',borderRadius:10}}><input type="checkbox" checked={settings.extraction_fields.includes(key)} onChange={()=>toggleExtraction(key)}/><span>{label}</span></label>)}</div>
          <label className="finance-field" style={{marginTop:14}}><span>WhatsApp para receber alertas de lead quente</span><input placeholder="5514999999999" value={settings.notification_phone || ''} onChange={(e)=>setSettings((s)=>({...s,notification_phone:e.target.value}))}/></label>
        </section>

        <section className="finance-panel">
          <SectionTitle icon={Clock3} title="Horário de Atendimento" subtitle="Por enquanto, escolha atendimento 24h ou mantenha a IA pausada fora do período desejado."/>
          <label className="finance-field"><span>Modo</span><select value={settings.schedule?.mode || '24h'} onChange={(e)=>setSettings((s)=>({...s,schedule:{...(s.schedule||{}),mode:e.target.value}}))}><option value="24h">24 horas</option><option value="custom">Horário personalizado (próxima etapa)</option></select></label>
        </section>

        <section className="finance-panel">
          <SectionTitle icon={Database} title="Base de Conhecimento" subtitle="Cole aqui preços, garantias, equipamentos, links e orientações que a IA pode consultar."/>
          <textarea rows="10" style={{width:'100%'}} value={settings.knowledge_context || ''} onChange={(e)=>setSettings((s)=>({...s,knowledge_context:e.target.value}))} placeholder="Ex.: garantias, regiões atendidas, condições comerciais, equipamentos disponíveis..."/>
        </section>
      </div>

      <div style={{display:'grid',gap:18}}>
        <section className="finance-panel">
          <SectionTitle icon={BrainCircuit} title="Configuração da IA" subtitle="Prompt principal e critérios de classificação."/>
          <div className="finance-form">
            <label className="finance-field"><span>Score lead quente</span><input type="number" min="0" max="100" value={settings.min_hot_score} onChange={(e)=>setSettings((s)=>({...s,min_hot_score:e.target.value}))}/></label>
            <label className="finance-field"><span>Score lead morno</span><input type="number" min="0" max="100" value={settings.min_warm_score} onChange={(e)=>setSettings((s)=>({...s,min_warm_score:e.target.value}))}/></label>
            <label className="finance-field finance-field-wide"><span>Instruções do Sistema (Prompt Principal)</span><textarea rows="18" value={settings.prompt || ''} onChange={(e)=>setSettings((s)=>({...s,prompt:e.target.value}))}/></label>
          </div>
        </section>

        <section className="finance-two-columns">
          <article className="finance-panel"><SectionTitle icon={Bot} title="Sobre a Empresa"/><textarea rows="10" style={{width:'100%'}} value={settings.company_info || ''} onChange={(e)=>setSettings((s)=>({...s,company_info:e.target.value}))}/></article>
          <article className="finance-panel"><SectionTitle icon={ShieldCheck} title="Regras de Segurança"/><textarea rows="10" style={{width:'100%'}} value={settings.safety_rules || ''} onChange={(e)=>setSettings((s)=>({...s,safety_rules:e.target.value}))}/></article>
        </section>

        <section className="finance-two-columns">
          <article className="finance-panel"><SectionTitle icon={UserRoundCheck} title="Transferência Humana"/><textarea rows="10" style={{width:'100%'}} value={settings.transfer_rules || ''} onChange={(e)=>setSettings((s)=>({...s,transfer_rules:e.target.value}))}/></article>
          <article className="finance-panel"><SectionTitle icon={Sparkles} title="Exemplos de Conversa"/><textarea rows="10" style={{width:'100%'}} value={settings.conversation_examples || ''} onChange={(e)=>setSettings((s)=>({...s,conversation_examples:e.target.value}))} placeholder="Cole exemplos do tom e da sequência que você deseja."/></article>
        </section>
      </div>
    </section>

    <section className="finance-actions" style={{position:'sticky',bottom:12,zIndex:3,margin:'18px 0',justifyContent:'flex-end'}}><button className="finance-button" type="button" disabled={saving} onClick={saveSettings}><Save size={16}/> {saving?'Salvando...':'Salvar todas as configurações'}</button></section>

    <section className="finance-panel" style={{marginTop:18}}>
      <SectionTitle icon={Sparkles} title="Fila da IA" subtitle="Teste uma resposta sem enviar ao cliente. A coluna Diagnóstico mostra a resposta gerada ou o erro real do backend."/>
      <div className="finance-table-wrapper"><table className="finance-table"><thead><tr><th>Lead</th><th>Conta</th><th>Score</th><th>Lead solar?</th><th>Proposta?</th><th>Etapa</th><th>Diagnóstico</th><th>Ações</th></tr></thead><tbody>
        {loading?<tr><td colSpan="8" className="finance-empty-cell">Carregando...</td></tr>:conversations.length===0?<tr><td colSpan="8" className="finance-empty-cell">Nenhuma conversa encontrada.</td></tr>:conversations.map((row)=><tr key={row.id}>
          <td><strong>{row.contact_name || row.phone}</strong><small>{row.city || 'Cidade não informada'}</small></td>
          <td>{row.estimated_monthly_bill?money(row.estimated_monthly_bill):'-'}</td>
          <td><strong style={{display:'flex',alignItems:'center',gap:5}}>{row.ai_score>=Number(settings.min_hot_score||70)&&<Flame size={15}/>} {row.ai_score||0}</strong></td>
          <td>{row.ai_is_solar_lead===true?'Sim':row.ai_is_solar_lead===false?'Não':'-'}</td>
          <td>{row.has_existing_proposal===true?'Sim':row.has_existing_proposal===false?'Não':'-'}</td>
          <td>{row.ai_handoff?<span className="finance-badge recebida"><UserRoundCheck size={13}/> Assumir</span>:row.lead_stage||'Novo'}</td>
          <td style={{minWidth:260,maxWidth:420,whiteSpace:'normal'}}><small style={{display:'block',color:row.ai_last_error?'#b91c1c':'inherit'}}>{diagnosticText(row)}</small>{row.ai_last_attempt_at && <small style={{display:'block',marginTop:4,opacity:.65}}>Última tentativa: {new Date(row.ai_last_attempt_at).toLocaleString('pt-BR')}</small>}</td>
          <td><div className="finance-row-actions"><button className="finance-secondary-button" type="button" disabled={testingId===row.id} onClick={()=>testAI(row)}>{testingId===row.id?'Testando...':'Testar IA'}</button><button className="finance-secondary-button" type="button" onClick={()=>toggleConversation(row)}>{row.ai_paused?'Retomar':'Pausar'}</button></div></td>
        </tr>)}
      </tbody></table></div>
    </section>
  </FinanceLayout>;
}
