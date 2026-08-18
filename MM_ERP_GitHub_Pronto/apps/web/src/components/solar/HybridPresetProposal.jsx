import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, FileDown, ShieldCheck } from 'lucide-react';
import { cardFeeService } from '../../services/cardFeeService.js';
import { HYBRID_INVERTER_IMAGE, HYBRID_PANEL_IMAGE } from './hybridProposalAssets.js';

const KIT = {
  panelCount: 33,
  panelPowerW: 620,
  systemPowerKw: 20.46,
  inverterCount: 2,
  inverterModel: 'SAJ híbrido 7,5 kW Mono 220V',
  cashPrice: 34876,
  rsdPrice: 3200,
};

const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const assetUrl = (name) => `${import.meta.env.BASE_URL}${name}`;

function cardGross(net, feePercent) {
  const rate = Number(feePercent || 0) / 100;
  if (rate <= 0 || rate >= 1) return Number(net || 0);
  return Number(net || 0) / (1 - rate);
}

function loadLogoAsPng(src, maxWidth = 360, maxHeight = 240) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Não foi possível preparar o logotipo.'));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('Não foi possível carregar o logotipo.'));
    image.src = src;
  });
}

function addPng(doc, image, x, y, width, height) {
  if (!image) return;
  doc.addImage(image, 'PNG', x, y, width, height, undefined, 'FAST');
}

function addJpeg(doc, image, x, y, width, height) {
  if (!image) return;
  doc.addImage(image, 'JPEG', x, y, width, height, undefined, 'FAST');
}

function drawHeader(doc, logo, subtitle, price) {
  const navy = [8, 46, 88];
  const gold = [245, 188, 15];
  doc.setFillColor(...navy);
  doc.rect(0, 0, 210, 42, 'F');
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, 6, 25, 25, 3, 3, 'F');
    addPng(doc, logo, 12, 8, 21, 21);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text('MM ENERGIA SOLAR', logo ? 40 : 12, 17);
  doc.setFontSize(18);
  doc.text('PROPOSTA COMERCIAL', 198, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle, 198, 24, { align: 'right' });
  if (price) {
    doc.setTextColor(...gold);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(money(price), 198, 34, { align: 'right' });
  }
}

function drawFooter(doc, logo, page) {
  const navy = [8, 46, 88];
  doc.setFillColor(...navy);
  doc.rect(0, 280, 210, 17, 'F');
  if (logo) addPng(doc, logo, 11, 282, 13, 13);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('MM Energia Solar • Projeto, instalação, homologação e pós-venda.', 105, 289, { align: 'center' });
  doc.text(`Página ${page}/2`, 198, 289, { align: 'right' });
}

