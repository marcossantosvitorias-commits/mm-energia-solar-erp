import React,{useMemo,useState}from'react';
import{BatteryCharging,CheckCircle2,ChevronLeft,ChevronRight,Gauge,Grid2X2,RotateCcw,ShieldCheck,Sun,Zap}from'lucide-react';

const n=(v,f=0)=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:f};
const decimal=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});

export const HYBRID_BATTERIES=[
{id:'must-lp15-1250',brand:'MUST',model:'LP15-1250 LiFePO4 12.8V 50Ah',capacityKwh:.64,powerKw:.64,dod:80,dodType:'calculo',voltage:12.8,maxDischargeA:50},
{id:'must-lp15-12100',brand:'MUST',model:'LP15-12100 LiFePO4 12.8V 100Ah',capacityKwh:1.28,powerKw:1.28,dod:80,dodType:'calculo',voltage:12.8,maxDischargeA:100},
{id:'dyness-ar1-2',brand:'Dyness',model:'AR1.2 LiFePO4 100Ah',capacityKwh:1.28,powerKw:null,dod:80,dodType:'calculo',voltage:12.8,maxDischargeA:null},
{id:'felicity-fla12100-pg2',brand:'Felicity Solar',model:'FLA12100-PG2 12.8V 100Ah',capacityKwh:1.28,powerKw:null,dod:80,dodType:'calculo',voltage:12.8,maxDischargeA:null},
{id:'pylontech-us2000c',brand:'Pylontech',model:'US2000C 48V',capacityKwh:2.4,powerKw:1.2,dod:95,dodType:'fabricante',voltage:48,maxDischargeA:89},
{id:'must-lp15-12200',brand:'MUST',model:'LP15-12200 LiFePO4 12.8V 200Ah',capacityKwh:2.56,powerKw:1.28,dod:80,dodType:'calculo',voltage:12.8,maxDischargeA:100},
{id:'must-lp15-24100',brand:'MUST',model:'LP15-24100 LiFePO4 25.6V 100Ah',capacityKwh:2.56,powerKw:2.56,dod:80,dodType:'calculo',voltage:25.6,maxDischargeA:100},
{id:'dyness-ar2-5',brand:'Dyness',model:'AR2.5 LiFePO4 100Ah',capacityKwh:2.56,powerKw:null,dod:80,dodType:'calculo',voltage:25.6,maxDischargeA:null},
{id:'felicity-fla12200-pg2',brand:'Felicity Solar',model:'FLA12200-PG2 12.8V 200Ah',capacityKwh:2.56,powerKw:null,dod:80,dodType:'calculo',voltage:12.8,maxDischargeA:null},
{id:'pylontech-us3000c',brand:'Pylontech',model:'US3000C 48V',capacityKwh:3.552,powerKw:1.776,dod:95,dodType:'fabricante',voltage:48,maxDischargeA:89},
{id:'pylontech-us5000',brand:'Pylontech',model:'US5000 48V',capacityKwh:4.8,powerKw:3.84,dod:95,dodType:'fabricante',voltage:48,maxDischargeA:120},
{id:'saj-b3-5',brand:'SAJ',model:'B3-5.0KWH-LV 48V 100Ah',capacityKwh:5,powerKw:2.5,dod:90,dodType:'fabricante',voltage:48,maxDischargeA:100},
{id:'deye-se-g5-1',brand:'Deye',model:'SE-G5.1 51.2V 100Ah',capacityKwh:5.12,powerKw:2.56,dod:80,dodType:'fabricante',voltage:51.2,maxDischargeA:100},
{id:'deye-se-g5-1-pro-b',brand:'Deye',model:'SE-G5.1 Pro B 51.2V 100Ah',capacityKwh:5.12,powerKw:2.56,dod:90,dodType:'fabricante',voltage:51.2,maxDischargeA:100},
{id:'dyness-dl5-pro',brand:'Dyness',model:'DL5.0C Pro 51.2V 100Ah',capacityKwh:5.12,powerKw:5.12,dod:90,dodType:'calculo',voltage:51.2,maxDischargeA:100},
{id:'deye-rw-m6-1',brand:'Deye',model:'RW-M6.1 6.1kWh 51.2V',capacityKwh:6.1,powerKw:3.07,dod:90,dodType:'fabricante',voltage:51.2,maxDischargeA:100},
{id:'felicity-14-3',brand:'Felicity Solar',model:'FLA48280-EU 14.3kWh',capacityKwh:14.3,powerKw:7.1,dod:95,dodType:'fabricante',voltage:51.2,maxDischargeA:140}
];

