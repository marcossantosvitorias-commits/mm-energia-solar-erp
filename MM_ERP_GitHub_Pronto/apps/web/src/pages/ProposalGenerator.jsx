import React, { useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
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

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export default function ProposalGenerator({ quantidadePlacas, precoRecomendado }) {
  const [dados, setDados] = useState({
    cliente: '',
    cidade: 'Bauru/SP',
    telefone: '',
    potenciaPlaca: 620,
    marcaPlaca: 'TSUN',
    inversor: 'SAJ ou Deye, conforme disponibilidade',
    geracaoMensal: Math.round(quantidadePlacas * 77.35),
    valorProposta: precoRecomendado.toFixed(2),
    validade: 7,
    observacoes: 'Projeto, instalação, homologação e pós-venda inclusos.',
  });

  const valor = Number(dados.valorProposta || precoRecomendado || 0);
  const potenciaSistema = (quantidadePlacas * Number(dados.potenciaPlaca || 0)) / 1000;
  const parcelas = useMemo(
    () => BELCRED.map((opcao) => ({ ...opcao, valor: valor * opcao.fator })),
    [valor],
  );

  const atualizar = (event) => {
    const { name, value } = event.target;
    setDados((atual) => ({ ...atual, [name]: value }));
  };

  const gerarPdf = () => {
    if (!dados.cliente.trim()) {
      window.alert('Informe o nome do cliente para gerar a proposta.');
      return;
    }

    const janela = window.open('', '_blank');
    if (!janela) {
      window.alert('Permita a abertura de janelas para gerar a proposta em PDF.');
      return;
    }

    janela.opener = null;
    const data = new Intl.DateTimeFormat('pt-BR').format(new Date());
    const linhasParcelas = parcelas.map((item) => `
      <tr>
        <td>${item.parcelas}x</td>
        <td>${formatarMoeda(item.valor)}</td>
        <td>${item.taxa} a.m.</td>
      </tr>
    `).join('');

    janela.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Proposta MM Energia Solar - ${escapeHtml(dados.cliente)}</title>
  <style>
    *{box-sizing:border-box} body{margin:0;background:#eef2f7;color:#10233f;font-family:Arial,sans-serif}
    .page{width:210mm;min-height:297mm;margin:0 auto;background:white;padding:17mm}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #f5c400;padding-bottom:16px}
    .brand{display:flex;gap:12px;align-items:center}.mark{width:54px;height:54px;border-radius:15px;background:#f5c400;display:grid;place-items:center;font-size:25px;font-weight:900}
    h1{font-size:25px;margin:0}.muted{color:#667085}.badge{background:#10233f;color:white;border-radius:999px;padding:8px 14px;font-weight:700}
    .hero{margin:24px 0;padding:22px;border-radius:18px;background:linear-gradient(135deg,#071a35,#123f70);color:white}
    .hero h2{margin:0 0 8px;font-size:24px}.hero p{margin:5px 0;color:#d9e7f7}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}.card{border:1px solid #d8e0ea;border-radius:14px;padding:15px}
    .card span{display:block;color:#667085;font-size:12px;text-transform:uppercase;font-weight:700}.card strong{display:block;margin-top:6px;font-size:17px}
    .price{background:#fff7c7;border:1px solid #ead05c;border-radius:16px;padding:18px;margin:20px 0;display:flex;justify-content:space-between;align-items:center}
    .price strong{font-size:26px}.section-title{font-size:18px;margin:24px 0 10px}
    table{width:100%;border-collapse:collapse;font-size:13px}th{background:#10233f;color:white;text-align:left;padding:9px}td{padding:8px;border-bottom:1px solid #d8e0ea}
    .note{font-size:11px;line-height:1.5;color:#667085;margin-top:18px}.footer{margin-top:24px;padding-top:14px;border-top:2px solid #f5c400;display:flex;justify-content:space-between;font-size:12px}
    .actions{position:fixed;right:18px;bottom:18px}.actions button{border:0;border-radius:12px;padding:14px 18px;background:#f5c400;color:#10233f;font-weight:800;box-shadow:0 8px 24px #0003}
    @media print{body{background:white}.page{margin:0;padding:13mm}.actions{display:none}@page{size:A4;margin:0}}
    @media(max-width:800px){.page{width:100%;padding:20px}.grid{grid-template-columns:1fr}.header{align-items:flex-start}.badge{font-size:11px}}
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div class="brand"><div class="mark">☀</div><div><h1>MM Energia Solar</h1><div class="muted">Energia inteligente para sua casa ou empresa</div></div></div>
      <div class="badge">PROPOSTA COMERCIAL</div>
    </header>

    <section class="hero">
      <h2>Olá, ${escapeHtml(dados.cliente)}!</h2>
      <p>Preparamos uma solução fotovoltaica para reduzir sua conta de energia com segurança e acompanhamento completo.</p>
      <p><strong>Local:</strong> ${escapeHtml(dados.cidade)} ${dados.telefone ? `• <strong>Contato:</strong> ${escapeHtml(dados.telefone)}` : ''}</p>
    </section>

    <div class="grid">
      <div class="card"><span>Sistema</span><strong>${quantidadePlacas} painéis de ${escapeHtml(dados.potenciaPlaca)} W</strong></div>
      <div class="card"><span>Potência instalada</span><strong>${potenciaSistema.toFixed(2).replace('.', ',')} kWp</strong></div>
      <div class="card"><span>Geração estimada</span><strong>${escapeHtml(dados.geracaoMensal)} kWh/mês</strong></div>
      <div class="card"><span>Equipamentos</span><strong>${escapeHtml(dados.marcaPlaca)} + ${escapeHtml(dados.inversor)}</strong></div>
    </div>

    <div class="price"><div><span>Investimento à vista</span><div class="muted">Projeto completo instalado</div></div><strong>${formatarMoeda(valor)}</strong></div>

    <h3 class="section-title">Simulação de financiamento BelCred</h3>
    <table>
      <thead><tr><th>Prazo</th><th>Parcela estimada</th><th>Taxa informada</th></tr></thead>
      <tbody>${linhasParcelas}</tbody>
    </table>

    <h3 class="section-title">O que está incluso</h3>
    <div class="card"><strong>${escapeHtml(dados.observacoes)}</strong><p class="muted">Equipamentos, estrutura, proteções elétricas, instalação e trâmites de homologação conforme escopo comercial.</p></div>

    <p class="note">Simulação BelCred meramente indicativa, calculada pelos coeficientes das cotações fornecidas. Valores, taxas, prazo, IOF, disponibilidade e aprovação estão sujeitos à análise de crédito e confirmação da instituição financeira. A geração é uma estimativa e pode variar conforme localização, orientação, sombreamento, clima e condições da instalação.</p>

    <footer class="footer"><strong>MM Energia Solar • Bauru/SP</strong><span>Emitida em ${data} • Validade: ${escapeHtml(dados.validade)} dias</span></footer>
  </main>
  <div class="actions"><button onclick="window.print()">Salvar em PDF / Imprimir</button></div>
</body>
</html>`);
    janela.document.close();
  };

  return (
    <section className="finance-panel">
      <div className="finance-panel-header">
        <div>
          <h2>Gerador de proposta para o cliente</h2>
          <p>Crie uma proposta em PDF com o preço do kit e a simulação BelCred.</p>
        </div>
      </div>

      <div className="finance-form">
        <label className="finance-field">
          <span>Nome do cliente *</span>
          <input name="cliente" value={dados.cliente} onChange={atualizar} placeholder="Nome completo" />
        </label>
        <label className="finance-field">
          <span>Cidade/UF</span>
          <input name="cidade" value={dados.cidade} onChange={atualizar} />
        </label>
        <label className="finance-field">
          <span>Telefone</span>
          <input name="telefone" value={dados.telefone} onChange={atualizar} placeholder="(14) 99999-9999" />
        </label>
        <label className="finance-field">
          <span>Potência de cada painel (W)</span>
          <input type="number" name="potenciaPlaca" value={dados.potenciaPlaca} onChange={atualizar} />
        </label>
        <label className="finance-field">
          <span>Marca/modelo dos painéis</span>
          <input name="marcaPlaca" value={dados.marcaPlaca} onChange={atualizar} />
        </label>
        <label className="finance-field">
          <span>Inversor ou microinversor</span>
          <input name="inversor" value={dados.inversor} onChange={atualizar} />
        </label>
        <label className="finance-field">
          <span>Geração estimada (kWh/mês)</span>
          <input type="number" name="geracaoMensal" value={dados.geracaoMensal} onChange={atualizar} />
        </label>
        <label className="finance-field">
          <span>Valor final da proposta</span>
          <input type="number" step="0.01" name="valorProposta" value={dados.valorProposta} onChange={atualizar} />
        </label>
        <label className="finance-field">
          <span>Validade da proposta (dias)</span>
          <input type="number" name="validade" value={dados.validade} onChange={atualizar} />
        </label>
        <label className="finance-field">
          <span>Itens e observações</span>
          <textarea name="observacoes" value={dados.observacoes} onChange={atualizar} rows="3" />
        </label>
      </div>

      <div className="pricing-highlight">
        <span>BelCred: exemplo em 96x</span>
        <strong>{formatarMoeda(parcelas.find((item) => item.parcelas === 96)?.valor || 0)}</strong>
      </div>

      <button type="button" className="finance-primary-button" onClick={gerarPdf}>
        <FileDown size={19} />
        Gerar proposta em PDF
      </button>
    </section>
  );
}
