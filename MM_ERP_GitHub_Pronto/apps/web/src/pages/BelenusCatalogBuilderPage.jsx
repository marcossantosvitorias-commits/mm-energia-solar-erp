import React, { useMemo, useState } from 'react';
import { CheckCircle2, PackagePlus, Search, Send, ShoppingCart, Trash2 } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { belenusPricingService } from '../services/belenusPricingService.js';

const moeda = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });
const numero = (v) => Number(v || 0);

export default function BelenusCatalogBuilderPage(){
  const [busca,setBusca]=useState('');
  const [categoria,setCategoria]=useState('');
  const [itens,setItens]=useState([]);
  const [frete,setFrete]=useState(0);
  const [nome,setNome]=useState('');
  const [salvando,setSalvando]=useState(false);
  const [mensagem,setMensagem]=useState('');

  const categorias=useMemo(()=>belenusPricingService.getCatalogCategories(),[]);
  const catalogo=useMemo(()=>belenusPricingService.listCatalog({category:categoria,search:busca}),[categoria,busca]);

  const adicionar=(item)=>{
    setMensagem('');
    setItens(atual=>{
      const existente=atual.find(x=>x.sku===item.sku);
      if(existente) return atual.map(x=>x.sku===item.sku?{...x,quantidade:x.quantidade+1}:x);
      return [...atual,{...item,quantidade:1}];
    });
  };

  const alterarQtd=(sku,quantidade)=>setItens(atual=>atual.map(x=>x.sku===sku?{...x,quantidade:Math.max(0,numero(quantidade))}:x).filter(x=>x.quantidade>0));
  const remover=(sku)=>setItens(atual=>atual.filter(x=>x.sku!==sku));

  const resumo=useMemo(()=>{
    const produtos=itens.reduce((s,x)=>s+(x.price*x.quantidade),0);
    const total=produtos+numero(frete);
    const modulos=itens.filter(x=>x.category==='Módulo');
    const inversores=itens.filter(x=>['Microinversor','Inversor on-grid'].includes(x.category));
    const placas=modulos.reduce((s,x)=>s+x.quantidade,0);
    const potencia=modulos.reduce((s,x)=>s+((numero(x.powerW)*x.quantidade)/1000),0);
    const invQtd=inversores.reduce((s,x)=>s+x.quantidade,0);
    return {produtos,total,placas,potencia,invQtd,modulo:modulos.map(x=>`${x.brand} ${x.model}`).join(' + '),inversor:inversores.map(x=>`${x.quantidade}x ${x.brand} ${x.model}`).join(' + ')};
  },[itens,frete]);

  async function enviar(){
    if(!itens.length){setMensagem('Adicione pelo menos um item ao cálculo.');return;}
    if(!resumo.placas){setMensagem('Para enviar como kit solar, adicione pelo menos um módulo fotovoltaico.');return;}
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
      setNome('');
    }catch(e){setMensagem(`Erro ao enviar: ${e.message}`);}finally{setSalvando(false);}
  }

  return <FinanceLayout title="Cotações Belenus" subtitle="Acervo Belenus com 12% de desconto. Monte qualquer kit e envie para Preços dos kits.">
    <div className="belenus-lab">
      <section className="finance-panel belenus-lab-hero">
        <div><span className="belenus-chip">PREÇOS COM 12% DE DESCONTO</span><h2>Acervo de produtos Belenus</h2><p>Use esta página para consultar custo, montar combinações e criar kits que ainda não existem na tabela comercial.</p></div>
        <div className="belenus-hero-number"><small>Itens no acervo</small><strong>{belenusPricingService.listCatalog().length}</strong></div>
      </section>

      {mensagem&&<div className="finance-notice">{mensagem}</div>}

      <section className="finance-panel">
        <div className="belenus-tools">
          <label className="belenus-search"><Search size={17}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar marca, modelo ou código..."/></label>
          <select value={categoria} onChange={e=>setCategoria(e.target.value)}><option value="">Todas as categorias</option>{categorias.map(c=><option key={c}>{c}</option>)}</select>
        </div>
        <div className="belenus-catalog-grid">
          {catalogo.map(item=><article className="belenus-product-card" key={item.sku}>
            <div><small>{item.category}</small><h3>{item.brand}</h3><p>{item.model}</p><code>{item.sku}</code></div>
            <div className="belenus-price"><span>Preço Belenus (-12%)</span><strong>{moeda.format(item.price)}</strong><small>Tabela: {moeda.format(item.tablePrice)}</small></div>
            <button type="button" onClick={()=>adicionar(item)}><PackagePlus size={16}/> Adicionar ao cálculo</button>
          </article>)}
        </div>
      </section>

      <section className="finance-panel belenus-builder">
        <div className="finance-panel-header"><div><h2><ShoppingCart size={20}/> Montar nova cotação</h2><p>Exemplo: adicione o módulo 5 vezes, escolha o inversor e os materiais necessários.</p></div></div>
        {!itens.length?<div className="finance-empty">Nenhum item adicionado. Escolha os produtos acima.</div>:<div className="belenus-cart-list">
          {itens.map(item=><div className="belenus-cart-row" key={item.sku}>
            <div><strong>{item.brand} · {item.model}</strong><small>{item.sku} · {moeda.format(item.price)} por {item.unit||'UN'}</small></div>
            <input type="number" min="1" step="1" value={item.quantidade} onChange={e=>alterarQtd(item.sku,e.target.value)}/>
            <strong>{moeda.format(item.price*item.quantidade)}</strong>
            <button type="button" className="icon-danger" onClick={()=>remover(item.sku)} title="Remover"><Trash2 size={16}/></button>
          </div>)}
        </div>}

        <div className="belenus-builder-fields">
          <label><span>Nome do kit</span><input value={nome} onChange={e=>setNome(e.target.value)} placeholder={resumo.placas?`${resumo.placas} placas - Belenus`: 'Ex.: 5 placas microinversor'}/></label>
          <label><span>Frete</span><input type="number" min="0" step="0.01" value={frete} onChange={e=>setFrete(e.target.value)}/></label>
        </div>

        <div className="belenus-summary-grid">
          <div><span>Módulos</span><strong>{resumo.placas}</strong></div>
          <div><span>Potência</span><strong>{resumo.potencia.toFixed(2).replace('.',',')} kWp</strong></div>
          <div><span>Produtos</span><strong>{moeda.format(resumo.produtos)}</strong></div>
          <div className="total"><span>Total + frete</span><strong>{moeda.format(resumo.total)}</strong></div>
        </div>

        <button type="button" className="belenus-send" disabled={salvando||!itens.length} onClick={enviar}>{salvando?<><CheckCircle2 size={18}/> Enviando...</>:<><Send size={18}/> Enviar para Preços dos kits</>}</button>
      </section>
    </div>

    <style>{`
      .belenus-lab{display:grid;gap:18px}.belenus-lab-hero{display:flex;justify-content:space-between;gap:20px;align-items:center;background:linear-gradient(135deg,#0f2c52,#1c4f8a);color:#fff}.belenus-lab-hero h2{color:#fff;margin:8px 0 5px}.belenus-lab-hero p{margin:0;color:#dbeafe}.belenus-chip{display:inline-flex;padding:7px 10px;border-radius:999px;background:#f5d34d;color:#0f2c52;font-size:11px;font-weight:900}.belenus-hero-number{min-width:140px;padding:16px;border-radius:18px;background:#ffffff14;border:1px solid #ffffff25;text-align:center}.belenus-hero-number small{display:block;color:#dbeafe}.belenus-hero-number strong{display:block;font-size:34px;margin-top:4px}.belenus-tools{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:12px;margin-bottom:16px}.belenus-search{display:flex;align-items:center;gap:8px;border:1px solid #dbe3ee;border-radius:12px;padding:0 12px;background:#fff}.belenus-search input{border:0!important;box-shadow:none!important;width:100%;padding:12px 4px!important}.belenus-tools select{border:1px solid #dbe3ee;border-radius:12px;padding:12px;background:#fff}.belenus-catalog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}.belenus-product-card{border:1px solid #e2e8f0;border-radius:18px;padding:15px;display:grid;gap:13px;background:#fff}.belenus-product-card h3{margin:3px 0;color:#0f2c52}.belenus-product-card p{margin:0;color:#64748b;min-height:42px}.belenus-product-card code{font-size:10px;color:#64748b}.belenus-price{padding:11px;border-radius:12px;background:#f0fdf4;display:grid;gap:2px}.belenus-price span,.belenus-price small{font-size:11px;color:#64748b}.belenus-price strong{font-size:20px;color:#166534}.belenus-product-card button,.belenus-send{display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:11px;padding:11px 13px;font-weight:900;cursor:pointer}.belenus-product-card button{background:#eef5ff;color:#174e87}.belenus-builder h2{display:flex;align-items:center;gap:7px}.belenus-cart-list{display:grid;gap:8px}.belenus-cart-row{display:grid;grid-template-columns:minmax(0,1fr) 80px 130px 40px;gap:10px;align-items:center;padding:12px;border:1px solid #e2e8f0;border-radius:13px}.belenus-cart-row small{display:block;color:#64748b;margin-top:3px}.belenus-cart-row input{width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:9px}.icon-danger{border:0;background:#fff1f2;color:#be123c;border-radius:9px;width:38px;height:38px;display:grid;place-items:center}.belenus-builder-fields{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:12px;margin-top:14px}.belenus-builder-fields label{display:grid;gap:5px;font-size:12px;font-weight:800;color:#475569}.belenus-builder-fields input{padding:11px;border:1px solid #cbd5e1;border-radius:10px}.belenus-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.belenus-summary-grid div{padding:13px;border-radius:13px;background:#f8fafc;border:1px solid #e2e8f0;display:grid;gap:3px}.belenus-summary-grid span{font-size:11px;color:#64748b}.belenus-summary-grid strong{font-size:18px;color:#0f2c52}.belenus-summary-grid .total{background:#fff8db;border-color:#f2dc82}.belenus-send{margin-top:14px;margin-left:auto;background:linear-gradient(135deg,#e8bd26,#f3d66a);color:#0f2c52;padding:13px 18px}.belenus-send:disabled{opacity:.5;cursor:not-allowed}@media(max-width:700px){.belenus-lab-hero{align-items:flex-start;flex-direction:column}.belenus-hero-number{width:100%;box-sizing:border-box}.belenus-tools{grid-template-columns:1fr}.belenus-catalog-grid{grid-template-columns:1fr}.belenus-cart-row{grid-template-columns:minmax(0,1fr) 62px 36px}.belenus-cart-row>strong{grid-column:1/3}.belenus-builder-fields{grid-template-columns:1fr}.belenus-summary-grid{grid-template-columns:repeat(2,1fr)}.belenus-send{width:100%;margin-left:0}}
    `}</style>
  </FinanceLayout>;
}
