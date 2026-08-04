import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, FileText, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import ProposalGenerator from './ProposalGenerator.jsx';
import './CotacoesBelenusPage.css';

const cotacoes = [
  { id: 'WEB-006414070', placas: 4, potencia: 2.48, modulo: 'TCL Solar bifacial N-Type 620 W', inversores: 1, inversor: 'Microinversor Deye 2,25 kW 220 V', produtos: 3619.53, frete: 500, total: 4119.53, estrutura: 'Telha colonial - alumínio Belenergy com ajuste vertical', emissao: '25/07/2026' },
  { id: 'WEB-006408977', placas: 6, potencia: 3.72, modulo: 'JA Solar bifacial N-Type 620 W', inversores: 2, inversor: 'Microinversor Deye 2,25 kW 220 V', produtos: 6141.56, frete: 500, total: 6641.56, estrutura: 'Telha colonial - alumínio Belenergy', emissao: '24/07/2026' },
  { id: 'WEB-006409592', placas: 8, potencia: 4.96, modulo: 'TCL Solar bifacial N-Type 620 W', inversores: 2, inversor: 'Microinversor Deye 2,25 kW 220 V', produtos: 7239.06, frete: 500, total: 7739.06, estrutura: 'Telha colonial - alumínio Belenergy', emissao: '24/07/2026' },
  { id: 'WEB-006409022', placas: 10, potencia: 6.2, modulo: 'JA Solar bifacial N-Type 620 W', inversores: 3, inversor: 'Microinversor Deye 2,25 kW 220 V', produtos: 9949.81, frete: 619.04, total: 10568.85, estrutura: 'Telha colonial - alumínio Belenergy', emissao: '24/07/2026' },
  { id: 'WEB-006414746', placas: 12, potencia: 7.44, modulo: 'TCL Solar bifacial N-Type 620 W', inversores: 3, inversor: 'Microinversor Deye 2,25 kW 220 V', produtos: 10810.97, frete: 660.38, total: 11471.35, estrutura: 'Telha colonial - alumínio Belenergy com ajuste vertical', emissao: '26/07/2026' },
  { id: 'WEB-006409070', placas: 16, potencia: 9.92, modulo: 'JA Solar bifacial N-Type 620 W', inversores: 4, inversor: 'Microinversor Deye 2,25 kW 220 V', produtos: 14964.06, frete: 707.25, total: 15671.31, estrutura: 'Telha colonial - alumínio Belenergy', emissao: '24/07/2026' },
];

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (valor) => Number(valor || 0);
const porcentagem = (valor) => numero(valor) / 100;
const STORAGE_KEY = 'mm-erp-cotacoes-belenus-config-v2';

const FORM_PADRAO = {
  materialEletrico: 350,
  maoDeObra: 700,
  mensalidadeTreviso: 1000,
  instalacoesMes: 4,
  trt: 68,
  combustivel: 100,
  outros: 0,
  imposto: 4,
  comissao: 0,
  margem: 25,
  desconto: 3,
  taxaCartao: 11.69,
};

function carregarConfiguracao() {
  try {
    const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return {
      cotacaoId: salvo?.cotacaoId || cotacoes[0].id,
      formaPagamento: salvo?.formaPagamento || 'avista',
      form: { ...FORM_PADRAO, ...(salvo?.form || {}) },
    };
  } catch {
    return { cotacaoId: cotacoes[0].id, formaPagamento: 'avista', form: FORM_PADRAO };
  }
}

