import React, { useMemo, useState } from 'react';
import { AlertTriangle, BatteryCharging, Calculator, CheckCircle2, Zap } from 'lucide-react';
import ProposalGenerator from './ProposalGenerator.jsx';
import HybridCalculatorWizard from '../components/solar/HybridCalculatorWizard.jsx';

const moeda = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });
const numero = v => Number(v || 0);
const percentual = v => numero(v) / 100;

const CATALOGO = {
  modulo: { nome:'NPlus bifacial 620 W', potenciaW:620, custoUnitario:496 },
  inversor: { nome:'Inversor SAJ monofásico híbrido 7,5 kW H2 220 V 2 MPPT', potenciaKw:7.5, custoUnitario:4999.11 },
  baterias: {
    'saj-b3-5': { nome:'Bateria SAJ B3-5.0KWH-LV 48 V, 100 Ah, 5 kWh', capacidadeKwh:5, custoUnitario:7999.80 },
  },
  fornecedor:'Soollar Distribuidora - CD Jundiaí/SP',
  referencia:'Cotação informada em 28/07/2026',
};

const FORM_PADRAO = { materialEletrico:600, maoDeObra:1000, engenharia:1000, instalacoesMes:4, trt:68, combustivel:100, outros:0, imposto:4, comissao:0, margem:25, desconto:3 };