export default function HybridPresetProposal() {
  const [fees, setFees] = useState([]);
  const [loadingFees, setLoadingFees] = useState(true);
  const [selectedInstallments, setSelectedInstallments] = useState(21);
  const [client, setClient] = useState({ name: '', phone: '', city: 'Bauru/SP' });
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    cardFeeService.list('My Gateway')
      .then((rows) => { if (active) setFees(rows || []); })
      .catch((error) => { if (active) setMessage(`Não foi possível carregar as taxas do cartão: ${error.message}`); })
      .finally(() => { if (active) setLoadingFees(false); });
    return () => { active = false; };
  }, []);

  const selectedFee = useMemo(
    () => fees.find((item) => Number(item.installments) === Number(selectedInstallments)) || null,
    [fees, selectedInstallments],
  );

  const visibleFees = useMemo(
    () => fees.filter((item) => Number(item.installments) >= 12 && Number(item.installments) <= 21),
    [fees],
  );

  const cardTotal = selectedFee ? cardGross(KIT.cashPrice, selectedFee.fee_percent) : KIT.cashPrice;
  const cardInstallment = cardTotal / Math.max(1, Number(selectedInstallments || 1));

  const generatePdf = async () => {
    if (generating) return;
    setGenerating(true);
    setMessage('');

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const navy = [8, 46, 88];
      const gold = [245, 188, 15];
      const gray = [92, 105, 120];

      // O logo vem do public. As fotos do painel e inversor já estão embutidas como JPEG
      // no bundle da ERP e são entregues diretamente ao jsPDF, sem Image()/canvas no Android.
      const logo = await loadLogoAsPng(assetUrl('logo-mm.png')).catch(() => null);

      drawHeader(doc, logo, 'Sistema Fotovoltaico Híbrido', KIT.cashPrice);

      let y = 53;
      doc.setTextColor(...navy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('CLIENTE', 12, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(38, 48, 60);
      doc.setFontSize(8.5);
      doc.text(client.name || 'Não informado', 12, y + 7);
      doc.text(`Cidade: ${client.city || '-'}`, 12, y + 13);
      doc.text(`Contato: ${client.phone || '-'}`, 110, y + 13);

      y += 22;
      doc.setFillColor(247, 249, 252);
      doc.setDrawColor(218, 225, 233);
      doc.roundedRect(10, y, 190, 76, 3, 3, 'FD');
      doc.setTextColor(...navy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.text('Configuração do sistema', 15, y + 10);

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, y + 17, 80, 50, 2, 2, 'F');
      doc.roundedRect(105, y + 17, 80, 50, 2, 2, 'F');
      addJpeg(doc, HYBRID_PANEL_IMAGE, 29, y + 20, 52, 36);
      addJpeg(doc, HYBRID_INVERTER_IMAGE, 121, y + 20, 48, 36);

      doc.setTextColor(...navy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('TSUN 620W BIFACIAL', 55, y + 60, { align: 'center' });
      doc.text('SAJ HÍBRIDO 7,5 kW', 145, y + 60, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...gray);
      doc.setFontSize(7.5);
      doc.text(`${KIT.panelCount} módulos • ${KIT.systemPowerKw.toFixed(2).replace('.', ',')} kWp`, 55, y + 66, { align: 'center' });
      doc.text(`${KIT.inverterCount} unidades • Mono 220V`, 145, y + 66, { align: 'center' });

      y += 84;
      doc.setFillColor(...navy);
      doc.roundedRect(10, y, 190, 22, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('VALOR DO SISTEMA À VISTA / PIX', 16, y + 9);
      doc.setTextColor(...gold);
      doc.setFontSize(17);
      doc.text(money(KIT.cashPrice), 194, y + 15, { align: 'right' });

      y += 29;
      doc.setFillColor(255, 249, 235);
      doc.setDrawColor(245, 188, 15);
      doc.roundedRect(10, y, 190, 38, 3, 3, 'FD');
      doc.setTextColor(145, 93, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.2);
      doc.text('RSD (RAPID SHUTDOWN DEVICE) — OPCIONAL', 16, y + 9);
      doc.setFontSize(12.5);
      doc.text(money(KIT.rsdPrice), 194, y + 9, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(79, 68, 48);
      const rsdText = 'Dispositivo de desligamento rápido para desenergizar os cabos de corrente contínua próximos aos módulos, reduzindo a tensão durante emergências ou manutenções.';
      doc.text(doc.splitTextToSize(rsdText, 176), 16, y + 19);
      doc.setFont('helvetica', 'bold');
      doc.text('Valor separado e não incluso no total principal da proposta.', 16, y + 32);

      y += 46;
      doc.setTextColor(...navy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('Resumo comercial', 10, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(8);
      doc.text('Projeto completo com fornecimento dos equipamentos, instalação e homologação conforme escopo comercial.', 10, y + 8);
      doc.text('As condições de parcelamento, itens inclusos e garantias estão detalhadas na página 2.', 10, y + 14);

      drawFooter(doc, logo, 1);

      doc.addPage();
      drawHeader(doc, logo, 'Condições comerciais e escopo', null);

      y = 52;
      doc.setTextColor(...navy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Parcelamento no cartão', 10, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...gray);
      doc.setFontSize(7.5);
      doc.text('Taxas My Gateway cadastradas no ERP. O total abaixo mantém o valor líquido da venda.', 10, y + 7);
      y += 13;

      const rows = visibleFees.length ? visibleFees : (selectedFee ? [selectedFee] : []);
      doc.setFontSize(7.2);
      rows.slice(0, 10).forEach((fee, index) => {
        const installments = Number(fee.installments);
        const gross = cardGross(KIT.cashPrice, fee.fee_percent);
        const installment = gross / installments;
        const rowY = y + index * 7;
        doc.setFillColor(index % 2 ? 249 : 244, index % 2 ? 250 : 247, index % 2 ? 252 : 250);
        doc.rect(10, rowY, 190, 6.5, 'F');
        doc.setTextColor(39, 51, 66);
        doc.setFont('helvetica', 'bold');
        doc.text(`${installments}x`, 14, rowY + 4.4);
        doc.setFont('helvetica', 'normal');
        doc.text(`Taxa ${Number(fee.fee_percent).toFixed(2).replace('.', ',')}%`, 31, rowY + 4.4);
        doc.text(`Total ${money(gross)}`, 82, rowY + 4.4);
        doc.setFont('helvetica', 'bold');
        doc.text(`${installments}x de ${money(installment)}`, 195, rowY + 4.4, { align: 'right' });
      });

      y += 78;
      doc.setTextColor(...navy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('O que está incluso', 10, y);
      const included = [
        'Projeto e dimensionamento do sistema',
        '33 módulos fotovoltaicos TSUN 620W bifaciais',
        '2 inversores híbridos SAJ 7,5 kW Mono 220V',
        'Estrutura de fixação dos módulos',
        'Cabeamento e proteções elétricas conforme projeto',
        'Instalação, configuração e testes',
        'Homologação junto à concessionária',
        'Configuração do monitoramento e pós-venda MM Energia Solar',
      ];
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(45, 56, 70);
      doc.setFontSize(8);
      included.forEach((item, index) => doc.text(`• ${item}`, 14, y + 8 + index * 6));

      y += 61;
      doc.setFillColor(247, 249, 252);
      doc.setDrawColor(218, 225, 233);
      doc.roundedRect(10, y, 92, 47, 3, 3, 'FD');
      doc.roundedRect(108, y, 92, 47, 3, 3, 'FD');
      doc.setTextColor(...navy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Garantias e segurança', 16, y + 10);
      doc.text('Condições comerciais', 114, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 70, 84);
      doc.setFontSize(7.2);
      const warranty = [
        'Equipamentos: conforme fabricante.',
        'Instalação: conforme contrato comercial.',
        'Homologação acompanhada pela MM Energia Solar.',
        'RSD opcional: não incluso no valor principal.',
      ];
      const terms = [
        'Valor à vista/Pix: ' + money(KIT.cashPrice) + '.',
        'Parcelamento sujeito às taxas vigentes.',
        'Validade comercial: 7 dias.',
        'Cronograma conforme disponibilidade de equipamentos.',
      ];
      warranty.forEach((item, index) => doc.text(doc.splitTextToSize(`• ${item}`, 80), 16, y + 19 + index * 6));
      terms.forEach((item, index) => doc.text(doc.splitTextToSize(`• ${item}`, 80), 114, y + 19 + index * 6));

      y += 55;
      doc.setTextColor(...gray);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.text('Observação: imagens dos equipamentos são referências visuais dos modelos informados e podem variar conforme atualização de fabricante ou lote.', 10, y);

      drawFooter(doc, logo, 2);

      const safeName = String(client.name || 'cliente')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      doc.save(`proposta-hibrido-${safeName || 'cliente'}.pdf`);
      setMessage('Proposta completa de 2 páginas gerada com sucesso.');
    } catch (error) {
      setMessage(`Não foi possível gerar a proposta: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="hybrid-proposal-card">
      <div className="hybrid-proposal-head">
        <div>
          <span className="hybrid-proposal-kicker">KIT SELECIONADO</span>
          <h2>33 placas TSUN + 2 SAJ híbridos 7,5 kW</h2>
          <p>Preencha o cliente e gere a proposta completa em 2 páginas.</p>
        </div>
        <button type="button" className="hybrid-generate-button" onClick={generatePdf} disabled={generating}>
          <FileDown size={18} /> {generating ? 'Gerando...' : 'GERAR PROPOSTA PDF'}
        </button>
      </div>
      <div className="hybrid-summary-grid">
        <div><span>Potência</span><strong>20,46 kWp</strong></div>
        <div><span>À vista / Pix</span><strong>{money(KIT.cashPrice)}</strong></div>
        <div><span>RSD opcional</span><strong>{money(KIT.rsdPrice)}</strong></div>
      </div>
      <div className="hybrid-client-grid">
        <label><span>Cliente</span><input value={client.name} onChange={(e) => setClient((current) => ({ ...current, name: e.target.value }))} placeholder="Nome do cliente" /></label>
        <label><span>WhatsApp</span><input value={client.phone} onChange={(e) => setClient((current) => ({ ...current, phone: e.target.value }))} placeholder="Telefone" /></label>
        <label><span>Cidade</span><input value={client.city} onChange={(e) => setClient((current) => ({ ...current, city: e.target.value }))} /></label>
        <label><span>Parcelamento</span><select value={selectedInstallments} onChange={(e) => setSelectedInstallments(Number(e.target.value))}>{fees.map((fee) => <option key={fee.id || fee.installments} value={fee.installments}>{fee.installments}x — {Number(fee.fee_percent).toFixed(2).replace('.', ',')}%</option>)}</select></label>
      </div>
      <div className="hybrid-payment-row">
        <div><CreditCard size={17} /><span>{loadingFees ? 'Carregando taxas...' : selectedFee ? `${selectedInstallments}x de ${money(cardInstallment)} · total ${money(cardTotal)}` : 'Taxa de cartão não cadastrada'}</span></div>
        <div><ShieldCheck size={17} /><span>RSD {money(KIT.rsdPrice)} — opcional e fora do total.</span></div>
      </div>
      {message && <p className="hybrid-proposal-message">{message}</p>}
      <button type="button" className="hybrid-generate-button hybrid-generate-bottom" onClick={generatePdf} disabled={generating}>
        <FileDown size={18} /> {generating ? 'Gerando proposta...' : 'GERAR PROPOSTA PDF'}
      </button>
      <style>{`
        .hybrid-proposal-card{margin-top:18px;padding:20px;border:1px solid #dbe3ec;border-radius:22px;background:#fff;box-shadow:0 12px 30px rgba(15,44,82,.06)}
        .hybrid-proposal-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px}.hybrid-proposal-head h2{margin:4px 0 3px;color:#0b2b52;font-size:24px;line-height:1.2}.hybrid-proposal-head p{margin:0;color:#667085}.hybrid-proposal-kicker{font-size:11px;font-weight:900;letter-spacing:.08em;color:#8a6800}
        .hybrid-generate-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:13px;background:#0b2b52;color:#fff;font-weight:900;padding:13px 18px;min-height:48px;cursor:pointer;white-space:nowrap}.hybrid-generate-button:disabled{opacity:.65;cursor:wait}
        .hybrid-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:18px}.hybrid-summary-grid>div{min-width:0;padding:15px 16px;border:1px solid #e0e6ed;border-radius:16px;background:#fbfcfe}.hybrid-summary-grid span{display:block;color:#667085;font-size:12px;margin-bottom:5px}.hybrid-summary-grid strong{display:block;color:#0b2b52;font-size:22px;line-height:1.15;overflow-wrap:anywhere}
        .hybrid-client-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.hybrid-client-grid label{display:grid;gap:6px}.hybrid-client-grid label span{font-size:12px;font-weight:800;color:#344054}.hybrid-client-grid input,.hybrid-client-grid select{width:100%;min-width:0;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:12px;padding:12px 13px;background:#fff;font:inherit;color:#101828}
        .hybrid-payment-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.hybrid-payment-row>div{display:flex;align-items:center;gap:8px;min-width:0;padding:11px 12px;border-radius:12px;background:#f8fafc;color:#344054;font-size:13px}.hybrid-payment-row span{overflow-wrap:anywhere}
        .hybrid-proposal-message{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:#f0fdf4;color:#166534;font-weight:700;font-size:13px}.hybrid-generate-bottom{display:none;width:100%;margin-top:14px}
        @media(max-width:700px){.hybrid-proposal-card{padding:16px;border-radius:18px}.hybrid-proposal-head{display:block;margin-bottom:14px}.hybrid-proposal-head h2{font-size:20px}.hybrid-proposal-head>.hybrid-generate-button{display:none}.hybrid-summary-grid{grid-template-columns:1fr;gap:8px}.hybrid-summary-grid>div{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 13px}.hybrid-summary-grid span{margin:0;font-size:12px}.hybrid-summary-grid strong{font-size:18px;text-align:right;white-space:nowrap}.hybrid-client-grid{grid-template-columns:1fr}.hybrid-payment-row{grid-template-columns:1fr}.hybrid-generate-bottom{display:flex;position:sticky;bottom:10px;z-index:4;box-shadow:0 8px 22px rgba(11,43,82,.24)}}
      `}</style>
    </section>
  );
}
