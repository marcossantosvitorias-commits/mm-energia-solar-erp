import React, { useMemo } from 'react';
import './monthly-generation-chart.css';
import { buildMonthlyGeneration } from '../../lib/monthlyGeneration.js';

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