export function HybridKitsContent() {
  const [dimensionamento, setDimensionamento] = useState(null);
  const [form, setForm] = useState(FORM_PADRAO);
  const atualizar = e => { const {name,value}=e.target; setForm(a=>({...a,[name]:value})); };

  const kit = useMemo(() => {
    const placas = dimensionamento?.moduleCount || 8;
    const potenciaPlaca = dimensionamento?.panelPowerW || 620;
    const potenciaSistema = dimensionamento?.totalModuleKw || (placas * potenciaPlaca / 1000);
    const bateriaCatalogo = dimensionamento ? CATALOGO.baterias[dimensionamento.battery?.id] : CATALOGO.baterias['saj-b3-5'];
    const quantidadeBaterias = dimensionamento?.batteryCount || 1;
    const custoPaineis = placas * CATALOGO.modulo.custoUnitario;
    const custoInversor = CATALOGO.inversor.custoUnitario;
    const custoBateria = bateriaCatalogo ? quantidadeBaterias * bateriaCatalogo.custoUnitario : 0;
    const custoEquipamentos = custoPaineis + custoInversor + custoBateria;
    const inversorAdequado = !dimensionamento || dimensionamento.minInverterKw <= CATALOGO.inversor.potenciaKw;
    return { placas,potenciaPlaca,potenciaSistema,quantidadeBaterias,custoPaineis,custoInversor,custoBateria,custoEquipamentos,bateriaCatalogo,inversorAdequado };
  }, [dimensionamento]);

  const resultado = useMemo(() => {
    const rateioEngenharia = numero(form.engenharia) / Math.max(1,numero(form.instalacoesMes));
    const custosInstalacao = numero(form.materialEletrico)+numero(form.maoDeObra)+rateioEngenharia+numero(form.trt)+numero(form.combustivel)+numero(form.outros);
    const custoTotal = kit.custoEquipamentos + custosInstalacao;
    const divisor = 1-percentual(form.imposto)-percentual(form.comissao)-percentual(form.margem);
    const precoVenda = kit.bateriaCatalogo && divisor > 0 ? custoTotal/divisor : 0;
    const imposto = precoVenda*percentual(form.imposto);
    const comissao = precoVenda*percentual(form.comissao);
    const lucro = precoVenda-custoTotal-imposto-comissao;
    const precoComDesconto = precoVenda*(1-percentual(form.desconto));
    return {rateioEngenharia,custosInstalacao,custoTotal,precoVenda,imposto,comissao,lucro,precoComDesconto};
  }, [form,kit]);

  const descricaoBateria = kit.bateriaCatalogo ? `${kit.quantidadeBaterias}x ${kit.bateriaCatalogo.nome}` : `${kit.quantidadeBaterias}x ${dimensionamento?.battery?.brand || ''} ${dimensionamento?.battery?.model || ''}`;
  const descricaoInversor = `${CATALOGO.inversor.nome} + ${descricaoBateria}`;

  return <div className="hybrid-kits-content">
    <HybridCalculatorWizard onResult={setDimensionamento} />

    {dimensionamento && <section className="finance-panel" style={{marginBottom:18,borderColor:'#86efac',background:'#f0fdf4'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,fontWeight:900,color:'#166534'}}><CheckCircle2 size={20}/> Kit montado automaticamente pelo dimensionamento</div>
      <p style={{margin:'8px 0 0',color:'#166534'}}>{kit.placas} módulos · {kit.potenciaSistema.toFixed(2).replace('.',',')} kWp · {kit.quantidadeBaterias} bateria(s) · inversor mínimo {dimensionamento.minInverterKw.toFixed(2).replace('.',',')} kW.</p>
    </section>}

    {!kit.inversorAdequado && <section className="finance-panel" style={{marginBottom:18,borderColor:'#fdba74',background:'#fff7ed'}}><div style={{display:'flex',gap:9,alignItems:'center',color:'#9a3412',fontWeight:900}}><AlertTriangle size={19}/> O inversor cadastrado de 7,5 kW é menor que o mínimo calculado de {dimensionamento.minInverterKw.toFixed(2).replace('.',',')} kW. Cadastre um inversor híbrido maior antes de fechar a proposta.</div></section>}
    {!kit.bateriaCatalogo && <section className="finance-panel" style={{marginBottom:18,borderColor:'#fdba74',background:'#fff7ed'}}><div style={{display:'flex',gap:9,alignItems:'center',color:'#9a3412',fontWeight:900}}><AlertTriangle size={19}/> A bateria escolhida ainda não possui preço cadastrado. O dimensionamento foi mantido, mas o preço final fica bloqueado até cadastrar o custo desse modelo.</div></section>}

    <section className="finance-two-columns">
      <article className="finance-panel">
        <div className="finance-panel-header"><div><h2>Kit híbrido dimensionado</h2><p>{CATALOGO.fornecedor}</p></div><div className="belenus-power"><Zap size={16}/>{kit.potenciaSistema.toFixed(2).replace('.',',')} kWp</div></div>
        <div className="finance-list-item"><div><strong>Módulos</strong><span>{kit.placas}x {CATALOGO.modulo.nome}</span></div><strong>{moeda.format(kit.custoPaineis)}</strong></div>
        <div className="finance-list-item"><div><strong>Inversor híbrido</strong><span>{CATALOGO.inversor.nome}</span></div><strong>{moeda.format(kit.custoInversor)}</strong></div>
        <div className="finance-list-item"><div><strong>Bateria de lítio</strong><span>{descricaoBateria}</span></div><strong>{kit.bateriaCatalogo ? moeda.format(kit.custoBateria) : 'Preço não cadastrado'}</strong></div>
        <div className="pricing-highlight"><span>Custo dos equipamentos</span><strong>{kit.bateriaCatalogo ? moeda.format(kit.custoEquipamentos) : 'Aguardando bateria'}</strong></div>
        <p style={{color:'#667085',fontSize:13}}>{CATALOGO.referencia}. Confirmar estoque, frete e compatibilidade técnica antes da compra.</p>
      </article>

      <article className="finance-panel"><h2>Instalação, impostos e margem</h2><div className="finance-form">
        <Campo label="Material elétrico" name="materialEletrico" value={form.materialEletrico} onChange={atualizar}/><Campo label="Mão de obra" name="maoDeObra" value={form.maoDeObra} onChange={atualizar}/><Campo label="Engenharia" name="engenharia" value={form.engenharia} onChange={atualizar}/><Campo label="Instalações previstas no mês" name="instalacoesMes" value={form.instalacoesMes} onChange={atualizar}/>
        <div className="belenus-engineering-share"><span>Engenharia rateada neste projeto</span><strong>{moeda.format(resultado.rateioEngenharia)}</strong></div>
        <Campo label="TRT" name="trt" value={form.trt} onChange={atualizar}/><Campo label="Combustível" name="combustivel" value={form.combustivel} onChange={atualizar}/><Campo label="Outros custos" name="outros" value={form.outros} onChange={atualizar}/><Campo label="Imposto (%)" name="imposto" value={form.imposto} onChange={atualizar}/><Campo label="Comissão (%)" name="comissao" value={form.comissao} onChange={atualizar}/><Campo label="Margem líquida desejada (%)" name="margem" value={form.margem} onChange={atualizar}/><Campo label="Desconto máximo (%)" name="desconto" value={form.desconto} onChange={atualizar}/>
      </div></article>
    </section>

    <section className="belenus-summary"><article><span>Equipamentos</span><strong>{kit.bateriaCatalogo ? moeda.format(kit.custoEquipamentos) : '—'}</strong></article><article><span>Instalação e adicionais</span><strong>{moeda.format(resultado.custosInstalacao)}</strong></article><article><span>Custo total</span><strong>{kit.bateriaCatalogo ? moeda.format(resultado.custoTotal) : '—'}</strong></article><article className="profit"><span>Lucro líquido</span><strong>{kit.bateriaCatalogo ? moeda.format(resultado.lucro) : '—'}</strong></article></section>

    <section className="belenus-final-price"><div><span>Preço recomendado ao cliente</span><strong>{kit.bateriaCatalogo ? moeda.format(resultado.precoVenda) : 'Cadastre o preço da bateria'}</strong>{kit.bateriaCatalogo && <small>Imposto {moeda.format(resultado.imposto)} · margem {form.margem}%</small>}</div><div className="belenus-final-actions"><div><span>Com desconto máximo</span><strong>{kit.bateriaCatalogo ? moeda.format(resultado.precoComDesconto) : '—'}</strong></div><div style={{display:'flex',alignItems:'center',gap:8,color:'#0b2b52',fontWeight:700}}><BatteryCharging size={20}/> Armazenamento: {dimensionamento ? dimensionamento.totalBatteryKwh.toFixed(1).replace('.',',') : '5,0'} kWh</div><div style={{display:'flex',alignItems:'center',gap:8,color:'#0b2b52',fontWeight:700}}><Calculator size={20}/> Quantidades automáticas</div></div></section>

    {kit.bateriaCatalogo && <ProposalGenerator key={`${kit.placas}-${kit.quantidadeBaterias}-${resultado.precoVenda.toFixed(2)}`} quantidadePlacas={kit.placas} precoRecomendado={resultado.precoVenda} modulo={CATALOGO.modulo.nome} inversor={descricaoInversor} potenciaSistemaKw={kit.potenciaSistema}/>} 
  </div>;
}

function Campo({label,...props}){return <label className="finance-field"><span>{label}</span><input type="number" step="0.01" {...props}/></label>}
export default HybridKitsContent;
