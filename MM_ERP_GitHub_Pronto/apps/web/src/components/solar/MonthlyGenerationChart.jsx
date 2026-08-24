import React, { useMemo } from 'react';
import { jsPDF } from 'jspdf';
import './monthly-generation-chart.css';
import { buildMonthlyGeneration } from '../../lib/monthlyGeneration.js';

const proposalLogoImage = typeof Image !== 'undefined' ? new Image() : null;
if (proposalLogoImage) {
  proposalLogoImage.src = `${import.meta.env.BASE_URL}logo-mm.png`;
}

if (jsPDF?.API?.text && !jsPDF.API.__mmProposalLogoPatched) {
  const originalText = jsPDF.API.text;
  jsPDF.API.text = function patchedProposalHeaderText(text, x, y, options, transform) {
    if (text === 'MM ENERGIA SOLAR' && Number(x) === 12 && Number(y) === 18 && proposalLogoImage?.complete && proposalLogoImage.naturalWidth > 0) {
      try {
        const maxWidth = 42;
        const maxHeight = 14;
        const ratio = proposalLogoImage.naturalWidth / proposalLogoImage.naturalHeight;
        let width = maxWidth;
        let height = width / ratio;
        if (height > maxHeight) {
          height = maxHeight;
          width = height * ratio;
        }
        this.addImage(proposalLogoImage, 'PNG', 12, 6, width, height, undefined, 'NONE');
        return this;
      } catch {
        // Se o navegador ainda não conseguir usar a imagem, mantém o texto como fallback.
      }
    }
    return originalText.call(this, text, x, y, options, transform);
  };
  jsPDF.API.__mmProposalLogoPatched = true;
}

export { buildMonthlyGeneration } from '../../lib/monthlyGeneration.js';

export default function MonthlyGenerationChart({ monthlyAverage, consumption = 0, compact = false }) {
  const data = useMemo(() => buildMonthlyGeneration(monthlyAverage), [monthlyAverage]);
  const maxValue = Math.max(1, ...data.map((item) => item.generation), Number(consumption) || 0);
  const annual = data.reduce((sum, item) => sum + item.generation, 0);
  return <section className={`monthly-generation-chart${compact ? ' compact' : ''}`}>
    <div className="monthly-chart-heading"><div><strong>Geração estimada mês a mês</strong><span>Janeiro a dezembro · total anual de {annual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh</span></div>{Number(consumption) > 0 && <small>Linha de consumo: {Number(consumption).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kWh/mês</small>}</div>
    <div className="monthly-chart-area">
      {Number(consumption) > 0 && <div className="consumption-line" style={{ bottom: `${Math.min(100, (Number(consumption) / maxValue) * 100)}%` }}><span>Consumo</span></div>}
      {data.map((item) => <div className="monthly-bar-column" key={item.month}><span className="monthly-bar-value">{item.generation.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span><div className="monthly-bar-track"><div className="monthly-bar-fill" style={{ height: `${Math.max(3, (item.generation / maxValue) * 100)}%` }} /></div><strong>{item.month}</strong></div>)}
    </div>
  </section>;
}
