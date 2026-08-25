import React, { useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { formatarMoeda } from '../components/finance/storage.js';
import ProposalGenerator from './ProposalGenerator.jsx';

const presets = Array.from({ length: 19 }, (_, indice) => indice + 4);
const TAXA_CARTAO_12X = 11.69;

const microinversorPresets = {
  12: {
    custoEquipamentosDistribuidora: 10430.60,
    frete: 642.12,
    modulo: 'TCL Solar bifacial N-Type 620 W - MFTC-1.2-BF-132-620W',
    inversor: '3 microinversores Growatt monofásicos 2,5 kW, 4 MPPT, 220 V - MINVGR-MO-220V-2.5KW',
  },
  20: {
    custoEquipamentosDistribuidora: 17457.51,
    frete: 707.25,
    modulo: 'Módulo bifacial N-Type Gokin 620 W - MFGF-1.2-BF-132-620W',
    inversor: '5 microinversores Growatt 2,25 kW 220 V, 4 MPPT - MINVGR-MO-220-2.25KW',
  },
};

const configuracoes = {
  microinversor: {
    titulo: 'Microinversor',
    descricao: 'Kits com microinversores. Selecione a quantidade de placas.',
    modulo: 'Módulo fotovoltaico bifacial N-Type 620 W',
    inversor: 'Microinversor Deye 2,25 kW 220 V',
  },
  inversor: {
    titulo: 'Inversor string',
    descricao: 'Kits com inversor central/string. Selecione a quantidade de placas.',
    modulo: 'TCL Solar bifacial N-Type 620 W - MFTC-1.2-BF-132-620W',
    inversor: 'Inversor string conforme dimensionamento',
  },
  hibrido: {
    titulo: 'Híbrido',
    descricao: 'Kits com inversor híbrido, bateria e backup. Selecione a quantidade de placas.',
    modulo: 'Módulo fotovoltaico bifacial N-Type 620 W',
    inversor: 'SAJ H2 5 kW',
  },
};

const numero = (valor) => Number(valor || 0);
const percentual = (valor) => numero(valor) / 100;

function inversorStringPorQuantidade(quantidade) {
  const qtd = Number(quantidade || 0);
  if (qtd <= 6) return 'Inversor string 3 kW';
  if (qtd <= 10) return 'Inversor string 5 kW';
  if (qtd <= 12) return 'Inversor string 6 kW';
  if (qtd <= 14) return 'Inversor string 6,6 kW';
  return 'Inversor string 7,5 kW';
}

export default function PrecificacaoKitsPage() {
  const [tipoSistema, setTipoSistema] = useState('microinversor');
  const [quantidades, setQuantidades] = useState({ microinversor: 4, inversor: 4, hibrido: 4 });
  const [formaPagamento, setFormaPagamento] = useState('avista');
  const [forms, setForms] = useState({
    microinversor: {
      custoPlaca: 650,
      custoInversor: 2200,
      custoEstrutura: 800,
      custoEquipamentosDistribuidora: 0,
      materialEletrico: 350,
      frete: 375,
      maoDeObra: 700,
      engenharia: 250,
      trt: 68,
      combustivel: 100,
      outrosCustos: 0,
      impostoVenda: 4,
      comissao: 0,
      margemDesejada: 25,
    },
    inversor: {
      custoPlaca: 0,
      custoInversor: 0,
      custoEstrutura: 0,
      custoEquipamentosDistribuidora: 5212.43,
      materialEletrico: 350,
      frete: 500,
      maoDeObra: 700,
      engenharia: 250,
      trt: 68,
      combustivel: 100,
      outrosCustos: 0,
      impostoVenda: 4,
      comissao: 0,
      margemDesejada: 25,
    },
    hibrido: {
      custoPlaca: 508.40,
      custoInversor: 3999.29,
      custoEstrutura: 350,
      custoEquipamentosDistribuidora: 0,
      materialEletrico: 350,
      frete: 0,
      maoDeObra: 700,
      engenharia: 250,
      trt: 68,
      combustivel: 100,
      outrosCustos: 5405,
      impostoVenda: 4,
      comissao: 0,
      margemDesejada: 25,
    },
  });

  const config = configuracoes[tipoSistema];
  const quantidadePlacas = quantidades[tipoSistema];
  const form = forms[tipoSistema];
  const presetMicro = tipoSistema === 'microinversor' ? microinversorPresets[quantidadePlacas] : null;
  const moduloProposta = presetMicro?.modulo || config.modulo;
  const inversorProposta = tipoSistema === 'inversor'
    ? inversorStringPorQuantidade(quantidadePlacas)
    : (presetMicro?.inversor || config.inversor);

  const selecionarTipo = (tipo) => {
    setTipoSistema(tipo);
    setFormaPagamento('avista');
  };

  const selecionarKit = (quantidade) => {
    setQuantidades((atual) => ({ ...atual, [tipoSistema]: quantidade }));

    if (tipoSistema === 'microinversor') {
      const preset = microinversorPresets[quantidade];
      setForms((atual) => ({
        ...atual,
        microinversor: {
          ...atual.microinversor,
          custoEquipamentosDistribuidora: preset?.custoEquipamentosDistribuidora || 0,
          frete: preset?.frete || 375,
        },
      }));
    }

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

    return { custoEquipamentos, custoTotal, precoVenda, precoCartao, valorProposta, lucro, margemReal };
  }, [form, quantidadePlacas, formaPagamento]);

  return (
    <FinanceLayout
      title="Preços dos kits"
      subtitle="Microinversor, inversor string e híbrido organizados por quantidade de placas."
      theme="empresa"
    >
      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Escolha o tipo de proposta</h2>
            <p>Os valores internos dos equipamentos ficam ocultos nesta visualização.</p>
          </div>
        </div>
        <div className="tax-mode-grid">
          <button className={tipoSistema === 'microinversor' ? 'active' : ''} onClick={() => selecionarTipo('microinversor')}>
            <strong>Microinversor</strong><span>Kits com microinversores</span>
          </button>
          <button className={tipoSistema === 'inversor' ? 'active' : ''} onClick={() => selecionarTipo('inversor')}>
            <strong>Inversor string</strong><span>Kits com inversor central</span>
          </button>
          <button className={tipoSistema === 'hibrido' ? 'active' : ''} onClick={() => selecionarTipo('hibrido')}>
            <strong>Híbrido</strong><span>Inversor híbrido + bateria + backup</span>
          </button>
        </div>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div><h2>{config.titulo}</h2><p>{config.descricao}</p></div>
        </div>

        <div className="kit-preset-grid">
          {presets.map((quantidade) => (
            <button
              key={quantidade}
              className={`kit-preset ${quantidadePlacas === quantidade ? 'active' : ''}`}
              onClick={() => selecionarKit(quantidade)}
            >
              <strong>{quantidade}</strong>
              <span>placas</span>
            </button>
          ))}
        </div>
      </section>

      <details className="finance-panel">
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Custos internos — abrir somente para editar</summary>
        <div className="finance-two-columns" style={{ marginTop: 18 }}>
          <article className="finance-panel">
            <h2>Custos do kit</h2>
            <div className="finance-form">
              <label className="finance-field"><span>Total dos produtos da distribuidora</span><input type="number" step="0.01" name="custoEquipamentosDistribuidora" value={form.custoEquipamentosDistribuidora} onChange={atualizar} /></label>
              <label className="finance-field"><span>Custo de cada placa</span><input type="number" step="0.01" name="custoPlaca" value={form.custoPlaca} onChange={atualizar} disabled={numero(form.custoEquipamentosDistribuidora) > 0} /></label>
              <label className="finance-field"><span>{tipoSistema === 'microinversor' ? 'Custo dos microinversores' : tipoSistema === 'hibrido' ? 'Custo do inversor híbrido' : 'Custo do inversor'}</span><input type="number" step="0.01" name="custoInversor" value={form.custoInversor} onChange={atualizar} disabled={numero(form.custoEquipamentosDistribuidora) > 0} /></label>
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
          </article>
        </div>
      </details>

      <section className="finance-grid">
        <StatCard label="Preço à vista" value={formatarMoeda(resultado.precoVenda)} helper={`${quantidadePlacas} placas • valores internos ocultos`} tone="primary" />
        <StatCard label="Lucro estimado" value={formatarMoeda(resultado.lucro)} helper={`Margem real de ${resultado.margemReal.toFixed(2)}%`} tone="positive" />
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div><h2>Forma de pagamento da proposta</h2><p>O valor selecionado será levado para o PDF e para o WhatsApp.</p></div>
        </div>
        <div className="tax-mode-grid">
          <button className={formaPagamento === 'avista' ? 'active' : ''} onClick={() => setFormaPagamento('avista')}>
            <strong>À vista</strong><span>{formatarMoeda(resultado.precoVenda)}</span>
          </button>
          <button className={formaPagamento === 'cartao' ? 'active' : ''} onClick={() => setFormaPagamento('cartao')}>
            <strong>Cartão em 12x</strong><span>12x de {formatarMoeda(resultado.precoCartao / 12)} • total {formatarMoeda(resultado.precoCartao)}</span>
          </button>
        </div>
        <div className="pricing-highlight"><span>Valor que irá para a proposta</span><strong>{formatarMoeda(resultado.valorProposta)}</strong></div>
      </section>

      <ProposalGenerator
        key={`${tipoSistema}-${quantidadePlacas}-${resultado.valorProposta.toFixed(2)}-${formaPagamento}`}
        quantidadePlacas={quantidadePlacas}
        precoRecomendado={resultado.valorProposta}
        modulo={moduloProposta}
        inversor={inversorProposta}
        potenciaSistemaKw={(quantidadePlacas * 620) / 1000}
      />
    </FinanceLayout>
  );
}
