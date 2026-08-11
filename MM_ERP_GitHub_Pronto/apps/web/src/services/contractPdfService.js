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
  paragraph('Com base nas informações fornecidas pela CONTRATANTE e nos cálculos realizados a partir desses dados, a CONTRATADA fornecerá os materiais e executará a instalação do sistema solar fotovoltaico descrito neste contrato.');
  paragraph(contract.systemDescription || 'Sistema solar fotovoltaico conforme proposta comercial aprovada.', { bold: true });

  heading('3.1. COMPONENTES DO SISTEMA FOTOVOLTAICO');
  paragraph(contract.components || 'Módulos fotovoltaicos, inversor ou microinversores, estrutura de fixação, dispositivos de proteção, cabos, projeto fotovoltaico, ART de projeto e execução, acompanhamento junto à distribuidora e monitoramento via web.');

  heading('3.2. COMPONENTES E SERVIÇOS FORNECIDOS PARA INSTALAÇÃO');
  paragraph('Estão inclusos, quando aplicáveis ao sistema contratado: DPS de proteção, disjuntores, cabos elétricos, projeto solar fotovoltaico, ART de projeto e execução, acompanhamento do processo junto à distribuidora de energia e monitoramento do sistema via web, além dos demais itens expressamente descritos na proposta comercial ou no campo de componentes deste contrato.');

  heading('4. PRAZO PARA EXECUÇÃO');
  paragraph('A conclusão da obra ocorrerá em até 60 (sessenta) dias corridos, contados a partir da assinatura deste contrato e da disponibilização, pela CONTRATANTE, de todos os documentos, acessos e condições técnicas necessários. O prazo poderá ser prorrogado mediante justificativa por motivo técnico, força maior, atraso da distribuidora, indisponibilidade de equipamentos ou necessidade de adequações no imóvel.');
  paragraph('As partes, doravante denominadas CONTRATANTE e CONTRATADA, estabelecem entre si, para o cumprimento deste contrato, as cláusulas seguintes.');

  heading('CLÁUSULA PRIMEIRA - LOCAL E OBJETO DA INSTALAÇÃO');
  paragraph(`O sistema solar fotovoltaico será instalado no seguinte endereço: ${normalize(contract.installationAddress)}.`);

  heading('CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES E DIREITOS DA CONTRATADA');
  paragraph('2.1 - Quanto ao contrato');
  paragraph('2.1.1 - Cumprir integralmente este contrato, responsabilizando-se administrativa e tecnicamente pela direção, supervisão, planejamento, garantias, cumprimento dos prazos e execução dos serviços contratados dentro dos padrões de qualidade aplicáveis.');
  paragraph('2.1.2 - Providenciar a Anotação de Responsabilidade Técnica (ART) aplicável ao projeto e/ou à execução dos serviços, perante o conselho profissional competente, apresentando o respectivo comprovante à CONTRATANTE quando cabível.');

  paragraph('2.2 - Quanto à direção e condução dos serviços');
  paragraph('2.2.1 - Designar profissionais devidamente capacitados e qualificados como responsáveis pela direção e execução dos serviços, respondendo pela análise técnica, operacional e estrutural necessária à implantação do projeto.');
  paragraph('2.2.2 - Elaborar e acompanhar os projetos e documentos técnicos necessários perante os órgãos e entidades competentes, inclusive a distribuidora de energia elétrica, quando aplicável, e disponibilizar à CONTRATANTE os documentos técnicos pertinentes em meio eletrônico, preferencialmente em formato PDF e, quando disponível e necessário, em formato PLT.');

  paragraph('2.3 - Quanto ao pessoal');
  paragraph('2.3.1 - Empregar na execução dos serviços apenas pessoal tecnicamente habilitado e com os requisitos necessários ao exercício de suas atribuições. A CONTRATADA, na qualidade de empregadora ou responsável pela equipe contratada, será a única responsável pelas atividades desempenhadas, pelo cumprimento das normas de segurança do trabalho, encargos e direitos de seus profissionais, sem qualquer ônus ou vínculo empregatício com a CONTRATANTE.');
  paragraph('2.3.2 - Prestar os serviços discriminados no objeto deste contrato empregando habilidade, diligência e capacidade técnica compatíveis com os serviços contratados.');

  paragraph('2.4 - Quanto à garantia');
  paragraph('2.4.1 - A CONTRATADA oferecerá garantia de 1 (um) ano para os serviços de instalação do sistema solar fotovoltaico, contada a partir da conclusão da instalação. As garantias dos equipamentos e componentes são de responsabilidade dos respectivos fabricantes, conforme prazos, condições, notas fiscais, manuais e termos de garantia aplicáveis.');

  heading('CLÁUSULA TERCEIRA - OBRIGAÇÕES DA CONTRATANTE');
  paragraph('3.1 - Facilitar o acesso da equipe da CONTRATADA ao local da obra sempre que necessário para vistoria, instalação, testes, ajustes ou demais atividades relacionadas ao objeto contratado.');
  paragraph('3.2 - Fornecer todos os dados, documentos e informações pertinentes aos trabalhos, prestando a assistência necessária à CONTRATADA para o cumprimento de suas obrigações nos prazos definidos de comum acordo entre as partes.');
  paragraph('3.3 - Efetuar o pagamento das importâncias devidas à CONTRATADA nos valores, datas e condições acordados neste contrato.');
  paragraph('3.4 - Fornecer, quando existente ou tecnicamente necessário, projeto arquitetônico atualizado, plantas, documentos do imóvel e demais informações necessárias à correta execução dos trabalhos.');
  paragraph('3.5 - Providenciar e custear, quando não estiverem expressamente incluídas no objeto contratado, quaisquer adequações necessárias na instalação do imóvel, incluindo unificação ou alteração de titularidade, adequação de caixas, padrões, cabos e/ou disjuntores de entrada, adequações de rede ou transformador, adequações de estrutura civil e processo de aumento de carga.');
  paragraph('3.6 - A CONTRATANTE autoriza a CONTRATADA a representá-la perante a concessionária ou distribuidora de energia elétrica exclusivamente para os atos necessários à solicitação de acesso, apresentação de documentos, acompanhamento e homologação do sistema fotovoltaico, podendo obter em seu nome as autorizações técnicas necessárias ao objeto deste contrato.');
  paragraph('3.7 - A CONTRATANTE deverá manter o local da instalação em condições adequadas de segurança e informar previamente qualquer condição que possa interferir na execução dos serviços ou na segurança da equipe técnica.');

  heading('CLÁUSULA QUARTA - PREÇO, VALORES E FORMA DE PAGAMENTO');
  paragraph('4.1 - Pelo fornecimento dos materiais e execução dos serviços previstos neste contrato, a CONTRATANTE pagará à CONTRATADA o valor total indicado abaixo, observadas as condições de pagamento acordadas.');
  paragraph(`4.1.1 - O valor total do presente contrato é de ${Number(contract.totalValue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`);
  paragraph(`Forma de pagamento: ${normalize(contract.paymentTerms)}.`);
  paragraph(`Quando houver pagamento via PIX, a chave da CONTRATADA é o CNPJ ${COMPANY.pix}, de titularidade da MM Energia Solar.`);
  paragraph('Em caso de desistência ou renúncia imotivada da CONTRATANTE após a assinatura e antes da conclusão da instalação, será devida à CONTRATADA multa compensatória de 10% (dez por cento) do valor total deste contrato, a título de reparação e indenização, sem prejuízo do ressarcimento de materiais personalizados, serviços já executados e despesas comprovadamente realizadas e não recuperáveis.');

  heading('CLÁUSULA QUINTA - DISPOSIÇÕES FINAIS');
  paragraph('As partes reconhecem como válidas as assinaturas eletrônicas apostas neste instrumento, nos termos da legislação aplicável.');
  paragraph('As partes elegem o foro da comarca de Bauru/SP para dirimir quaisquer dúvidas ou controvérsias oriundas do presente contrato, com renúncia a qualquer outro, por mais privilegiado que seja.');
  paragraph('E por estarem justas e contratadas, CONTRATADA e CONTRATANTE firmam o presente CONTRATO DE FORNECIMENTO DE MATERIAIS E INSTALAÇÃO DE SISTEMA SOLAR FOTOVOLTAICO.');

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
