import React, { useMemo, useState } from 'react';
import { CreditCard, FileDown, ShieldCheck, Sparkles } from 'lucide-react';
import { formatarMoeda } from '../components/finance/storage.js';

const BELCRED = [
  { parcelas: 24, taxa: '1,91%', fator: 730.42 / 12232.56 },
  { parcelas: 30, taxa: '1,97%', fator: 622.11 / 12232.56 },
  { parcelas: 36, taxa: '2,02%', fator: 551.80 / 12232.56 },
  { parcelas: 48, taxa: '2,06%', fator: 463.73 / 12232.56 },
  { parcelas: 60, taxa: '2,10%', fator: 415.01 / 12232.56 },
  { parcelas: 72, taxa: '2,19%', fator: 391.95 / 12232.56 },
  { parcelas: 84, taxa: '2,28%', fator: 380.78 / 12232.56 },
  { parcelas: 96, taxa: '2,32%', fator: 370.80 / 12232.56 },
];

const TAXAS_CARTAO = [
  { parcelas: 1, taxa: 4.59 },
  { parcelas: 2, taxa: 6.09 },
  { parcelas: 3, taxa: 6.65 },
  { parcelas: 4, taxa: 7.15 },
  { parcelas: 5, taxa: 7.69 },
  { parcelas: 6, taxa: 8.19 },
  { parcelas: 7, taxa: 9.09 },
  { parcelas: 8, taxa: 9.69 },
  { parcelas: 9, taxa: 10.25 },
  { parcelas: 10, taxa: 10.79 },
  { parcelas: 11, taxa: 11.39 },
  { parcelas: 12, taxa: 11.69 },
  { parcelas: 13, taxa: 12.55 },
  { parcelas: 14, taxa: 12.99 },
  { parcelas: 15, taxa: 13.69 },
  { parcelas: 16, taxa: 14.29 },
  { parcelas: 17, taxa: 14.85 },
  { parcelas: 18, taxa: 15.49 },
  { parcelas: 19, taxa: 16.39 },
  { parcelas: 20, taxa: 17.39 },
  { parcelas: 21, taxa: 18.28 },
];

const IRRADIACAO_MEDIA = 5.2;
const FATOR_DESEMPENHO = 0.8;
const DIAS_MES = 30;
const DEFAULT_PANEL_IMAGE = 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=85';
const DEFAULT_INVERTER_IMAGE = 'https://www.deyeinverter.com/deyeinverter/2025/06/03/%E4%BA%A7%E5%93%81%E5%B0%81%E9%9D%A2-3-3.png';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function calcularGeracaoPorPainel(potenciaW) {
  return (Number(potenciaW || 0) * IRRADIACAO_MEDIA * FATOR_DESEMPENHO * DIAS_MES) / 1000;
}

