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

function normalize(value) {
  return String(value || '').trim();
}

async function loadLogo() {
  const candidates = [`${import.meta.env.BASE_URL || '/'}logo-mm.png`, '/logo-mm.png'];
  for (const src of candidates) {
    try {
      const response = await fetch(src, { cache: 'no-store' });
      if (!response.ok) continue;
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        const image = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = objectUrl;
        });
        const maxWidth = 420;
        const maxHeight = 180;
        const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const width = Math.max(1, Math.round(image.width * ratio));
        const height = Math.max(1, Math.round(image.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        return {
          dataUrl: canvas.toDataURL('image/jpeg', 0.68),
          width,
          height,
        };
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch {
      // tenta o próximo caminho
    }
  }
  return null;
}

export async function generateContractPdf(contract) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  const margin = 18;
  const width = 210 - (margin * 2);
  const bottom = 278;
  let y = 20;

  const logo = await loadLogo();
  if (logo) {
    try {
      const maxLogoWidth = 56;
      const maxLogoHeight = 24;
      const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height);
      const logoWidth = logo.width * scale;
      const logoHeight = logo.height * scale;
      const logoX = (210 - logoWidth) / 2;
      const logoY = 9;
      doc.addImage(logo.dataUrl, 'JPEG', logoX, logoY, logoWidth, logoHeight, 'mm-logo', 'FAST');
      y = logoY + logoHeight + 7;
    } catch {
      y = 20;
    }
  }

  const addPage = () => { doc.addPage(); y = 20; };
  const ensure = (height = 10) => { if (y + height > bottom) addPage(); };

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
    doc.setFontSize(10.3);
    doc.text(text, margin, y);
    y += 6;
  };

  const paragraph = (text, options = {}) => {
    const fontSize = options.fontSize || 9.2;
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(normalize(text), width);
    const lineHeight = options.lineHeight || 4.45;
    ensure((lines.length * lineHeight) + 3);
    doc.text(lines, margin, y, { align: options.align || 'justify', maxWidth: width });
    y += (lines.length * lineHeight) + (options.after ?? 2.5);
  };

  const field = (label, value) => paragraph(`${label}: ${normalize(value) || '-'}`, { after: 1.2 });
  const executionTerm = normalize(contract.executionTerm) || '60 dias corridos';

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
  paragraph('Com base nas informações fornecidas pela CONTRATANTE e nos cálculos realizados a partir desses dados, a CONTRATADA fornecerá os materiais e executará a instalação do sistema solar fotovoltaico descrito neste contrato.');
  paragraph(contract.systemDescription || 'Sistema solar fotovoltaico conforme proposta comercial aprovada.', { bold: true });

  heading('3.1. COMPONENTES DO SISTEMA FOTOVOLTAICO');
  paragraph(contract.components || 'Módulos fotovoltaicos, inversor ou microinversores, estrutura de fixação, dispositivos de proteção, cabos, projeto fotovoltaico, ART de projeto e execução, acompanhamento junto à distribuidora e monitoramento via web.');

  heading('3.2. COMPONENTES E SERVIÇOS FORNECIDOS PARA INSTALAÇÃO');
  paragraph('Estão inclusos, quando aplicáveis ao sistema contratado: DPS de proteção, disjuntores, cabos elétricos, projeto solar fotovoltaico, ART de projeto e execução, acompanhamento do processo junto à distribuidora de energia e monitoramento do sistema via web, além dos demais itens expressamente descritos na proposta comercial ou no campo de componentes deste contrato.');

  heading('4. PRAZO PARA EXECUÇÃO');
  paragraph(`A conclusão da obra ocorrerá no prazo de ${executionTerm}, contado a partir da assinatura deste contrato e da disponibilização, pela CONTRATANTE, de todos os documentos, acessos e condições técnicas necessários. O prazo poderá ser prorrogado mediante justificativa por motivo técnico, força maior, atraso da distribuidora, indisponibilidade de equipamentos ou necessidade de adequações no imóvel.`);

  heading('CLÁUSULA PRIMEIRA - LOCAL E OBJETO DA INSTALAÇÃO');
  paragraph(`O sistema solar fotovoltaico será instalado no seguinte endereço: ${normalize(contract.installationAddress)}.`);

  heading('CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES E DIREITOS DA CONTRATADA');
  paragraph('2.1.1 - Cumprir integralmente este contrato, responsabilizando-se administrativa e tecnicamente pela direção, supervisão, planejamento, garantias, cumprimento dos prazos e execução dos serviços contratados dentro dos padrões de qualidade aplicáveis.');
  paragraph('2.1.2 - Providenciar a Anotação de Responsabilidade Técnica (ART) aplicável ao projeto e/ou à execução dos serviços, perante o conselho profissional competente, apresentando o respectivo comprovante à CONTRATANTE quando cabível.');
  paragraph('2.2.1 - Designar profissionais devidamente capacitados e qualificados como responsáveis pela direção e execução dos serviços, respondendo pela análise técnica, operacional e estrutural necessária à implantação do projeto.');
  paragraph('2.2.2 - Elaborar e acompanhar os projetos e documentos técnicos necessários perante os órgãos e entidades competentes, inclusive a distribuidora de energia elétrica, quando aplicável, e disponibilizar à CONTRATANTE os documentos técnicos pertinentes em meio eletrônico, preferencialmente em formato PDF e, quando disponível e necessário, em formato PLT.');
  paragraph('2.3.1 - Empregar na execução dos serviços apenas pessoal tecnicamente habilitado. A CONTRATADA será responsável pelas atividades desempenhadas, normas de segurança do trabalho, encargos e direitos de seus profissionais, sem qualquer vínculo empregatício com a CONTRATANTE.');
  paragraph('2.4.1 - A CONTRATADA oferecerá garantia de 1 (um) ano para os serviços de instalação. As garantias dos equipamentos e componentes são de responsabilidade dos respectivos fabricantes, conforme notas fiscais, manuais e termos de garantia aplicáveis.');

  heading('CLÁUSULA TERCEIRA - OBRIGAÇÕES DA CONTRATANTE');
  paragraph('3.1 - Facilitar o acesso da equipe da CONTRATADA ao local da obra sempre que necessário para vistoria, instalação, testes, ajustes ou demais atividades relacionadas ao objeto contratado.');
  paragraph('3.2 - Fornecer todos os dados, documentos e informações pertinentes aos trabalhos, prestando a assistência necessária à CONTRATADA.');
  paragraph('3.3 - Efetuar o pagamento das importâncias devidas à CONTRATADA nos valores, datas e condições acordados neste contrato.');
  paragraph('3.4 - Fornecer, quando existente ou tecnicamente necessário, projeto arquitetônico atualizado, plantas, documentos do imóvel e demais informações necessárias à correta execução dos trabalhos.');
  paragraph('3.5 - Providenciar e custear, quando não estiverem expressamente incluídas no objeto contratado, adequações de titularidade, caixas, padrões, cabos, disjuntores de entrada, rede ou transformador, estrutura civil e aumento de carga.');
  paragraph('3.6 - A CONTRATANTE autoriza a CONTRATADA a representá-la perante a concessionária ou distribuidora de energia elétrica exclusivamente para os atos necessários à solicitação de acesso, apresentação de documentos, acompanhamento e homologação do sistema fotovoltaico.');
  paragraph('3.7 - A CONTRATANTE deverá manter o local da instalação em condições adequadas de segurança e informar previamente qualquer condição que possa interferir na execução dos serviços.');

  heading('CLÁUSULA QUARTA - PREÇO, VALORES E FORMA DE PAGAMENTO');
  paragraph(`4.1.1 - O valor total do presente contrato é de ${Number(contract.totalValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`);
  paragraph(`Forma de pagamento: ${normalize(contract.paymentTerms)}.`);
  paragraph(`Quando houver pagamento via PIX, a chave da CONTRATADA é o CNPJ ${COMPANY.pix}, de titularidade da MM Energia Solar.`);
  paragraph('Em caso de desistência ou renúncia imotivada da CONTRATANTE após a assinatura e antes da conclusão da instalação, será devida multa compensatória de 10% (dez por cento) do valor total deste contrato, sem prejuízo do ressarcimento de materiais personalizados, serviços já executados e despesas comprovadamente realizadas e não recuperáveis.');

  heading('CLÁUSULA QUINTA - DISPOSIÇÕES FINAIS');
  paragraph('As partes reconhecem como válidas as assinaturas eletrônicas apostas neste instrumento, nos termos da legislação aplicável.');
  paragraph('As partes elegem o foro da comarca de Bauru/SP para dirimir quaisquer dúvidas ou controvérsias oriundas do presente contrato, com renúncia a qualquer outro, por mais privilegiado que seja.');
  paragraph('E por estarem justas e contratadas, CONTRATADA e CONTRATANTE firmam o presente contrato.');

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
