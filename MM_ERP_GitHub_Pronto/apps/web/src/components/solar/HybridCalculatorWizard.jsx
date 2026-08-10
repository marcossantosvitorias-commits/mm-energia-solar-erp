import React, { useMemo, useState } from 'react';
import { BatteryCharging, Calculator, CheckCircle2, Gauge, Grid2X2, RotateCcw, Sun, Zap } from 'lucide-react';

const number = (value, fallback = 0) => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

const BATTERIES = [
  { id: 'deye-rw-m6-1', brand: 'Deye', model: 'RW-M6.1 6.1kWh 51.2V BT', capacityKwh: 6.1, powerKw: 3.07, dod: 90, voltage: 51.2, maxDischargeA: 100 },
  { id: 'deye-se-g5-1', brand: 'Deye', model: 'SE-G5.1 PRO 5.1kWh 51.2V BT', capacityKwh: 5.1, powerKw: 2.56, dod: 90, voltage: 51.2, maxDischargeA: 100 },
  { id: 'saj-b3-5', brand: 'SAJ', model: 'B3-5.0KWH-LV 48V 100Ah', capacityKwh: 5, powerKw: 2.5, dod: 90, voltage: 48, maxDischargeA: 100 },
  { id: 'felicity-14-3', brand: 'Felicity Solar', model: 'FLA48280-EU 14.3kWh 51.2V', capacityKwh: 14.3, powerKw: 7.1, dod: 90, voltage: 51.2, maxDischargeA: 140 },
];

const initial = {
  systemType: 'hybrid',
  mode: 'quick',
  irradiationMode: 'minimum',
  irradiation: 3.653,
  voltage: '127/220 V',
  phase: 'Bifásico',
  monthlyConsumption: 399,
  autonomyHours: 24,
  efficiency: 75,
  shading: 0,
  batteryId: BATTERIES[0].id,
  panelPowerW: 620,
};