export default function ProposalGenerator({ quantidadePlacas, precoRecomendado, modulo, inversor, potenciaSistemaKw }) {
  const potenciaInicial = Math.round((Number(potenciaSistemaKw || 0) * 1000) / quantidadePlacas) || 620;
  const [dados, setDados] = useState({
    cliente: '', cidade: 'Bauru/SP', telefone: '', potenciaPlaca: potenciaInicial,
    marcaPlaca: modulo || 'TCL Solar bifacial N-Type 620 W',
    inversor: inversor || 'Microinversor Deye 2,25 kW 220 V',
    geracaoMensal: Math.round(calcularGeracaoPorPainel(potenciaInicial) * quantidadePlacas),
    valorProposta: precoRecomendado.toFixed(2), validade: 7,
    observacoes: 'Projeto executivo, instalação, homologação junto à concessionária, estrutura, proteções elétricas e pós-venda inclusos.',
    fotoPainel: DEFAULT_PANEL_IMAGE, fotoInversor: DEFAULT_INVERTER_IMAGE,
  });

  const valor = Number(dados.valorProposta || precoRecomendado || 0);
  const potenciaSistema = (quantidadePlacas * Number(dados.potenciaPlaca || 0)) / 1000;
  const geracaoPorPainel = calcularGeracaoPorPainel(dados.potenciaPlaca);
  const geracaoCalculada = geracaoPorPainel * quantidadePlacas;
  const parcelas = useMemo(() => BELCRED.map((opcao) => ({ ...opcao, valor: valor * opcao.fator })), [valor]);
  const cartao = useMemo(() => TAXAS_CARTAO.map((opcao) => {
    const total = valor / (1 - opcao.taxa / 100);
    return { ...opcao, total, valorParcela: total / opcao.parcelas };
  }), [valor]);

  const atualizar = (event) => {
    const { name, value } = event.target;
    setDados((atual) => name === 'potenciaPlaca'
      ? { ...atual, potenciaPlaca: value, geracaoMensal: Math.round(calcularGeracaoPorPainel(value) * quantidadePlacas) }
      : { ...atual, [name]: value });
  };

  const gerarPdf = () => {
    if (!dados.cliente.trim()) { window.alert('Informe o nome do cliente para gerar a proposta.'); return; }
    const janela = window.open('', '_blank');
    if (!janela) { window.alert('Permita a abertura de janelas para gerar a proposta em PDF.'); return; }
    janela.opener = null;
    const data = new Intl.DateTimeFormat('pt-BR').format(new Date());
    const logoUrl = `${window.location.origin}/logo-mm.png`;
    const linhasParcelas = parcelas.map((item) => `<tr><td><strong>${item.parcelas}x</strong></td><td>${formatarMoeda(item.valor)}</td><td>${item.taxa} a.m.</td></tr>`).join('');
    const linhasCartao = cartao.map((item) => `<tr><td><strong>${item.parcelas === 1 ? 'Crédito à vista' : `${item.parcelas}x`}</strong></td><td>${formatarMoeda(item.valorParcela)}</td><td>${formatarMoeda(item.total)}</td><td>${item.taxa.toFixed(2).replace('.', ',')}%</td></tr>`).join('');

    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Proposta MM Energia Solar - ${escapeHtml(dados.cliente)}</title><style>
*{box-sizing:border-box}:root{--navy:#08274d;--navy2:#0d3c70;--gold:#f7bd16;--ink:#142033;--muted:#667085;--line:#dde4ee;--soft:#f5f8fc}body{margin:0;background:#dfe6ef;color:var(--ink);font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:210mm;min-height:297mm;margin:18px auto;background:#fff;box-shadow:0 24px 70px #00152b2b;overflow:hidden;page-break-after:always}.page:last-of-type{page-break-after:auto}.top{background:linear-gradient(135deg,var(--navy),var(--navy2));color:#fff;padding:16mm 16mm 12mm;position:relative;overflow:hidden}.brand-row{display:flex;align-items:center;justify-content:space-between;gap:24px}.logo{width:156px;max-height:66px;object-fit:contain}.proposal-tag{border:1px solid #ffffff66;border-radius:999px;padding:8px 14px;font-size:11px;font-weight:800;letter-spacing:1.4px}.headline{margin:24px 0 5px;font-size:31px;line-height:1.06;max-width:540px}.headline b{color:var(--gold)}.sub{margin:0;color:#d9e8f7;font-size:14px;line-height:1.55}.client-strip{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:12px;margin-top:22px}.client-box{background:#ffffff12;border:1px solid #ffffff26;border-radius:12px;padding:11px}.client-box span{display:block;color:#b9cee3;font-size:9px;text-transform:uppercase}.client-box strong{display:block;margin-top:5px;font-size:13px}.content{padding:10mm 16mm 12mm}.section-title{display:flex;align-items:center;gap:9px;margin:0 0 12px;color:var(--navy);font-size:16px}.section-title:before{content:'';width:5px;height:19px;border-radius:4px;background:var(--gold)}.system-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.metric{background:var(--soft);border:1px solid var(--line);border-radius:13px;padding:13px}.metric span{display:block;color:var(--muted);font-size:9px}.metric strong{display:block;margin-top:8px;color:var(--navy);font-size:14px}.investment{margin:17px 0;background:#fff8dc;border:1px solid #f0d26a;border-radius:16px;padding:18px;display:grid;grid-template-columns:1fr auto}.investment strong{font-size:29px;color:var(--navy)}.included,.guarantees{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0 18px}.included div,.guarantee{border:1px solid var(--line);border-radius:11px;padding:10px}.equipment-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.equipment-card{border:1px solid var(--line);border-radius:16px;overflow:hidden}.equipment-photo{height:158px;display:flex;align-items:center;justify-content:center}.equipment-photo img{width:100%;height:100%;object-fit:contain}.equipment-body{padding:14px}.equipment-body h3{margin:0;color:var(--navy)}.equipment-body p,.specs{font-size:10px;color:var(--muted);line-height:1.5}table{width:100%;border-collapse:separate;border-spacing:0;font-size:10px;border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-bottom:10px}th{background:var(--navy);color:#fff;text-align:left;padding:8px}td{padding:7px 8px;border-bottom:1px solid var(--line)}tbody tr:nth-child(even){background:#f8fafc}.legal{font-size:8.6px;line-height:1.5;color:#7b8798}.notes{margin-top:16px;border-left:5px solid var(--gold);padding:13px;background:#f8fafc}.footer{background:var(--navy);color:#fff;padding:9mm 16mm;display:flex;justify-content:space-between}.footer-logo{width:112px}.footer div{font-size:10px;text-align:right}.actions{position:fixed;right:18px;bottom:18px}.actions button{border:0;border-radius:14px;padding:15px 20px;background:var(--gold);font-weight:900}@media print{body{background:#fff}.page{margin:0;box-shadow:none}.actions{display:none}@page{size:A4;margin:0}}@media(max-width:800px){.page{width:100%;margin:0}.system-grid,.included,.guarantees,.equipment-grid{grid-template-columns:1fr 1fr}.client-strip{grid-template-columns:1fr}}
</style></head><body>
<main class="page"><section class="top"><div class="brand-row"><img class="logo" src="${logoUrl}"/><div class="proposal-tag">PROPOSTA COMERCIAL</div></div><h1 class="headline">Energia solar pensada para <b>economizar todos os meses</b>.</h1><p class="sub">Solução fotovoltaica completa, com instalação, homologação e suporte.</p><div class="client-strip"><div class="client-box"><span>Cliente</span><strong>${escapeHtml(dados.cliente)}</strong></div><div class="client-box"><span>Local</span><strong>${escapeHtml(dados.cidade)}</strong></div><div class="client-box"><span>Contato</span><strong>${escapeHtml(dados.telefone || 'Não informado')}</strong></div></div></section><section class="content"><h2 class="section-title">Resumo do sistema</h2><div class="system-grid"><div class="metric"><span>Quantidade</span><strong>${quantidadePlacas} painéis</strong></div><div class="metric"><span>Potência instalada</span><strong>${potenciaSistema.toFixed(2).replace('.', ',')} kWp</strong></div><div class="metric"><span>Geração estimada</span><strong>${Number(dados.geracaoMensal || geracaoCalculada).toLocaleString('pt-BR')} kWh/mês</strong></div><div class="metric"><span>Geração por painel</span><strong>${geracaoPorPainel.toFixed(2).replace('.', ',')} kWh/mês</strong></div></div><div class="investment"><div><span>Investimento total</span><small>Projeto completo instalado e homologado</small></div><strong>${formatarMoeda(valor)}</strong></div><h2 class="section-title">Escopo incluso</h2><div class="included"><div><b>Projeto</b><small>Documentação técnica</small></div><div><b>Instalação</b><small>Estrutura e proteções</small></div><div><b>Homologação</b><small>Junto à concessionária</small></div><div><b>Pós-venda</b><small>Suporte especializado</small></div></div><h2 class="section-title">Pagamento no cartão de crédito</h2><table><thead><tr><th>Condição</th><th>Valor da parcela</th><th>Total no cartão</th><th>Taxa</th></tr></thead><tbody>${linhasCartao}</tbody></table><p class="legal">Valores do cartão calculados com a taxa da operação incluída, preservando o valor líquido da proposta. Condições sujeitas à disponibilidade da operadora.</p><h2 class="section-title">Financiamento BelCred</h2><table><thead><tr><th>Prazo</th><th>Parcela estimada</th><th>Taxa informada</th></tr></thead><tbody>${linhasParcelas}</tbody></table><p class="legal">Simulação indicativa, sujeita à análise de crédito.</p></section><footer class="footer"><img class="footer-logo" src="${logoUrl}"/><div><b>MM Energia Solar • Bauru/SP</b><br/>Proposta emitida em ${data} • Validade: ${escapeHtml(dados.validade)} dias</div></footer></main>
<main class="page"><section class="top"><div class="brand-row"><img class="logo" src="${logoUrl}"/><div class="proposal-tag">DETALHES TÉCNICOS</div></div><h1 class="headline">Equipamentos selecionados para <b>desempenho e segurança</b>.</h1></section><section class="content"><div class="equipment-grid"><article class="equipment-card"><div class="equipment-photo"><img src="${escapeHtml(dados.fotoPainel)}"/></div><div class="equipment-body"><h3>${escapeHtml(dados.marcaPlaca)}</h3><p>Quantidade: ${quantidadePlacas} unidades • Potência: ${escapeHtml(dados.potenciaPlaca)} W.</p></div></article><article class="equipment-card"><div class="equipment-photo"><img src="${escapeHtml(dados.fotoInversor)}"/></div><div class="equipment-body"><h3>${escapeHtml(dados.inversor)}</h3><p>Conversão, proteção e monitoramento do sistema.</p></div></article></div><h2 class="section-title" style="margin-top:20px">Garantias e segurança</h2><div class="guarantees"><div class="guarantee"><b>Módulos</b><br/><small>Conforme fabricante</small></div><div class="guarantee"><b>Inversor</b><br/><small>Conforme fabricante</small></div><div class="guarantee"><b>Instalação</b><br/><small>Garantia de serviço</small></div><div class="guarantee"><b>Homologação</b><br/><small>Acompanhamento incluso</small></div></div><div class="notes"><strong>Observações</strong><p>${escapeHtml(dados.observacoes)}</p></div></section><footer class="footer"><img class="footer-logo" src="${logoUrl}"/><div><b>MM Energia Solar • Bauru/SP</b><br/>Energia limpa, economia e acompanhamento profissional.</div></footer></main><div class="actions"><button onclick="window.print()">Salvar em PDF / Imprimir</button></div></body></html>`);
    janela.document.close();
  };

  const exemplo12 = cartao.find((item) => item.parcelas === 12);

  return <section className="finance-panel">
    <div className="finance-panel-header"><div><h2>Gerador de proposta para o cliente</h2><p>Crie uma proposta detalhada com opções de pagamento.</p></div></div>
    <div className="finance-form">
      <label className="finance-field"><span>Nome do cliente *</span><input name="cliente" value={dados.cliente} onChange={atualizar} placeholder="Nome completo" /></label>
      <label className="finance-field"><span>Cidade/UF</span><input name="cidade" value={dados.cidade} onChange={atualizar} /></label>
      <label className="finance-field"><span>Telefone</span><input name="telefone" value={dados.telefone} onChange={atualizar} /></label>
      <label className="finance-field"><span>Potência de cada painel (W)</span><input type="number" name="potenciaPlaca" value={dados.potenciaPlaca} onChange={atualizar} /></label>
      <label className="finance-field"><span>Marca/modelo dos painéis</span><input name="marcaPlaca" value={dados.marcaPlaca} onChange={atualizar} /></label>
      <label className="finance-field"><span>Inversor ou microinversor</span><input name="inversor" value={dados.inversor} onChange={atualizar} /></label>
      <label className="finance-field"><span>Geração estimada (kWh/mês)</span><input type="number" name="geracaoMensal" value={dados.geracaoMensal} onChange={atualizar} /></label>
      <label className="finance-field"><span>Valor final da proposta</span><input type="number" step="0.01" name="valorProposta" value={dados.valorProposta} onChange={atualizar} /></label>
      <label className="finance-field"><span>Validade da proposta (dias)</span><input type="number" name="validade" value={dados.validade} onChange={atualizar} /></label>
      <label className="finance-field"><span>Foto do painel (URL)</span><input name="fotoPainel" value={dados.fotoPainel} onChange={atualizar} /></label>
      <label className="finance-field"><span>Foto do inversor/microinversor (URL)</span><input name="fotoInversor" value={dados.fotoInversor} onChange={atualizar} /></label>
      <label className="finance-field"><span>Itens e observações</span><textarea name="observacoes" value={dados.observacoes} onChange={atualizar} rows="3" /></label>
    </div>
    <div className="pricing-highlight"><span>Geração estimada</span><strong>{Math.round(geracaoCalculada).toLocaleString('pt-BR')} kWh/mês</strong></div>
    <div className="pricing-highlight"><span><CreditCard size={17} /> Cartão em 12x com taxa de 11,69%</span><strong>12x de {formatarMoeda(exemplo12?.valorParcela || 0)} • total {formatarMoeda(exemplo12?.total || 0)}</strong></div>
    <div className="pricing-highlight"><span>BelCred: exemplo em 96x</span><strong>{formatarMoeda(parcelas.find((item) => item.parcelas === 96)?.valor || 0)}</strong></div>
    <div style={{ marginTop: 18, border: '1px solid #dce5ef', borderRadius: 18, padding: 16, background: 'linear-gradient(135deg, #f8fbff, #fffdf3)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: '#0b2b52' }}><Sparkles size={20} /><strong>Proposta detalhada pronta</strong></div><button type="button" onClick={gerarPdf} style={{ width: '100%', minHeight: 62, border: 0, borderRadius: 16, background: 'linear-gradient(135deg, #08274d, #0d3c70)', color: '#fff', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11 }}><FileDown size={22} />Gerar proposta detalhada em PDF</button><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, color: '#667085', fontSize: 12 }}><ShieldCheck size={15} /> Com cartão, BelCred, equipamentos e garantias</div></div>
  </section>;
}
