import React, { useMemo, useState } from 'react';
import { BatteryCharging, CheckCircle2, Grid2X2, RotateCcw, Sun, Zap } from 'lucide-react';

const n = (v, f = 0) => { const x = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(x) ? x : f; };
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

// Acervo técnico para dimensionamento. Quando o fabricante não publica DoD máximo
// de forma clara na página pública, usamos 80% como DoD de cálculo conservador.
export const HYBRID_BATTERIES = [
  { id:'must-lp15-1250', brand:'MUST', model:'LP15-1250 LiFePO4 12.8V 50Ah', capacityKwh:0.64, powerKw:0.64, dod:80, dodType:'calculo', voltage:12.8, maxDischargeA:50, source:'MUST LP1500' },
  { id:'must-lp15-12100', brand:'MUST', model:'LP15-12100 LiFePO4 12.8V 100Ah', capacityKwh:1.28, powerKw:1.28, dod:80, dodType:'calculo', voltage:12.8, maxDischargeA:100, source:'MUST LP1500' },
  { id:'dyness-ar1-2', brand:'Dyness', model:'AR1.2 LiFePO4 100Ah', capacityKwh:1.28, powerKw:null, dod:80, dodType:'calculo', voltage:12.8, maxDischargeA:null, source:'Dyness AR1.2' },
  { id:'felicity-fla12100-pg2', brand:'Felicity Solar', model:'FLA12100-PG2 12.8V 100Ah', capacityKwh:1.28, powerKw:null, dod:80, dodType:'calculo', voltage:12.8, maxDischargeA:null, source:'Felicity FLA12100/200-PG2' },
  { id:'pylontech-us2000c', brand:'Pylontech', model:'US2000C 48V', capacityKwh:2.4, powerKw:1.2, dod:95, dodType:'fabricante', voltage:48, maxDischargeA:89, source:'Pylontech US Series' },
  { id:'must-lp15-12200', brand:'MUST', model:'LP15-12200 LiFePO4 12.8V 200Ah', capacityKwh:2.56, powerKw:1.28, dod:80, dodType:'calculo', voltage:12.8, maxDischargeA:100, source:'MUST LP1500' },
  { id:'must-lp15-24100', brand:'MUST', model:'LP15-24100 LiFePO4 25.6V 100Ah', capacityKwh:2.56, powerKw:2.56, dod:80, dodType:'calculo', voltage:25.6, maxDischargeA:100, source:'MUST LP1500' },
  { id:'dyness-ar2-5', brand:'Dyness', model:'AR2.5 LiFePO4 100Ah', capacityKwh:2.56, powerKw:null, dod:80, dodType:'calculo', voltage:25.6, maxDischargeA:null, source:'Dyness AR2.5' },
  { id:'felicity-fla12200-pg2', brand:'Felicity Solar', model:'FLA12200-PG2 12.8V 200Ah', capacityKwh:2.56, powerKw:null, dod:80, dodType:'calculo', voltage:12.8, maxDischargeA:null, source:'Felicity FLA12100/200-PG2' },
  { id:'pylontech-us3000c', brand:'Pylontech', model:'US3000C 48V', capacityKwh:3.552, powerKw:1.776, dod:95, dodType:'fabricante', voltage:48, maxDischargeA:89, source:'Pylontech US Series' },
  { id:'pylontech-us5000', brand:'Pylontech', model:'US5000 48V', capacityKwh:4.8, powerKw:3.84, dod:95, dodType:'fabricante', voltage:48, maxDischargeA:120, source:'Pylontech US Series' },
  { id:'saj-b3-5', brand:'SAJ', model:'B3-5.0KWH-LV 48V 100Ah', capacityKwh:5, powerKw:2.5, dod:90, dodType:'fabricante', voltage:48, maxDischargeA:100, source:'SAJ B3-5.0-LV' },
  { id:'deye-se-g5-1', brand:'Deye', model:'SE-G5.1 51.2V 100Ah', capacityKwh:5.12, powerKw:2.56, dod:80, dodType:'fabricante', voltage:51.2, maxDischargeA:100, source:'Deye SE-G5.1' },
  { id:'deye-se-g5-1-pro-b', brand:'Deye', model:'SE-G5.1 Pro B 51.2V 100Ah', capacityKwh:5.12, powerKw:2.56, dod:90, dodType:'fabricante', voltage:51.2, maxDischargeA:100, source:'Deye SE-G5.1 Pro B' },
  { id:'dyness-dl5-pro', brand:'Dyness', model:'DL5.0C Pro 51.2V 100Ah', capacityKwh:5.12, powerKw:5.12, dod:90, dodType:'calculo', voltage:51.2, maxDischargeA:100, source:'Dyness DL5.0C Pro' },
  { id:'deye-rw-m6-1', brand:'Deye', model:'RW-M6.1 6.1kWh 51.2V', capacityKwh:6.1, powerKw:3.07, dod:90, dodType:'fabricante', voltage:51.2, maxDischargeA:100, source:'Deye RW-M6.1' },
  { id:'felicity-14-3', brand:'Felicity Solar', model:'FLA48280-EU 14.3kWh', capacityKwh:14.3, powerKw:7.1, dod:95, dodType:'fabricante', voltage:51.2, maxDischargeA:140, source:'Felicity FLA48280-EU' },
];

