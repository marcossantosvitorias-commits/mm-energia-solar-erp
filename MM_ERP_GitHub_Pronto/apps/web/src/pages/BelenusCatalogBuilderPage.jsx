import React, { useMemo, useState } from 'react';
import {
  BatteryCharging,
  Cable,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircuitBoard,
  Grid2X2,
  PackagePlus,
  Search,
  Send,
  Settings2,
  ShoppingCart,
  Trash2,
  Zap,
} from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { belenusPricingService } from '../services/belenusPricingService.js';

const moeda = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });
const numero = (v) => Number(v || 0);

const STEPS = [
  { id:'paineis', title:'Painéis', subtitle:'Escolha o módulo fotovoltaico', icon:Grid2X2 },
  { id:'inversor', title:'Inversor ou microinversor', subtitle:'Escolha o equipamento de conversão', icon:Zap },
  { id:'estrutura', title:'Estrutura', subtitle:'Perfis, grampos, hastes e suportes', icon:Settings2 },
  { id:'cabos', title:'Cabos', subtitle:'Cabos solares e cabeamento', icon:Cable },
  { id:'eletrico', title:'Elétrico', subtitle:'Conectores, DPS, medidores e proteções', icon:CircuitBoard },
];

function belongsToStep(item, step){
  const category=String(item.category||'').toLowerCase();
  const text=`${item.category} ${item.brand} ${item.model} ${item.sku}`.toLowerCase();
  if(step==='paineis') return category==='módulo';
  if(step==='inversor') return ['microinversor','inversor on-grid','inversor híbrido'].includes(category);
  if(step==='estrutura') return category==='estrutura';
  if(step==='cabos') return text.includes('cabo');
  if(step==='eletrico') return !text.includes('cabo') && ['componente elétrico','medidor','rsd'].includes(category);
  return false;
}

