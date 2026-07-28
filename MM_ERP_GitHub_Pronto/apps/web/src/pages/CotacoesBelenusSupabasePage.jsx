import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { belenusPricingService } from '../services/belenusPricingService.js';
import { cardFeeService } from '../services/cardFeeService.js';
import ProposalGenerator from './ProposalGenerator.jsx';
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
  imposto: 4,
  comissao: 0,
  margem: 25,
  desconto: 3,
};

function formatarData(data) {
  if (!data) return '-';
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR');
}

export default function CotacoesBelenusSupabasePage({ pricingMode = false }) {
  const { user } = useAuth();
  const [cotacoes, setCotacoes] = useState([]);
  const [cotacaoId, setCotacaoId] = useState('');
  const [form, setForm] = useState(FORM_PADRAO);
  const [cardFees, setCardFees] = useState([]);
  const [installments, setInstallments] = useState(12);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [copiado, setCopiado] = useState(false);

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
        setCotacoes(quotes);
        setCotacaoId(settings?.cotacaoId || quotes[0]?.id || '');
        setForm({ ...FORM_PADRAO, ...(settings?.form || {}) });
        setCardFees(fees);
        if (!fees.some((item) => item.installments === 12)) {
          setInstallments(fees[0]?.installments || 1);
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
    const custoTotal = cotacao.total + adicionais;
    const divisor = 1 - porcentagem(form.imposto) - porcentagem(form.comissao) - porcentagem(form.margem);
    const precoVenda = divisor > 0 ? custoTotal / divisor : 0;
    const imposto = precoVenda * porcentagem(form.imposto);
    const comissao = precoVenda * porcentagem(form.comissao);
    const lucro = precoVenda - custoTotal - imposto - comissao;
    const precoComDesconto = precoVenda * (1 - porcentagem(form.desconto));
    const cardRate = porcentagem(selectedFee?.fee_percent || 0);
    const precoCartao = cardRate < 1 ? precoVenda / (1 - cardRate) : 0;
    return {
      rateioEngenharia,
      adicionais,
      custoTotal,
      precoVenda,
      imposto,
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

  const atualizar = (event) => {
    const { name, value } = event.target;
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
      `Potência: ${cotacao.potencia.toFixed(2).replace('.', ',')} kWp`,
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

  return (
    <FinanceLayout
      title={pricingMode ? 'Preço dos kits' : 'Cotações Belenus'}
      subtitle="Cotações, margem e parcelamento centralizados no Supabase."
    >
      {mensagem && <p className="finance-notice">{mensagem}</p>}
      {carregando && <div className="finance-empty">Carregando cotações e taxas...</div>}
      {!carregando && !cotacao && <div className="finance-empty">Nenhuma cotação Belenus cadastrada.</div>}

      {!carregando && cotacao && resultado && <>
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
            <h2>Kit selecionado</h2>
            <div className="finance-list-item"><div><strong>Módulos</strong><span>{cotacao.modulo}</span></div><strong>{cotacao.placas} un.</strong></div>
            <div className="finance-list-item"><div><strong>Inversores</strong><span>{cotacao.inversor}</span></div><strong>{cotacao.inversores} un.</strong></div>
            <div className="finance-list-item"><div><strong>Estrutura</strong><span>{cotacao.estrutura}</span></div><strong>Inclusa</strong></div>
            <div className="finance-list-item"><div><strong>Produtos</strong><span>Cotação {cotacao.id}</span></div><strong>{moeda.format(cotacao.produtos)}</strong></div>
            <div className="finance-list-item"><div><strong>Frete</strong><span>Entrega da cotação</span></div><strong>{moeda.format(cotacao.frete)}</strong></div>
            <p className="belenus-validity">Emitida em {formatarData(cotacao.emissao)}. Confira disponibilidade antes da compra.</p>
          </article>

          <article className="finance-panel">
            <div className="finance-panel-header"><h2>Custos e margem</h2>{podeSalvar && <button className="finance-button inline-button" type="button" onClick={salvarConfiguracao} disabled={salvando}><Save size={16} /> {salvando ? 'Salvando...' : 'Salvar parâmetros'}</button>}</div>
            <div className="finance-form belenus-form">
              {[
                ['materialEletrico', 'Material elétrico'], ['maoDeObra', 'Mão de obra'], ['mensalidadeTreviso', 'Mensalidade Treviso'],
                ['instalacoesMes', 'Instalações no mês'], ['trt', 'TRT'], ['combustivel', 'Combustível'], ['outros', 'Outros custos'],
                ['imposto', 'Imposto (%)'], ['comissao', 'Comissão (%)'], ['margem', 'Margem líquida (%)'], ['desconto', 'Desconto máximo (%)'],
              ].map(([name, label]) => <label className="finance-field" key={name}><span>{label}</span><input type="number" step="0.01" min={name === 'instalacoesMes' ? '1' : undefined} name={name} value={form[name]} onChange={atualizar} /></label>)}
            </div>
          </article>
        </section>

        <section className="finance-panel">
          <div className="finance-panel-header"><div><h2>Pagamento no cartão</h2><p>A taxa é incorporada ao preço para preservar o valor líquido da venda.</p></div><Link className="finance-secondary-button" to="/app/taxas-cartao">Editar taxas</Link></div>
          <div className="finance-form">
            <label className="finance-field"><span>Parcelamento My Gateway</span><select value={installments} onChange={(event) => setInstallments(Number(event.target.value))}>{cardFees.map((item) => <option key={item.installments} value={item.installments}>{item.installments === 1 ? 'Crédito à vista' : `${item.installments}x`} · {Number(item.fee_percent).toFixed(2).replace('.', ',')}%</option>)}</select></label>
            <div className="finance-field"><span>Preço no cartão</span><strong className="dashboard-big-number">{moeda.format(resultado.precoCartao)}</strong></div>
            <div className="finance-field"><span>Parcela para o cliente</span><strong className="dashboard-big-number">{installments}x de {moeda.format(resultado.valorParcela)}</strong></div>
            <div className="finance-field"><span>Custo financeiro incorporado</span><strong>{moeda.format(resultado.custoTaxaCartao)}</strong></div>
          </div>
        </section>

        <section className="belenus-summary">
          <article><span>Cotação + frete</span><strong>{moeda.format(cotacao.total)}</strong></article>
          <article><span>Custos adicionais</span><strong>{moeda.format(resultado.adicionais)}</strong></article>
          <article><span>Custo total</span><strong>{moeda.format(resultado.custoTotal)}</strong></article>
          <article className="profit"><span>Lucro líquido</span><strong>{moeda.format(resultado.lucro)}</strong></article>
        </section>

        <section className="belenus-final-price">
          <div><span>Preço recomendado à vista</span><strong>{moeda.format(resultado.precoVenda)}</strong><small>Markup {resultado.markup.toFixed(2)}x · Imposto {moeda.format(resultado.imposto)}</small></div>
          <div className="belenus-final-actions"><div><span>Cartão {installments}x sem juros</span><strong>{moeda.format(resultado.precoCartao)}</strong><small>{installments}x de {moeda.format(resultado.valorParcela)}</small></div><button type="button" onClick={copiarResumo}>{copiado ? <Check size={17} /> : <Copy size={17} />}{copiado ? 'Copiado' : 'Copiar proposta'}</button><Link to="/app/belcred">Simular financiamento</Link></div>
        </section>

        <ProposalGenerator key={`${cotacao.id}-${resultado.precoVenda.toFixed(2)}`} quantidadePlacas={cotacao.placas} precoRecomendado={resultado.precoVenda} modulo={cotacao.modulo} inversor={`${cotacao.inversores}x ${cotacao.inversor}`} potenciaSistemaKw={cotacao.potencia} />
      </>}
    </FinanceLayout>
  );
}
