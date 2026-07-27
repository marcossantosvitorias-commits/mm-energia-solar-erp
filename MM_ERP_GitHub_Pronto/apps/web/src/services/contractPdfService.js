import { jsPDF } from 'jspdf';

const COMPANY = {
  name: 'MM ENERGIA SOLAR',
  cnpj: '42.197.107/0001-11',
  address: 'Rua Milton Amorim Carvalho, nº 1-123, bairro Edson Silva, Bauru/SP',
  zipCode: '17065-460',
  pix: '42.197.107/0001-11',
};

function brDate(value = new Date()) {
  return new Intl.DateTimeFormat('pt-BR').format(value instanceof Date ? value : new Date(value));
}

async function loadLogo() {
  try {
    const response = await fetch('/logo-mm.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function normalize(value) {
  return String(value || '').trim();
}

export async function generateContractPdf(contract) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const width = 210 - (margin * 2);
  const bottom = 278;
  let y = 20;

  const logo = await loadLogo();
  if (logo) {
    try { doc.addImage(logo, 'PNG', 75, 9, 60, 27, undefined, 'FAST'); } catch { /* mantém PDF sem logo */ }
    y = 42;
  }

  const addPage = () => {
    doc.addPage();
    y = 20;
  };

  const ensure = (height = 10) => {
    if (y + height > bottom) addPage();
  };

  const title = (text) => {
    ensure(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, 105, y, { align: 'center' });
    y += (lines.length * 6) + 5;
  };

  const heading = (text) => {
    ensure(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(text, margin, y);
    y += 6;
  };

  const paragraph = (text, options = {}) => {
    const fontSize = options.fontSize || 9.4;
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(normalize(text), width);
    const lineHeight = options.lineHeight || 4.6;
    ensure((lines.length * lineHeight) + 3);
    doc.text(lines, margin, y, { align: options.align || 'justify', maxWidth: width });
    y += (lines.length * lineHeight) + (options.after ?? 3);
  };

  const field = (label, value) => paragraph(`${label}: ${normalize(value) || '-'}`, { after: 1.5 });

  title('CONTRATO DE FORNECIMENTO DE MATERIAIS E INSTALAÇÃO DE SISTEMA DE GERADOR FOTOVOLTAICO');

  heading('1. PARTE CONTRATADA');
  field('Nome', COMPANY.name);
  field('CNPJ', COMPANY.cnpj);
  field('Endereço', COMPANY.address);
  field('CEP', COMPANY.zipCode);
  y += 2;

  heading('2. PARTE CONTRATANTE');
  field('Nome', contract.clientName);
  field('CPF/CNPJ', contract.clientDocument);
  field('Endereço', contract.clientAddress);
  field('Telefone', contract.clientPhone);
  field('E-mail', contract.clientEmail);
  y += 2;

  heading('3. OBJETO');
  paragraph('Com base nas informações fornecidas pela CONTRATANTE e nos cálculos realizados, a CONTRATADA fornecerá os materiais e executará a instalação do sistema solar fotovoltaico descrito neste contrato.');
  paragraph(contract.systemDescription || 'Sistema solar fotovoltaico conforme proposta comercial aprovada.', { bold: true });

  heading('3.1. COMPONENTES E SERVIÇOS INCLUSOS');
  paragraph(contract.components || 'Módulos fotovoltaicos, inversor ou microinversores, estrutura de fixação, dispositivos de proteção, cabos, projeto fotovoltaico, ART de projeto e execução, acompanhamento junto à distribuidora e monitoramento via web.');

  heading('4. PRAZO PARA EXECUÇÃO');
  paragraph('A conclusão da obra ocorrerá em até 69 (sessenta e nove) dias corridos, contados a partir da assinatura deste contrato e da disponibilização, pela CONTRATANTE, de todos os documentos, acessos e condições técnicas necessários. O prazo poderá ser prorrogado mediante justificativa por motivo técnico, força maior, atraso da distribuidora, indisponibilidade de equipamentos ou necessidade de adequações no imóvel.');

  heading('CLÁUSULA PRIMEIRA - LOCAL DA INSTALAÇÃO');
  paragraph(`O sistema solar fotovoltaico será instalado no seguinte endereço: ${normalize(contract.installationAddress)}.`);

  heading('CLÁUSULA SEGUNDA - OBRIGAÇÕES DA CONTRATADA');
  paragraph('A CONTRATADA se responsabiliza administrativa e tecnicamente pela direção, supervisão, planejamento, qualidade e execução dos serviços contratados; providenciará a responsabilidade técnica aplicável; utilizará pessoal capacitado; elaborará e acompanhará o processo de homologação junto à distribuidora; e entregará as informações de monitoramento disponíveis para o sistema instalado.');
  paragraph('A garantia dos serviços de instalação será de 1 (um) ano após a conclusão. As garantias dos equipamentos são de responsabilidade dos respectivos fabricantes, conforme os prazos constantes na proposta, notas fiscais e manuais.');

  heading('CLÁUSULA TERCEIRA - OBRIGAÇÕES DA CONTRATANTE');
  paragraph('A CONTRATANTE deverá facilitar o acesso ao local da obra; fornecer documentos e informações corretas; efetuar os pagamentos nas datas acordadas; manter o local em condições de segurança; e realizar, quando necessário, adequações de padrão, caixas, cabos, disjuntores, rede, transformador, estrutura civil, titularidade ou aumento de carga que não estejam expressamente incluídas no objeto.');
  paragraph('A CONTRATANTE autoriza a CONTRATADA a representá-la perante a concessionária de energia exclusivamente para os atos necessários à solicitação de acesso e homologação do sistema fotovoltaico.');

  heading('CLÁUSULA QUARTA - PREÇO E FORMA DE PAGAMENTO');
  paragraph(`O valor total deste contrato é de ${Number(contract.totalValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`);
  paragraph(`Forma de pagamento: ${normalize(contract.paymentTerms)}.`);
  paragraph(`Quando houver pagamento via PIX, a chave da CONTRATADA é o CNPJ ${COMPANY.pix}, de titularidade da MM Energia Solar.`);
  paragraph('Em caso de desistência imotivada da CONTRATANTE após a assinatura e antes da conclusão da instalação, será devida multa compensatória de 10% (dez por cento) do valor total do contrato, sem prejuízo do ressarcimento de materiais personalizados, serviços já executados e despesas comprovadamente realizadas.');

  heading('CLÁUSULA QUINTA - DISPOSIÇÕES FINAIS');
  paragraph('As partes reconhecem a validade da assinatura eletrônica e elegem o foro da comarca de Bauru/SP para dirimir controvérsias decorrentes deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.');
  paragraph('E por estarem de acordo, as partes firmam o presente contrato de fornecimento de materiais e instalação de sistema solar fotovoltaico.');

  ensure(45);
  paragraph(`Bauru/SP, ${brDate()}.`, { align: 'left', after: 12 });
  doc.setDrawColor(70);
  doc.line(margin, y, 88, y);
  doc.line(122, y, 192, y);
  y += 5;
  doc.setFontSize(9);
  doc.text('MM ENERGIA SOLAR', 53, y, { align: 'center' });
  doc.text(normalize(contract.clientName), 157, y, { align: 'center', maxWidth: 70 });

  const safeName = normalize(contract.clientName).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'cliente';
  const fileName = `contrato-energia-solar-${safeName}.pdf`;
  const blob = doc.output('blob');
  return { doc, blob, fileName };
}

export async function downloadContractPdf(contract) {
  const result = await generateContractPdf(contract);
  result.doc.save(result.fileName);
  return result;
}
