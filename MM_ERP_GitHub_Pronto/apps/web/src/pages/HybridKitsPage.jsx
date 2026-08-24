import React, { useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import HybridPresetProposal from '../components/solar/HybridPresetProposal.jsx';
import HybridCalculatorWizard from '../components/solar/HybridCalculatorWizard.jsx';

const QUANTIDADES_KITS = Array.from({ length: 19 }, (_, indice) => indice + 4);

const KITS_HIBRIDOS = [
  {
    placas: 33,
    potenciaPlaca: 620,
    potenciaSistema: 20.46,
    inversores: 2,
    inversor: 'SAJ híbrido 7,5 kW Mono 220V',
    valorVenda: 34876,
    rsd: 3200,
    referencia: 'Kit comercial MM Energia Solar',
  },
];

export function HybridKitsContent() {
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState(4);

  const kitSelecionado = useMemo(
    () => KITS_HIBRIDOS.find((kit) => kit.placas === quantidadeSelecionada) || null,
    [quantidadeSelecionada],
  );

  const potenciaSelecionada = quantidadeSelecionada * 620 / 1000;

  return (
    <div className="hybrid-kits-content">
      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Escolha o kit híbrido</h2>
            <p>Kits organizados de 4 até 22 placas. Os valores ficam ocultos e podem ser cadastrados depois.</p>
          </div>
        </div>

        <div className="belenus-quotes">
          {QUANTIDADES_KITS.map((quantidade) => {
            const kit = KITS_HIBRIDOS.find((item) => item.placas === quantidade);
            return (
              <button
                type="button"
                key={quantidade}
                className={quantidadeSelecionada === quantidade ? 'active' : ''}
                onClick={() => setQuantidadeSelecionada(quantidade)}
              >
                <div className="belenus-quote-top">
                  <span>{quantidade} placas</span>
                  <small>{(quantidade * 620 / 1000).toFixed(2).replace('.', ',')} kWp</small>
                </div>
                <b>{kit ? `${kit.inversores}x ${kit.inversor}` : 'Preço pendente'}</b>
              </button>
            );
          })}
        </div>

        <div className="finance-notice">
          Selecionado: {quantidadeSelecionada} placas · {potenciaSelecionada.toFixed(2).replace('.', ',')} kWp
          {kitSelecionado ? ` · ${kitSelecionado.inversores}x ${kitSelecionado.inversor}` : ' · preço ainda não cadastrado'}.
        </div>
      </section>

      <HybridPresetProposal quantidadePlacasInicial={quantidadeSelecionada} />

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