const initial={systemType:'hybrid',mode:'quick',irradiationMode:'minimum',irradiation:3.653,voltage:'127/220 V',phase:'Bifásico',monthlyConsumption:399,autonomyHours:24,efficiency:75,shading:0,batteryId:'saj-b3-5',panelPowerW:620};
const labels=['Sistema','Parâmetros','Bateria','Módulo','Resultado'];
const batteryShortLabel=b=>`${b.brand} · ${String(b.model).split(' ')[0]} · ${decimal.format(b.capacityKwh)} kWh · ${decimal.format(b.voltage)} V`;

export default function HybridCalculatorWizard({onResult}){
  const[form,setForm]=useState(initial);
  const[step,setStep]=useState(1);
  const battery=HYBRID_BATTERIES.find(b=>b.id===form.batteryId)||HYBRID_BATTERIES[0];
  const result=useMemo(()=>{
    const c=Math.max(0,n(form.monthlyConsumption));
    const irr=Math.max(.1,n(form.irradiation,3.653));
    const eff=Math.min(1,Math.max(.01,n(form.efficiency,75)/100));
    const shade=1-Math.min(.95,Math.max(0,n(form.shading)/100));
    const panel=Math.max(.005,n(form.panelPowerW,620)/1000);
    const gpk=irr*30*eff*shade;
    const modules=Math.max(1,Math.ceil((c/gpk)/panel));
    const kw=modules*panel;
    const gen=kw*gpk;
    const daily=c/30;
    const req=daily*Math.max(.0417,n(form.autonomyHours,24)/24);
    const usable=battery.capacityKwh*battery.dod/100;
    const count=form.systemType==='ongrid'?0:Math.max(1,Math.ceil(req/usable));
    return{...form,battery,moduleCount:modules,totalModuleKw:kw,monthlyGeneration:gen,dailyConsumption:daily,requestedUsableKwh:req,batteryCount:count,totalBatteryKwh:count*battery.capacityKwh,usableBatteryKwh:count*usable,minInverterKw:kw/1.3,availableBatteryPowerKw:count*n(battery.powerKw,0)};
  },[form,battery]);
  const update=(k,v)=>setForm(x=>({...x,[k]:v}));
  const reset=()=>{setForm(initial);setStep(1);onResult?.(null)};
  const calc=()=>{onResult?.(result);setStep(5)};

  return <section className="hybrid-wizard" style={s.shell}>
    <style>{`
      .hybrid-wizard *{box-sizing:border-box}
      .hybrid-battery-select,.hybrid-battery-select option{font-size:13px}
      @media(max-width:720px){
        .hybrid-wizard{padding:14px!important;border-radius:18px!important}
        .hybrid-hero{grid-template-columns:1fr!important;padding:16px!important;border-radius:18px!important}
        .hybrid-title{font-size:24px!important;line-height:1.15!important;flex-wrap:wrap!important}
        .hybrid-hero-stats{grid-template-columns:repeat(3,minmax(0,1fr))!important}
        .hybrid-top{padding:10px!important;min-width:0!important}
        .hybrid-top span{font-size:10px!important;white-space:normal!important}
        .hybrid-top strong{font-size:13px!important;overflow-wrap:anywhere!important}
        .hybrid-card,.hybrid-result{padding:15px!important;border-radius:18px!important}
        .hybrid-detail{flex-direction:column!important;align-items:flex-start!important}
        .hybrid-actions{flex-direction:column!important}
        .hybrid-actions button{width:100%!important;margin-left:0!important;justify-content:center!important}
        .hybrid-battery-select,.hybrid-battery-select option{font-size:11px!important}
        .hybrid-battery-select{padding:9px 10px!important}
      }
      @media(max-width:430px){
        .hybrid-hero-stats{grid-template-columns:1fr!important}
        .hybrid-progress-row{gap:6px!important}
        .hybrid-dot{min-height:36px!important}
      }
    `}</style>

    <div className="hybrid-hero" style={s.hero}>
      <div>
        <span style={s.eyebrow}>DIMENSIONAMENTO HÍBRIDO / BESS</span>
        <h2 className="hybrid-title" style={s.title}><BatteryCharging size={24}/> Calculadora híbrida inteligente</h2>
        <p style={s.heroText}>Fluxo em etapas inspirado no vídeo. O resultado alimenta automaticamente kit, custo e proposta.</p>
      </div>
      <div className="hybrid-hero-stats" style={s.heroStats}>
        <Top label="Geração" value={`${Math.round(result.monthlyGeneration)} kWh/mês`} icon={<Sun size={16}/>}/>
        <Top label="Baterias" value={String(result.batteryCount)} icon={<BatteryCharging size={16}/>}/>
        <Top label="Inversor mín." value={`${decimal.format(result.minInverterKw)} kW`} icon={<Zap size={16}/>}/>
      </div>
    </div>

    <div style={s.progress}>
      <div style={s.progressHead}><strong>PASSO {step} DE 5</strong><span>{labels[step-1]}</span></div>
      <div className="hybrid-progress-row" style={s.progressRow}>{[1,2,3,4,5].map(i=><span className="hybrid-dot" key={i} style={{...s.dot,...(i<=step?s.dotOn:{})}}>{i}</span>)}</div>
    </div>

    {step===1&&<Card title="Escolha o tipo de sistema" subtitle="Selecione o cenário correto antes do dimensionamento.">
      <Option active={form.systemType==='hybrid'} title="Híbrido" text="Rede + baterias para reserva e continuidade." icon={<BatteryCharging size={27}/>} tone="#2563eb" onClick={()=>update('systemType','hybrid')}/>
      <Option active={form.systemType==='offgrid'} title="Off-Grid" text="Sistema independente da concessionária." icon={<Sun size={27}/>} tone="#10b981" onClick={()=>update('systemType','offgrid')}/>
      <Option active={form.systemType==='ongrid'} title="On-Grid" text="Conectado à rede, sem armazenamento." icon={<Grid2X2 size={27}/>} tone="#f59e0b" onClick={()=>update('systemType','ongrid')}/>
    </Card>}

    {step===2&&<Card title="Parâmetros do dimensionamento" subtitle="Ajuste consumo, autonomia e condições do local.">
      <div style={s.grid}>
        <Select label="Modalidade" value={form.mode} onChange={e=>update('mode',e.target.value)} options={[['quick','Cálculo rápido'],['complete','Cálculo completo']]}/>
        <Field label="Consumo (kWh/mês)" value={form.monthlyConsumption} onChange={e=>update('monthlyConsumption',e.target.value)}/>
        <Field label="Autonomia (h)" value={form.autonomyHours} onChange={e=>update('autonomyHours',e.target.value)}/>
        <Field label="Eficiência FV (%)" value={form.efficiency} onChange={e=>update('efficiency',e.target.value)}/>
        <Field label="Sombreamento (%)" value={form.shading} onChange={e=>update('shading',e.target.value)}/>
        <Select label="Tensão" value={form.voltage} onChange={e=>update('voltage',e.target.value)} options={['127/220 V','220/380 V','254/440 V']}/>
        <Select label="Fase" value={form.phase} onChange={e=>update('phase',e.target.value)} options={['Monofásico','Bifásico','Trifásico']}/>
        <Field label="Irradiação" value={form.irradiation} onChange={e=>update('irradiation',e.target.value)}/>
      </div>
      <div style={s.quickGrid}>
        <Quick active={form.irradiationMode==='minimum'} title="Irradiação mínima" text="3,653 · conservador" onClick={()=>setForm(x=>({...x,irradiationMode:'minimum',irradiation:3.653}))}/>
        <Quick active={form.irradiationMode==='average'} title="Irradiação média" text="4,791 · equilíbrio" onClick={()=>setForm(x=>({...x,irradiationMode:'average',irradiation:4.791}))}/>
        <Quick active={form.irradiationMode==='inclined'} title="Plano inclinado" text="5,010 · melhor cenário" onClick={()=>setForm(x=>({...x,irradiationMode:'inclined',irradiation:5.01}))}/>
      </div>
    </Card>}

    {step===3&&<Card title="Selecione a bateria" subtitle="Escolha um modelo do acervo para dimensionar o banco.">
      <label style={s.label}>Bateria
        <select className="hybrid-battery-select" style={s.input} value={form.batteryId} onChange={e=>update('batteryId',e.target.value)}>
          {[...HYBRID_BATTERIES].sort((a,b)=>a.capacityKwh-b.capacityKwh).map(b=><option key={b.id} value={b.id}>{batteryShortLabel(b)}</option>)}
        </select>
      </label>
      <div style={s.specGrid}>
        <Spec label="Modelo" value={battery.model} icon={<BatteryCharging size={17}/>}/>
        <Spec label="Fabricante" value={battery.brand} icon={<ShieldCheck size={17}/>}/>
        <Spec label="Capacidade" value={`${decimal.format(battery.capacityKwh)} kWh`} icon={<Gauge size={17}/>}/>
        <Spec label="Potência" value={battery.powerKw?`${decimal.format(battery.powerKw)} kW`:'Não informada'} icon={<Zap size={17}/>}/>
        <Spec label="DoD usado" value={`${battery.dod}%${battery.dodType==='calculo'?' · conservador':''}`} icon={<ShieldCheck size={17}/>}/>
        <Spec label="Corrente máx." value={battery.maxDischargeA?`${battery.maxDischargeA} A`:'Não informada'} icon={<Zap size={17}/>}/>
      </div>
    </Card>}

    {step===4&&<Card title="Módulo fotovoltaico" subtitle="Defina o painel e confira a prévia antes de aplicar ao kit.">
      <div style={{maxWidth:320}}><Field label="Potência do módulo (Wp)" value={form.panelPowerW} onChange={e=>update('panelPowerW',e.target.value)}/></div>
      <div style={s.previewGrid}>
        <Preview label="Módulos" value={String(result.moduleCount)}/>
        <Preview label="Potência" value={`${decimal.format(result.totalModuleKw)} kWp`}/>
        <Preview label="Geração" value={`${Math.round(result.monthlyGeneration)} kWh/mês`}/>
        <Preview label="Banco" value={`${result.batteryCount} bateria(s)`}/>
        <Preview label="Inversor mín." value={`${decimal.format(result.minInverterKw)} kW`}/>
      </div>
    </Card>}

    {step===5&&<div className="hybrid-result" style={s.result}>
      <div style={s.resultHead}>
        <div><span style={s.resultEye}>RESULTADO FINAL</span><h3 style={s.resultTitle}>Resumo do dimensionamento</h3><p style={s.muted}>Resultado destacado e pronto para a precificação.</p></div>
        <button type="button" style={s.outline} onClick={reset}><RotateCcw size={15}/> Novo cálculo</button>
      </div>
      <div style={s.highGrid}>
        <High icon={<Grid2X2 size={20}/>} label="Módulos" value={`${result.moduleCount} x ${form.panelPowerW} W`}/>
        <High icon={<Sun size={20}/>} label="Potência FV" value={`${decimal.format(result.totalModuleKw)} kWp`}/>
        <High icon={<Zap size={20}/>} label="Geração mensal" value={`${Math.round(result.monthlyGeneration)} kWh`}/>
        <High icon={<BatteryCharging size={20}/>} label="Baterias" value={String(result.batteryCount)}/>
      </div>
      <div style={s.details}>
        <Detail label="Modelo da bateria" value={battery.model}/>
        <Detail label="Capacidade total" value={`${decimal.format(result.totalBatteryKwh)} kWh`}/>
        <Detail label="Energia utilizável" value={`${decimal.format(result.usableBatteryKwh)} kWh`}/>
        <Detail label="Autonomia solicitada" value={`${decimal.format(n(form.autonomyHours))} h`}/>
        <Detail label="Potência mínima do inversor" value={`${decimal.format(result.minInverterKw)} kW`}/>
        <Detail label="Tensão / fase" value={`${form.voltage} · ${form.phase}`}/>
      </div>
      <div style={s.success}><CheckCircle2 size={18}/> Dimensionamento aplicado à precificação abaixo.</div>
    </div>}

    <div className="hybrid-actions" style={s.actions}>
      {step>1&&step<5&&<button type="button" style={s.secondary} onClick={()=>setStep(x=>Math.max(1,x-1))}><ChevronLeft size={16}/> Voltar</button>}
      {step<4&&<button type="button" style={s.primary} onClick={()=>setStep(x=>Math.min(5,x+1))}>Avançar <ChevronRight size={16}/></button>}
      {step===4&&<button type="button" style={s.primary} onClick={calc}><CheckCircle2 size={16}/> Calcular e aplicar ao kit</button>}
    </div>
  </section>;
}

