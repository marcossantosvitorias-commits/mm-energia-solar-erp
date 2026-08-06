import React, { useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { formatarMoeda } from '../components/finance/storage.js';
import ProposalGenerator from './ProposalGenerator.jsx';

const presets = [4, 6, 7, 8, 10, 12, 14, 16, 20];
const TAXA_CARTAO_12X = 11.69;

const configuracoes = {
  microinversor: {
    titulo: 'Proposta com microinversor',
    descricao: 'Use para kits com um ou mais microinversores instalados próximos aos módulos.',
    quantidadePlacas: 4,
    custoPlaca: 650,
    custoInversor: 2200,
    custoEstrutura: 800,
    frete: 375,
    modulo: 'Módulo fotovoltaico bifacial N-Type 620 W',
    inversor: 'Microinversor Deye 2,25 kW 220 V',
  },
  inversor: {
    titulo: 'Proposta com inversor string',
    descricao: 'Use para kits com inversor central/string. O orçamento Belenus enviado foi usado como modelo inicial.',
    quantidadePlacas: 6,
    custoPlaca: 0,
    custoInversor: 0,
    custoEstrutura: 0,
    custoEquipamentosDistribuidora: 5212.43,
    frete: 500,
    modulo: 'TCL Solar bifacial N-Type 620 W - MFTC-1.2-BF-132-620W',
    inversor: 'Deye monofásico 5 kW, 2 MPPT, 220 V - INVDE-MO-220V-5KW',
  },
};

const numero = (valor) => Number(valor || 0);
const percentual = (valor) => numero(valor) / 100;

export default function PrecificacaoKitsPage() {
  const [tipoSistema, setTipoSistema] = useState('microinversor');
  const config = configuracoes[tipoSistema];
  const [quantidades, setQuantidades] = useState({ microinversor: 4, inversor: 6 });
  const [formaPagamento, setFormaPagamento] = useState('avista');
  const [forms, setForms] = useState({
    microinversor: {
      custoPlaca: 650, custoInversor: 2200, custoEstrutura: 800,
      custoEquipamentosDistribuidora: 0, materialEletrico: 350, frete: 375,
      maoDeObra: 700, engenharia: 250, trt: 68, combustivel: 100,
      outrosCustos: 0, impostoVenda: 4, comissao: 0, margemDesejada: 25,
    },
    inversor: {
      custoPlaca: 0, custoInversor: 0, custoEstrutura: 0,
      custoEquipamentosDistribuidora: 5212.43, materialEletrico: 350, frete: 500,
      maoDeObra: 700, engenharia: 250, trt: 68, combustivel: 100,
      outrosCustos: 0, impostoVenda: 4, comissao: 0, margemDesejada: 25,
    },
  });

  const quantidadePlacas = quantidades[tipoSistema];
  const form = forms[tipoSistema];

  const selecionarTipo = (tipo) => {
    setTipoSistema(tipo);
    setFormaPagamento('avista');
  };

  const selecionarKit = (quantidade) => {
    setQuantidades((atual) => ({ ...atual, [tipoSistema]: quantidade }));
    setFormaPagamento('avista');
  };

  const atualizar = (event) => {
    const { name, value } = event.target;
    setForms((atual) => ({
      ...atual,
      [tipoSistema]: { ...atual[tipoSistema], [name]: value },
    }));
  };

  const resultado = useMemo(() => {
    const custoPaineis = quantidadePlacas * numero(form.custoPlaca);
    const custoEquipamentosDetalhado = custoPaineis + numero(form.custoInversor) + numero(form.custoEstrutura);
    const custoEquipamentos = numero(form.custoEquipamentosDistribuidora) > 0
      ? numero(form.custoEquipamentosDistribuidora)
      : custoEquipamentosDetalhado;
    const custosOperacionais = numero(form.materialEletrico) + numero(form.frete) + numero(form.maoDeObra) +
      numero(form.engenharia) + numero(form.trt) + numero(form.combustivel) + numero(form.outrosCustos);
    const custoTotal = custoEquipamentos + custosOperacionais;
    const imposto = percentual(form.impostoVenda);
    const comissao = percentual(form.comissao);
    const margem = percentual(form.margemDesejada);
    const divisor = 1 - imposto - comissao - margem;
    const precoVenda = divisor > 0 ? custoTotal / divisor : 0;
    const precoCartao = precoVenda / (1 - TAXA_CARTAO_12X / 100);
    const valorProposta = formaPagamento === 'cartao' ? precoCartao : precoVenda;
    const valorImposto = precoVenda * imposto;
    const valorComissao = precoVenda * comissao;
    const lucro = precoVenda - custoTotal - valorImposto - valorComissao;
    const margemReal = precoVenda > 0 ? (lucro / precoVenda) * 100 : 0;
    return { custoPaineis, custoEquipamentos, custosOperacionais, custoTotal, precoVenda, precoCartao, valorProposta, valorImposto, lucro, margemReal };
  }, [form, quantidadePlacas, formaPagamento]);

  return (
    <FinanceLayout title="Preços dos kits" subtitle="Calcule e gere propostas separadas para microinversor ou inversor string." theme="empresa">
      <section className="finance-panel">
        <div className="finance-panel-header">
          <div><h2>Escolha o tipo de proposta</h2><p>Cada opção mantém seus próprios custos, quantidade de placas e equipamentos.</p></div>
        </div>
        <div className="tax-mode-grid">
          <button className={tipoSistema === 'microinversor' ? 'active' : ''} onClick={() => selecionarTipo('microinversor')}>
            <strong>Microinversor</strong><span>Página de proposta para kits com microinversores</span>
          </button>
          <button className={tipoSistema === 'inversor' ? 'active' : ''} onClick={() => selecionarTipo('inversor')}>
            <strong>Inversor string</strong><span>Página de proposta para kits com inversor central</span>
          </button>
        </div>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header"><div><h2>{config.titulo}</h2><p>{config.descricao}</p></div></div>
        {tipoSistema === 'inversor' && (
          <div className="tax-warning">
            Modelo carregado do orçamento WEB-006496328: 6 módulos TCL Solar de 620 W, inversor Deye 5 kW, sistema de 3,72 kWp, produtos por R$ 5.212,43 e frete de R$ 500,00.
          </div>
        )}
        <div className="kit-preset-grid">
          {presets.map((quantidade) => (
            <button key={quantidade} className={`kit-preset ${quantidadePlacas === quantidade ? 'active' : ''}`} onClick={() => selecionarKit(quantidade)}>
              <strong>{quantidade}</strong><span>placas</span>
            </button>
          ))}
          <label className="kit-custom"><span>Outra quantidade</span><input type="number" min="1" value={quantidadePlacas} onChange={(event) => selecionarKit(Number(event.target.value || 1))} /></label>
        </div>
      </section>

      <section className="finance-two-columns">
        <article className="finance-panel">
          <h2>Custos do kit</h2>
          <div className="finance-form">
            {tipoSistema === 'inversor' && <label className="finance-field"><span>Total dos produtos da distribuidora</span><input type="number" step="0.01" name="custoEquipamentosDistribuidora" value={form.custoEquipamentosDistribuidora} onChange={atualizar} /></label>}
            <label className="finance-field"><span>Custo de cada placa</span><input type="number" step="0.01" name="custoPlaca" value={form.custoPlaca} onChange={atualizar} disabled={numero(form.custoEquipamentosDistribuidora) > 0} /></label>
            <label className="finance-field"><span>{tipoSistema === 'microinversor' ? 'Custo dos microinversores' : 'Custo do inversor'}</span><input type="number" step="0.01" name="custoInversor" value={form.custoInversor} onChange={atualizar} disabled={numero(form.custoEquipamentosDistribuidora) > 0} /></label>
            <label className="finance-field"><span>Estrutura</span><input type="number" step="0.01" name="custoEstrutura" value={form.custoEstrutura} onChange={atualizar} disabled={numero(form.custoEquipamentosDistribuidora) > 0} /></label>
            <label className="finance-field"><span>Material elétrico adicional</span><input type="number" step="0.01" name="materialEletrico" value={form.materialEletrico} onChange={atualizar} /></label>
            <label className="finance-field"><span>Frete</span><input type="number" step="0.01" name="frete" value={form.frete} onChange={atualizar} /></label>
            <label className="finance-field"><span>Mão de obra</span><input type="number" step="0.01" name="maoDeObra" value={form.maoDeObra} onChange={atualizar} /></label>
            <label className="finance-field"><span>Engenharia</span><input type="number" step="0.01" name="engenharia" value={form.engenharia} onChange={atualizar} /></label>
            <label className="finance-field"><span>TRT</span><input type="number" step="0.01" name="trt" value={form.trt} onChange={atualizar} /></label>
            <label className="finance-field"><span>Combustível</span><input type="number" step="0.01" name="combustivel" value={form.combustivel} onChange={atualizar} /></label>
            <label className="finance-field"><span>Outros custos</span><input type="number" step="0.01" name="outrosCustos" value={form.outrosCustos} onChange={atualizar} /></label>
          </div>
        </article>
        <article className="finance-panel">
          <h2>Imposto e margem</h2>
          <div className="finance-form">
            <label className="finance-field"><span>Imposto sobre a venda (%)</span><input type="number" step="0.01" name="impostoVenda" value={form.impostoVenda} onChange={atualizar} /></label>
            <label className="finance-field"><span>Comissão de venda (%)</span><input type="number" step="0.01" name="comissao" value={form.comissao} onChange={atualizar} /></label>
            <label className="finance-field"><span>Margem líquida desejada (%)</span><input type="number" step="0.01" name="margemDesejada" value={form.margemDesejada} onChange={atualizar} /></label>
          </div>
          <div className="tax-warning">Os valores são editáveis. O total da distribuidora não é mostrado ao cliente na proposta.</div>
        </article>
      </section>

      <section className="finance-grid">
        <StatCard label="Custo dos equipamentos" value={formatarMoeda(resultado.custoEquipamentos)} helper={tipoSistema === 'inversor' ? 'Produtos do orçamento da distribuidora' : `${quantidadePlacas} placas, estrutura e microinversores`} tone="negative" />
        <StatCard label="Custo total instalado" value={formatarMoeda(resultado.custoTotal)} helper="Equipamentos e custos operacionais" tone="negative" />
        <StatCard label="Preço à vista" value={formatarMoeda(resultado.precoVenda)} helper={`Imposto de ${form.impostoVenda}% incluído`} tone="primary" />
        <StatCard label="Lucro estimado" value={formatarMoeda(resultado.lucro)} helper={`Margem real de ${resultado.margemReal.toFixed(2)}%`} tone="positive" />
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header"><div><h2>Forma de pagamento da proposta</h2><p>O valor selecionado será levado para o PDF e para o WhatsApp.</p></div></div>
        <div className="tax-mode-grid">
          <button className={formaPagamento === 'avista' ? 'active' : ''} onClick={() => setFormaPagamento('avista')}><strong>À vista</strong><span>{formatarMoeda(resultado.precoVenda)}</span></button>
          <button className={formaPagamento === 'cartao' ? 'active' : ''} onClick={() => setFormaPagamento('cartao')}><strong>Cartão em 12x</strong><span>12x de {formatarMoeda(resultado.precoCartao / 12)} • total {formatarMoeda(resultado.precoCartao)}</span></button>
        </div>
        <div className="pricing-highlight"><span>Valor que irá para a proposta</span><strong>{formatarMoeda(resultado.valorProposta)}</strong></div>
      </section>

      <ProposalGenerator
        key={`${tipoSistema}-${quantidadePlacas}-${resultado.valorProposta.toFixed(2)}-${formaPagamento}`}
        quantidadePlacas={quantidadePlacas}
        precoRecomendado={resultado.valorProposta}
        modulo={config.modulo}
        inversor={config.inversor}
        potenciaSistemaKw={(quantidadePlacas * 620) / 1000}
      />
    </FinanceLayout>
  );
}
