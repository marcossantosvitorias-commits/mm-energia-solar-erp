import React, { useMemo, useState } from 'react';
import { BatteryCharging, Calculator, Zap } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import ProposalGenerator from './ProposalGenerator.jsx';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = (valor) => Number(valor || 0);
const percentual = (valor) => numero(valor) / 100;

const KITS_HIBRIDOS = [
  {
    id: 'hibrido-saj-5kwh-8p',
    nome: 'Kit híbrido SAJ 5 kWh',
    placas: 8,
    potenciaPlaca: 620,
    potenciaSistema: 4.96,
    modulo: 'NPlus bifacial 620 W',
    custoPaineis: 3968,
    inversor: 'Inversor SAJ monofásico híbrido 7,5 kW H2 220 V 2 MPPT',
    custoInversor: 4999.11,
    bateria: 'Bateria SAJ B3-5.0KWH-LV 48 V, 100 Ah, 5 kWh',
    quantidadeBaterias: 1,
    custoBateria: 7999.80,
    custoEquipamentos: 16966.91,
    fornecedor: 'Soollar Distribuidora - CD Jundiaí/SP',
    referencia: 'Cotação informada em 28/07/2026',
  },
];

const FORM_PADRAO = {
  materialEletrico: 600,
  maoDeObra: 1000,
  engenharia: 250,
  trt: 68,
  combustivel: 100,
  outros: 0,
  imposto: 4,
  comissao: 0,
  margem: 25,
  desconto: 3,
};

