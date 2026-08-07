import React from 'react';
import { Link } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import './CotacoesBelenusPage.css';

export default function PrecosKitsPage() {
  return (
    <FinanceLayout
      title="Preços dos kits"
      subtitle="Escolha o tipo de sistema para calcular e gerar a proposta."
      theme="empresa"
    >
      <div className="kits-pricing-page">
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
        .kit-choice-link{display:flex;flex-direction:column;gap:6px;padding:18px;border:1px solid #dfe5ec;border-radius:18px;background:#fff;color:#0b2b52;text-decoration:none;min-height:108px;justify-content:center}.kit-choice-link strong{font-size:22px}.kit-choice-link span{color:#6f7b8c;line-height:1.4}.kit-choice-link:active,.kit-choice-link:hover{border-color:#e2bf2f;background:#fff9df}.tax-mode-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}@media(max-width:700px){.tax-mode-grid{grid-template-columns:1fr}.kit-choice-link{min-height:96px;padding:16px}.kit-choice-link strong{font-size:20px}}
      `}</style>
    </FinanceLayout>
  );
}