function Card({title,subtitle,children}){return <div className="hybrid-card" style={s.card}><h3 style={s.cardTitle}>{title}</h3><p style={s.muted}>{subtitle}</p><div style={{display:'grid',gap:14,marginTop:16}}>{children}</div></div>}
function Field({label,...p}){return <label style={s.label}>{label}<input type="number" step="0.01" style={s.input}{...p}/></label>}
function Select({label,options,...p}){return <label style={s.label}>{label}<select style={s.input}{...p}>{options.map(o=>Array.isArray(o)?<option key={o[0]} value={o[0]}>{o[1]}</option>:<option key={o}>{o}</option>)}</select></label>}
function Option({active,title,text,icon,tone,onClick}){return <button type="button" onClick={onClick} style={{...s.option,...(active?{borderColor:tone,boxShadow:`0 12px 28px ${tone}22`,background:'#f8fbff'}:{})}}><span style={{...s.optionIcon,color:tone,background:`${tone}14`}}>{icon}</span><span><strong style={s.optionTitle}>{title}</strong><small style={s.optionText}>{text}</small></span></button>}
function Quick({active,title,text,onClick}){return <button type="button" onClick={onClick} style={{...s.quick,...(active?{borderColor:'#e8bd26',background:'#fff8db'}:{})}}><strong>{title}</strong><small>{text}</small></button>}
function Spec({label,value,icon}){return <div style={s.spec}><span style={s.specLabel}>{icon}{label}</span><strong>{value}</strong></div>}
function Preview({label,value}){return <div style={s.preview}><small>{label}</small><strong>{value}</strong></div>}
function High({icon,label,value}){return <div style={s.high}><span style={s.highIcon}>{icon}</span><small>{label}</small><strong>{value}</strong></div>}
function Detail({label,value}){return <div className="hybrid-detail" style={s.detail}><span>{label}</span><strong>{value}</strong></div>}
function Top({label,value,icon}){return <div className="hybrid-top" style={s.top}><span style={s.topLabel}>{icon}{label}</span><strong>{value}</strong></div>}