const initial = { systemType:'hybrid', irradiation:3.653, voltage:'127/220 V', phase:'Bifásico', monthlyConsumption:399, autonomyHours:24, efficiency:75, shading:0, batteryId:'saj-b3-5', panelPowerW:620 };

export default function HybridCalculatorWizard({ onResult }) {
  const [form, setForm] = useState(initial);
  const [done, setDone] = useState(false);
  const battery = HYBRID_BATTERIES.find(b => b.id === form.batteryId) || HYBRID_BATTERIES[0];
  const result = useMemo(() => {
    const consumption = Math.max(0, n(form.monthlyConsumption));
    const irradiation = Math.max(.1, n(form.irradiation, 3.653));
    const efficiency = Math.min(1, Math.max(.01, n(form.efficiency,75)/100));
    const shade = 1 - Math.min(.95, Math.max(0,n(form.shading)/100));
    const panelKw = Math.max(.005,n(form.panelPowerW,620)/1000);
    const generationPerKw = irradiation * 30 * efficiency * shade;
    const moduleCount = Math.max(1, Math.ceil((consumption / generationPerKw) / panelKw));
    const totalModuleKw = moduleCount * panelKw;
    const monthlyGeneration = totalModuleKw * generationPerKw;
    const dailyConsumption = consumption / 30;
    const requestedUsableKwh = dailyConsumption * Math.max(.0417,n(form.autonomyHours,24)/24);
    const usablePerBattery = battery.capacityKwh * battery.dod / 100;
    const batteryCount = form.systemType === 'ongrid' ? 0 : Math.max(1,Math.ceil(requestedUsableKwh / usablePerBattery));
    const totalBatteryKwh = batteryCount * battery.capacityKwh;
    const usableBatteryKwh = batteryCount * usablePerBattery;
    const minInverterKw = totalModuleKw / 1.3;
    const availableBatteryPowerKw = batteryCount * n(battery.powerKw,0);
    return { ...form, battery, moduleCount, totalModuleKw, monthlyGeneration, dailyConsumption, requestedUsableKwh, batteryCount, totalBatteryKwh, usableBatteryKwh, minInverterKw, availableBatteryPowerKw };
  }, [form,battery]);

  const update = (name,value) => { setDone(false); setForm(c => ({...c,[name]:value})); };
  const calculate = () => { setDone(true); onResult?.(result); };
  const reset = () => { setForm(initial); setDone(false); onResult?.(null); };

  return <section style={s.shell}>
    <div style={s.header}><div><span style={s.eyebrow}>DIMENSIONAMENTO HÍBRIDO / BESS</span><h2 style={s.h2}><BatteryCharging size={22}/> Calculadora híbrida</h2><p style={s.sub}>O resultado alimenta automaticamente o kit, o custo e a proposta.</p></div><button type="button" style={s.secondary} onClick={reset}><RotateCcw size={15}/> Novo cálculo</button></div>
    <div style={s.grid}>
      <Select label="Tipo de sistema" value={form.systemType} onChange={e=>update('systemType',e.target.value)} options={[['hybrid','Híbrido'],['offgrid','Off-Grid'],['ongrid','On-Grid']]}/>
      <Field label="Consumo (kWh/mês)" value={form.monthlyConsumption} onChange={e=>update('monthlyConsumption',e.target.value)}/>
      <Field label="Autonomia (h)" value={form.autonomyHours} onChange={e=>update('autonomyHours',e.target.value)}/>
      <Field label="Irradiação (kWh/m².dia)" value={form.irradiation} onChange={e=>update('irradiation',e.target.value)}/>
      <Field label="Eficiência FV (%)" value={form.efficiency} onChange={e=>update('efficiency',e.target.value)}/>
      <Field label="Sombreamento (%)" value={form.shading} onChange={e=>update('shading',e.target.value)}/>
      <Field label="Potência do módulo (Wp)" value={form.panelPowerW} onChange={e=>update('panelPowerW',e.target.value)}/>
      <Select label="Tensão" value={form.voltage} onChange={e=>update('voltage',e.target.value)} options={['127/220 V','220/380 V','254/440 V']}/>
      <Select label="Fase" value={form.phase} onChange={e=>update('phase',e.target.value)} options={['Monofásico','Bifásico','Trifásico']}/>
      <label style={s.label}>Bateria<select style={s.input} value={form.batteryId} onChange={e=>update('batteryId',e.target.value)}>{HYBRID_BATTERIES.map(b=><option key={b.id} value={b.id}>{b.brand} - {b.model} · {decimal.format(b.capacityKwh)} kWh · {decimal.format(b.voltage)} V</option>)}</select></label>
    </div>
    <div style={s.batteryInfo}>
      <div><span>Capacidade</span><strong>{decimal.format(battery.capacityKwh)} kWh</strong></div>
      <div><span>Tensão</span><strong>{decimal.format(battery.voltage)} V</strong></div>
      <div><span>DoD usado</span><strong>{battery.dod}%{battery.dodType === 'calculo' ? ' (conservador)' : ''}</strong></div>
      <div><span>Descarga</span><strong>{battery.maxDischargeA ? `${battery.maxDischargeA} A` : 'Consultar ficha'}</strong></div>
    </div>
    <div style={s.preview}><span>Prévia</span><strong>{result.moduleCount} módulos · {decimal.format(result.totalModuleKw)} kWp · {result.batteryCount} bateria(s) · inversor mínimo {decimal.format(result.minInverterKw)} kW</strong></div>
    <button type="button" style={s.primary} onClick={calculate}><CheckCircle2 size={17}/> Calcular e aplicar ao kit</button>
    {done && <div style={s.result}>
      <Result icon={<Grid2X2 size={18}/>} label="Módulos" value={`${result.moduleCount} x ${form.panelPowerW} W`}/>
      <Result icon={<Sun size={18}/>} label="Geração mensal" value={`${Math.round(result.monthlyGeneration)} kWh`}/>
      <Result icon={<BatteryCharging size={18}/>} label="Banco de baterias" value={`${result.batteryCount} x ${battery.capacityKwh} kWh = ${decimal.format(result.totalBatteryKwh)} kWh`}/>
      <Result icon={<BatteryCharging size={18}/>} label="Energia utilizável" value={`${decimal.format(result.usableBatteryKwh)} kWh`}/>
      <Result icon={<Zap size={18}/>} label="Inversor mínimo" value={`${decimal.format(result.minInverterKw)} kW`}/>
      <div style={s.ok}>Dimensionamento aplicado à precificação abaixo.</div>
      {battery.dodType === 'calculo' && <div style={s.note}>Nesta bateria, o DoD de {battery.dod}% é um valor conservador adotado apenas para o dimensionamento. Confirme a ficha técnica do lote/modelo antes da instalação.</div>}
    </div>}
  </section>;
}

