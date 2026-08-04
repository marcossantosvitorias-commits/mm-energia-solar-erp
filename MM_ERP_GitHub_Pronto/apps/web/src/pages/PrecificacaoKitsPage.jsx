import React, { useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { formatarMoeda } from '../components/finance/storage.js';
import ProposalGenerator from './ProposalGenerator.jsx';

const presets = [4, 6, 7, 8, 10, 12, 14, 16, 20];
const precosAVista = { 7: 11412.5 };

const numero = (valor) => Number(valor || 0);
const percentual = (valor) => numero(valor) / 100;

function PrecificacaoKitsPage() {
  const [quantidadePlacas, setQuantidadePlacas] = useState(4);

  const [form, setForm] = useState({
    custoPlaca: 650,
    custoInversor: 2200,
    custoEstrutura: 800,
    materialEletrico: 350,
    frete: 375,
    maoDeObra: 700,
    engenharia: 250,
    trt: 68,
    combustivel: 100,
    outrosCustos: 0,
    impostoVenda: 4,
    ibsCbs: 26.5,
    creditoCompras: 26.5,
    baseCredito: 100,
    comissao: 0,
    margemDesejada: 25,
    descontoMaximo: 3,
  });

  const [modoTributario, setModoTributario] = useState('atual');

  function atualizar(event) {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
  }

  const resultado = useMemo(() => {
    const custoPaineis = quantidadePlacas * numero(form.custoPlaca);

    const custoEquipamentos =
      custoPaineis +
      numero(form.custoInversor) +
      numero(form.custoEstrutura);

    const custosOperacionais =
      numero(form.materialEletrico) +
      numero(form.frete) +
      numero(form.maoDeObra) +
      numero(form.engenharia) +
      numero(form.trt) +
      numero(form.combustivel) +
      numero(form.outrosCustos);

    const custoTotal = custoEquipamentos + custosOperacionais;

    const aliquotaTributo =
      modoTributario === 'atual'
        ? percentual(form.impostoVenda)
        : percentual(form.ibsCbs);

    const aliquotaComissao = percentual(form.comissao);
    const margem = percentual(form.margemDesejada);

    const baseCredito = custoEquipamentos * percentual(form.baseCredito);

    const creditoTributario =
      modoTributario === 'reforma'
        ? baseCredito * percentual(form.creditoCompras)
        : 0;

    const divisor = 1 - aliquotaTributo - aliquotaComissao - margem;

    const precoCalculado =
      divisor > 0 ? (custoTotal - creditoTributario) / divisor : 0;
    const precoVenda = precosAVista[quantidadePlacas] ?? precoCalculado;

    const tributoBruto = precoVenda * aliquotaTributo;
    const tributoLiquido = Math.max(0, tributoBruto - creditoTributario);
    const comissao = precoVenda * aliquotaComissao;
    const lucro = precoVenda - custoTotal - comissao - tributoLiquido;
    const margemReal = precoVenda > 0 ? (lucro / precoVenda) * 100 : 0;

    const valorLiquidoRecebido =
      modoTributario === 'reforma'
        ? precoVenda - tributoLiquido
        : precoVenda;

    const precoComDesconto = precoVenda * (1 - percentual(form.descontoMaximo));
    const markup = custoTotal > 0 ? precoVenda / custoTotal : 0;

    return {
      custoPaineis,
      custoEquipamentos,
      custosOperacionais,
      custoTotal,
      baseCredito,
      creditoTributario,
      precoVenda,
      tributoBruto,
      tributoLiquido,
      comissao,
      lucro,
      margemReal,
      valorLiquidoRecebido,
      precoComDesconto,
      markup,
    };
  }, [form, quantidadePlacas, modoTributario]);

  const comparativo = useMemo(() => {
    return presets.map((quantidade) => {
      const custoPaineis = quantidade * numero(form.custoPlaca);

      const custoTotal =
        custoPaineis +
        numero(form.custoInversor) +
        numero(form.custoEstrutura) +
        numero(form.materialEletrico) +
        numero(form.frete) +
        numero(form.maoDeObra) +
        numero(form.engenharia) +
        numero(form.trt) +
        numero(form.combustivel) +
        numero(form.outrosCustos);

      const aliquotaTributo =
        modoTributario === 'atual'
          ? percentual(form.impostoVenda)
          : percentual(form.ibsCbs);

      const credito =
        modoTributario === 'reforma'
          ? (custoPaineis + numero(form.custoInversor) + numero(form.custoEstrutura)) *
            percentual(form.baseCredito) *
            percentual(form.creditoCompras)
          : 0;

      const divisor =
        1 -
        aliquotaTributo -
        percentual(form.comissao) -
        percentual(form.margemDesejada);

      const precoCalculado = divisor > 0 ? (custoTotal - credito) / divisor : 0;
      const preco = precosAVista[quantidade] ?? precoCalculado;

      return {
        quantidade,
        custoTotal,
        credito,
        preco,
        parcela96: preco / 96,
      };
    });
  }, [form, modoTributario]);

  return (
    <FinanceLayout
      title="Formação de preço dos kits"
      subtitle="Calcule o preço mínimo de venda, lucro e impacto tributário."
      theme="empresa"
    >
      <section className="finance-panel">
        <div className="finance-panel-header">
          <h2>Escolha o tamanho do kit</h2>
        </div>

        <div className="kit-preset-grid">
          {presets.map((quantidade) => (
            <button
              key={quantidade}
              className={`kit-preset ${quantidadePlacas === quantidade ? 'active' : ''}`}
              onClick={() => setQuantidadePlacas(quantidade)}
            >
              <strong>{quantidade}</strong>
              <span>placas</span>
            </button>
          ))}

          <label className="kit-custom">
            <span>Outra quantidade</span>
            <input
              type="number"
              min="1"
              value={quantidadePlacas}
              onChange={(event) => setQuantidadePlacas(Number(event.target.value || 1))}
            />
          </label>
        </div>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <h2>Regime de cálculo</h2>
        </div>

        <div className="tax-mode-grid">
          <button
            className={modoTributario === 'atual' ? 'active' : ''}
            onClick={() => setModoTributario('atual')}
          >
            <strong>Modelo atual</strong>
            <span>Simples Nacional ou imposto atual</span>
          </button>

          <button
            className={modoTributario === 'reforma' ? 'active' : ''}
            onClick={() => setModoTributario('reforma')}
          >
            <strong>IBS + CBS</strong>
            <span>Com crédito tributário e split payment</span>
          </button>
        </div>
      </section>

      <section className="finance-two-columns">
        <article className="finance-panel">
          <h2>Custos do kit</h2>

          <div className="finance-form">
            <label className="finance-field"><span>Custo de cada placa</span><input type="number" step="0.01" name="custoPlaca" value={form.custoPlaca} onChange={atualizar} /></label>
            <label className="finance-field"><span>Inversor ou microinversores</span><input type="number" step="0.01" name="custoInversor" value={form.custoInversor} onChange={atualizar} /></label>
            <label className="finance-field"><span>Estrutura</span><input type="number" step="0.01" name="custoEstrutura" value={form.custoEstrutura} onChange={atualizar} /></label>
            <label className="finance-field"><span>Material elétrico</span><input type="number" step="0.01" name="materialEletrico" value={form.materialEletrico} onChange={atualizar} /></label>
            <label className="finance-field"><span>Frete proporcional</span><input type="number" step="0.01" name="frete" value={form.frete} onChange={atualizar} /></label>
            <label className="finance-field"><span>Mão de obra</span><input type="number" step="0.01" name="maoDeObra" value={form.maoDeObra} onChange={atualizar} /></label>
            <label className="finance-field"><span>Engenharia</span><input type="number" step="0.01" name="engenharia" value={form.engenharia} onChange={atualizar} /></label>
            <label className="finance-field"><span>TRT</span><input type="number" step="0.01" name="trt" value={form.trt} onChange={atualizar} /></label>
            <label className="finance-field"><span>Combustível</span><input type="number" step="0.01" name="combustivel" value={form.combustivel} onChange={atualizar} /></label>
            <label className="finance-field"><span>Outros custos</span><input type="number" step="0.01" name="outrosCustos" value={form.outrosCustos} onChange={atualizar} /></label>
          </div>
        </article>

        <article className="finance-panel">
          <h2>Tributos e margem</h2>

          <div className="finance-form">
            <label className="finance-field"><span>Imposto atual sobre a venda (%)</span><input type="number" step="0.01" name="impostoVenda" value={form.impostoVenda} onChange={atualizar} /></label>
            <label className="finance-field"><span>IBS + CBS estimado (%)</span><input type="number" step="0.01" name="ibsCbs" value={form.ibsCbs} onChange={atualizar} /></label>
            <label className="finance-field"><span>Crédito sobre compras (%)</span><input type="number" step="0.01" name="creditoCompras" value={form.creditoCompras} onChange={atualizar} /></label>
            <label className="finance-field"><span>Parte dos equipamentos com crédito (%)</span><input type="number" step="0.01" name="baseCredito" value={form.baseCredito} onChange={atualizar} /></label>
            <label className="finance-field"><span>Comissão de venda (%)</span><input type="number" step="0.01" name="comissao" value={form.comissao} onChange={atualizar} /></label>
            <label className="finance-field"><span>Margem líquida desejada (%)</span><input type="number" step="0.01" name="margemDesejada" value={form.margemDesejada} onChange={atualizar} /></label>
            <label className="finance-field"><span>Desconto máximo permitido (%)</span><input type="number" step="0.01" name="descontoMaximo" value={form.descontoMaximo} onChange={atualizar} /></label>
          </div>

          <div className="tax-warning">As alíquotas ficam editáveis para você ajustar conforme a orientação do contador.</div>
        </article>
      </section>

      <section className="finance-grid">
        <StatCard label="Custo total" value={formatarMoeda(resultado.custoTotal)} helper={`${quantidadePlacas} placas e instalação`} tone="negative" />
        <StatCard label="Preço à vista" value={formatarMoeda(resultado.precoVenda)} helper={precosAVista[quantidadePlacas] ? 'Preço comercial cadastrado' : `Margem desejada de ${form.margemDesejada}%`} tone="primary" />
        <StatCard label="Lucro estimado" value={formatarMoeda(resultado.lucro)} helper={`Margem real de ${resultado.margemReal.toFixed(2)}%`} tone="positive" />
        <StatCard label="Preço com desconto" value={formatarMoeda(resultado.precoComDesconto)} helper={`Desconto máximo de ${form.descontoMaximo}%`} tone="warning" />
      </section>

      <ProposalGenerator
        key={`${quantidadePlacas}-${resultado.precoVenda.toFixed(2)}`}
        quantidadePlacas={quantidadePlacas}
        precoRecomendado={resultado.precoVenda}
      />

      <section className="finance-two-columns">
        <article className="finance-panel">
          <h2>Detalhamento do cálculo</h2>
          <div className="finance-list-item"><div><strong>Custo dos painéis</strong><span>{quantidadePlacas} × {formatarMoeda(form.custoPlaca)}</span></div><strong>{formatarMoeda(resultado.custoPaineis)}</strong></div>
          <div className="finance-list-item"><div><strong>Equipamentos</strong><span>Painéis, inversor e estrutura</span></div><strong>{formatarMoeda(resultado.custoEquipamentos)}</strong></div>
          <div className="finance-list-item"><div><strong>Custos operacionais</strong><span>Instalação e despesas adicionais</span></div><strong>{formatarMoeda(resultado.custosOperacionais)}</strong></div>
          <div className="finance-list-item"><div><strong>Crédito tributário estimado</strong><span>Aplicável no cenário IBS + CBS</span></div><strong>{formatarMoeda(resultado.creditoTributario)}</strong></div>
          <div className="finance-list-item"><div><strong>Imposto bruto da venda</strong><span>Antes do aproveitamento de créditos</span></div><strong>{formatarMoeda(resultado.tributoBruto)}</strong></div>
          <div className="finance-list-item"><div><strong>Imposto líquido estimado</strong><span>Imposto bruto menos créditos</span></div><strong>{formatarMoeda(resultado.tributoLiquido)}</strong></div>
          <div className="finance-list-item"><div><strong>Comissão</strong><span>Percentual informado</span></div><strong>{formatarMoeda(resultado.comissao)}</strong></div>
        </article>

        <article className="finance-panel">
          <h2>Informações comerciais</h2>
          <div className="finance-list-item"><div><strong>Valor líquido recebido</strong><span>Após retenção tributária estimada</span></div><strong>{formatarMoeda(resultado.valorLiquidoRecebido)}</strong></div>
          <div className="finance-list-item"><div><strong>Markup</strong><span>Preço dividido pelo custo total</span></div><strong>{resultado.markup.toFixed(2)}×</strong></div>
          <div className="finance-list-item"><div><strong>Parcela em 96 vezes</strong><span>Sem juros bancários</span></div><strong>{formatarMoeda(resultado.precoVenda / 96)}</strong></div>
          <div className="finance-list-item"><div><strong>Parcela em 60 vezes</strong><span>Sem juros bancários</span></div><strong>{formatarMoeda(resultado.precoVenda / 60)}</strong></div>
          <div className="finance-list-item"><div><strong>Parcela em 48 vezes</strong><span>Sem juros bancários</span></div><strong>{formatarMoeda(resultado.precoVenda / 48)}</strong></div>
          <div className="pricing-highlight"><span>Preço à vista</span><strong>{formatarMoeda(resultado.precoVenda)}</strong></div>
        </article>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header"><h2>Tabela automática de preços</h2></div>
        <div className="finance-table-wrapper">
          <table className="finance-table">
            <thead><tr><th>Kit</th><th>Custo total</th><th>Crédito estimado</th><th>Preço à vista</th><th>Parcela em 96x</th></tr></thead>
            <tbody>
              {comparativo.map((item) => (
                <tr key={item.quantidade}>
                  <td><strong>{item.quantidade} placas</strong></td>
                  <td>{formatarMoeda(item.custoTotal)}</td>
                  <td>{formatarMoeda(item.credito)}</td>
                  <td><strong>{formatarMoeda(item.preco)}</strong></td>
                  <td>{formatarMoeda(item.parcela96)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </FinanceLayout>
  );
}

export default PrecificacaoKitsPage;
