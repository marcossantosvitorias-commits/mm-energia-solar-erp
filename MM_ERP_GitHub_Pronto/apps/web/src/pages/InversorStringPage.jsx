import React, { useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import ProposalGenerator from './ProposalGenerator.jsx';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (valor) => Number(valor || 0);
const percentual = (valor) => numero(valor) / 100;

const FORM_PADRAO = {
  placas: 6,
  potenciaPlaca: 620,
  custoEquipamentos: 5212.43,
  frete: 500,
  materialEletrico: 350,
  maoDeObra: 700,
  engenharia: 250,
  trt: 68,
  combustivel: 100,
  outros: 0,
  imposto: 4,
  comissao: 0,
  margem: 25,
};

export default function InversorStringPage() {
  const [form, setForm] = useState(FORM_PADRAO);
  const [formaPagamento, setFormaPagamento] = useState('avista');

  const resultado = useMemo(() => {
    const custoTotal = numero(form.custoEquipamentos) + numero(form.frete) + numero(form.materialEletrico)
      + numero(form.maoDeObra) + numero(form.engenharia) + numero(form.trt)
      + numero(form.combustivel) + numero(form.outros);
    const imposto = percentual(form.imposto);
    const comissao = percentual(form.comissao);
    const margem = percentual(form.margem);
    const divisor = 1 - imposto - comissao - margem;
    const precoVista = divisor > 0 ? custoTotal / divisor : 0;
    const precoCartao = precoVista / (1 - 0.1169);
    return {
      custoTotal,
      precoVista,
      precoCartao,
      valorProposta: formaPagamento === 'cartao' ? precoCartao : precoVista,
      potenciaSistema: numero(form.placas) * numero(form.potenciaPlaca) / 1000,
    };
  }, [form, formaPagamento]);

  const atualizar = ({ target: { name, value } }) => setForm((atual) => ({ ...atual, [name]: value }));

  const campos = [
    ['placas', 'Quantidade de placas', '1'],
    ['potenciaPlaca', 'Potência de cada placa (W)', '1'],
    ['custoEquipamentos', 'Produtos da distribuidora', '0.01'],
    ['frete', 'Frete', '0.01'],
    ['materialEletrico', 'Material elétrico adicional', '0.01'],
    ['maoDeObra', 'Mão de obra', '0.01'],
    ['engenharia', 'Engenharia', '0.01'],
    ['trt', 'TRT', '0.01'],
    ['combustivel', 'Combustível', '0.01'],
    ['outros', 'Outros custos', '0.01'],
    ['imposto', 'Imposto (%)', '0.01'],
    ['comissao', 'Comissão (%)', '0.01'],
    ['margem', 'Margem líquida (%)', '0.01'],
  ];

  return (
    <FinanceLayout title="Proposta com inversor" subtitle="Kits on-grid com inversor string/central." theme="empresa">
      <section className="finance-panel">
        <div className="finance-panel-header">
          <div><h2>Modelo inicial da distribuidora</h2><p>6 módulos TCL Solar 620 W + inversor Deye monofásico 5 kW, 2 MPPT, 220 V.</p></div>
        </div>
        <div className="finance-notice">Sistema inicial: 3,72 kWp · produtos R$ 5.212,43 · frete R$ 500,00. Todos os valores podem ser alterados.</div>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header"><div><h2>Custos e margem</h2><p>Esses custos ficam somente no ERP e não aparecem para o cliente.</p></div></div>
        <div className="finance-form">
          {campos.map(([name, label, step]) => (
            <label className="finance-field" key={name}>
              <span>{label}</span>
              <input type="number" min="0" step={step} name={name} value={form[name]} onChange={atualizar} />
            </label>
          ))}
        </div>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header"><div><h2>Escolha o valor da proposta</h2><p>Selecione à vista ou cartão antes de gerar o PDF.</p></div></div>
        <div className="tax-mode-grid">
          <button type="button" className={formaPagamento === 'avista' ? 'active' : ''} onClick={() => setFormaPagamento('avista')}>
            <strong>Preço à vista</strong><span>{moeda.format(resultado.precoVista)}</span>
          </button>
          <button type="button" className={formaPagamento === 'cartao' ? 'active' : ''} onClick={() => setFormaPagamento('cartao')}>
            <strong>Cartão em 12x</strong><span>12x de {moeda.format(resultado.precoCartao / 12)} · total {moeda.format(resultado.precoCartao)}</span>
          </button>
        </div>
        <div className="pricing-highlight"><span>Valor que irá para a proposta</span><strong>{moeda.format(resultado.valorProposta)}</strong></div>
      </section>

      <ProposalGenerator
        key={`${form.placas}-${resultado.valorProposta.toFixed(2)}-${formaPagamento}`}
        quantidadePlacas={numero(form.placas)}
        precoRecomendado={resultado.valorProposta}
        modulo="TCL Solar bifacial N-Type 620 W"
        inversor="Deye monofásico 5 kW, 2 MPPT, 220 V"
        potenciaSistemaKw={resultado.potenciaSistema}
      />
    </FinanceLayout>
  );
}
