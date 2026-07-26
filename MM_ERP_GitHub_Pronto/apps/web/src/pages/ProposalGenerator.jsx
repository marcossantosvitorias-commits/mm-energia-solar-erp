import React, { useMemo, useState } from 'react';
import { FileDown, ShieldCheck, Sparkles } from 'lucide-react';
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

export default function ProposalGenerator({ quantidadePlacas, precoRecomendado, modulo, inversor, potenciaSistemaKw }) {
  const [dados, setDados] = useState({
    cliente: '',
    cidade: 'Bauru/SP',
    telefone: '',
    potenciaPlaca: Math.round((Number(potenciaSistemaKw || 0) * 1000) / quantidadePlacas) || 620,
    marcaPlaca: modulo || 'Painel fotovoltaico N-Type',
    inversor: inversor || 'Inversor conforme kit selecionado',
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
    const logoUrl = `${window.location.origin}/logo-mm.png`;
    const linhasParcelas = parcelas.map((item) => `
      <tr>
        <td><strong>${item.parcelas}x</strong></td>
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
    *{box-sizing:border-box}
    :root{--navy:#08274d;--navy2:#0d3c70;--gold:#f7bd16;--ink:#142033;--muted:#667085;--line:#dde4ee;--soft:#f5f8fc}
    body{margin:0;background:#dfe6ef;color:var(--ink);font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{width:210mm;min-height:297mm;margin:18px auto;background:#fff;box-shadow:0 24px 70px #00152b2b;overflow:hidden}
    .top{background:linear-gradient(135deg,var(--navy),var(--navy2));color:#fff;padding:17mm 16mm 13mm;position:relative;overflow:hidden}
    .top:after{content:'';position:absolute;width:160px;height:160px;border:34px solid #ffffff12;border-radius:50%;right:-48px;top:-58px}
    .brand-row{display:flex;align-items:center;justify-content:space-between;gap:24px}
    .logo{width:156px;max-height:66px;object-fit:contain;object-position:left center;filter:drop-shadow(0 4px 12px #0004)}
    .proposal-tag{border:1px solid #ffffff66;border-radius:999px;padding:8px 14px;font-size:11px;font-weight:800;letter-spacing:1.4px}
    .headline{margin:24px 0 5px;font-size:31px;line-height:1.06;max-width:520px}
    .headline b{color:var(--gold)}
    .sub{margin:0;color:#d9e8f7;font-size:14px;line-height:1.55;max-width:560px}
    .client-strip{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:12px;margin-top:22px}
    .client-box{background:#ffffff12;border:1px solid #ffffff26;border-radius:12px;padding:11px 12px}
    .client-box span{display:block;color:#b9cee3;font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:800}
    .client-box strong{display:block;margin-top:5px;font-size:13px;color:#fff}
    .content{padding:11mm 16mm 13mm}
    .section-title{display:flex;align-items:center;gap:9px;margin:0 0 12px;color:var(--navy);font-size:16px}
    .section-title:before{content:'';width:5px;height:19px;border-radius:4px;background:var(--gold)}
    .system-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .metric{background:var(--soft);border:1px solid var(--line);border-radius:13px;padding:13px;min-height:91px}
    .metric span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.8px;font-weight:800}
    .metric strong{display:block;margin-top:8px;color:var(--navy);font-size:14px;line-height:1.3}
    .investment{margin:17px 0;background:linear-gradient(135deg,#fff8dc,#fffdf5);border:1px solid #f0d26a;border-radius:16px;padding:18px;display:grid;grid-template-columns:1fr auto;align-items:center;gap:18px}
    .investment span{display:block;color:#8b6a00;font-size:10px;text-transform:uppercase;font-weight:800;letter-spacing:1px}
    .investment small{display:block;color:var(--muted);margin-top:5px}
    .investment strong{font-size:29px;color:var(--navy)}
    .included{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0 18px}
    .included div{border:1px solid var(--line);border-radius:11px;padding:10px;background:#fff}
    .included b{display:block;color:var(--navy);font-size:11px}.included small{display:block;margin-top:3px;color:var(--muted);font-size:9px;line-height:1.35}
    table{width:100%;border-collapse:separate;border-spacing:0;font-size:11px;border:1px solid var(--line);border-radius:12px;overflow:hidden}
    th{background:var(--navy);color:#fff;text-align:left;padding:9px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.6px}
    td{padding:8px 10px;border-bottom:1px solid var(--line)}tr:last-child td{border-bottom:0}tbody tr:nth-child(even){background:#f8fafc}
    .notes{margin-top:16px;border-radius:12px;background:#f8fafc;border-left:5px solid var(--gold);padding:13px 14px}
    .notes strong{color:var(--navy);font-size:12px}.notes p{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.5}
    .legal{font-size:8.6px;line-height:1.5;color:#7b8798;margin:15px 0}
    .footer{background:var(--navy);color:#fff;padding:10mm 16mm;display:flex;justify-content:space-between;align-items:center;gap:20px}
    .footer-logo{width:112px;max-height:46px;object-fit:contain;object-position:left center}.footer div{font-size:10px;line-height:1.6;text-align:right;color:#d9e8f7}.footer b{color:#fff}
    .actions{position:fixed;right:18px;bottom:18px}.actions button{border:0;border-radius:14px;padding:15px 20px;background:var(--gold);color:var(--navy);font-weight:900;box-shadow:0 10px 30px #0004;cursor:pointer}
    @media print{body{background:#fff}.page{margin:0;box-shadow:none}.actions{display:none}@page{size:A4;margin:0}}
    @media(max-width:800px){.page{width:100%;margin:0}.top,.content,.footer{padding-left:22px;padding-right:22px}.system-grid,.included{grid-template-columns:1fr 1fr}.client-strip{grid-template-columns:1fr}.investment{grid-template-columns:1fr}.brand-row{align-items:flex-start}.logo{width:130px}}
  </style>
</head>
<body>
  <main class="page">
    <section class="top">
      <div class="brand-row">
        <img class="logo" src="${logoUrl}" alt="MM Energia Solar" />
        <div class="proposal-tag">PROPOSTA COMERCIAL</div>
      </div>
      <h1 class="headline">Energia solar pensada para <b>economizar todos os meses</b>.</h1>
      <p class="sub">Solução fotovoltaica completa, com equipamentos de qualidade, instalação especializada, homologação e suporte pós-venda.</p>
      <div class="client-strip">
        <div class="client-box"><span>Cliente</span><strong>${escapeHtml(dados.cliente)}</strong></div>
        <div class="client-box"><span>Local</span><strong>${escapeHtml(dados.cidade)}</strong></div>
        <div class="client-box"><span>Contato</span><strong>${escapeHtml(dados.telefone || 'Não informado')}</strong></div>
      </div>
    </section>

    <section class="content">
      <h2 class="section-title">Resumo do sistema</h2>
      <div class="system-grid">
        <div class="metric"><span>Quantidade</span><strong>${quantidadePlacas} painéis</strong></div>
        <div class="metric"><span>Potência instalada</span><strong>${potenciaSistema.toFixed(2).replace('.', ',')} kWp</strong></div>
        <div class="metric"><span>Geração estimada</span><strong>${escapeHtml(dados.geracaoMensal)} kWh/mês</strong></div>
        <div class="metric"><span>Validade</span><strong>${escapeHtml(dados.validade)} dias</strong></div>
      </div>

      <div class="investment">
        <div><span>Investimento total</span><small>Projeto completo instalado e homologado</small></div>
        <strong>${formatarMoeda(valor)}</strong>
      </div>

      <h2 class="section-title">Equipamentos e serviços</h2>
      <div class="included">
        <div><b>Painéis</b><small>${escapeHtml(dados.marcaPlaca)} — ${escapeHtml(dados.potenciaPlaca)} W</small></div>
        <div><b>Inversor</b><small>${escapeHtml(dados.inversor)}</small></div>
        <div><b>Instalação</b><small>Equipe especializada, estrutura e proteções</small></div>
        <div><b>Homologação</b><small>Processo junto à concessionária incluso</small></div>
      </div>

      <h2 class="section-title">Simulação de financiamento BelCred</h2>
      <table>
        <thead><tr><th>Prazo</th><th>Parcela estimada</th><th>Taxa informada</th></tr></thead>
        <tbody>${linhasParcelas}</tbody>
      </table>

      <div class="notes">
        <strong>Observações da proposta</strong>
        <p>${escapeHtml(dados.observacoes)}</p>
      </div>

      <p class="legal">A simulação BelCred é meramente indicativa, calculada com base nos coeficientes das cotações fornecidas. Valores, taxas, prazo, IOF, disponibilidade e aprovação estão sujeitos à análise de crédito e confirmação da instituição financeira. A geração apresentada é uma estimativa e pode variar conforme localização, orientação, sombreamento, clima e condições da instalação.</p>
    </section>

    <footer class="footer">
      <img class="footer-logo" src="${logoUrl}" alt="MM Energia Solar" />
      <div><b>MM Energia Solar • Bauru/SP</b><br/>Proposta emitida em ${data} • Validade: ${escapeHtml(dados.validade)} dias<br/>Projeto, instalação, homologação e pós-venda.</div>
    </footer>
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
          <p>Crie uma proposta comercial profissional com a identidade da MM Energia Solar.</p>
        </div>
      </div>

      <div className="finance-form">
        <label className="finance-field"><span>Nome do cliente *</span><input name="cliente" value={dados.cliente} onChange={atualizar} placeholder="Nome completo" /></label>
        <label className="finance-field"><span>Cidade/UF</span><input name="cidade" value={dados.cidade} onChange={atualizar} /></label>
        <label className="finance-field"><span>Telefone</span><input name="telefone" value={dados.telefone} onChange={atualizar} placeholder="(14) 99999-9999" /></label>
        <label className="finance-field"><span>Potência de cada painel (W)</span><input type="number" name="potenciaPlaca" value={dados.potenciaPlaca} onChange={atualizar} /></label>
        <label className="finance-field"><span>Marca/modelo dos painéis</span><input name="marcaPlaca" value={dados.marcaPlaca} onChange={atualizar} /></label>
        <label className="finance-field"><span>Inversor ou microinversor</span><input name="inversor" value={dados.inversor} onChange={atualizar} /></label>
        <label className="finance-field"><span>Geração estimada (kWh/mês)</span><input type="number" name="geracaoMensal" value={dados.geracaoMensal} onChange={atualizar} /></label>
        <label className="finance-field"><span>Valor final da proposta</span><input type="number" step="0.01" name="valorProposta" value={dados.valorProposta} onChange={atualizar} /></label>
        <label className="finance-field"><span>Validade da proposta (dias)</span><input type="number" name="validade" value={dados.validade} onChange={atualizar} /></label>
        <label className="finance-field"><span>Itens e observações</span><textarea name="observacoes" value={dados.observacoes} onChange={atualizar} rows="3" /></label>
      </div>

      <div className="pricing-highlight">
        <span>BelCred: exemplo em 96x</span>
        <strong>{formatarMoeda(parcelas.find((item) => item.parcelas === 96)?.valor || 0)}</strong>
      </div>

      <div style={{ marginTop: 18, border: '1px solid #dce5ef', borderRadius: 18, padding: 16, background: 'linear-gradient(135deg, #f8fbff, #fffdf3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: '#0b2b52' }}>
          <Sparkles size={20} />
          <strong>Proposta pronta para apresentação</strong>
        </div>
        <button
          type="button"
          onClick={gerarPdf}
          style={{
            width: '100%',
            minHeight: 62,
            border: 0,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #08274d, #0d3c70)',
            color: '#fff',
            fontSize: 17,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 11,
            boxShadow: '0 12px 28px rgba(8,39,77,.25)',
            cursor: 'pointer',
          }}
        >
          <FileDown size={22} />
          Gerar proposta profissional em PDF
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, color: '#667085', fontSize: 12 }}>
          <ShieldCheck size={15} /> Com logotipo, dados do sistema, investimento e financiamento
        </div>
      </div>
    </section>
  );
}
