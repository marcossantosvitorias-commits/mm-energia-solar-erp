import React, { useMemo, useState } from 'react';
import { Calculator, Copy, Check } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import './BelCredSimuladorPage.css';

const BASE_REFERENCIA = 16383.49;

const planos = [
  { parcelas: 24, taxa: 1.91, parcelaBase: 978.29 },
  { parcelas: 30, taxa: 1.97, parcelaBase: 833.22 },
  { parcelas: 36, taxa: 2.02, parcelaBase: 739.04 },
  { parcelas: 48, taxa: 2.06, parcelaBase: 621.09 },
  { parcelas: 60, taxa: 2.10, parcelaBase: 555.84 },
  { parcelas: 72, taxa: 2.19, parcelaBase: 524.95 },
  { parcelas: 84, taxa: 2.28, parcelaBase: 509.99 },
  { parcelas: 96, taxa: 2.32, parcelaBase: 496.62 },
];

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function lerMoeda(valor) {
  const apenasNumeros = String(valor).replace(/\D/g, '');
  return Number(apenasNumeros || 0) / 100;
}

function exibirCampo(valor) {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function BelCredSimuladorPage() {
  const [valor, setValor] = useState(16383.49);
  const [copiado, setCopiado] = useState(false);

  const simulacoes = useMemo(
    () =>
      planos.map((plano) => {
        const parcela = (valor / BASE_REFERENCIA) * plano.parcelaBase;
        return {
          ...plano,
          parcela,
          total: parcela * plano.parcelas,
        };
      }),
    [valor],
  );

  async function copiarSimulacao() {
    const texto = [
      `Simulação BelCred para ${moeda.format(valor)}`,
      '',
      ...simulacoes.map(
        ({ parcelas, parcela, taxa }) =>
          `${parcelas}x de ${moeda.format(parcela)} (${taxa.toFixed(2).replace('.', ',')}% a.m.)`,
      ),
      '',
      'Valores estimados, sujeitos à aprovação e às condições da financeira.',
    ].join('\n');

    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <FinanceLayout
      title="Simulador BelCred"
      subtitle="Calcule as parcelas do financiamento para apresentar ao cliente."
      theme="empresa"
    >
      <section className="belcred-hero">
        <div className="belcred-logo">
          <img src="/belcred-logo.svg" alt="BelCred" />
        </div>

        <div className="belcred-value">
          <label htmlFor="valor-financiado">Valor a financiar</label>
          <div className="belcred-money-input">
            <span>R$</span>
            <input
              id="valor-financiado"
              inputMode="decimal"
              value={exibirCampo(valor)}
              onChange={(event) => setValor(lerMoeda(event.target.value))}
              aria-label="Valor a financiar"
            />
          </div>
          <small>Digite o valor total do projeto.</small>
        </div>
      </section>

      <section className="finance-panel belcred-results">
        <div className="finance-panel-header">
          <div>
            <h2>Opções de financiamento</h2>
            <p>Parcelas calculadas para {moeda.format(valor)}</p>
          </div>
          <button
            type="button"
            className="belcred-copy"
            onClick={copiarSimulacao}
            disabled={!valor}
          >
            {copiado ? <Check size={17} /> : <Copy size={17} />}
            {copiado ? 'Copiado' : 'Copiar simulação'}
          </button>
        </div>

        {valor > 0 ? (
          <div className="belcred-grid">
            {simulacoes.map(({ parcelas, taxa, parcela, total }) => (
              <article className="belcred-option" key={parcelas}>
                <div className="belcred-term">
                  <span>{parcelas}x</span>
                  <small>{taxa.toFixed(2).replace('.', ',')}% a.m.</small>
                </div>
                <div className="belcred-installment">
                  <small>Parcela estimada</small>
                  <strong>{moeda.format(parcela)}</strong>
                  <span>Total: {moeda.format(total)}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="belcred-empty">
            <Calculator size={28} />
            <p>Informe um valor para calcular as parcelas.</p>
          </div>
        )}
      </section>

      <aside className="belcred-note">
        <strong>Importante:</strong> cálculo estimado com base nas condições da
        simulação BelCred de {moeda.format(BASE_REFERENCIA)}. Os valores finais
        podem variar após análise de crédito, tarifas e arredondamentos da financeira.
      </aside>
    </FinanceLayout>
  );
}

export default BelCredSimuladorPage;