export default function HybridCalculatorWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initial);
  const battery = BATTERIES.find((item) => item.id === form.batteryId) || BATTERIES[0];

  const result = useMemo(() => {
    const consumption = Math.max(0, number(form.monthlyConsumption));
    const irradiation = Math.max(0.1, number(form.irradiation, 3.653));
    const efficiency = Math.min(1, Math.max(0.01, number(form.efficiency, 75) / 100));
    const shadingFactor = 1 - Math.min(0.95, Math.max(0, number(form.shading, 0) / 100));
    const panelPowerKw = Math.max(0.005, number(form.panelPowerW, 620) / 1000);
    const effectiveGenerationPerKwMonth = irradiation * 30 * efficiency * shadingFactor;
    const requiredPvKw = effectiveGenerationPerKwMonth > 0 ? consumption / effectiveGenerationPerKwMonth : 0;
    const moduleCount = Math.max(1, Math.ceil(requiredPvKw / panelPowerKw));
    const totalModuleKw = moduleCount * panelPowerKw;
    const monthlyGeneration = totalModuleKw * effectiveGenerationPerKwMonth;

    const dailyConsumption = consumption / 30;
    const autonomyDays = Math.max(0.0417, number(form.autonomyHours, 24) / 24);
    const requiredUsableBatteryKwh = dailyConsumption * autonomyDays;
    const usablePerBattery = battery.capacityKwh * (battery.dod / 100);
    const batteryCount = Math.max(1, Math.ceil(requiredUsableBatteryKwh / usablePerBattery));
    const totalBatteryKwh = batteryCount * battery.capacityKwh;
    const usableBatteryKwh = batteryCount * usablePerBattery;

    // Mesmo critério mostrado na referência: relação CC/CA de 1,30 para a potência mínima do inversor.
    const minInverterKw = totalModuleKw / 1.3;

    return {
      moduleCount,
      totalModuleKw,
      monthlyGeneration,
      dailyConsumption,
      batteryCount,
      totalBatteryKwh,
      usableBatteryKwh,
      minInverterKw,
    };
  }, [form, battery]);

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const chooseIrradiation = (mode, value) => setForm((current) => ({ ...current, irradiationMode: mode, irradiation: value }));
  const next = () => setStep((current) => Math.min(6, current + 1));
  const back = () => setStep((current) => Math.max(1, current - 1));
  const reset = () => { setForm(initial); setStep(1); };

  return (
    <section style={styles.shell}>
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>DIMENSIONAMENTO BESS / HÍBRIDO</span>
          <h2 style={styles.heading}><BatteryCharging size={23} /> Calculadora híbrida em etapas</h2>
          <p style={styles.subtitle}>Fluxo baseado na gravação enviada: consumo, irradiação, autonomia, bateria, módulos e inversor.</p>
        </div>
        <button type="button" onClick={reset} style={styles.ghostButton}><RotateCcw size={15} /> Novo cálculo</button>
      </div>

      <div style={styles.progressWrap}>
        <div style={styles.progressTop}><strong>PASSO {Math.min(step, 5)} DE 5</strong><span>{step === 6 ? 'Resultado' : stepLabels[step]}</span></div>
        <div style={styles.progress}>{[1,2,3,4,5].map((item) => <span key={item} style={{ ...styles.progressBar, background: item <= Math.min(step, 5) ? '#2563eb' : '#e2e8f0' }} />)}</div>
      </div>

      {step === 1 && <StepCard title="Escolha o tipo de sistema a ser calculado" subtitle="Baseado no tipo de sistema que será instalado no cliente">
        <Choice active={form.systemType === 'offgrid'} icon={<Sun size={28} />} title="Off-Grid" text="Sistema totalmente independente da rede elétrica pública." onClick={() => update('systemType', 'offgrid')} tone="#10b981" />
        <Choice active={form.systemType === 'hybrid'} icon={<BatteryCharging size={28} />} title="Híbrido" text="Sistema conectado à rede com baterias, capaz de operar em quedas de energia." onClick={() => update('systemType', 'hybrid')} tone="#2563eb" />
        <Choice active={form.systemType === 'ongrid'} icon={<Grid2X2 size={28} />} title="On-Grid" text="Sistema conectado à rede da concessionária, sem armazenamento." onClick={() => update('systemType', 'ongrid')} tone="#f59e0b" />
      </StepCard>}

      {step === 2 && <StepCard title="Escolha a modalidade do cálculo" subtitle="Selecione como deseja dimensionar o sistema">
        <Choice active={form.mode === 'quick'} icon={<Gauge size={28} />} title="Cálculo Rápido" text="Estimativa prática baseada no consumo mensal." onClick={() => update('mode', 'quick')} tone="#10b981" />
        <Choice active={form.mode === 'complete'} icon={<Calculator size={28} />} title="Cálculo Completo" text="Estrutura preparada para detalhamento por equipamentos e cargas." onClick={() => update('mode', 'complete')} tone="#2563eb" />
      </StepCard>}

      {step === 3 && <StepCard title="Confirme os parâmetros técnicos" subtitle="Ajuste as configurações usadas para o dimensionamento solar.">
        <div style={styles.sectionTitle}><Sun size={19} /> Irradiação solar</div>
        <div style={styles.radioGroup}>
          <Radio checked={form.irradiationMode === 'minimum'} label="Irradiação Mínima" detail="3,653 — recomendado para autonomia" onClick={() => chooseIrradiation('minimum', 3.653)} />
          <Radio checked={form.irradiationMode === 'average'} label="Irradiação Média" detail="4,791" onClick={() => chooseIrradiation('average', 4.791)} />
          <Radio checked={form.irradiationMode === 'inclined'} label="Plano Inclinado" detail="5,010" onClick={() => chooseIrradiation('inclined', 5.010)} />
        </div>
        <div style={styles.formGrid}>
          <Field label="Irradiação usada (kWh/m².dia)" value={form.irradiation} onChange={(e) => update('irradiation', e.target.value)} />
          <Select label="Tensão" value={form.voltage} onChange={(e) => update('voltage', e.target.value)} options={['127/220 V','220/380 V','254/440 V']} />
          <Select label="Fase" value={form.phase} onChange={(e) => update('phase', e.target.value)} options={['Monofásico','Bifásico','Trifásico']} />
          <Field label="Consumo de energia (kWh/mês)" value={form.monthlyConsumption} onChange={(e) => update('monthlyConsumption', e.target.value)} />
          <Field label="Autonomia (h)" value={form.autonomyHours} onChange={(e) => update('autonomyHours', e.target.value)} />
          <Field label="Eficiência do sistema FV (%)" value={form.efficiency} onChange={(e) => update('efficiency', e.target.value)} />
          <Field label="Sombreamento (%)" value={form.shading} onChange={(e) => update('shading', e.target.value)} />
        </div>
      </StepCard>}

      {step === 4 && <StepCard title="Selecione o modelo de bateria" subtitle="Somente baterias de lítio (LiFePO4)">
        <label style={styles.label}>Bateria
          <select style={styles.input} value={form.batteryId} onChange={(e) => update('batteryId', e.target.value)}>
            {BATTERIES.map((item) => <option value={item.id} key={item.id}>{item.brand} - {item.model}</option>)}
          </select>
        </label>
        <div style={styles.batteryCard}>
          <div><span>MARCA / FABRICANTE</span><strong>{battery.brand}</strong></div>
          <div><span>MODELO</span><strong>{battery.model}</strong></div>
          <div><span>CAPACIDADE</span><strong>{decimal.format(battery.capacityKwh)} kWh</strong></div>
          <div><span>POTÊNCIA</span><strong>{decimal.format(battery.powerKw)} kW</strong></div>
          <div><span>DoD</span><strong>{battery.dod}%</strong></div>
          <div><span>CORRENTE MÁX. DESCARGA</span><strong>{battery.maxDischargeA} A</strong></div>
          <div><span>TENSÃO NOMINAL</span><strong>{decimal.format(battery.voltage)} V</strong></div>
        </div>
      </StepCard>}

      {step === 5 && <StepCard title="Potência do painel solar" subtitle="Informe a potência unitária do módulo que será usado no projeto.">
        <Field label="Potência unitária do painel (Wp)" value={form.panelPowerW} onChange={(e) => update('panelPowerW', e.target.value)} min="5" max="2000" />
        <div style={styles.previewLine}><span>Prévia</span><strong>{result.moduleCount} módulos · {decimal.format(result.totalModuleKw)} kWp · {result.batteryCount} bateria(s)</strong></div>
      </StepCard>}

      {step === 6 && <div style={styles.resultCard}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}><CheckCircle2 size={38} color="#16a34a" /><h2 style={{ margin: '8px 0 4px' }}>Resultado do Cálculo</h2><p style={styles.subtitle}>Principais informações do dimensionamento {form.systemType === 'hybrid' ? 'Híbrido' : form.systemType === 'offgrid' ? 'Off-Grid' : 'On-Grid'}.</p></div>
        <ResultRow highlight icon={<Grid2X2 size={19} />} label={`Número de módulos (${form.panelPowerW} Wp)`} value={result.moduleCount} />
        <ResultRow icon={<Sun size={19} />} label="Potência total dos módulos (kWp)" value={decimal.format(result.totalModuleKw)} />
        <ResultRow icon={<Zap size={19} />} label="Geração mensal do sistema (kWh)" value={Math.round(result.monthlyGeneration)} />
        {form.systemType !== 'ongrid' && <>
          <ResultRow highlight="blue" icon={<BatteryCharging size={19} />} label="Número de baterias" value={result.batteryCount} />
          <ResultRow label="Modelo da bateria" value={battery.model} />
          <ResultRow label="Fabricante" value={battery.brand} />
          <ResultRow label="Capacidade total (kWh)" value={decimal.format(result.totalBatteryKwh)} />
          <ResultRow label="Energia utilizável diária (kWh/dia)" value={decimal.format(result.usableBatteryKwh)} />
          <ResultRow label="Autonomia do sistema (horas)" value={decimal.format(number(form.autonomyHours))} />
        </>}
        <ResultRow icon={<Zap size={19} />} label="Potência mínima do inversor (kW)" value={decimal.format(result.minInverterKw)} />
        <ResultRow label="Tensão do inversor" value={`${form.voltage} (${form.phase})`} />
        <div style={styles.note}>Critério aplicado: geração = kWp × irradiação × 30 × eficiência × (1 − sombreamento); banco = consumo diário × autonomia ÷ energia útil por bateria; inversor mínimo = potência FV ÷ 1,30.</div>
      </div>}

      <div style={styles.actions}>
        {step > 1 && <button type="button" onClick={back} style={styles.secondary}>Voltar</button>}
        {step < 5 && <button type="button" onClick={next} style={styles.primary}>Avançar</button>}
        {step === 5 && <button type="button" onClick={next} style={{ ...styles.primary, background: '#0ea66d' }}><CheckCircle2 size={17} /> Realizar cálculo</button>}
        {step === 6 && <button type="button" onClick={reset} style={styles.primary}><RotateCcw size={17} /> Novo cálculo</button>}
      </div>
    </section>
  );
}