export default function HybridKitsPage() {
  const [kitId, setKitId] = useState(KITS_HIBRIDOS[0].id);
  const [form, setForm] = useState(FORM_PADRAO);
  const kit = KITS_HIBRIDOS.find((item) => item.id === kitId) || KITS_HIBRIDOS[0];

  const atualizar = (event) => {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
  };

  const resultado = useMemo(() => {
    const custosInstalacao =
      numero(form.materialEletrico) + numero(form.maoDeObra) + numero(form.engenharia) +
      numero(form.trt) + numero(form.combustivel) + numero(form.outros);
    const custoTotal = kit.custoEquipamentos + custosInstalacao;
    const divisor = 1 - percentual(form.imposto) - percentual(form.comissao) - percentual(form.margem);
    const precoVenda = divisor > 0 ? custoTotal / divisor : 0;
    const imposto = precoVenda * percentual(form.imposto);
    const comissao = precoVenda * percentual(form.comissao);
    const lucro = precoVenda - custoTotal - imposto - comissao;
    const precoComDesconto = precoVenda * (1 - percentual(form.desconto));
    return { custosInstalacao, custoTotal, precoVenda, imposto, comissao, lucro, precoComDesconto };
  }, [form, kit]);

  const descricaoInversor = `${kit.inversor} + ${kit.quantidadeBaterias}x ${kit.bateria}`;

  return (
    <FinanceLayout
      title="Kits híbridos com bateria"
      subtitle="Precificação e proposta separadas dos sistemas on-grid."
      theme="empresa"
    >
      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Escolha o kit híbrido</h2>
            <p>Os valores de equipamentos permanecem separados dos kits on-grid.</p>
          </div>
        </div>
        <div className="kit-preset-grid">
          {KITS_HIBRIDOS.map((item) => (
            <button key={item.id} type="button" className={`kit-preset ${kitId === item.id ? 'active' : ''}`} onClick={() => setKitId(item.id)}>
              <strong>{item.placas} placas</strong>
              <span>{item.potenciaSistema.toFixed(2).replace('.', ',')} kWp + {item.quantidadeBaterias * 5} kWh</span>
            </button>
          ))}
        </div>
      </section>

      <section className="finance-two-columns">
        <article className="finance-panel">
          <div className="finance-panel-header">
            <div><h2>{kit.nome}</h2><p>{kit.fornecedor}</p></div>
            <div className="belenus-power"><Zap size={16} />{kit.potenciaSistema.toFixed(2).replace('.', ',')} kWp</div>
          </div>
          <div className="finance-list-item"><div><strong>Módulos</strong><span>{kit.placas}x {kit.modulo}</span></div><strong>{moeda.format(kit.custoPaineis)}</strong></div>
          <div className="finance-list-item"><div><strong>Inversor híbrido</strong><span>{kit.inversor}</span></div><strong>{moeda.format(kit.custoInversor)}</strong></div>
          <div className="finance-list-item"><div><strong>Bateria de lítio</strong><span>{kit.quantidadeBaterias}x {kit.bateria}</span></div><strong>{moeda.format(kit.custoBateria)}</strong></div>
          <div className="pricing-highlight"><span>Custo dos equipamentos</span><strong>{moeda.format(kit.custoEquipamentos)}</strong></div>
          <p style={{ color: '#667085', fontSize: 13 }}>{kit.referencia}. Confirmar estoque, frete e compatibilidade técnica antes da compra.</p>
        </article>

        <article className="finance-panel">
          <h2>Instalação, impostos e margem</h2>
          <div className="finance-form">
            <label className="finance-field"><span>Material elétrico</span><input type="number" step="0.01" name="materialEletrico" value={form.materialEletrico} onChange={atualizar} /></label>
            <label className="finance-field"><span>Mão de obra</span><input type="number" step="0.01" name="maoDeObra" value={form.maoDeObra} onChange={atualizar} /></label>
            <label className="finance-field"><span>Engenharia</span><input type="number" step="0.01" name="engenharia" value={form.engenharia} onChange={atualizar} /></label>
            <label className="finance-field"><span>TRT</span><input type="number" step="0.01" name="trt" value={form.trt} onChange={atualizar} /></label>
            <label className="finance-field"><span>Combustível</span><input type="number" step="0.01" name="combustivel" value={form.combustivel} onChange={atualizar} /></label>
            <label className="finance-field"><span>Outros custos</span><input type="number" step="0.01" name="outros" value={form.outros} onChange={atualizar} /></label>
            <label className="finance-field"><span>Imposto (%)</span><input type="number" step="0.01" name="imposto" value={form.imposto} onChange={atualizar} /></label>
            <label className="finance-field"><span>Comissão (%)</span><input type="number" step="0.01" name="comissao" value={form.comissao} onChange={atualizar} /></label>
            <label className="finance-field"><span>Margem líquida desejada (%)</span><input type="number" step="0.01" name="margem" value={form.margem} onChange={atualizar} /></label>
            <label className="finance-field"><span>Desconto máximo (%)</span><input type="number" step="0.01" name="desconto" value={form.desconto} onChange={atualizar} /></label>
          </div>
        </article>
      </section>

      <section className="belenus-summary">
        <article><span>Equipamentos</span><strong>{moeda.format(kit.custoEquipamentos)}</strong></article>
        <article><span>Instalação e adicionais</span><strong>{moeda.format(resultado.custosInstalacao)}</strong></article>
        <article><span>Custo total</span><strong>{moeda.format(resultado.custoTotal)}</strong></article>
        <article className="profit"><span>Lucro líquido</span><strong>{moeda.format(resultado.lucro)}</strong></article>
      </section>

      <section className="belenus-final-price">
        <div>
          <span>Preço recomendado ao cliente</span>
          <strong>{moeda.format(resultado.precoVenda)}</strong>
          <small>Imposto {moeda.format(resultado.imposto)} · margem {form.margem}%</small>
        </div>
        <div className="belenus-final-actions">
          <div><span>Com desconto máximo</span><strong>{moeda.format(resultado.precoComDesconto)}</strong></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0b2b52', fontWeight: 700 }}><BatteryCharging size={20} /> Autonomia armazenada: 5 kWh</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0b2b52', fontWeight: 700 }}><Calculator size={20} /> Cálculo separado do on-grid</div>
        </div>
      </section>

      <ProposalGenerator
        key={`${kit.id}-${resultado.precoVenda.toFixed(2)}`}
        quantidadePlacas={kit.placas}
        precoRecomendado={resultado.precoVenda}
        modulo={kit.modulo}
        inversor={descricaoInversor}
        potenciaSistemaKw={kit.potenciaSistema}
      />
    </FinanceLayout>
  );
}