export default function BelenusCatalogBuilderPage(){
  const [placasDesejadas,setPlacasDesejadas]=useState(5);
  const [busca,setBusca]=useState('');
  const [etapaAberta,setEtapaAberta]=useState('paineis');
  const [itens,setItens]=useState([]);
  const [frete,setFrete]=useState(0);
  const [nome,setNome]=useState('');
  const [salvando,setSalvando]=useState(false);
  const [mensagem,setMensagem]=useState('');

  const catalogoCompleto=useMemo(()=>belenusPricingService.listCatalog(),[]);
  const catalogoEtapa=useMemo(()=>{
    const termo=busca.trim().toLowerCase();
    return catalogoCompleto
      .filter(item=>belongsToStep(item,etapaAberta))
      .filter(item=>!termo||`${item.brand} ${item.model} ${item.sku}`.toLowerCase().includes(termo));
  },[catalogoCompleto,etapaAberta,busca]);

  const adicionar=(item)=>{
    setMensagem('');
    setItens(atual=>{
      const existente=atual.find(x=>x.sku===item.sku);
      if(existente) return atual;
      const quantidade=item.category==='Módulo'?Math.max(1,numero(placasDesejadas)):1;
      return [...atual,{...item,quantidade}];
    });
    if(item.category==='Módulo') setEtapaAberta('inversor');
  };

  const alterarQtd=(sku,quantidade)=>setItens(atual=>atual.map(x=>x.sku===sku?{...x,quantidade:Math.max(1,numero(quantidade))}:x));
  const remover=(sku)=>setItens(atual=>atual.filter(x=>x.sku!==sku));

  const resumo=useMemo(()=>{
    const produtos=itens.reduce((s,x)=>s+(x.price*x.quantidade),0);
    const total=produtos+numero(frete);
    const modulos=itens.filter(x=>x.category==='Módulo');
    const inversores=itens.filter(x=>['Microinversor','Inversor on-grid','Inversor híbrido'].includes(x.category));
    const placas=modulos.reduce((s,x)=>s+x.quantidade,0);
    const potencia=modulos.reduce((s,x)=>s+((numero(x.powerW)*x.quantidade)/1000),0);
    const invQtd=inversores.reduce((s,x)=>s+x.quantidade,0);
    return {
      produtos,total,placas,potencia,invQtd,
      modulo:modulos.map(x=>`${x.brand} ${x.model}`).join(' + '),
      inversor:inversores.map(x=>`${x.quantidade}x ${x.brand} ${x.model}`).join(' + '),
    };
  },[itens,frete]);

  const selecionadosPorEtapa=(step)=>itens.filter(item=>belongsToStep(item,step));

  async function enviar(){
    if(!itens.length){setMensagem('Adicione os itens do kit antes de enviar.');return;}
    if(!resumo.placas){setMensagem('Escolha um painel antes de enviar o kit.');return;}
    setSalvando(true);setMensagem('');
    try{
      const salvo=await belenusPricingService.publishCatalogKit({
        name:nome||`${resumo.placas} placas - cálculo Belenus`,
        items:itens,
        freight:numero(frete),
        panelsCount:resumo.placas,
        systemPowerKwp:resumo.potencia,
        panelModel:resumo.modulo,
        invertersCount:resumo.invQtd,
        inverterModel:resumo.inversor,
        productsTotal:resumo.produtos,
        total:resumo.total,
      });
      setMensagem(`Kit enviado para Preços dos kits: ${salvo.quote_number}`);
    }catch(e){
      setMensagem(`Erro ao enviar: ${e.message}`);
    }finally{
      setSalvando(false);
    }
  }

  return <FinanceLayout title="Cotações Belenus" subtitle="Monte o kit por etapas com os preços Belenus já com 12% de desconto.">
    <div className="bel-builder-page">
      <section className="finance-panel bel-start-card">
        <span className="bel-discount-chip">BELENUS · 12% DE DESCONTO APLICADO</span>
        <h2>O que você quer montar?</h2>
        <p>Digite primeiro a quantidade de placas. Depois escolha os componentes nos botões abaixo.</p>
        <label className="bel-panels-input">
          <span>Quantidade de placas</span>
          <div><input type="number" min="1" step="1" value={placasDesejadas} onChange={e=>setPlacasDesejadas(Math.max(1,numero(e.target.value)))}/><strong>placas</strong></div>
        </label>
      </section>

      {mensagem&&<div className="finance-notice">{mensagem}</div>}

      <section className="bel-steps">
        {STEPS.map(step=>{
          const Icon=step.icon;
          const aberto=etapaAberta===step.id;
          const escolhidos=selecionadosPorEtapa(step.id);
          return <div className="bel-step" key={step.id}>
            <button type="button" className={`bel-step-button ${aberto?'active':''}`} onClick={()=>{setEtapaAberta(aberto?'':step.id);setBusca('');}}>
              <span className="bel-step-icon"><Icon size={22}/></span>
              <span className="bel-step-copy"><strong>{step.title}</strong><small>{step.subtitle}</small></span>
              {escolhidos.length>0&&<span className="bel-selected-count">{escolhidos.length} escolhido{escolhidos.length>1?'s':''}</span>}
              {aberto?<ChevronUp size={20}/>:<ChevronDown size={20}/>} 
            </button>

            {aberto&&<div className="bel-step-content">
              <label className="bel-search"><Search size={17}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder={`Buscar em ${step.title.toLowerCase()}...`}/></label>
              <div className="bel-products-list">
                {catalogoEtapa.map(item=>{
                  const selecionado=itens.some(x=>x.sku===item.sku);
                  return <article className={`bel-product-row ${selecionado?'selected':''}`} key={item.sku}>
                    <div className="bel-product-info">
                      <strong>{item.brand} · {item.model}</strong>
                      <small>{item.sku}</small>
                      <span>{moeda.format(item.price)} <em>com -12%</em></span>
                    </div>
                    <button type="button" disabled={selecionado} onClick={()=>adicionar(item)}>
                      {selecionado?<><CheckCircle2 size={16}/> Adicionado</>:<><PackagePlus size={16}/> Escolher</>}
                    </button>
                  </article>;
                })}
                {!catalogoEtapa.length&&<div className="finance-empty">Nenhum item encontrado nesta categoria.</div>}
              </div>
            </div>}
          </div>;
        })}
      </section>

      <section className="finance-panel bel-summary">
        <div className="finance-panel-header"><div><h2><ShoppingCart size={20}/> Kit montado</h2><p>Você pode ajustar a quantidade de qualquer item antes de enviar.</p></div></div>
        {!itens.length?<div className="finance-empty">Escolha os componentes nos botões acima.</div>:<div className="bel-cart-list">
          {itens.map(item=><div className="bel-cart-row" key={item.sku}>
            <div><strong>{item.brand} · {item.model}</strong><small>{moeda.format(item.price)} por {item.unit||'UN'}</small></div>
            <label><span>Qtd.</span><input type="number" min="1" step="1" value={item.quantidade} onChange={e=>alterarQtd(item.sku,e.target.value)}/></label>
            <strong>{moeda.format(item.price*item.quantidade)}</strong>
            <button type="button" className="icon-danger" onClick={()=>remover(item.sku)} title="Remover"><Trash2 size={16}/></button>
          </div>)}
        </div>}

        <div className="bel-fields">
          <label><span>Nome do kit</span><input value={nome} onChange={e=>setNome(e.target.value)} placeholder={`${resumo.placas||placasDesejadas} placas - Belenus`}/></label>
          <label><span>Frete</span><input type="number" min="0" step="0.01" value={frete} onChange={e=>setFrete(e.target.value)}/></label>
        </div>

        <div className="bel-total-grid">
          <div><span>Placas</span><strong>{resumo.placas}</strong></div>
          <div><span>Potência</span><strong>{resumo.potencia.toFixed(2).replace('.',',')} kWp</strong></div>
          <div><span>Produtos</span><strong>{moeda.format(resumo.produtos)}</strong></div>
          <div className="total"><span>Total + frete</span><strong>{moeda.format(resumo.total)}</strong></div>
        </div>

        <button type="button" className="bel-send" disabled={salvando||!itens.length} onClick={enviar}>
          {salvando?<><CheckCircle2 size={18}/> Enviando...</>:<><Send size={18}/> Enviar para Preços dos kits</>}
        </button>
      </section>
    </div>

    <style>{`
      .bel-builder-page{display:grid;gap:16px}.bel-start-card{background:linear-gradient(135deg,#0f2c52,#1b4f87);color:#fff}.bel-start-card h2{color:#fff;margin:10px 0 5px}.bel-start-card p{margin:0 0 18px;color:#dbeafe}.bel-discount-chip{display:inline-flex;padding:6px 10px;border-radius:999px;background:#f4d35e;color:#0f2c52;font-size:11px;font-weight:900}.bel-panels-input{display:grid;gap:7px;max-width:320px;font-weight:800}.bel-panels-input>div{display:flex;align-items:center;background:#fff;border-radius:14px;padding:5px 12px}.bel-panels-input input{min-width:0;width:100%;border:0!important;box-shadow:none!important;font-size:28px!important;font-weight:900;color:#0f2c52;padding:8px!important}.bel-panels-input strong{color:#64748b;white-space:nowrap}.bel-steps{display:grid;gap:10px}.bel-step{border:1px solid #dfe5ec;border-radius:18px;background:#fff;overflow:hidden}.bel-step-button{width:100%;display:flex;align-items:center;gap:12px;text-align:left;border:0;background:#fff;padding:16px;cursor:pointer;color:#0f2c52}.bel-step-button.active{background:#f8fbff}.bel-step-icon{width:44px;height:44px;border-radius:13px;background:#eef5ff;display:grid;place-items:center;color:#1c4f8a;flex:0 0 auto}.bel-step-copy{display:grid;gap:2px;flex:1}.bel-step-copy strong{font-size:17px}.bel-step-copy small{color:#64748b}.bel-selected-count{font-size:11px;font-weight:900;background:#dcfce7;color:#166534;border-radius:999px;padding:5px 8px}.bel-step-content{padding:0 14px 14px;border-top:1px solid #eef2f7}.bel-search{margin:14px 0 10px;display:flex;align-items:center;gap:8px;border:1px solid #dbe3ee;border-radius:12px;padding:0 12px}.bel-search input{width:100%;border:0!important;box-shadow:none!important;padding:11px 3px!important}.bel-products-list{display:grid;gap:8px}.bel-product-row{display:flex;align-items:center;gap:12px;border:1px solid #e2e8f0;border-radius:13px;padding:12px}.bel-product-row.selected{background:#f0fdf4;border-color:#bbf7d0}.bel-product-info{display:grid;gap:3px;flex:1;min-width:0}.bel-product-info strong{color:#0f2c52}.bel-product-info small{color:#64748b;font-size:10px}.bel-product-info span{font-weight:900;color:#166534}.bel-product-info em{font-style:normal;font-size:10px}.bel-product-row>button{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:10px;padding:10px 12px;background:#eef5ff;color:#1c4f8a;font-weight:900}.bel-product-row>button:disabled{background:#dcfce7;color:#166534}.bel-summary h2{display:flex;gap:7px;align-items:center}.bel-cart-list{display:grid;gap:8px}.bel-cart-row{display:grid;grid-template-columns:minmax(0,1fr) 85px 130px 40px;gap:10px;align-items:center;padding:11px;border:1px solid #e2e8f0;border-radius:13px}.bel-cart-row small{display:block;color:#64748b;margin-top:3px}.bel-cart-row label{display:grid;gap:3px;font-size:10px;color:#64748b}.bel-cart-row input{width:100%;box-sizing:border-box;padding:8px;border:1px solid #cbd5e1;border-radius:8px}.icon-danger{border:0;background:#fff1f2;color:#be123c;border-radius:9px;width:38px;height:38px;display:grid;place-items:center}.bel-fields{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:12px;margin-top:14px}.bel-fields label{display:grid;gap:5px;font-size:12px;font-weight:800;color:#475569}.bel-fields input{padding:11px;border:1px solid #cbd5e1;border-radius:10px}.bel-total-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.bel-total-grid div{padding:13px;border-radius:13px;background:#f8fafc;border:1px solid #e2e8f0;display:grid;gap:3px}.bel-total-grid span{font-size:11px;color:#64748b}.bel-total-grid strong{font-size:18px;color:#0f2c52}.bel-total-grid .total{background:#fff8db;border-color:#f2dc82}.bel-send{margin-top:14px;margin-left:auto;display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:12px;padding:13px 18px;background:linear-gradient(135deg,#e8bd26,#f3d66a);color:#0f2c52;font-weight:900}.bel-send:disabled{opacity:.5}@media(max-width:700px){.bel-start-card{padding:16px!important}.bel-step-button{padding:14px}.bel-step-copy strong{font-size:16px}.bel-step-copy small{font-size:12px}.bel-selected-count{display:none}.bel-product-row{align-items:flex-start;flex-direction:column}.bel-product-row>button{width:100%;justify-content:center}.bel-cart-row{grid-template-columns:minmax(0,1fr) 72px 36px}.bel-cart-row>strong{grid-column:1/3}.bel-fields{grid-template-columns:1fr}.bel-total-grid{grid-template-columns:repeat(2,1fr)}.bel-send{width:100%;margin-left:0}}
    `}</style>
  </FinanceLayout>;
}