const stepLabels = { 1:'Sistema', 2:'Modalidade', 3:'Parâmetros', 4:'Bateria', 5:'Módulo' };

function StepCard({ title, subtitle, children }) { return <div style={styles.stepCard}><h3 style={styles.stepTitle}>{title}</h3><p style={styles.subtitle}>{subtitle}</p><div style={{ display:'grid', gap:14, marginTop:18 }}>{children}</div></div>; }
function Choice({ active, icon, title, text, onClick, tone }) { return <button type="button" onClick={onClick} style={{ ...styles.choice, borderColor: active ? tone : '#dbe3ee', boxShadow: active ? `0 0 0 2px ${tone}18` : 'none' }}><span style={{ ...styles.choiceIcon, color:tone, background:`${tone}12` }}>{icon}</span><strong>{title}</strong><span>{text}</span></button>; }
function Radio({ checked, label, detail, onClick }) { return <button type="button" onClick={onClick} style={styles.radio}><span style={{ ...styles.dot, borderColor: checked ? '#2563eb' : '#cbd5e1' }}>{checked && <i style={styles.dotInner} />}</span><strong>{label}</strong><small>{detail}</small></button>; }
function Field({ label, ...props }) { return <label style={styles.label}>{label}<input type="number" step="0.01" {...props} style={styles.input} /></label>; }
function Select({ label, options, ...props }) { return <label style={styles.label}>{label}<select {...props} style={styles.input}>{options.map((item) => <option key={item}>{item}</option>)}</select></label>; }
function ResultRow({ label, value, icon, highlight }) { const bg = highlight === 'blue' ? '#eff6ff' : highlight ? '#ecfdf5' : '#fff'; return <div style={{ ...styles.resultRow, background:bg, borderColor: highlight === 'blue' ? '#bfdbfe' : highlight ? '#bbf7d0' : '#e2e8f0' }}><span style={styles.resultLabel}>{icon}{label}</span><strong>{value}</strong></div>; }

