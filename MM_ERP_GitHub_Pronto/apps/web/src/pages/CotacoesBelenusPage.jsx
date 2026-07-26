import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, FileText, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import ProposalGenerator from './ProposalGenerator.jsx';
import { quotesDatabase, settingsDatabase } from '../services/businessDatabaseService.js';
import './CotacoesBelenusPage.css';

const COTACAO_VAZIA = {
  id: '', placas: 0, potencia: 0, modulo: '', inversores: 0, inversor: '',
  produtos: 0, frete: 0, total: 0, estrutura: '', emissao: '',
};

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numero = (valor) => Number(valor || 0);
const porcentagem = (valor) => numero(valor) / 100;
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
};

function CotacoesBelenusPage({ pricingMode = false }) {
  const [cotacoes, setCotacoes] = useState([]);
  const [cotacaoId, setCotacaoId] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [form, setForm] = useState(FORM_PADRAO);
  const [configCarregada, setConfigCarregada] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    Promise.all([
      quotesDatabase.list('Belenus'),
      settingsDatabase.get('belenus_pricing', { cotacaoId: '', form: FORM_PADRAO }),
    ]).then(([quotes, config]) => {
      if (!ativo) return;
      setCotacoes(quotes);
      setCotacaoId(config?.cotacaoId || quotes[0]?.id || '');
      setForm({ ...FORM_PADRAO, ...(config?.form || {}) });
      setConfigCarregada(true);
    }).catch((error) => {
      if (ativo) setErro(error.message);
    });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!configCarregada) return undefined;
    const timer = window.setTimeout(() => {
      settingsDatabase.set(
        'belenus_pricing',
        { cotacaoId, form },
        'Custos, margem e seleção da calculadora de preços dos kits Belenus.',
      ).catch((error) => setErro(error.message));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [cotacaoId, form, configCarregada]);

  const cotacao = cotacoes.find((item) => item.id === cotacaoId) || cotacoes[0] || COTACAO_VAZIA;

  function atualizar(event) {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
  }

  const resultado = useMemo(() => {
    const rateioEngenharia =
      numero(form.mensalidadeTreviso) /
      Math.max(1, numero(form.instalacoesMes));

    const adicionais =
      numero(form.materialEletrico) +
      numero(form.maoDeObra) +
      rateioEngenharia +
      numero(form.trt) +
      numero(form.combustivel) +
      numero(form.outros);

    const custoTotal = cotacao.total + adicionais;
    const divisor =
      1 -
      porcentagem(form.imposto) -
      porcentagem(form.comissao) -
      porcentagem(form.margem);
    const precoVenda = divisor > 0 ? custoTotal / divisor : 0;
    const imposto = precoVenda * porcentagem(form.imposto);
    const comissao = precoVenda * porcentagem(form.comissao);
    const lucro = precoVenda - custoTotal - imposto - comissao;
    const precoComDesconto =
      precoVenda * (1 - porcentagem(form.desconto));
    const markup = custoTotal > 0 ? precoVenda / custoTotal : 0;

    return {
      adicionais,
      rateioEngenharia,
      custoTotal,
      precoVenda,
      imposto,
      comissao,
      lucro,
      precoComDesconto,
      markup,
    };
  }, [cotacao, form]);

  async function copiarResumo() {
    const texto = [
      `Proposta MM Energia Solar - ${cotacao.placas} placas`,
      `Potência: ${cotacao.potencia.toFixed(2).replace('.', ',')} kWp`,
      `Módulos: ${cotacao.modulo}`,
      `${cotacao.inversores} ${cotacao.inversores === 1 ? 'microinversor' : 'microinversores'} Deye`,
      '',
      `Preço de venda: ${moeda.format(resultado.precoVenda)}`,
      `Preço com desconto: ${moeda.format(resultado.precoComDesconto)}`,
    ].join('\n');

    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <FinanceLayout
      title={pricingMode ? 'Preço dos kits' : 'Cotações Belenus'}
      subtitle={pricingMode
        ? 'Preços calculados a partir das cotações reais da Belenus.'
        : 'Escolha um kit e calcule o preço final para o cliente.'}
      theme="empresa"
    >
      {erro ? <p className="crm-message">{erro}</p> : null}
      {!erro && !cotacoes.length ? <p className="crm-message">Carregando cotações do Supabase...</p> : null}
      <section className="belenus-quotes">
        {cotacoes.map((item) => (
          <button
            type="button"
            key={item.id}
            className={cotacaoId === item.id ? 'active' : ''}
            onClick={() => setCotacaoId(item.id)}
          >
            <div className="belenus-quote-top">
              <span>{item.placas} placas</span>
              <small>{item.potencia.toFixed(2).replace('.', ',')} kWp</small>
            </div>
            <strong>{moeda.format(item.total)}</strong>
            <small>Equipamentos + frete</small>
            <b>{item.id}</b>
          </button>
        ))}
      </section>

      <section className="finance-two-columns">
        <article className="finance-panel">
          <div className="finance-panel-header">
            <div>
              <h2>Kit selecionado</h2>
              <p className="belenus-subtitle">Cotação {cotacao.id}</p>
            </div>
            <div className="belenus-power">
              <Zap size={16} />
              {cotacao.potencia.toFixed(2).replace('.', ',')} kWp
            </div>
          </div>

          <div className="belenus-kit-title">
            <FileText size={22} />
            <div>
              <strong>{cotacao.placas} módulos de 620 W</strong>
              <span>{cotacao.modulo}</span>
            </div>
          </div>

          <div className="finance-list-item">
            <div><strong>Microinversores</strong><span>{cotacao.inversor}</span></div>
            <strong>{cotacao.inversores} un.</strong>
          </div>
          <div className="finance-list-item">
            <div><strong>Estrutura</strong><span>{cotacao.estrutura}</span></div>
            <strong>Inclusa</strong>
          </div>
          <div className="finance-list-item">
            <div><strong>Produtos</strong><span>Conforme cotação Belenus</span></div>
            <strong>{moeda.format(cotacao.produtos)}</strong>
          </div>
          <div className="finance-list-item">
            <div><strong>Frete</strong><span>Entrega informada na cotação</span></div>
            <strong>{moeda.format(cotacao.frete)}</strong>
          </div>
          <div className="belenus-cost-total">
            <span>Custo da cotação</span>
            <strong>{moeda.format(cotacao.total)}</strong>
          </div>
          <p className="belenus-validity">
            Emitida em {cotacao.emissao}. Confira preço e disponibilidade antes da compra.
          </p>
        </article>

        <article className="finance-panel">
          <h2>Custos da instalação</h2>
          <div className="finance-form belenus-form">
            <label className="finance-field">
              <span>Material elétrico</span>
              <input type="number" step="0.01" name="materialEletrico" value={form.materialEletrico} onChange={atualizar} />
            </label>
            <label className="finance-field">
              <span>Mão de obra</span>
              <input type="number" step="0.01" name="maoDeObra" value={form.maoDeObra} onChange={atualizar} />
            </label>
            <label className="finance-field">
              <span>Mensalidade Treviso</span>
              <input type="number" step="0.01" name="mensalidadeTreviso" value={form.mensalidadeTreviso} onChange={atualizar} />
            </label>
            <label className="finance-field">
              <span>Instalações previstas no mês</span>
              <input type="number" min="1" step="1" name="instalacoesMes" value={form.instalacoesMes} onChange={atualizar} />
            </label>
            <div className="belenus-engineering-share">
              <span>Engenharia rateada neste projeto</span>
              <strong>{moeda.format(resultado.rateioEngenharia)}</strong>
            </div>
            <label className="finance-field">
              <span>TRT</span>
              <input type="number" step="0.01" name="trt" value={form.trt} onChange={atualizar} />
            </label>
            <label className="finance-field">
              <span>Combustível</span>
              <input type="number" step="0.01" name="combustivel" value={form.combustivel} onChange={atualizar} />
            </label>
            <label className="finance-field">
              <span>Outros custos</span>
              <input type="number" step="0.01" name="outros" value={form.outros} onChange={atualizar} />
            </label>
          </div>
        </article>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <h2>Margem e condições comerciais</h2>
        </div>
        <div className="belenus-rates">
          <label className="finance-field">
            <span>Imposto sobre a venda (%)</span>
            <input type="number" step="0.01" name="imposto" value={form.imposto} onChange={atualizar} />
          </label>
          <label className="finance-field">
            <span>Comissão (%)</span>
            <input type="number" step="0.01" name="comissao" value={form.comissao} onChange={atualizar} />
          </label>
          <label className="finance-field">
            <span>Margem líquida desejada (%)</span>
            <input type="number" step="0.01" name="margem" value={form.margem} onChange={atualizar} />
          </label>
          <label className="finance-field">
            <span>Desconto máximo (%)</span>
            <input type="number" step="0.01" name="desconto" value={form.desconto} onChange={atualizar} />
          </label>
        </div>
      </section>

      <section className="belenus-summary">
        <article>
          <span>Cotação + frete</span>
          <strong>{moeda.format(cotacao.total)}</strong>
        </article>
        <article>
          <span>Custos adicionais</span>
          <strong>{moeda.format(resultado.adicionais)}</strong>
        </article>
        <article>
          <span>Custo total</span>
          <strong>{moeda.format(resultado.custoTotal)}</strong>
        </article>
        <article className="profit">
          <span>Lucro líquido</span>
          <strong>{moeda.format(resultado.lucro)}</strong>
        </article>
      </section>

      <section className="belenus-final-price">
        <div>
          <span>Preço recomendado ao cliente</span>
          <strong>{moeda.format(resultado.precoVenda)}</strong>
          <small>
            Markup {resultado.markup.toFixed(2)}x · Imposto {moeda.format(resultado.imposto)}
            {resultado.comissao > 0 ? ` · Comissão ${moeda.format(resultado.comissao)}` : ''}
          </small>
        </div>
        <div className="belenus-final-actions">
          <div>
            <span>Com desconto máximo</span>
            <strong>{moeda.format(resultado.precoComDesconto)}</strong>
          </div>
          <button type="button" onClick={copiarResumo}>
            {copiado ? <Check size={17} /> : <Copy size={17} />}
            {copiado ? 'Copiado' : 'Copiar proposta'}
          </button>
          <Link to="/app/belcred">Simular financiamento</Link>
        </div>
      </section>

      <ProposalGenerator
        key={`${cotacao.id}-${resultado.precoVenda.toFixed(2)}`}
        quantidadePlacas={cotacao.placas}
        precoRecomendado={resultado.precoVenda}
        modulo={cotacao.modulo}
        inversor={`${cotacao.inversores}x ${cotacao.inversor}`}
        potenciaSistemaKw={cotacao.potencia}
        supplierQuoteId={cotacao.databaseId}
        quoteNumber={cotacao.id}
      />
    </FinanceLayout>
  );
}

export default CotacoesBelenusPage;
