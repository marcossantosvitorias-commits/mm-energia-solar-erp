import React, { useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import ProposalGenerator from './ProposalGenerator.jsx';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (valor) => Number(valor || 0);
const percentual = (valor) => numero(valor) / 100;

// Sempre usamos o maior valor exibido no orçamento: "Valor total".
// Esse valor já contempla o frete quando o orçamento da distribuidora o inclui.
const KITS_INVERSOR = [
  {
    placas: 4,
    potenciaPlaca: 620,
    valorTotalDistribuidora: 4443.55,
    inversor: 'Auxsol monofásico 3 kW',
    referencia: 'Orçamento enviado em 06/08/2026',
  },
  {
    placas: 5,
    potenciaPlaca: 620,
    valorTotalDistribuidora: 5114.23,
    inversor: 'Auxsol monofásico 5 kW',
    referencia: 'Orçamento enviado em 06/08/2026',
  },
  {
    placas: 6,
    potenciaPlaca: 620,
    valorTotalDistribuidora: 5712.43,
    inversor: 'Auxsol monofásico 5 kW',
    referencia: 'Orçamento WEB-006496328',
  },
  {
    placas: 7,
    potenciaPlaca: 620,
    valorTotalDistribuidora: 6377.43,
    inversor: 'Auxsol monofásico 5 kW',
    referencia: 'Orçamento enviado em 06/08/2026',
  },
  {
    placas: 8,
    potenciaPlaca: 620,
    valorTotalDistribuidora: 6989.63,
    inversor: 'Auxsol monofásico 5 kW',
    referencia: 'Orçamento enviado em 06/08/2026',
  },
  {
    placas: 9,
    potenciaPlaca: 620,
    valorTotalDistribuidora: 7654.62,
    inversor: 'Auxsol monofásico 5 kW',
    referencia: 'Orçamento enviado em 06/08/2026',
  },
  {
    placas: 10,
    potenciaPlaca: 620,
    valorTotalDistribuidora: 8337.49,
    inversor: 'Deye monofásico 6,6 kW',
    referencia: 'Orçamento enviado em 06/08/2026',
  },
  {
    placas: 12,
    potenciaPlaca: 620,
    valorTotalDistribuidora: 9799.71,
    inversor: 'Auxsol monofásico 6 kW',
    referencia: 'Cotação cadastrada em 10/08/2026 · produtos R$ 9.263,61 · frete R$ 536,10',
  },
];

const FORM_PADRAO = {
  placas: 6,
  potenciaPlaca: 620,
  custoEquipamentos: 5712.43,
  freteAdicional: 0,
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
  const [inversorSelecionado, setInversorSelecionado] = useState('Auxsol monofásico 5 kW');
  const [referencia, setReferencia] = useState('Orçamento WEB-006496328');
  const [formaPagamento, setFormaPagamento] = useState('avista');

  const resultado = useMemo(() => {
    const custoTotal = numero(form.custoEquipamentos) + numero(form.freteAdicional) + numero(form.materialEletrico)
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

  const selecionarKit = (kit) => {
    setForm((atual) => ({
      ...atual,
      placas: kit.placas,
      potenciaPlaca: kit.potenciaPlaca,
      custoEquipamentos: kit.valorTotalDistribuidora,
      freteAdicional: 0,
    }));
    setInversorSelecionado(kit.inversor);
    setReferencia(kit.referencia);
    setFormaPagamento('avista');
  };

  const campos = [
    ['placas', 'Quantidade de placas', '1'],
    ['potenciaPlaca', 'Potência de cada placa (W)', '1'],
    ['custoEquipamentos', 'Valor total da distribuidora', '0.01'],
    ['freteAdicional', 'Frete adicional (se houver)', '0.01'],
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
          <div>
            <h2>Escolha o kit com inversor</h2>
            <p>Os valores abaixo usam sempre o maior valor do orçamento: o Valor total da distribuidora.</p>
          </div>
        </div>
        <div className="belenus-quotes">
          {KITS_INVERSOR.map((kit) => (
            <button
              type="button"
              key={kit.placas}
              className={numero(form.placas) === kit.placas ? 'active' : ''}
              onClick={() => selecionarKit(kit)}
            >
              <div className="belenus-quote-top">
                <span>{kit.placas} placas</span>
                <small>{(kit.placas * kit.potenciaPlaca / 1000).toFixed(2).replace('.', ',')} kWp</small>
              </div>
              <strong>{moeda.format(kit.valorTotalDistribuidora)}</strong>
              <small>Valor total da distribuidora</small>
              <b>{kit.inversor}</b>
            </button>
          ))}
        </div>
        <div className="finance-notice">
          Selecionado: {form.placas} placas · {resultado.potenciaSistema.toFixed(2).replace('.', ',')} kWp · {inversorSelecionado} · {referencia}.
        </div>
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
        key={`${form.placas}-${resultado.valorProposta.toFixed(2)}-${formaPagamento}-${inversorSelecionado}`}
        quantidadePlacas={numero(form.placas)}
        precoRecomendado={resultado.valorProposta}
        modulo="Módulo fotovoltaico bifacial Tier 1 620 W"
        inversor={inversorSelecionado}
        potenciaSistemaKw={resultado.potenciaSistema}
      />
    </FinanceLayout>
  );
}