const styles = {
  shell:{background:'#f8fafc',border:'1px solid #dbe3ee',borderRadius:20,padding:22,marginBottom:24,boxShadow:'0 10px 35px rgba(15,23,42,.06)'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap'},eyebrow:{fontSize:11,fontWeight:900,letterSpacing:1.2,color:'#64748b'},heading:{display:'flex',alignItems:'center',gap:9,margin:'6px 0',fontSize:24,color:'#0f172a'},subtitle:{margin:'4px 0 0',color:'#64748b',fontSize:14,lineHeight:1.5},
  ghostButton:{display:'inline-flex',alignItems:'center',gap:7,border:'1px solid #cbd5e1',background:'#fff',padding:'9px 12px',borderRadius:10,fontWeight:800,color:'#334155',cursor:'pointer'},progressWrap:{margin:'22px 0 18px',background:'#fff',padding:16,borderRadius:15,border:'1px solid #e2e8f0'},progressTop:{display:'flex',justifyContent:'space-between',fontSize:12,color:'#2563eb',marginBottom:10},progress:{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8},progressBar:{height:7,borderRadius:99},
  stepCard:{background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,padding:22},stepTitle:{fontSize:22,margin:0,color:'#0f172a'},choice:{width:'100%',display:'grid',placeItems:'center',gap:8,padding:'22px 16px',background:'#fff',border:'2px solid #dbe3ee',borderRadius:18,cursor:'pointer',color:'#0f172a'},choiceIcon:{width:58,height:58,display:'grid',placeItems:'center',borderRadius:16},
  sectionTitle:{display:'flex',alignItems:'center',gap:8,fontWeight:900,color:'#334155'},radioGroup:{display:'grid',gap:8},radio:{display:'grid',gridTemplateColumns:'24px auto 1fr',gap:9,alignItems:'center',textAlign:'left',border:0,background:'transparent',padding:'7px 0',cursor:'pointer',color:'#334155'},radioGroupSmall:{fontSize:12},dot:{width:18,height:18,border:'2px solid',borderRadius:'50%',display:'grid',placeItems:'center'},dotInner:{width:8,height:8,borderRadius:'50%',background:'#2563eb'},
  formGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:13},label:{fontSize:13,fontWeight:800,color:'#334155'},input:{width:'100%',boxSizing:'border-box',marginTop:6,padding:'11px 12px',border:'1px solid #cbd5e1',borderRadius:10,background:'#fff',fontSize:14},batteryCard:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,padding:16,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:14},batteryCardItem:{display:'grid'},
  previewLine:{display:'flex',justifyContent:'space-between',gap:15,flexWrap:'wrap',padding:14,borderRadius:12,background:'#f1f5f9',color:'#334155'},actions:{display:'flex',gap:10,marginTop:16},primary:{flex:1,display:'inline-flex',justifyContent:'center',alignItems:'center',gap:8,border:0,borderRadius:11,padding:'13px 18px',background:'#2563eb',color:'#fff',fontWeight:900,cursor:'pointer'},secondary:{minWidth:140,border:'1px solid #cbd5e1',borderRadius:11,padding:'13px 18px',background:'#fff',fontWeight:900,color:'#334155',cursor:'pointer'},
  resultCard:{background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,padding:22},resultRow:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,border:'1px solid',borderRadius:13,padding:'13px 15px',marginBottom:9,color:'#0f172a'},resultLabel:{display:'inline-flex',alignItems:'center',gap:9,color:'#475569',fontWeight:800},note:{marginTop:16,padding:14,background:'#f8fafc',borderRadius:12,color:'#64748b',fontSize:12,lineHeight:1.55}
};
