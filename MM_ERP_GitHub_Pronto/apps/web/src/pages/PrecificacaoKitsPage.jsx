import React, { useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { formatarMoeda } from '../components/finance/storage.js';
import ProposalGenerator from './ProposalGenerator.jsx';

const presets = [4, 6, 7, 8, 10, 12, 14, 16, 20];
const TAXA_CARTAO_12X = 11.69;
const PRECO_HIBRIDO_REFERENCIA = 18490;
const PRECO_HIBRIDO_MINIMO_REFERENCIA = 17990;
const CUSTO_HIBRIDO_REFERENCIA = 13905.89;
const FATOR_PRECO_HIBRIDO = PRECO_HIBRIDO_REFERENCIA / CUSTO_HIBRIDO_REFERENCIA;
const FATOR_MINIMO_HIBRIDO = PRECO_HIBRIDO_MINIMO_REFERENCIA / CUSTO_HIBRIDO_REFERENCIA;

const orcamentosMicroinversor = {
  20: {
    cotacao: 'WEB-006590407',
    produtos: 17457.51,
    frete: 707.25,
    potenciaSistemaKw: 12.4,
    modulo: 'Módulo bifacial N-Type Gokin 620 W - MFGF-1.2-BF-132-620W',
    inversor: '5 microinversores Growatt 2,25 kW 220 V, 4 MPPT - MINVGR-MO-220-2.25KW',
    descricao: '20 módulos Gokin 620 W + 5 microinversores Growatt 2,25 kW + estrutura colonial Belenergy',
  },
};

const configuracoes = {
  microinversor: {
    titulo: 'Proposta com microinversor',
    descricao: 'Use para kits com um ou mais microinversores instalados próximos aos módulos.',
    modulo: 'Módulo fotovoltaico bifacial N-Type 620 W',
    inversor: 'Microinversor Deye 2,25 kW 220 V',
  },
  inversor: {
    titulo: 'Proposta com inversor string',
    descricao: 'Use para kits com inversor central/string. O orçamento Belenus enviado foi usado como modelo inicial.',
    modulo: 'TCL Solar bifacial N-Type 620 W - MFTC-1.2-BF-132-620W',
    inversor: 'Deye monofásico 5 kW, 2 MPPT, 220 V - INVDE-MO-220V-5KW',
  },
  hibrido: {
    titulo: 'Kits Híbridos',
    descricao: 'Kits com inversor híbrido, baterias, RSD e reserva de energia integrada ao sistema fotovoltaico.',
    modulo: 'Módulo fotovoltaico bifacial N-Type 620 W',
    inversor: 'SAJ H2 5 kW',
  },
  retrofit: {
    titulo: 'Retrofit Híbrido',
    descricao: 'Para clientes que já possuem sistema fotovoltaico, inclusive com microinversores, e desejam acrescentar backup com bateria.',
    modulo: 'Módulos fotovoltaicos existentes do cliente',
    inversor: 'SAJ H2 5 kW',
  },
};

const numero = (valor) => Number(valor || 0);
const percentual = (valor) => numero(valor) / 100;

export default function PrecificacaoKitsPage() {
  const [tipoSistema, setTipoSistema] = useState('microinversor');
  const config = configuracoes[tipoSistema];
  const [quantidades, setQuantidades] = useState({ microinversor: 20, inversor: 6, hibrido: 4, retrofit: 0 });
  const [formaPagamento, setFormaPagamento] = useState('avista');
  const [forms, setForms] = useState({
    microinversor: {
      custoPlaca: 650, custoInversor: 2200, custoEstrutura: 800,
      custoEquipamentosDistribuidora: 17457.51, materialEletrico: 350, frete: 707.25,
      maoDeObra: 700, engenharia: 250, trt: 68, combustivel: 100,
      outrosCustos: 0, impostoVenda: 4, comissao: 0, margemDesejada: 25,
    },
    inversor: {
      custoPlaca: 0, custoInversor: 0, custoEstrutura: 0,
      custoEquipamentosDistribuidora: 5212.43, materialEletrico: 350, frete: 500,
      maoDeObra: 700, engenharia: 250, trt: 68, combustivel: 100,
      outrosCustos: 0, impostoVenda: 4, comissao: 0, margemDesejada: 25,
    },
    hibrido: {
      nomeKit: 'Kit Híbrido Start – 5 kW / Bateria 5 kWh',
      custoPlaca: 508.40, custoInversor: 3999.29, modeloInversor: 'SAJ H2 5 kW', potenciaInversorKw: 5,
      quantidadeBaterias: 1, custoBateria: 4450, capacidadeBateriaKwh: 5,
      quantidadeRsd: 2, custoRsdUnitario: 175, custoControladorRsd: 623,
      custoKitEstrutura: 150, quantidadePerfis: 4, custoPerfilUnitario: 50, custoCabosFotovoltaicos: 300,
      custoEquipamentosDistribuidora: 0, materialEletrico: 350, frete: 0,
      maoDeObra: 700, engenharia: 250, trt: 68, combustivel: 100,
      outrosCustos: 332, impostoVenda: 4, comissao: 0, margemDesejada: 20.79,
    },
    retrofit: {
      nomeKit: 'Retrofit Híbrido',
      custoPlaca: 0, custoInversor: 3999.29, modeloInversor: 'SAJ H2 5 kW', potenciaInversorKw: 5,
      quantidadeBaterias: 1, custoBateria: 4450, capacidadeBateriaKwh: 5,
      quantidadeRsd: 0, custoRsdUnitario: 175, custoControladorRsd: 623,
      custoKitEstrutura: 0, quantidadePerfis: 0, custoPerfilUnitario: 50, custoCabosFotovoltaicos: 300,
      custoEquipamentosDistribuidora: 0, materialEletrico: 350, frete: 0,
      maoDeObra: 700, engenharia: 250, trt: 68, combustivel: 100,
      outrosCustos: 0, impostoVenda: 4, comissao: 0, margemDesejada: 20.79,
      modulosExistentes: 0, microinversoresExistentes: 0, modulosMantidosMicro: 0, modulosTransferidosHibrido: 0,
    },
  });

  const quantidadePlacas = quantidades[tipoSistema];
  const form = forms[tipoSistema];
  const isHibrido = tipoSistema === 'hibrido' || tipoSistema === 'retrofit';
  const orcamentoMicroAtivo = tipoSistema === 'microinversor' ? orcamentosMicroinversor[quantidadePlacas] : null;

  const selecionarTipo = (tipo) => {
    setTipoSistema(tipo);
    setFormaPagamento('avista');
  };

  const selecionarKit = (quantidade) => {
    setQuantidades((atual) => ({ ...atual, [tipoSistema]: quantidade }));
    if (tipoSistema === 'microinversor') {
      const orcamento = orcamentosMicroinversor[quantidade];
      setForms((atual) => ({
        ...atual,
        microinversor: {
          ...atual.microinversor,
          custoEquipamentosDistribuidora: orcamento ? orcamento.produtos : 0,
          frete: orcamento ? orcamento.frete : 375,
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

  const trocarInversorHibrido = (modelo) => {
    const modelo75 = modelo === 'SAJ H2 7,5 kW';
    setForms((atual) => ({
      ...atual,
      [tipoSistema]: {
        ...atual[tipoSistema],
        modeloInversor: modelo,
        potenciaInversorKw: modelo75 ? 7.5 : 5,
        custoInversor: modelo75 ? 4999.11 : 3999.29,
      },
    }));
  };

  const resultado = useMemo(() => {
    let custoPaineis = quantidadePlacas * numero(form.custoPlaca);
    let custoEquipamentosDetalhado = custoPaineis + numero(form.custoInversor) + numero(form.custoEstrutura);

    if (isHibrido) {
      const custoBaterias = numero(form.quantidadeBaterias) * numero(form.custoBateria);
      const custoRsds = numero(form.quantidadeRsd) * numero(form.custoRsdUnitario);
      const custoEstruturaHibrida = numero(form.custoKitEstrutura) + (numero(form.quantidadePerfis) * numero(form.custoPerfilUnitario));
      custoEquipamentosDetalhado = custoPaineis + numero(form.custoInversor) + custoBaterias + custoRsds +
        numero(form.custoControladorRsd) + custoEstruturaHibrida + numero(form.custoCabosFotovoltaicos);
    }

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
    const precoVendaPadrao = divisor > 0 ? custoTotal / divisor : 0;
    const precoVenda = isHibrido ? custoTotal * FATOR_PRECO_HIBRIDO : precoVendaPadrao;
    const precoMinimo = isHibrido ? custoTotal * FATOR_MINIMO_HIBRIDO : 0;
    const precoCartao = precoVenda / (1 - TAXA_CARTAO_12X / 100);
    const valorProposta = formaPagamento === 'cartao' ? precoCartao : precoVenda;
    const valorImposto = precoVenda * imposto;
    const valorComissao = precoVenda * comissao;
    const lucro = precoVenda - custoTotal - valorImposto - valorComissao;
    const margemReal = precoVenda > 0 ? (lucro / precoVenda) * 100 : 0;
    const capacidadeBateriasKwh = isHibrido ? numero(form.quantidadeBaterias) * numero(form.capacidadeBateriaKwh) : 0;
    const potenciaFotovoltaicaKw = tipoSistema === 'retrofit'
      ? (numero(form.modulosTransferidosHibrido) * 620) / 1000
      : (quantidadePlacas * 620) / 1000;
    return {
      custoPaineis, custoEquipamentos, custosOperacionais, custoTotal, precoVenda, precoMinimo, precoCartao,
      valorProposta, valorImposto, lucro, margemReal, capacidadeBateriasKwh, potenciaFotovoltaicaKw,
    };
  }, [form, quantidadePlacas, formaPagamento, isHibrido, tipoSistema]);

  const retrofitInvalido = tipoSistema === 'retrofit' && (
    numero(form.modulosMantidosMicro) + numero(form.modulosTransferidosHibrido) > numero(form.modulosExistentes)
  );

  const equipamentosHibridos = isHibrido ? [
    `${tipoSistema === 'hibrido' ? quantidadePlacas : numero(form.modulosTransferidosHibrido)} módulos de 620 W no inversor híbrido`,
    `${form.modeloInversor}`,
    `${form.quantidadeBaterias} bateria(s) SAJ 48 V de 5 kWh / 100 Ah`,
    `${form.quantidadeRsd} dispositivo(s) RSD`,
    '1 controlador de RSD',
    tipoSistema === 'hibrido' ? 'Kit de estrutura + perfis' : 'Adequação do sistema existente conforme levantamento',
    'Cabos fotovoltaicos',
  ] : [];

  return (
    <FinanceLayout title="Preços dos kits" subtitle="Calcule e gere propostas para microinversor, inversor string, kits híbridos e retrofit híbrido." theme="empresa">
      <section className="finance-panel">
        <div className="finance-panel-header">
          <div><h2>Escolha o tipo de proposta</h2><p>Cada opção mantém seus próprios custos, quantidade de placas e equipamentos.</p></div>
        </div>
        <div className="tax-mode-grid">
          <button className={tipoSistema === 'microinversor' ? 'active' : ''} onClick={() => selecionarTipo('microinversor')}><strong>Microinversor</strong><span>Kits com microinversores</span></button>
          <button className={tipoSistema === 'inversor' ? 'active' : ''} onClick={() => selecionarTipo('inversor')}><strong>Inversor string</strong><span>Kits com inversor central</span></button>
          <button className={tipoSistema === 'hibrido' ? 'active' : ''} onClick={() => selecionarTipo('hibrido')}><strong>Kits Híbridos</strong><span>Inversor híbrido + bateria + backup</span></button>
          <button className={tipoSistema === 'retrofit' ? 'active' : ''} onClick={() => selecionarTipo('retrofit')}><strong>Retrofit Híbrido</strong><span>Upgrade de sistema existente</span></button>
        </div>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header"><div><h2>{config.titulo}</h2><p>{config.descricao}</p></div></div>
        {tipoSistema === 'inversor' && <div className="tax-warning">Modelo carregado do orçamento WEB-006496328: 6 módulos TCL Solar de 620 W, inversor Deye 5 kW, sistema de 3,72 kWp, produtos por R$ 5.212,43 e frete de R$ 500,00.</div>}
        {orcamentoMicroAtivo && <div className="tax-warning">Cotação {orcamentoMicroAtivo.cotacao}: {orcamentoMicroAtivo.descricao}. Produtos por {formatarMoeda(orcamentoMicroAtivo.produtos)} + frete de {formatarMoeda(orcamentoMicroAtivo.frete)}. Potência: {orcamentoMicroAtivo.potenciaSistemaKw.toFixed(2).replace('.', ',')} kWp.</div>}
        {tipoSistema === 'hibrido' && <div className="tax-warning"><strong>Kit cadastrado:</strong> {form.nomeKit}. Base: 4 módulos de 620 W, SAJ H2 5 kW, 1 bateria de 5 kWh, RSD, controlador, estrutura e cabos.</div>}
        {tipoSistema === 'retrofit' && <div className="tax-warning">A divisão entre módulos mantidos nos microinversores e módulos transferidos para o inversor híbrido é uma simulação comercial e deve ser validada tecnicamente no projeto.</div>}

        {tipoSistema !== 'retrofit' && <div className="kit-preset-grid">
          {presets.map((quantidade) => <button key={quantidade} className={`kit-preset ${quantidadePlacas === quantidade ? 'active' : ''}`} onClick={() => selecionarKit(quantidade)}><strong>{quantidade}</strong><span>placas</span></button>)}
          <label className="kit-custom"><span>Outra quantidade</span><input type="number" min="1" value={quantidadePlacas} onChange={(event) => selecionarKit(Number(event.target.value || 1))} /></label>
        </div>}

        {isHibrido && <div className="finance-form" style={{ marginTop: 18 }}>
          <label className="finance-field"><span>Modelo do inversor híbrido</span><select value={form.modeloInversor} onChange={(event) => trocarInversorHibrido(event.target.value)}><option>SAJ H2 5 kW</option><option>SAJ H2 7,5 kW</option></select></label>
          <label className="finance-field"><span>Quantidade de baterias de 5 kWh</span><select name="quantidadeBaterias" value={form.quantidadeBaterias} onChange={atualizar}><option value="1">1 bateria — 5 kWh</option><option value="2">2 baterias — 10 kWh</option><option value="3">3 baterias — 15 kWh</option></select></label>
        </div>}

        {tipoSistema === 'retrofit' && <div className="finance-form" style={{ marginTop: 18 }}>
          <label className="finance-field"><span>Módulos existentes no cliente</span><input type="number" min="0" name="modulosExistentes" value={form.modulosExistentes} onChange={atualizar} /></label>
          <label className="finance-field"><span>Microinversores existentes</span><input type="number" min="0" name="microinversoresExistentes" value={form.microinversoresExistentes} onChange={atualizar} /></label>
          <label className="finance-field"><span>Módulos que permanecem nos microinversores</span><input type="number" min="0" name="modulosMantidosMicro" value={form.modulosMantidosMicro} onChange={atualizar} /></label>
          <label className="finance-field"><span>Módulos transferidos para o inversor híbrido</span><input type="number" min="0" name="modulosTransferidosHibrido" value={form.modulosTransferidosHibrido} onChange={atualizar} /></label>
          {retrofitInvalido && <div className="tax-warning">A soma dos módulos mantidos e transferidos é maior que a quantidade existente. Revise a configuração antes de gerar a proposta.</div>}
        </div>}
      </section>

      {isHibrido && <section className="finance-panel">
        <div className="finance-panel-header"><div><h2>Composição do híbrido</h2><p>Custos unitários editáveis e recálculo automático.</p></div></div>
        <div className="finance-form">
          <label className="finance-field"><span>Custo de cada módulo 620 W</span><input type="number" step="0.01" name="custoPlaca" value={form.custoPlaca} onChange={atualizar} /></label>
          <label className="finance-field"><span>Custo do inversor híbrido</span><input type="number" step="0.01" name="custoInversor" value={form.custoInversor} onChange={atualizar} /></label>
          <label className="finance-field"><span>Custo de cada bateria 5 kWh</span><input type="number" step="0.01" name="custoBateria" value={form.custoBateria} onChange={atualizar} /></label>
          <label className="finance-field"><span>Quantidade de RSD</span><input type="number" min="0" name="quantidadeRsd" value={form.quantidadeRsd} onChange={atualizar} /></label>
          <label className="finance-field"><span>Custo unitário RSD</span><input type="number" step="0.01" name="custoRsdUnitario" value={form.custoRsdUnitario} onChange={atualizar} /></label>
          <label className="finance-field"><span>Controlador de RSD</span><input type="number" step="0.01" name="custoControladorRsd" value={form.custoControladorRsd} onChange={atualizar} /></label>
          <label className="finance-field"><span>Kit de estrutura</span><input type="number" step="0.01" name="custoKitEstrutura" value={form.custoKitEstrutura} onChange={atualizar} /></label>
          <label className="finance-field"><span>Quantidade de perfis</span><input type="number" min="0" name="quantidadePerfis" value={form.quantidadePerfis} onChange={atualizar} /></label>
          <label className="finance-field"><span>Custo por perfil</span><input type="number" step="0.01" name="custoPerfilUnitario" value={form.custoPerfilUnitario} onChange={atualizar} /></label>
          <label className="finance-field"><span>Cabos fotovoltaicos</span><input type="number" step="0.01" name="custoCabosFotovoltaicos" value={form.custoCabosFotovoltaicos} onChange={atualizar} /></label>
        </div>
      </section>}

      <section className="finance-two-columns">
        <article className="finance-panel">
          <h2>Custos do kit</h2>
          <div className="finance-form">
            {!isHibrido && <><label className="finance-field"><span>Total dos produtos da distribuidora</span><input type="number" step="0.01" name="custoEquipamentosDistribuidora" value={form.custoEquipamentosDistribuidora} onChange={atualizar} /></label><label className="finance-field"><span>Custo de cada placa</span><input type="number" step="0.01" name="custoPlaca" value={form.custoPlaca} onChange={atualizar} disabled={numero(form.custoEquipamentosDistribuidora) > 0} /></label><label className="finance-field"><span>{tipoSistema === 'microinversor' ? 'Custo dos microinversores' : 'Custo do inversor'}</span><input type="number" step="0.01" name="custoInversor" value={form.custoInversor} onChange={atualizar} disabled={numero(form.custoEquipamentosDistribuidora) > 0} /></label><label className="finance-field"><span>Estrutura</span><input type="number" step="0.01" name="custoEstrutura" value={form.custoEstrutura} onChange={atualizar} disabled={numero(form.custoEquipamentosDistribuidora) > 0} /></label></>}
            <label className="finance-field"><span>Material elétrico adicional</span><input type="number" step="0.01" name="materialEletrico" value={form.materialEletrico} onChange={atualizar} /></label>
            <label className="finance-field"><span>Frete / deslocamento adicional</span><input type="number" step="0.01" name="frete" value={form.frete} onChange={atualizar} /></label>
            <label className="finance-field"><span>Mão de obra / instalação</span><input type="number" step="0.01" name="maoDeObra" value={form.maoDeObra} onChange={atualizar} /></label>
            <label className="finance-field"><span>Engenharia / projeto</span><input type="number" step="0.01" name="engenharia" value={form.engenharia} onChange={atualizar} /></label>
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
            {!isHibrido && <label className="finance-field"><span>Margem líquida desejada (%)</span><input type="number" step="0.01" name="margemDesejada" value={form.margemDesejada} onChange={atualizar} /></label>}
          </div>
          <div className="tax-warning">Os valores são editáveis. O custo interno não é mostrado ao cliente na proposta.</div>
          {isHibrido && <div className="tax-warning">Preço sugerido calculado a partir da referência de R$ 18.490,00 para custo completo de R$ 13.905,89. Piso comercial recalculado a partir da referência de R$ 17.990,00.</div>}
        </article>
      </section>

      <section className="finance-grid">
        <StatCard label="Custo dos equipamentos" value={formatarMoeda(resultado.custoEquipamentos)} helper={isHibrido ? 'Equipamentos e materiais do sistema híbrido' : (tipoSistema === 'inversor' ? 'Produtos do orçamento da distribuidora' : (orcamentoMicroAtivo ? `Produtos da cotação ${orcamentoMicroAtivo.cotacao}` : `${quantidadePlacas} placas, estrutura e microinversores`))} tone="negative" />
        <StatCard label="Custo total instalado" value={formatarMoeda(resultado.custoTotal)} helper="Equipamentos e custos operacionais" tone="negative" />
        <StatCard label="Preço à vista" value={formatarMoeda(resultado.precoVenda)} helper={`Imposto de ${form.impostoVenda}% incluído`} tone="primary" />
        <StatCard label="Lucro estimado" value={formatarMoeda(resultado.lucro)} helper={`Margem real de ${resultado.margemReal.toFixed(2)}%`} tone="positive" />
        {isHibrido && <StatCard label="Preço mínimo comercial" value={formatarMoeda(resultado.precoMinimo)} helper="Referência mínima recalculada" tone="primary" />}
        {isHibrido && <StatCard label="Baterias" value={`${resultado.capacidadeBateriasKwh.toFixed(0)} kWh`} helper={`${form.quantidadeBaterias} bateria(s) de ${form.capacidadeBateriaKwh} kWh`} tone="positive" />}
        {isHibrido && <StatCard label="Potência FV no híbrido" value={`${resultado.potenciaFotovoltaicaKw.toFixed(2).replace('.', ',')} kWp`} helper={tipoSistema === 'retrofit' ? `${form.modulosTransferidosHibrido} módulos transferidos` : `${quantidadePlacas} módulos de 620 W`} tone="primary" />}
        {isHibrido && <StatCard label="Impostos estimados" value={formatarMoeda(resultado.valorImposto)} helper={`${form.impostoVenda}% sobre a venda`} tone="negative" />}
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
        key={`${tipoSistema}-${quantidadePlacas}-${resultado.valorProposta.toFixed(2)}-${formaPagamento}-${form.quantidadeBaterias || 0}-${form.modeloInversor || ''}`}
        quantidadePlacas={tipoSistema === 'retrofit' ? numero(form.modulosTransferidosHibrido) : quantidadePlacas}
        precoRecomendado={resultado.valorProposta}
        modulo={orcamentoMicroAtivo?.modulo || config.modulo}
        inversor={isHibrido ? form.modeloInversor : (orcamentoMicroAtivo?.inversor || config.inversor)}
        potenciaSistemaKw={orcamentoMicroAtivo?.potenciaSistemaKw || resultado.potenciaFotovoltaicaKw || ((quantidadePlacas * 620) / 1000)}
        tipoSistema={tipoSistema}
        nomeKit={isHibrido ? form.nomeKit : ''}
        potenciaInversorKw={isHibrido ? numero(form.potenciaInversorKw) : 0}
        quantidadeBaterias={isHibrido ? numero(form.quantidadeBaterias) : 0}
        capacidadeBateriaKwh={isHibrido ? resultado.capacidadeBateriasKwh : 0}
        precoMinimo={isHibrido ? resultado.precoMinimo : 0}
        equipamentosAdicionais={equipamentosHibridos}
        retrofitDados={tipoSistema === 'retrofit' ? {
          modulosExistentes: numero(form.modulosExistentes),
          microinversoresExistentes: numero(form.microinversoresExistentes),
          modulosMantidosMicro: numero(form.modulosMantidosMicro),
          modulosTransferidosHibrido: numero(form.modulosTransferidosHibrido),
        } : null}
      />
    </FinanceLayout>
  );
}