function Field({label,...props}){return <label style={s.label}>{label}<input type="number" step="0.01" style={s.input} {...props}/></label>}
function Select({label,options,...props}){return <label style={s.label}>{label}<select style={s.input} {...props}>{options.map(o=>Array.isArray(o)?<option key={o[0]} value={o[0]}>{o[1]}</option>:<option key={o}>{o}</option>)}</select></label>}
function Result({icon,label,value}){return <div style={s.row}><span>{icon}{label}</span><strong>{value}</strong></div>}
const s={shell:{background:'#fff',border:'1px solid #dfe5ec',borderRadius:18,padding:22,marginBottom:22,boxShadow:'0 8px 30px rgba(15,23,42,.05)'},header:{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap',marginBottom:18},eyebrow:{fontSize:11,fontWeight:900,letterSpacing:1.1,color:'#64748b'},h2:{display:'flex',alignItems:'center',gap:8,margin:'5px 0',color:'#0f2c52'},sub:{margin:0,color:'#64748b'},grid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:13},label:{fontSize:13,fontWeight:800,color:'#334155'},input:{width:'100%',boxSizing:'border-box',marginTop:6,padding:'11px 12px',border:'1px solid #cbd5e1',borderRadius:10,background:'#fff'},batteryInfo:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginTop:14},preview:{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginTop:16,padding:14,borderRadius:11,background:'#f8fafc',border:'1px solid #e2e8f0'},primary:{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7,width:'100%',marginTop:14,border:0,borderRadius:11,padding:'13px 16px',background:'#e8bd26',fontWeight:900,cursor:'pointer'},secondary:{display:'inline-flex',alignItems:'center',gap:6,border:'1px solid #cbd5e1',borderRadius:9,padding:'9px 12px',background:'#fff',fontWeight:800},result:{display:'grid',gap:8,marginTop:16},row:{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',padding:'11px 12px',border:'1px solid #e2e8f0',borderRadius:10},ok:{padding:12,borderRadius:10,background:'#dcfce7',color:'#166534',fontWeight:800},note:{padding:12,borderRadius:10,background:'#fff7ed',color:'#9a3412',fontSize:12,fontWeight:700}};
