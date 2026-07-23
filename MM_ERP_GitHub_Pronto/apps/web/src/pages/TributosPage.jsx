import React, { useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { formatarMoeda } from '../components/finance/storage.js';

const n = v => Number(v || 0); const p = v => n(v) / 100;
function TributosPage() {
  const [f, setF] = useState({ venda: 15000, compras: 10000, outrosCustos: 1000, simples: 4, ibsCbs: 26.5, creditoCompras: 26.5, percentualCreditavel: 100 });
  const atualizar = e => setF(x => ({ ...x, [e.target.name]: e.target.value }));
  const r = useMemo(() => {
    const impostoAtual = n(f.venda) * p(f.simples);
    const impostoBruto = n(f.venda) * p(f.ibsCbs);
    const baseCredito = n(f.compras) * p(f.percentualCreditavel);
    const credito = baseCredito * p(f.creditoCompras);
    const impostoLiquido = Math.max(0, impostoBruto - credito);
    const lucroAtual = n(f.venda) - n(f.compras) - n(f.outrosCustos) - impostoAtual;
    const lucroReforma = n(f.venda) - n(f.compras) - n(f.outrosCustos) - impostoLiquido;
    return { impostoAtual, impostoBruto, credito, impostoLiquido, liquidoSplit: n(f.venda) - impostoLiquido, lucroAtual, lucroReforma, impacto: lucroReforma - lucroAtual };
  }, [f]);
  return <FinanceLayout title="Simulador tributário" subtitle="Compare o modelo atual com IBS, CBS, créditos e split payment.">
    <section className="finance-panel"><h2>Dados da operação</h2><div className="finance-form">
      <label className="finance-field"><span>Valor da venda</span><input type="number" name="venda" value={f.venda} onChange={atualizar} /></label>
      <label className="finance-field"><span>Compras/equipamentos</span><input type="number" name="compras" value={f.compras} onChange={atualizar} /></label>
      <label className="finance-field"><span>Outros custos</span><input type="number" name="outrosCustos" value={f.outrosCustos} onChange={atualizar} /></label>
      <label className="finance-field"><span>Alíquota atual (%)</span><input type="number" step="0.01" name="simples" value={f.simples} onChange={atualizar} /></label>
      <label className="finance-field"><span>IBS + CBS estimado (%)</span><input type="number" step="0.01" name="ibsCbs" value={f.ibsCbs} onChange={atualizar} /></label>
      <label className="finance-field"><span>Crédito sobre compras (%)</span><input type="number" step="0.01" name="creditoCompras" value={f.creditoCompras} onChange={atualizar} /></label>
      <label className="finance-field"><span>Percentual das compras com crédito (%)</span><input type="number" step="0.01" name="percentualCreditavel" value={f.percentualCreditavel} onChange={atualizar} /></label>
    </div><div className="tax-warning">Simulação gerencial. Mantenha as alíquotas editáveis e confirme a regra aplicável com seu contador.</div></section>
    <section className="finance-grid">
      <StatCard label="Imposto atual" value={formatarMoeda(r.impostoAtual)} helper={`Alíquota de ${f.simples}%`} tone="negative" />
      <StatCard label="Crédito estimado" value={formatarMoeda(r.credito)} helper="Créditos das compras" tone="positive" />
      <StatCard label="Imposto líquido IBS/CBS" value={formatarMoeda(r.impostoLiquido)} helper="Após créditos" tone="warning" />
      <StatCard label="Líquido após split" value={formatarMoeda(r.liquidoSplit)} helper="Valor que entra na conta" tone="primary" />
    </section>
    <section className="finance-two-columns"><article className="finance-panel"><h2>Modelo atual</h2><div className="pricing-highlight"><span>Lucro estimado</span><strong>{formatarMoeda(r.lucroAtual)}</strong></div></article><article className="finance-panel"><h2>IBS + CBS</h2><div className="pricing-highlight"><span>Lucro estimado</span><strong>{formatarMoeda(r.lucroReforma)}</strong></div><div className="finance-list-item"><div><strong>Diferença entre cenários</strong><span>Reforma menos modelo atual</span></div><strong>{formatarMoeda(r.impacto)}</strong></div></article></section>
  </FinanceLayout>;
}
export default TributosPage;