function CotacoesBelenusPage({ pricingMode = false }) {
  const [configInicial] = useState(carregarConfiguracao);
  const [cotacaoId, setCotacaoId] = useState(configInicial.cotacaoId);
  const [formaPagamento, setFormaPagamento] = useState(configInicial.formaPagamento);
  const [copiado, setCopiado] = useState(false);
  const [form, setForm] = useState(configInicial.form);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cotacaoId, formaPagamento, form }));
  }, [cotacaoId, formaPagamento, form]);

  const cotacao = cotacoes.find((item) => item.id === cotacaoId) || cotacoes[0];

  function atualizar(event) {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
  }

  const resultado = useMemo(() => {
    const rateioEngenharia = numero(form.mensalidadeTreviso) / Math.max(1, numero(form.instalacoesMes));
    const adicionais = numero(form.materialEletrico) + numero(form.maoDeObra) + rateioEngenharia + numero(form.trt) + numero(form.combustivel) + numero(form.outros);
    const custoTotal = cotacao.total + adicionais;
    const divisor = 1 - porcentagem(form.imposto) - porcentagem(form.comissao) - porcentagem(form.margem);
    const precoVenda = divisor > 0 ? custoTotal / divisor : 0;
    const imposto = precoVenda * porcentagem(form.imposto);
    const comissao = precoVenda * porcentagem(form.comissao);
    const lucro = precoVenda - custoTotal - imposto - comissao;
    const precoComDesconto = precoVenda * (1 - porcentagem(form.desconto));
    const markup = custoTotal > 0 ? precoVenda / custoTotal : 0;
    const divisorCartao = 1 - porcentagem(form.taxaCartao);
    const precoCartao = divisorCartao > 0 ? precoVenda / divisorCartao : precoVenda;
    const parcelaCartao = precoCartao / 12;
    const precoSelecionado = formaPagamento === 'cartao' ? precoCartao : precoVenda;

    return { adicionais, rateioEngenharia, custoTotal, precoVenda, imposto, comissao, lucro, precoComDesconto, markup, precoCartao, parcelaCartao, precoSelecionado };
  }, [cotacao, form, formaPagamento]);

  async function copiarResumo() {
    const texto = [
      `Proposta MM Energia Solar - ${cotacao.placas} placas`,
      `Potência: ${cotacao.potencia.toFixed(2).replace('.', ',')} kWp`,
      `Módulos: ${cotacao.modulo}`,
      `${cotacao.inversores} ${cotacao.inversores === 1 ? 'microinversor' : 'microinversores'} Deye`,
      '',
      formaPagamento === 'cartao'
        ? `Cartão 12x sem juros: ${moeda.format(resultado.precoCartao)} (12x de ${moeda.format(resultado.parcelaCartao)})`
        : `Preço à vista: ${moeda.format(resultado.precoVenda)}`,
    ].join('\n');

    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <FinanceLayout
      title={pricingMode ? 'Preço dos kits' : 'Cotações Belenus'}
      subtitle={pricingMode ? 'Preços calculados a partir das cotações reais da Belenus.' : 'Escolha um kit e calcule o preço final para o cliente.'}
      theme="empresa"
    >
      <section className="belenus-quotes">
        {cotacoes.map((item) => (
          <button type="button" key={item.id} className={cotacaoId === item.id ? 'active' : ''} onClick={() => setCotacaoId(item.id)}>
            <div className="belenus-quote-top"><span>{item.placas} placas</span><small>{item.potencia.toFixed(2).replace('.', ',')} kWp</small></div>
            <strong>{moeda.format(item.total)}</strong><small>Equipamentos + frete</small><b>{item.id}</b>
          </button>
        ))}
      </section>

      <section className="finance-two-columns">
        <article className="finance-panel">
          <div className="finance-panel-header">
            <div><h2>Kit selecionado</h2><p className="belenus-subtitle">Cotação {cotacao.id}</p></div>
            <div className="belenus-power"><Zap size={16} />{cotacao.potencia.toFixed(2).replace('.', ',')} kWp</div>
          </div>
          <div className="belenus-kit-title"><FileText size={22} /><div><strong>{cotacao.placas} módulos de 620 W</strong><span>{cotacao.modulo}</span></div></div>
          <div className="finance-list-item"><div><strong>Microinversores</strong><span>{cotacao.inversor}</span></div><strong>{cotacao.inversores} un.</strong></div>
          <div className="finance-list-item"><div><strong>Estrutura</strong><span>{cotacao.estrutura}</span></div><strong>Inclusa</strong></div>
          <div className="finance-list-item"><div><strong>Produtos</strong><span>Conforme cotação Belenus</span></div><strong>{moeda.format(cotacao.produtos)}</strong></div>
          <div className="finance-list-item"><div><strong>Frete</strong><span>Entrega informada na cotação</span></div><strong>{moeda.format(cotacao.frete)}</strong></div>
          <div className="belenus-cost-total"><span>Custo da cotação</span><strong>{moeda.format(cotacao.total)}</strong></div>
          <p className="belenus-validity">Emitida em {cotacao.emissao}. Confira preço e disponibilidade antes da compra.</p>
        </article>

        <article className="finance-panel">
          <h2>Custos da instalação</h2>
          <div className="finance-form belenus-form">
            {[
              ['Material elétrico', 'materialEletrico', '0.01'],
              ['Mão de obra', 'maoDeObra', '0.01'],
              ['Mensalidade Treviso', 'mensalidadeTreviso', '0.01'],
              ['Instalações previstas no mês', 'instalacoesMes', '1'],
              ['TRT', 'trt', '0.01'],
              ['Combustível', 'combustivel', '0.01'],
              ['Outros custos', 'outros', '0.01'],
            ].map(([label, name, step]) => (
              <label className="finance-field" key={name}><span>{label}</span><input type="number" step={step} min={name === 'instalacoesMes' ? '1' : undefined} name={name} value={form[name]} onChange={atualizar} /></label>
            ))}
            <div className="belenus-engineering-share"><span>Engenharia rateada neste projeto</span><strong>{moeda.format(resultado.rateioEngenharia)}</strong></div>
          </div>
        </article>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header"><h2>Margem e condições comerciais</h2></div>
        <div className="belenus-rates">
          {[
            ['Imposto sobre a venda (%)', 'imposto'],
            ['Comissão (%)', 'comissao'],
            ['Margem líquida desejada (%)', 'margem'],
            ['Desconto máximo (%)', 'desconto'],
            ['Taxa do cartão (%)', 'taxaCartao'],
          ].map(([label, name]) => (
            <label className="finance-field" key={name}><span>{label}</span><input type="number" step="0.01" name={name} value={form[name]} onChange={atualizar} /></label>
          ))}
        </div>
      </section>

      <section className="belenus-summary">
        <article><span>Cotação + frete</span><strong>{moeda.format(cotacao.total)}</strong></article>
        <article><span>Custos adicionais</span><strong>{moeda.format(resultado.adicionais)}</strong></article>
        <article><span>Custo total</span><strong>{moeda.format(resultado.custoTotal)}</strong></article>
        <article className="profit"><span>Lucro líquido</span><strong>{moeda.format(resultado.lucro)}</strong></article>
      </section>

      <section className="belenus-final-price">
        <div>
          <span>Preço recomendado à vista</span>
          <strong>{moeda.format(resultado.precoVenda)}</strong>
          <small>Markup {resultado.markup.toFixed(2)}x · Imposto {moeda.format(resultado.imposto)}{resultado.comissao > 0 ? ` · Comissão ${moeda.format(resultado.comissao)}` : ''}</small>
          <div style={{ marginTop: 18 }}>
            <span>Cartão 12x sem juros</span>
            <strong style={{ display: 'block' }}>{moeda.format(resultado.precoCartao)}</strong>
            <small>12x de {moeda.format(resultado.parcelaCartao)}</small>
          </div>
        </div>

        <div className="belenus-final-actions">
          <div>
            <span>Valor que irá na proposta</span>
            <strong>{moeda.format(resultado.precoSelecionado)}</strong>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="radio" name="formaPagamento" checked={formaPagamento === 'avista'} onChange={() => setFormaPagamento('avista')} />
            À vista
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="radio" name="formaPagamento" checked={formaPagamento === 'cartao'} onChange={() => setFormaPagamento('cartao')} />
            Cartão 12x sem juros
          </label>
          <button type="button" onClick={copiarResumo}>{copiado ? <Check size={17} /> : <Copy size={17} />}{copiado ? 'Copiado' : 'Copiar proposta'}</button>
          <Link to="/app/belcred">Simular financiamento</Link>
        </div>
      </section>

      <ProposalGenerator
        key={`${cotacao.id}-${resultado.precoSelecionado.toFixed(2)}-${formaPagamento}`}
        quantidadePlacas={cotacao.placas}
        precoRecomendado={resultado.precoSelecionado}
        precoCartao={resultado.precoCartao}
        taxaCartao={numero(form.taxaCartao)}
        modulo={cotacao.modulo}
        inversor={`${cotacao.inversores}x ${cotacao.inversor}`}
        potenciaSistemaKw={cotacao.potencia}
      />
    </FinanceLayout>
  );
}

export default CotacoesBelenusPage;
