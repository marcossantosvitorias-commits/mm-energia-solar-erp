import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, FileDown, ShieldCheck, Zap } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { cardFeeService } from '../../services/cardFeeService.js';
import { PAINEL_IMAGE } from '../../assets/proposalImages.js';

const KIT = {
  panelCount: 33,
  panelPowerW: 620,
  systemPowerKw: 20.46,
  panelModel: 'TSUN 620W bifacial N-Type',
  inverterCount: 2,
  inverterModel: 'SAJ híbrido 7,5 kW H2 Mono 220V',
  cashPrice: 37656,
  rsdPrice: 3200,
};

const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function cardGross(net, feePercent) {
  const rate = Number(feePercent || 0) / 100;
  if (rate <= 0 || rate >= 1) return Number(net || 0);
  return Number(net || 0) / (1 - rate);
}

async function imageToDataUrl(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch { resolve(null); }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export default function HybridPresetProposal() {
  const [fees, setFees] = useState([]);
  const [loadingFees, setLoadingFees] = useState(true);
  const [selectedInstallments, setSelectedInstallments] = useState(21);
  const [client, setClient] = useState({ name: '', phone: '', city: 'Bauru/SP' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadFees() {
      try {
        const rows = await cardFeeService.list('My Gateway');
        if (active) setFees(rows || []);
      } catch (error) {
        if (active) setMessage(`Não foi possível carregar as taxas do cartão: ${error.message}`);
      } finally {
        if (active) setLoadingFees(false);
      }
    }
    loadFees();
    return () => { active = false; };
  }, []);

  const selectedFee = useMemo(() => fees.find((item) => Number(item.installments) === Number(selectedInstallments)) || null, [fees, selectedInstallments]);
  const cardTotal = selectedFee ? cardGross(KIT.cashPrice, selectedFee.fee_percent) : KIT.cashPrice;
  const cardInstallment = cardTotal / Math.max(1, Number(selectedInstallments || 1));

  const visibleFees = useMemo(() => fees.filter((item) => Number(item.installments) >= 12 && Number(item.installments) <= 21), [fees]);

  const generatePdf = async () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const navy = [8, 46, 88];
    const gold = [245, 188, 15];
    const gray = [92, 105, 120];
    const logoUrl = `${import.meta.env.BASE_URL}logo-mm.png`;
    const logo = await imageToDataUrl(logoUrl);

    doc.setFillColor(...navy); doc.rect(0, 0, 210, 48, 'F');
    if (logo) {
      try { doc.addImage(logo, 'PNG', 10, 8, 43, 30, undefined, 'FAST'); } catch {}
    } else {
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.text('MM ENERGIA SOLAR', 12, 18);
    }
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(19); doc.text('PROPOSTA COMERCIAL', 62, 18);
    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.text('Sistema Fotovoltaico Híbrido', 62, 26);
    doc.setTextColor(...gold); doc.setFont('helvetica','bold'); doc.setFontSize(17); doc.text(money(KIT.cashPrice), 62, 38);

    let y = 57;
    doc.setTextColor(...navy); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text('CLIENTE', 12, y);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(38,48,60);
    doc.text(client.name || 'Não informado', 36, y);
    doc.text(`Cidade: ${client.city || '-'}`, 12, y + 7);
    doc.text(`Contato: ${client.phone || '-'}`, 112, y + 7);

    y += 18;
    doc.setFillColor(247,249,252); doc.setDrawColor(218,225,233); doc.roundedRect(10, y, 190, 56, 3, 3, 'FD');
    doc.setTextColor(...navy); doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Configuração do sistema', 15, y + 10);
    try { doc.addImage(PAINEL_IMAGE, 'JPEG', 16, y + 16, 22, 32, undefined, 'FAST'); } catch {}
    doc.setFontSize(9.3); doc.text(`${KIT.panelCount} placas TSUN ${KIT.panelPowerW}W bifacial`, 44, y + 24);
    doc.setFont('helvetica','normal'); doc.setTextColor(...gray); doc.text(`Potência instalada: ${KIT.systemPowerKw.toFixed(2).replace('.', ',')} kWp`, 44, y + 31);

    doc.setFillColor(241,243,246); doc.setDrawColor(204,211,219); doc.roundedRect(128, y + 15, 60, 33, 3, 3, 'FD');
    doc.setTextColor(220,38,38); doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text('7.5kW', 158, y + 26, { align: 'center' });
    doc.setFontSize(13); doc.text('SAJ', 158, y + 34, { align: 'center' });
    doc.setTextColor(...navy); doc.setFontSize(8.3); doc.text('HÍBRIDO · MONO 220V', 158, y + 42, { align: 'center' });
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.text('2 inversores', 158, y + 47, { align: 'center' });

    y += 65;
    doc.setFillColor(...navy); doc.roundedRect(10, y, 190, 24, 3, 3, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.text('VALOR DO SISTEMA À VISTA / PIX', 16, y + 9);
    doc.setTextColor(...gold); doc.setFontSize(18); doc.text(money(KIT.cashPrice), 194, y + 16, { align: 'right' });

    y += 31;
    doc.setFillColor(255,249,235); doc.setDrawColor(245,188,15); doc.roundedRect(10, y, 190, 39, 3, 3, 'FD');
    doc.setTextColor(145,93,0); doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('RSD — OPCIONAL DE SEGURANÇA', 16, y + 9);
    doc.setFontSize(13); doc.text(money(KIT.rsdPrice), 194, y + 9, { align: 'right' });
    doc.setFont('helvetica','normal'); doc.setFontSize(7.2); doc.setTextColor(79,68,48);
    const rsdText = 'Rapid Shutdown Device (Dispositivo de Desligamento Rápido). Equipamento de segurança para sistemas fotovoltaicos sobre telhados, destinado a desenergizar rapidamente os cabos CC próximos aos módulos em emergências ou manutenções.';
    const rsdLines = doc.splitTextToSize(rsdText, 176); doc.text(rsdLines, 16, y + 18);
    doc.setFont('helvetica','bold'); doc.text('Não incluso no valor total da proposta. Adicionar somente se o cliente optar.', 16, y + 34);

    y += 47;
    doc.setTextColor(...navy); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text('Opções de cartão — taxas cadastradas na ERP', 10, y);
    y += 5;
    const rows = visibleFees.length ? visibleFees : (selectedFee ? [selectedFee] : []);
    doc.setFontSize(7.3);
    rows.slice(0, 10).forEach((fee, index) => {
      const installments = Number(fee.installments);
      const gross = cardGross(KIT.cashPrice, fee.fee_percent);
      const installment = gross / installments;
      const rowY = y + index * 7;
      doc.setFillColor(index % 2 ? 249 : 244, index % 2 ? 250 : 247, index % 2 ? 252 : 250); doc.rect(10, rowY, 190, 6.5, 'F');
      doc.setTextColor(39,51,66); doc.setFont('helvetica','bold'); doc.text(`${installments}x`, 14, rowY + 4.3);
      doc.setFont('helvetica','normal'); doc.text(`Taxa ${Number(fee.fee_percent).toFixed(2).replace('.', ',')}%`, 32, rowY + 4.3);
      doc.text(`Total ${money(gross)}`, 83, rowY + 4.3);
      doc.setFont('helvetica','bold'); doc.text(`${installments}x de ${money(installment)}`, 195, rowY + 4.3, { align: 'right' });
    });

    doc.setFillColor(...navy); doc.rect(0, 278, 210, 19, 'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.text('MM Energia Solar • Projeto, instalação e homologação conforme escopo comercial.', 105, 288, { align: 'center' });

    const safeName = String(client.name || 'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    doc.save(`proposta-hibrido-${safeName || 'cliente'}.pdf`);
  };

  return (
    <section className="finance-panel" style={{ marginTop: 18, border: '2px solid #f5bc0f' }}>
      <div className="finance-panel-header">
        <div>
          <h2>Proposta pronta — 33 TSUN + 2 SAJ híbridos 7,5 kW</h2>
          <p>Kit comercial fixo para gerar a proposta no padrão da MM ERP.</p>
        </div>
        <Zap size={24} color="#0b2b52" />
      </div>

      <div className="finance-grid" style={{ marginBottom: 16 }}>
        <article className="finance-panel"><span>Potência</span><strong className="dashboard-big-number">20,46 kWp</strong></article>
        <article className="finance-panel"><span>À vista / Pix</span><strong className="dashboard-big-number">{money(KIT.cashPrice)}</strong></article>
        <article className="finance-panel"><span>RSD opcional</span><strong className="dashboard-big-number">{money(KIT.rsdPrice)}</strong></article>
      </div>

      <div className="finance-form">
        <label className="finance-field"><span>Cliente</span><input value={client.name} onChange={(e) => setClient((current) => ({ ...current, name: e.target.value }))} placeholder="Nome do cliente" /></label>
        <label className="finance-field"><span>WhatsApp</span><input value={client.phone} onChange={(e) => setClient((current) => ({ ...current, phone: e.target.value }))} placeholder="Telefone" /></label>
        <label className="finance-field"><span>Cidade</span><input value={client.city} onChange={(e) => setClient((current) => ({ ...current, city: e.target.value }))} /></label>
        <label className="finance-field"><span>Parcelamento para destaque</span><select value={selectedInstallments} onChange={(e) => setSelectedInstallments(Number(e.target.value))}>{fees.map((fee) => <option key={fee.id || fee.installments} value={fee.installments}>{fee.installments}x — {Number(fee.fee_percent).toFixed(2).replace('.', ',')}%</option>)}</select></label>
      </div>

      {message && <p className="finance-notice">{message}</p>}

      <div className="finance-list-item" style={{ marginTop: 14 }}>
        <div><strong><CreditCard size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Cartão selecionado</strong><span>{loadingFees ? 'Carregando taxas...' : selectedFee ? `${selectedInstallments}x com taxa de ${Number(selectedFee.fee_percent).toFixed(2).replace('.', ',')}%` : 'Taxa não cadastrada'}</span></div>
        <strong>{selectedFee ? `${selectedInstallments}x de ${money(cardInstallment)}` : '—'}</strong>
      </div>

      <div className="finance-list-item">
        <div><strong><ShieldCheck size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />RSD (Rapid Shutdown Device)</strong><span>Opcional e não somado ao total principal. Será exibido separado no PDF.</span></div>
        <strong>{money(KIT.rsdPrice)}</strong>
      </div>

      <div className="finance-actions" style={{ marginTop: 16 }}>
        <button type="button" className="finance-button" onClick={generatePdf}><FileDown size={17} /> Gerar proposta PDF</button>
      </div>
    </section>
  );
}