const s={
 shell:{background:'#fff',border:'1px solid #dfe5ec',borderRadius:24,padding:24,marginBottom:22,boxShadow:'0 18px 40px rgba(15,23,42,.07)'},
 hero:{display:'grid',gridTemplateColumns:'minmax(0,1.35fr) minmax(250px,.75fr)',gap:18,padding:20,borderRadius:22,background:'linear-gradient(135deg,#0f2c52,#173d6d 60%,#1c4f8a)',marginBottom:18},
 eyebrow:{fontSize:11,fontWeight:900,letterSpacing:1.1,color:'#f6d96f'},
 title:{display:'flex',alignItems:'center',gap:9,margin:'8px 0',fontSize:28,color:'#fff'},
 heroText:{margin:0,color:'rgba(255,255,255,.85)',lineHeight:1.5},
 heroStats:{display:'grid',gap:10},
 top:{display:'grid',gap:4,padding:'12px 14px',borderRadius:16,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.16)',color:'#fff'},
 topLabel:{display:'inline-flex',alignItems:'center',gap:6},
 progress:{padding:16,borderRadius:18,border:'1px solid #e2e8f0',background:'#f8fafc',marginBottom:18},
 progressHead:{display:'flex',justifyContent:'space-between',gap:10,marginBottom:12,color:'#475569'},
 progressRow:{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10},
 dot:{minHeight:42,display:'grid',placeItems:'center',borderRadius:999,background:'#dbe3ee',color:'#64748b',fontWeight:900},
 dotOn:{background:'linear-gradient(135deg,#e8bd26,#f6d861)',color:'#0f2c52'},
 card:{border:'1px solid #e2e8f0',borderRadius:22,padding:20,background:'#fff'},
 cardTitle:{margin:0,fontSize:23,color:'#0f2c52'},
 muted:{margin:'6px 0 0',color:'#64748b',lineHeight:1.5},
 grid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14},
 label:{fontSize:13,fontWeight:800,color:'#334155'},
 input:{width:'100%',boxSizing:'border-box',marginTop:6,padding:'12px 13px',border:'1px solid #cbd5e1',borderRadius:12,background:'#fff'},
 option:{display:'flex',alignItems:'center',gap:14,width:'100%',padding:18,borderRadius:20,border:'1px solid #dbe3ee',background:'#fff'},
 optionIcon:{width:54,height:54,display:'grid',placeItems:'center',borderRadius:16,flexShrink:0},
 optionTitle:{display:'block',fontSize:18,color:'#0f2c52',textAlign:'left'},
 optionText:{display:'block',marginTop:4,color:'#64748b',textAlign:'left'},
 quickGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,padding:16,borderRadius:18,background:'#f8fafc',border:'1px solid #e2e8f0'},
 quick:{display:'grid',gap:4,padding:14,textAlign:'left',borderRadius:16,border:'1px solid #dbe3ee',background:'#fff'},
 specGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12},
 spec:{display:'grid',gap:8,padding:14,borderRadius:16,border:'1px solid #e2e8f0',background:'#fbfdff'},
 specLabel:{display:'inline-flex',alignItems:'center',gap:6,color:'#64748b',fontSize:12,fontWeight:800},
 previewGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,padding:16,borderRadius:18,background:'linear-gradient(180deg,#fffef7,#fff7d7)',border:'1px solid #f1e2a6'},
 preview:{display:'grid',gap:4,padding:14,borderRadius:16,background:'#fff',border:'1px solid #f2e7b6'},
 result:{padding:22,borderRadius:24,background:'linear-gradient(180deg,#fff,#f8fbff)',border:'1px solid #dbe6f3',boxShadow:'0 18px 34px rgba(37,99,235,.08)'},
 resultHead:{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap',marginBottom:18},
 resultEye:{color:'#2563eb',fontSize:11,fontWeight:900,letterSpacing:1.1},
 resultTitle:{margin:'6px 0 0',fontSize:28,color:'#0f2c52'},
 outline:{display:'inline-flex',alignItems:'center',gap:6,border:'1px solid #cbd5e1',borderRadius:10,padding:'10px 12px',background:'#fff',fontWeight:800},
 highGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:16},
 high:{display:'grid',gap:7,padding:16,borderRadius:18,background:'#fff',border:'1px solid #dbe6f3'},
 highIcon:{width:42,height:42,display:'grid',placeItems:'center',borderRadius:14,background:'#eef5ff',color:'#2563eb'},
 details:{display:'grid',gap:10},
 detail:{display:'flex',justifyContent:'space-between',gap:12,padding:'13px 14px',borderRadius:14,border:'1px solid #e2e8f0',background:'#fff'},
 success:{display:'inline-flex',alignItems:'center',gap:8,marginTop:16,padding:'12px 14px',borderRadius:12,background:'#dcfce7',color:'#166534',fontWeight:900},
 actions:{display:'flex',justifyContent:'space-between',gap:12,marginTop:18},
 primary:{display:'inline-flex',alignItems:'center',gap:8,border:0,borderRadius:14,padding:'13px 18px',background:'linear-gradient(135deg,#e8bd26,#f3d66a)',color:'#0f2c52',fontWeight:900,marginLeft:'auto'},
 secondary:{display:'inline-flex',alignItems:'center',gap:8,border:'1px solid #cbd5e1',borderRadius:14,padding:'13px 18px',background:'#fff',color:'#334155',fontWeight:900}
};
