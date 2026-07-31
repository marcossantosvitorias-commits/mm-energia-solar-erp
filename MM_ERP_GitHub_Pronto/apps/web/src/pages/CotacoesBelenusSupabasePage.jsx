import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, Save } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { belenusPricingService } from '../services/belenusPricingService.js';
import { cardFeeService } from '../services/cardFeeService.js';
import ProposalGenerator from './ProposalGenerator.jsx';
import { HybridKitsContent } from './HybridKitsPage.jsx';
import './CotacoesBelenusPage.css';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
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
  csosn: '400',
  imposto: 4,
  comissao: 0,
  margem: 25,
  desconto: 3,
};

export default function CotacoesBelenusSupabasePage({ pricingMode = false }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cotacoes, setCotacoes] = useState([]);
  const [cotacaoId, setCotacaoId] = useState('');
  const [form, setForm] = useState(FORM_PADRAO);
  const [cardFees, setCardFees] = useState([]);
  const [installments, setInstallments] = useState(12);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [custosAbertos, setCustosAbertos] = useState(false);
  const tipoKit = searchParams.get('tipo') === 'hibrido' ? 'hibrido' : 'on-grid';
  const exibindoHibridos = pricingMode && tipoKit === 'hibrido';

  const podeSalvar = ['admin', 'financeiro'].includes(user?.role);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const [quotes, settings, fees] = await Promise.all([
          belenusPricingService.listQuotes(),
          belenusPricingService.getSettings(),
          cardFeeService.list('My Gateway'),
        ]);
        if (!ativo) return;
        setCotacoes(quotes || []);
        setCotacaoId(settings?.cotacaoId || quotes?.[0]?.id || '');
        setForm({ ...FORM_PADRAO, ...(settings?.form || {}) });
        setCardFees(fees || []);
        if (!(fees || []).some((item) => item.installments === 12)) {
          setInstallments(fees?.[0]?.installments || 1);
        }
      } catch (error) {
        if (ativo) setMensagem(`Não foi possível carregar a calculadora: ${error.message}`);
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregar();
    return () => { ativo = false; };
  }, []);

  const cotacao = cotacoes.find((item) => item.id === cotacaoId) || cotacoes[0];
  const selectedFee = cardFees.find((item) => item.installments === Number(installments));

  const resultado = useMemo(() => {
    if (!cotacao) return null;
    const rateioEngenharia = numero(form.mensalidadeTreviso) / Math.max(1, numero(form.instalacoesMes));
    const adicionais = numero(form.materialEletrico) + numero(form.maoDeObra) + rateioEngenharia
      + numero(form.trt) + numero(form.combustivel) + numero(form.outros);
    const custoTotal = numero(cotacao.total) + adicionais;
    const csosn = String(form.csosn || '400');
    const aliquotaImposto = csosn === '400' ? porcentagem(form.imposto) : 0;
    const divisor = 1 - aliquotaImposto - porcentagem(form.comissao) - porcentagem(form.margem);
    const precoVenda = divisor > 0 ? custoTotal / divisor : 0;
    const impostoFinal = precoVenda * aliquotaImposto;
    const comissao = precoVenda * porcentagem(form.comissao);
    const lucro = precoVenda - custoTotal - impostoFinal - comissao;
    const precoComDesconto = precoVenda * (1 - porcentagem(form.desconto));
    const cardRate = porcentagem(selectedFee?.fee_percent || 0);
    const precoCartao = cardRate < 1 ? precoVenda / (1 - cardRate) : 0;
    return {
      rateioEngenharia,
      adicionais,
      custoTotal,
      precoVenda,
      csosn,
      aliquotaImposto,
      impostoFinal,
      comissao,
      lucro,
      precoComDesconto,
      markup: custoTotal > 0 ? precoVenda / custoTotal : 0,
      cardRate,
      precoCartao,
      valorParcela: precoCartao / Math.max(1, Number(installments)),
      custoTaxaCartao: precoCartao - precoVenda,
    };
  }, [cotacao, form, selectedFee, installments]);

  const atualizar = ({ target: { name, value } }) => {
    setForm((atual) => ({ ...atual, [name]: value }));
  };

  async function salvarConfiguracao() {
    if (!podeSalvar) return;
    setSalvando(true);
    try {
      await belenusPricingService.saveSettings({ cotacaoId, form });
      setMensagem('Configuração salva no Supabase.');
    } catch (error) {
      setMensagem(`Erro ao salvar: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function copiarResumo() {
    if (!cotacao || !resultado) return;
    const texto = [
      `Proposta MM Energia Solar - ${cotacao.placas} placas`,
      `Potência: ${numero(cotacao.potencia).toFixed(2).replace('.', ',')} kWp`,
      `Módulos: ${cotacao.modulo}`,
      `${cotacao.inversores}x ${cotacao.inversor}`,
      '',
      `Preço à vista: ${moeda.format(resultado.precoVenda)}`,
      `Cartão em ${installments}x sem juros: ${moeda.format(resultado.precoCartao)}`,
      `${installments} parcelas de ${moeda.format(resultado.valorParcela)}`,
    ].join('\n');
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  const campos = [
    ['materialEletrico', 'Material elétrico', '0.01'],
    ['maoDeObra', 'Mão de obra', '0.01'],
    ['mensalidadeTreviso', 'Mensalidade Treviso', '0.01'],
    ['instalacoesMes', 'Instalações previstas no mês', '1'],
    ['trt', 'TRT', '0.01'],
    ['combustivel', 'Combustível', '0.01'],
    ['outros', 'Outros custos', '0.01'],
    ['comissao', 'Comissão (%)', '0.01'],
    ['margem', 'Margem líquida (%)', '0.01'],
    ['desconto', 'Desconto máximo (%)', '0.01'],
  ];

  const selecionarTipoKit = (tipo) => {
    setSearchParams(tipo === 'hibrido' ? { tipo: 'hibrido' } : {});
  };

  return (
    <FinanceLayout
      title={pricingMode ? 'Preços dos kits' : 'Cotações Belenus'}
      subtitle={pricingMode ? 'Escolha entre kits on-grid e híbridos com bateria.' : 'Cotações, margem e parcelamento centralizados no Supabase.'}
    >
      <div className="kits-pricing-page">
        {pricingMode && <section className="kit-category-tabs" aria-label="Tipo de kit">
          <button type="button" className={tipoKit === 'on-grid' ? 'active' : ''} onClick={() => selecionarTipoKit('on-grid')} aria-pressed={tipoKit === 'on-grid'}>
            <strong>Kits on-grid</strong><small>Sistemas conectados à rede</small>
          </button>
          <button type="button" className={tipoKit === 'hibrido' ? 'active' : ''} onClick={() => selecionarTipoKit('hibrido')} aria-pressed={tipoKit === 'hibrido'}>
            <strong>Híbridos + bateria</strong><small>Energia solar com armazenamento</small>
          </button>
        </section>}

        {exibindoHibridos ? <HybridKitsContent /> : <>
        {mensagem && <p className="finance-notice">{mensagem}</p>}
        {carregando && <div className="finance-empty">Carregando cotações e taxas...</div>}
        {!carregando && !cotacao && <div className="finance-empty">Nenhuma cotação Belenus cadastrada.</div>}

        {!carregando && cotacao && resultado && <>
        <section className="belenus-quotes">
          {cotacoes.map((item) => (
            <button type="button" key={item.id} className={cotacaoId === item.id ? 'active' : ''} onClick={() => setCotacaoId(item.id)}>
              <div className="belenus-quote-top"><span>{item.placas} placas</span><small>{numero(item.potencia).toFixed(2).replace('.', ',')} kWp</small></div>
              <strong>{moeda.format(numero(item.total))}</strong><small>Equipamentos + frete</small><b>{item.id}</b>
            </button>
          ))}
        </section>

          <section className="finance-panel belenus-disclosure-panel">
            <button className="belenus-disclosure" type="button" onClick={() => setCustosAbertos((aberto) => !aberto)} aria-expanded={custosAbertos}>
              <span><strong>Custos e margem</strong><small>Abra para ajustar custos, imposto, comissão e margem.</small></span>
              {custosAbertos ? <ChevronUp size={21} /> : <ChevronDown size={21} />}
            </button>
            {custosAbertos && <div className="belenus-disclosure-content">
              <div className="belenus-disclosure-actions">
                <span>Parâmetros do preço selecionado</span>
                {podeSalvar && <button className="finance-button inline-button" type="button" onClick={salvarConfiguracao} disabled={salvando}><Save size={16} /> {salvando ? 'Salvando...' : 'Salvar parâmetros'}</button>}
              </div>
              <div className="finance-form belenus-form">
                {campos.slice(0, 4).map(([name, label, step]) => (
                  <label className="finance-field" key={name}><span>{label}</span><input type="number" step={step} min={name === 'instalacoesMes' ? '1' : '0'} name={name} value={form[name]} onChange={atualizar} /></label>
                ))}
                <div className="belenus-engineering-share" aria-live="polite"><span>Engenharia rateada</span><strong>{moeda.format(resultado.rateioEngenharia)}</strong></div>
                <label className="finance-field"><span>CSOSN — Simples Nacional</span><select name="csosn" value={form.csosn || '400'} onChange={atualizar}><option value="400">400 — Não tributada</option></select></label>
                <label className="finance-field"><span>Alíquota do imposto final (%)</span><input type="number" step="0.01" min="0" name="imposto" value={form.imposto} onChange={atualizar} /></label>
                {campos.slice(4).map(([name, label, step]) => (
                  <label className="finance-field" key={name}><span>{label}</span><input type="number" step={step} min="0" name={name} value={form[name]} onChange={atualizar} /></label>
                ))}
              </div>
              <p className="belenus-tax-note">CSOSN 400 · Base de cálculo {moeda.format(resultado.precoVenda)} · Imposto final {moeda.format(resultado.impostoFinal)}</p>
            </div>}
          </section>

        <section className="finance-panel">
          <div className="finance-panel-header"><div><h2>Pagamento no cartão</h2><p>A taxa é incorporada ao preço para preservar o valor líquido da venda.</p></div><Link className="finance-secondary-button" to="/app/taxas-cartao">Editar taxas</Link></div>
          {!cardFees.length && <p className="finance-notice">Nenhuma taxa de cartão cadastrada. Cadastre as taxas para calcular o parcelamento.</p>}
          <div className="finance-form belenus-payment-form">
            <label className="finance-field"><span>Parcelamento My Gateway</span><select value={installments} onChange={(event) => setInstallments(Number(event.target.value))} disabled={!cardFees.length}>{cardFees.map((item) => <option key={item.installments} value={item.installments}>{item.installments === 1 ? 'Crédito à vista' : `${item.installments}x`} · {numero(item.fee_percent).toFixed(2).replace('.', ',')}%</option>)}</select></label>
            <div className="finance-field"><span>Preço no cartão</span><strong className="dashboard-big-number">{moeda.format(resultado.precoCartao)}</strong></div>
            <div className="finance-field"><span>Parcela para o cliente</span><strong className="dashboard-big-number">{installments}x de {moeda.format(resultado.valorParcela)}</strong></div>
            <div className="finance-field"><span>Custo financeiro incorporado</span><strong>{moeda.format(resultado.custoTaxaCartao)}</strong></div>
          </div>
        </section>

        <section className="belenus-summary">
          <article><span>Cotação + frete</span><strong>{moeda.format(numero(cotacao.total))}</strong></article>
          <article><span>Custos adicionais</span><strong>{moeda.format(resultado.adicionais)}</strong></article>
          <article><span>Custo total</span><strong>{moeda.format(resultado.custoTotal)}</strong></article>
          <article className="tax"><span>Imposto final · CSOSN {resultado.csosn}</span><strong>{moeda.format(resultado.impostoFinal)}</strong></article>
          <article className="profit"><span>Lucro líquido</span><strong>{moeda.format(resultado.lucro)}</strong></article>
        </section>

        <section className="belenus-final-price">
          <div><span>Preço recomendado à vista</span><strong>{moeda.format(resultado.precoVenda)}</strong><small>Markup {resultado.markup.toFixed(2)}x · CSOSN {resultado.csosn} · Imposto final {moeda.format(resultado.impostoFinal)} · Com desconto {moeda.format(resultado.precoComDesconto)}</small></div>
          <div className="belenus-final-actions"><div><span>Cartão {installments}x sem juros</span><strong>{moeda.format(resultado.precoCartao)}</strong><small>{installments}x de {moeda.format(resultado.valorParcela)}</small></div><button type="button" onClick={copiarResumo}>{copiado ? <Check size={17} /> : <Copy size={17} />}{copiado ? 'Copiado' : 'Copiar proposta'}</button><Link to="/app/belcred">Simular financiamento</Link></div>
        </section>

        <ProposalGenerator
          key={`${cotacao.id}-${resultado.precoVenda.toFixed(2)}-${installments}`}
          quantidadePlacas={cotacao.placas}
          precoRecomendado={resultado.precoVenda}
          modulo={cotacao.modulo}
          inversor={`${cotacao.inversores}x ${cotacao.inversor}`}
          potenciaSistemaKw={cotacao.potencia}
          precoCartao={resultado.precoCartao}
          parcelasCartao={installments}
          valorParcelaCartao={resultado.valorParcela}
          taxaCartao={numero(selectedFee?.fee_percent)}
        />
        </>}
        </>}
      </div>
    </FinanceLayout>
  );
}
