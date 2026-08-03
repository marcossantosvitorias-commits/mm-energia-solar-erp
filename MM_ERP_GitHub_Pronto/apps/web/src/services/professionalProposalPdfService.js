import { jsPDF } from 'jspdf';
import { MICROINVERSOR_IMAGE, PAINEL_IMAGE } from '../assets/proposalImages.js';
import { buildMonthlyGeneration } from '../lib/monthlyGeneration.js';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const BELCRED = [
  { installments: 24, rate: '1,91%', factor: 978.28 / 16383.49 },
  { installments: 30, rate: '1,97%', factor: 833.22 / 16383.49 },
  { installments: 36, rate: '2,02%', factor: 739.04 / 16383.49 },
  { installments: 48, rate: '2,06%', factor: 621.09 / 16383.49 },
  { installments: 60, rate: '2,10%', factor: 555.84 / 16383.49 },
  { installments: 72, rate: '2,19%', factor: 524.95 / 16383.49 },
  { installments: 84, rate: '2,28%', factor: 509.99 / 16383.49 },
  { installments: 96, rate: '2,32%', factor: 496.62 / 16383.49 },
];

const digits = (value = '') => String(value).replace(/\D/g, '');
const number = (value) => Number(value) || 0;
const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const generationByPanel = (powerW) => (number(powerW) * 5.2 * 0.8 * 30) / 1000;
const safeFileName = (name) => String(name || 'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

export function normalizeProposalForPdf(proposal = {}) {
  const stored = proposal.proposal_data && typeof proposal.proposal_data === 'object' ? proposal.proposal_data : {};
  const panelCount = number(firstValue(proposal.panel_count, stored.quantidadePlacas, proposal.quantidadePlacas));
  const panelPowerW = number(firstValue(proposal.panel_power_w, stored.potenciaPlaca, proposal.potenciaPlaca)) || 620;
  const monthlyGenerationKwh = number(firstValue(proposal.monthly_generation_kwh, stored.geracaoMensal, proposal.geracaoMensal)) || Math.round(generationByPanel(panelPowerW) * panelCount);

  return {
    clientName: String(firstValue(proposal.client_name, stored.cliente, proposal.cliente, '') || ''),
    city: String(firstValue(proposal.city, stored.cidade, proposal.cidade, '') || ''),
    phone: String(firstValue(proposal.phone, stored.telefone, proposal.telefone, '') || ''),
    panelCount,
    panelPowerW,
    monthlyGenerationKwh,
    amount: number(firstValue(proposal.total_amount, stored.valorProposta, proposal.valorProposta)),
    validityDays: Math.max(1, number(firstValue(proposal.validity_days, stored.validade, proposal.validade)) || 7),
    panelModel: String(firstValue(proposal.panel_model, stored.marcaPlaca, proposal.marcaPlaca, 'Painel fotovoltaico de alta eficiência') || 'Painel fotovoltaico de alta eficiência'),
    inverterModel: String(firstValue(proposal.inverter_model, stored.inversor, proposal.inversor, 'Inversor dimensionado para o sistema') || 'Inversor dimensionado para o sistema'),
    paymentOptions: stored.paymentOptions || proposal.paymentOptions || {},
  };
}

function box(doc, x, y, width, height, fill = [246, 248, 252]) {
  doc.setFillColor(...fill);
  doc.setDrawColor(220, 226, 235);
  doc.roundedRect(x, y, width, height, 3, 3, 'FD');
}

function header(doc, title, highlight, tag) {
  doc.setFillColor(8, 46, 88); doc.rect(0, 0, 210, 72, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('MM ENERGIA SOLAR', 12, 18);
  doc.setFontSize(7.5); doc.text(tag, 198, 16, { align: 'right' }); doc.setFontSize(21); doc.text(title, 12, 34);
  doc.setTextColor(255, 194, 15); doc.text(highlight, 12, 45);
}

function footer(doc, validityDays) {
  doc.setFillColor(8, 46, 88); doc.rect(0, 266, 210, 31, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.text(`MM Energia Solar - Validade ${validityDays} dias`, 198, 283, { align: 'right' });
}

function containImage(doc, image, x, y, width, height) {
  try {
    const properties = doc.getImageProperties(image);
    const scale = Math.min(width / properties.width, height / properties.height);
    const imageWidth = properties.width * scale;
    const imageHeight = properties.height * scale;
    doc.addImage(image, 'JPEG', x + (width - imageWidth) / 2, y + (height - imageHeight) / 2, imageWidth, imageHeight, undefined, 'NONE');
  } catch {}
}

function drawMonthlyGenerationChart(doc, monthlyAverage, city) {
  const months = buildMonthlyGeneration(monthlyAverage);
  const annualTotal = Math.round(months.reduce((sum, item) => sum + item.generation, 0));
  const maximumGeneration = Math.max(...months.map((item) => item.generation), 1);
  const maximumScale = Math.max(100, Math.ceil(maximumGeneration / 50) * 50);
  const x = 13; const y = 95; const width = 184; const height = 130;
  const left = x + 18; const right = x + width - 6; const top = y + 20; const base = y + height - 23;
  const chartHeight = base - top; const chartWidth = right - left; const slotWidth = chartWidth / months.length; const barWidth = Math.min(9, slotWidth * 0.62);

  doc.setTextColor(16, 47, 82); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Estimativa de geração de janeiro a dezembro', 13, 84);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 99, 118);
  doc.text(`Local: ${city || 'São Paulo'} - Geração anual estimada: ${annualTotal.toLocaleString('pt-BR')} kWh`, 13, 90);
  doc.setFillColor(249, 251, 253); doc.setDrawColor(220, 229, 237); doc.roundedRect(x, y, width, height, 4, 4, 'FD');

  for (let index = 0; index <= 4; index += 1) {
    const lineY = top + (chartHeight / 4) * index;
    const value = Math.round(maximumScale - (maximumScale / 4) * index);
    doc.setDrawColor(221, 229, 237); doc.setLineWidth(0.25); doc.line(left, lineY, right, lineY);
    doc.setFontSize(5.5); doc.setTextColor(103, 119, 135); doc.text(String(value), left - 3, lineY + 1.7, { align: 'right' });
  }

  months.forEach((item, index) => {
    const barHeight = Math.max(1, (item.generation / maximumScale) * chartHeight);
    const barX = left + slotWidth * index + (slotWidth - barWidth) / 2;
    const barY = base - barHeight;
    doc.setFillColor(index === 10 ? 245 : 22, index === 10 ? 196 : 115, index === 10 ? 0 : 178);
    doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.2); doc.setTextColor(37, 55, 72);
    doc.text(Math.round(item.generation).toLocaleString('pt-BR'), barX + barWidth / 2, Math.max(top + 5, barY - 2), { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(81, 99, 116);
    doc.text(item.month, barX + barWidth / 2, base + 7, { align: 'center' });
  });

  doc.setFontSize(6.4); doc.setTextColor(91, 109, 128);
  doc.text('A estimativa pode variar conforme orientação, inclinação, sombreamento, clima e condições reais da instalação.', 13, 238);
}

function drawPaymentPage(doc, data) {
  const cardTotal = number(data.paymentOptions?.card?.total) || data.amount;
  const savedCardOptions = Array.isArray(data.paymentOptions?.card?.options) ? data.paymentOptions.card.options : [];
  const cardOptions = savedCardOptions.length ? savedCardOptions.map((option) => ({ installments: number(option.parcelas || option.installments), value: number(option.valorParcela || option.value) })) : Array.from({ length: 10 }, (_, index) => ({ installments: index + 12, value: cardTotal / (index + 12) }));

  header(doc, 'Condições de pagamento', 'BelCred e cartão.', 'PAGAMENTOS');
  doc.setTextColor(16, 47, 82); doc.setFontSize(12); doc.text('Financiamento BelCred', 12, 83);
  BELCRED.forEach((option, index) => {
    box(doc, 12, 90 + index * 12, 186, 11); doc.setFontSize(8);
    doc.text(`${option.installments}x`, 16, 97 + index * 12); doc.text(money.format(data.amount * option.factor), 62, 97 + index * 12); doc.text(`${option.rate} a.m.`, 155, 97 + index * 12);
  });
  doc.setFontSize(12); doc.text('Cartão de crédito', 12, 200);
  cardOptions.slice(0, 10).forEach((option, index) => {
    const x = 12 + (index % 3) * 63; const y = 207 + Math.floor(index / 3) * 13;
    box(doc, x, y, 59, 10); doc.setFontSize(7); doc.text(`${option.installments}x de ${money.format(option.value)}`, x + 3, y + 6.5);
  });
  footer(doc, data.validityDays);
}

export async function generateProfessionalProposalPdf(proposal = {}) {
  const data = normalizeProposalForPdf(proposal);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  header(doc, 'Energia solar pensada para', 'economizar todos os meses.', 'PROPOSTA COMERCIAL');
  let y = 82;
  [['CLIENTE', data.clientName || '-'], ['LOCAL', data.city || '-'], ['CONTATO', data.phone || '-']].forEach(([label, value]) => {
    box(doc, 12, y, 186, 14, [20, 66, 112]); doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.text(`${label}: ${value}`, 16, y + 9); y += 17;
  });
  doc.setTextColor(16, 47, 82); doc.setFontSize(13); doc.text('Resumo do sistema', 12, 140);
  [['Quantidade', `${data.panelCount} painéis`], ['Potência', `${((data.panelCount * data.panelPowerW) / 1000).toFixed(2).replace('.', ',')} kWp`]].forEach(([label, value], index) => {
    const x = index ? 106 : 12;
    box(doc, x, 147, 92, 22); doc.setFontSize(7); doc.text(label, x + 4, 154); doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text(value, x + 4, 163);
  });
  box(doc, 12, 174, 186, 22); doc.setFontSize(7); doc.text('Geração estimada', 16, 181); doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text(`${Math.round(data.monthlyGenerationKwh)} kWh/mês`, 16, 190);
  footer(doc, data.validityDays);

  doc.addPage(); header(doc, 'Sua geração prevista', 'em todos os meses.', 'PREVISÃO ANUAL'); drawMonthlyGenerationChart(doc, data.monthlyGenerationKwh, data.city); footer(doc, data.validityDays);
  doc.addPage(); drawPaymentPage(doc, data);
  doc.addPage(); header(doc, 'Equipamentos escolhidos para', 'desempenho e segurança.', 'EQUIPAMENTOS');
  box(doc, 12, 84, 90, 105, [255, 255, 255]); containImage(doc, PAINEL_IMAGE, 20, 91, 74, 50); doc.setTextColor(16, 47, 82); doc.setFontSize(9); doc.text(doc.splitTextToSize(data.panelModel, 78), 16, 149); doc.setFontSize(7); doc.text('Garantia: 15 anos', 16, 181);
  box(doc, 108, 84, 90, 105, [255, 255, 255]); containImage(doc, MICROINVERSOR_IMAGE, 116, 91, 74, 50); doc.setFontSize(9); doc.text(doc.splitTextToSize(data.inverterModel, 78), 112, 149); doc.setFontSize(7); doc.text('Garantia: 15 anos', 112, 181);
  doc.setFontSize(12); doc.text('Garantia da instalação: 1 ano', 12, 211); footer(doc, data.validityDays);
  doc.addPage(); header(doc, 'Seu projeto acompanhado', 'do início ao pós-venda.', 'ETAPAS DO PROJETO');
  [['Vistoria técnica', 'Validação do local'], ['Projeto executivo', 'Dimensionamento e documentação'], ['Instalação', 'Montagem e testes'], ['Homologação', 'Processo junto à concessionária'], ['Monitoramento', 'Configuração do aplicativo'], ['Pós-venda', 'Suporte após a entrega']].forEach(([title, description], index) => {
    const x = index % 2 ? 106 : 12; const yPosition = 84 + Math.floor(index / 2) * 48;
    box(doc, x, yPosition, 92, 38, [255, 255, 255]); doc.setTextColor(16, 47, 82); doc.setFontSize(9); doc.text(title, x + 5, yPosition + 11); doc.setFontSize(7); doc.text(description, x + 5, yPosition + 22);
  });
  footer(doc, data.validityDays);
  doc.addPage(); header(doc, 'Pronto para começar a', 'economizar com energia solar.', 'VALOR DA PROPOSTA');
  doc.setTextColor(16, 47, 82); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text('Investimento total do seu projeto', 105, 102, { align: 'center' });
  box(doc, 18, 116, 174, 58, [255, 250, 229]); doc.setTextColor(8, 46, 88); doc.setFont('helvetica', 'bold'); doc.setFontSize(38); doc.text(money.format(data.amount), 105, 151, { align: 'center' });
  doc.setTextColor(80, 99, 118); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`Proposta válida por ${data.validityDays} dias`, 105, 188, { align: 'center' });
  doc.setFontSize(11); doc.setTextColor(16, 47, 82); doc.text('Conte com a MM Energia Solar do projeto ao pós-venda.', 105, 215, { align: 'center' }); footer(doc, data.validityDays);

  const blob = doc.output('blob');
  return new File([blob], `Proposta MM Energia Solar - ${safeFileName(data.clientName)}.pdf`, { type: 'application/pdf' });
}

export function canShareProposalPdf(file) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  try { return !navigator.canShare || navigator.canShare({ files: [file] }); } catch { return false; }
}

export function downloadProposalPdf(file) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = file.name; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function whatsappUrl(phone, message) {
  let destination = digits(phone).replace(/^0+/, '');
  if (destination.length <= 11) destination = `55${destination}`;
  const encodedMessage = encodeURIComponent(message);
  return /Android/i.test(navigator.userAgent) ? `intent://send?phone=${destination}&text=${encodedMessage}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end` : `https://wa.me/${destination}?text=${encodedMessage}`;
}
