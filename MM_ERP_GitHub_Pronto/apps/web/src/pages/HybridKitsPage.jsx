import React, { useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import HybridPresetProposal from '../components/solar/HybridPresetProposal.jsx';
import HybridCalculatorWizard from '../components/solar/HybridCalculatorWizard.jsx';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const KITS_HIBRIDOS = [
  {
    placas: 33,
    potenciaPlaca: 620,
    potenciaSistema: 20.46,
    inversores: 2,
    inversor: 'SAJ híbrido 7,5 kW Mono 220V',
    valorVenda: 37656,
    rsd: 3200,
    referencia: 'Kit comercial MM Energia Solar',
  },
];

export function HybridKitsContent() {
  const [kitSelecionado, setKitSelecionado] = useState(KITS_HIBRIDOS[0]);

  return (
    <div className="hybrid-kits-content">
      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Escolha o kit híbrido</h2>
            <p>Mesmo padrão dos kits on-grid: escolha pela quantidade de placas e depois gere a proposta.</p>
          </div>
        </div>

        <div className="belenus-quotes">
          {KITS_HIBRIDOS.map((kit) => (
            <button
              type="button"
              key={`${kit.placas}-${kit.inversor}`}
              className={kitSelecionado.placas === kit.placas ? 'active' : ''}
              onClick={() => setKitSelecionado(kit)}
            >
              <div className="belenus-quote-top">
                <span>{kit.placas} placas</span>
                <small>{kit.potenciaSistema.toFixed(2).replace('.', ',')} kWp</small>
              </div>
              <strong>{moeda.format(kit.valorVenda)}</strong>
              <small>Preço de venda</small>
              <b>{kit.inversores}x {kit.inversor}</b>
            </button>
          ))}
        </div>

        <div className="finance-notice">
          Selecionado: {kitSelecionado.placas} placas TSUN 620W bifacial · {kitSelecionado.potenciaSistema.toFixed(2).replace('.', ',')} kWp · {kitSelecionado.inversores} inversores SAJ 7,5 kW · {moeda.format(kitSelecionado.valorVenda)}.
        </div>
      </section>

      <HybridPresetProposal />

      <details style={{ marginTop: 18 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800, color: '#0b2b52' }}>
          Ferramentas avançadas de dimensionamento
        </summary>
        <div style={{ marginTop: 14 }}>
          <HybridCalculatorWizard onResult={() => {}} />
        </div>
      </details>
    </div>
  );
}

export default function HybridKitsPage() {
  return (
    <FinanceLayout title="Kits híbridos" subtitle="Escolha o kit e gere a proposta comercial." theme="empresa">
      <HybridKitsContent />
    </FinanceLayout>
  );
}
