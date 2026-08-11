import React, { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { belenusPricingService } from '../services/belenusPricingService.js';
import './CotacoesBelenusPage.css';

const moeda = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });

export default function PrecosKitsPage() {
  const [kitsBelenus,setKitsBelenus]=useState([]);

  useEffect(()=>{
    let ativo=true;
    belenusPricingService.listPublishedCatalogKits()
      .then(data=>{if(ativo)setKitsBelenus(data||[]);})
      .catch(()=>{if(ativo)setKitsBelenus([]);});
    return()=>{ativo=false;};
  },[]);

  return (
    <FinanceLayout
      title="Preços dos kits"
      subtitle="Escolha o tipo de sistema para calcular e gerar a proposta."
      theme="empresa"
    >
      <div className="kits-pricing-page">
        {kitsBelenus.length>0&&<section className="finance-panel">
          <div className="finance-panel-header">
            <div>
              <h2>Kits enviados da Belenus</h2>
              <p>Cálculos aprovados no acervo Belenus usando preços com 12% de desconto.</p>
            </div>
            <Link className="finance-secondary-button" to="/app/precos/microinversor">Abrir precificação</Link>
          </div>
          <div className="published-kit-grid">
            {kitsBelenus.map(kit=><article className="published-kit-card" key={kit.id}>
              <span className="published-kit-badge"><BadgeCheck size={14}/> Belenus -12%</span>
              <strong>{kit.payload?.name||`${kit.placas} placas`}</strong>
              <small>{kit.placas} módulos · {Number(kit.potencia||0).toFixed(2).replace('.',',')} kWp</small>
              <div><span>Custo equipamentos + frete</span><b>{moeda.format(Number(kit.total||0))}</b></div>
              <Link to="/app/precos/microinversor">Calcular preço de venda <ArrowRight size={15}/></Link>
            </article>)}
          </div>
        </section>}

        <section className="finance-panel">
          <div className="finance-panel-header">
            <div>
              <h2>Kits on-grid</h2>
              <p>Escolha o tipo de inversor usado no sistema conectado à rede.</p>
            </div>
          </div>

          <div className="tax-mode-grid">
            <Link className="kit-choice-link" to="/app/precos/microinversor">
              <strong>Microinversor</strong>
              <span>Kits on-grid com microinversores e proposta específica</span>
            </Link>
            <Link className="kit-choice-link" to="/app/precos/inversor">
              <strong>Inversor</strong>
              <span>Kits on-grid com inversor string/central e proposta específica</span>
            </Link>
          </div>
        </section>

        <section className="finance-panel">
          <div className="finance-panel-header">
            <div>
              <h2>Híbridos + bateria</h2>
              <p>Sistemas com armazenamento de energia.</p>
            </div>
          </div>
          <Link className="finance-secondary-button" to="/app/precos/hibrido">Abrir kits híbridos</Link>
        </section>
      </div>

      <style>{`
        .kit-choice-link{display:flex;flex-direction:column;gap:6px;padding:18px;border:1px solid #dfe5ec;border-radius:18px;background:#fff;color:#0b2b52;text-decoration:none;min-height:108px;justify-content:center}.kit-choice-link strong{font-size:22px}.kit-choice-link span{color:#6f7b8c;line-height:1.4}.kit-choice-link:active,.kit-choice-link:hover{border-color:#e2bf2f;background:#fff9df}.tax-mode-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.published-kit-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.published-kit-card{display:grid;gap:8px;padding:15px;border-radius:16px;border:1px solid #dbe6f3;background:linear-gradient(180deg,#fff,#f8fbff)}.published-kit-card>strong{font-size:18px;color:#0f2c52}.published-kit-card>small{color:#64748b}.published-kit-card>div{display:grid;gap:3px;padding:10px;border-radius:11px;background:#f0fdf4}.published-kit-card>div span{font-size:11px;color:#64748b}.published-kit-card>div b{font-size:18px;color:#166534}.published-kit-card>a{display:flex;align-items:center;gap:6px;color:#1c4f8a;font-weight:800;text-decoration:none}.published-kit-badge{width:max-content;display:flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;background:#fff4bd;color:#725700;font-size:10px;font-weight:900}@media(max-width:700px){.tax-mode-grid{grid-template-columns:1fr}.kit-choice-link{min-height:96px;padding:16px}.kit-choice-link strong{font-size:20px}.published-kit-grid{grid-template-columns:1fr}}
      `}</style>
    </FinanceLayout>
  );
}
