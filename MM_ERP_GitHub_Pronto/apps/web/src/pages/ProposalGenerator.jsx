import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileDown, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Wrench } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';
import { MICROINVERSOR_IMAGE, PAINEL_IMAGE } from '../assets/proposalImages.js';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { createClientInteraction, listClients } from '../services/clientService.js';
import { closeProposalAsSale } from '../services/proposalWorkflowService.js';

const BELCRED = [
  { parcelas: 24, taxa: '1,91%', fator: 978.28 / 16383.49 },
  { parcelas: 30, taxa: '1,97%', fator: 833.22 / 16383.49 },
  { parcelas: 36, taxa: '2,02%', fator: 739.04 / 16383.49 },
  { parcelas: 48, taxa: '2,06%', fator: 621.09 / 16383.49 },
  { parcelas: 60, taxa: '2,10%', fator: 555.84 / 16383.49 },
  { parcelas: 72, taxa: '2,19%', fator: 524.95 / 16383.49 },
  { parcelas: 84, taxa: '2,28%', fator: 509.99 / 16383.49 },
  { parcelas: 96, taxa: '2,32%', fator: 496.62 / 16383.49 },
];

const IRRADIACAO_MEDIA = 5.2;
const FATOR_DESEMPENHO = 0.8;
const DIAS_MES = 30;
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const somenteNumeros = (valor = '') => String(valor).replace(/\D/g, '');
const gerarPorPainel = (potenciaW) => (Number(potenciaW || 0) * IRRADIACAO_MEDIA * FATOR_DESEMPENHO * DIAS_MES) / 1000;
const arquivoSeguro = (nome) => String(nome || 'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
const hoje = () => new Date().toLocaleDateString('pt-BR');

function WhatsAppBusinessIcon({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#25D366"/><path fill="#fff" d="M17.4 6.6A7.5 7.5 0 0 0 5.6 15.7L4.5 19.5l3.9-1a7.5 7.5 0 0 0 9-11.9Zm-5.4 11a6.2 6.2 0 0 1-3.2-.9l-.2-.1-2.3.6.6-2.2-.1-.2a6.2 6.2 0 1 1 5.2 2.8Zm3.4-4.6c-.2-.1-1.1-.5-1.3-.6-.2-.1-.3-.1-.5.1l-.6.8c-.1.2-.3.2-.5.1a5.1 5.1 0 0 1-2.5-2.2c-.2-.3.2-.4.5-1 .1-.1 0-.3 0-.4l-.6-1.5c-.1-.3-.3-.3-.5-.3h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3 1 2.5c.1.2 1.7 2.7 4.2 3.6 1.6.6 2.2.6 3 .4.5-.1 1.1-.5 1.3-1 .2-.5.2-.9.1-1-.1-.2-.2-.2-.4-.3Z"/></svg>;
}

function arredondar(doc, x, y, w, h, fill = [246, 248, 252], stroke = [220, 226, 235]) {
  doc.setFillColor(...fill); doc.setDrawColor(...stroke); doc.roundedRect(x, y, w, h, 3, 3, 'FD');
}

async function carregarImagem(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(blob); });
  } catch { return null; }
}

function cabecalho(doc, titulo, destaque, subtitulo, selo, logo) {
  doc.setFillColor(8, 46, 88); doc.rect(0, 0, 210, 72, 'F');
  doc.setFillColor(16, 65, 112); doc.circle(190, 8, 27, 'F'); doc.circle(198, 4, 16, 'F');
  if (logo) doc.addImage(logo, 'PNG', 12, 8, 32, 13, undefined, 'FAST');
  else { doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('MM ENERGIA SOLAR', 12, 18); }
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.roundedRect(157, 10, 39, 9, 4, 4, 'S'); doc.text(selo, 176.5, 15.7, { align: 'center' });
  doc.setFontSize(21); doc.text(titulo, 12, 33); doc.setTextColor(255, 194, 15); doc.text(destaque, 12, 43);
  doc.setTextColor(225, 234, 244); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.2); doc.text(doc.splitTextToSize(subtitulo, 178), 12, 53);
}

function rodape(doc, validade, texto = 'Projeto, instalação, homologação e pós-venda.') {
  doc.setFillColor(8, 46, 88); doc.rect(0, 266, 210, 31, 'F'); doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text('MM Energia Solar • Bauru/SP', 198, 278, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(`Proposta emitida em ${hoje()} • Validade: ${validade} dias`, 198, 284, { align: 'right' }); doc.text(texto, 198, 289, { align: 'right' });
}

function adicionarImagemContida(doc, imagem, x, y, larguraMaxima, alturaMaxima) {
  try {
    const props = doc.getImageProperties(imagem);
    const escala = Math.min(larguraMaxima / props.width, alturaMaxima / props.height);
    const largura = props.width * escala;
    const altura = props.height * escala;
    doc.addImage(imagem, 'JPEG', x + (larguraMaxima - largura) / 2, y + (alturaMaxima - altura) / 2, largura, altura, undefined, 'NONE');
  } catch { doc.addImage(imagem, 'JPEG', x, y, larguraMaxima, 0, undefined, 'NONE'); }
}

async function recortarCantoEsquerdo(imagem, percentual = 0.07) {
  try {
    const origem = await new Promise((resolve, reject) => {
      const foto = new Image();
      foto.onload = () => resolve(foto);
      foto.onerror = reject;
      foto.src = imagem;
    });
    const corte = Math.max(1, Math.round(origem.naturalWidth * percentual));
    const largura = origem.naturalWidth - corte;
    if (!largura || !origem.naturalHeight) return imagem;
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = origem.naturalHeight;
    const contexto = canvas.getContext('2d');
    if (!contexto) return imagem;
    contexto.drawImage(origem, corte, 0, largura, origem.naturalHeight, 0, 0, largura, origem.naturalHeight);
    return canvas.toDataURL('image/jpeg', 0.98);
  } catch { return imagem; }
}

export default function ProposalGenerator({ quantidadePlacas, precoRecomendado, modulo, inversor, potenciaSistemaKw, precoCartao = 0, taxaCartao = 0 }) {
  const navigate = useNavigate();
  const potenciaInicial = Math.round((Number(potenciaSistemaKw || 0) * 1000) / quantidadePlacas) || 620;
  const [clientes, setClientes] = useState([]); const [clienteId, setClienteId] = useState('');
  const [dados, setDados] = useState({ cliente: '', cidade: 'Bauru/SP', telefone: '', potenciaPlaca: potenciaInicial, marcaPlaca: modulo || 'Painel solar 620 Wp Tier 1', inversor: inversor || 'Microinversor 2,25 kW', geracaoMensal: Math.round(gerarPorPainel(potenciaInicial) * quantidadePlacas), valorProposta: Number(precoRecomendado || 0).toFixed(2), validade: 7, observacoes: 'Projeto executivo, instalação, homologação junto à concessionária, estrutura, proteções elétricas e pós-venda inclusos.' });
  const [historico, setHistorico] = useState([]); const [busca, setBusca] = useState(''); const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false); const [fechandoId, setFechandoId] = useState(null); const [planoBelcred, setPlanoBelcred] = useState(96);
  const valor = Number(dados.valorProposta || precoRecomendado || 0);
  const potenciaSistema = (quantidadePlacas * Number(dados.potenciaPlaca || 0)) / 1000;
  const geracaoCalculada = gerarPorPainel(dados.potenciaPlaca) * quantidadePlacas;
  const belcred = useMemo(() => BELCRED.map((opcao) => ({ ...opcao, valor: valor * opcao.fator })), [valor]);
  const belcredSelecionado = belcred.find((item) => item.parcelas === Number(planoBelcred)) || belcred.at(-1);
  const totalCartao = Number(precoCartao || valor * (1 + Number(taxaCartao || 0) / 100));
  const opcoesCartao = useMemo(() => Array.from({ length: 10 }, (_, index) => ({ parcelas: index + 12, valorParcela: totalCartao / (index + 12) })), [totalCartao]);

  const carregarDados = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const [clientsResult, proposalsResult, ordersResult] = await Promise.all([listClients(), supabase.from('sales_proposals').select('*').order('created_at', { ascending: false }).limit(100), supabase.from('service_orders').select('id, order_number, proposal_id, status')]);
      setClientes(clientsResult || []); if (proposalsResult.error) return; const orders = ordersResult.data || [];
      setHistorico((proposalsResult.data || []).map((proposal) => ({ ...proposal, serviceOrder: orders.find((order) => order.proposal_id === proposal.id) || null })));
    } catch { /* mantém disponível */ }
  };
  useEffect(() => { carregarDados(); }, []);
  useEffect(() => { setDados((atual) => ({ ...atual, valorProposta: Number(precoRecomendado || 0).toFixed(2), marcaPlaca: modulo || atual.marcaPlaca, inversor: inversor || atual.inversor })); }, [precoRecomendado, modulo, inversor]);
  const selecionarCliente = (id) => { setClienteId(id); const cliente = clientes.find((item) => item.id === id); if (cliente) setDados((atual) => ({ ...atual, cliente: cliente.name, telefone: cliente.phone, cidade: [cliente.city, cliente.state].filter(Boolean).join('/') || atual.cidade })); };
  const atualizar = ({ target: { name, value } }) => setDados((atual) => name === 'potenciaPlaca' ? { ...atual, potenciaPlaca: value, geracaoMensal: Math.round(gerarPorPainel(value) * quantidadePlacas) } : { ...atual, [name]: value });
  const paymentOptions = { cash: { total: valor }, card: { feePercent: Number(taxaCartao || 0), total: totalCartao, options: opcoesCartao }, belcred: { installments: belcredSelecionado?.parcelas || 96, monthlyRate: belcredSelecionado?.taxa || '', installmentValue: belcredSelecionado?.valor || 0 } };
  const payload = (status = 'Gerada') => ({ client_id: clienteId || null, client_name: dados.cliente.trim(), phone: somenteNumeros(dados.telefone), city: dados.cidade || null, status, total_amount: valor, panel_count: Number(quantidadePlacas || 0), panel_power_w: Number(dados.potenciaPlaca || 0), system_power_kw: potenciaSistema, monthly_generation_kwh: Number(dados.geracaoMensal || geracaoCalculada), panel_model: dados.marcaPlaca, inverter_model: dados.inversor, validity_days: Number(dados.validade || 7), notes: dados.observacoes || null, sent_at: status === 'Enviada' ? new Date().toISOString() : null, proposal_data: { ...dados, clienteId, quantidadePlacas, potenciaSistema, paymentOptions } });
  const validarNome = () => { if (dados.cliente.trim()) return true; setMensagem('Informe o nome do cliente antes de gerar a proposta.'); return false; };
  const salvarProposta = async (status = 'Gerada') => {
    if (!isSupabaseConfigured || !supabase) return { saved: false, warning: 'PDF gerado. O Supabase não está disponível para registrar a proposta.' };
    setSalvando(true); try { const { data, error } = await supabase.from('sales_proposals').insert(payload(status)).select('*').single(); if (error) return { saved: false, warning: `PDF gerado, mas não registrado no CRM: ${error.message}` }; if (clienteId) { try { await createClientInteraction(clienteId, { type: 'proposta', description: `Proposta ${status.toLowerCase()} no valor de ${moeda.format(valor)}.`, nextActionAt: '' }); } catch {} } await carregarDados(); return { saved: true, data }; } finally { setSalvando(false); }
  };

  const criarArquivoPdf = async (origem = dados) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const logo = await carregarImagem(`${import.meta.env.BASE_URL}logo-mm.png`);
    const microinversorImagem = await recortarCantoEsquerdo(MICROINVERSOR_IMAGE);
    const qtd = Number(origem.quantidadePlacas || quantidadePlacas || 0); const potenciaPainel = Number(origem.potenciaPlaca || dados.potenciaPlaca || 0); const potencia = (qtd * potenciaPainel) / 1000; const geracao = Number(origem.geracaoMensal || gerarPorPainel(potenciaPainel) * qtd); const validade = Number(origem.validade || 7); const valorPdf = Number(origem.valorProposta || valor || 0); const belcredPdf = BELCRED.map((opcao) => ({ ...opcao, valor: valorPdf * opcao.fator })); const cartaoPdf = Array.from({ length: 10 }, (_, i) => ({ parcelas: i + 12, valor: totalCartao / (i + 12) }));
    cabecalho(doc, 'Energia solar pensada para', 'economizar todos os meses.', 'Empresa especializada há mais de cinco anos no mercado solar, com projeto, instalação, homologação e suporte pós-venda.', 'PROPOSTA COMERCIAL', logo);
    let y = 79; [['CLIENTE', origem.cliente || '-'], ['LOCAL', origem.cidade || '-'], ['CONTATO', origem.telefone || '-']].forEach(([rotulo, conteudo]) => { arredondar(doc, 12, y, 186, 14, [20, 66, 112], [61, 101, 143]); doc.setTextColor(195, 213, 232); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.text(rotulo, 16, y + 5); doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.text(String(conteudo), 16, y + 11); y += 17; });
    doc.setTextColor(16, 47, 82); doc.setFontSize(12); doc.text('Resumo do sistema', 12, 136);
    [['QUANTIDADE', `${qtd} painéis`], ['POTÊNCIA INSTALADA', `${potencia.toFixed(2).replace('.', ',')} kWp`], ['GERAÇÃO ESTIMADA', `${Math.round(geracao).toLocaleString('pt-BR')} kWh/mês`], ['TECNOLOGIA', 'Microinversor']].forEach(([a, b], i) => { const x = i % 2 === 0 ? 12 : 106; const cy = i < 2 ? 141 : 167; arredondar(doc, x, cy, 92, 22); doc.setTextColor(95, 109, 128); doc.setFontSize(6.5); doc.text(a, x + 4, cy + 7); doc.setTextColor(25, 39, 59); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(b, x + 4, cy + 15); });
    arredondar(doc, 12, 194, 186, 28, [255, 251, 230], [235, 203, 74]); doc.setTextColor(101, 89, 31); doc.setFontSize(7); doc.text('INVESTIMENTO TOTAL', 16, 202); doc.setTextColor(25, 39, 59); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text('Projeto completo instalado e homologado', 16, 208); doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.text(moeda.format(valorPdf), 16, 218);
    doc.setFontSize(12); doc.text('Escopo incluso', 12, 230); [['Projeto', 'Dimensionamento e documentação'], ['Instalação', 'Estrutura, cabeamento e proteções'], ['Homologação', 'Processo junto à concessionária'], ['Pós-venda', 'Suporte após a entrega']].forEach(([a, b], i) => { const x = i % 2 === 0 ? 12 : 106; const cy = i < 2 ? 235 : 249; arredondar(doc, x, cy, 92, 11, [255, 255, 255]); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.text(a, x + 3, cy + 4.5); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.7); doc.text(b, x + 3, cy + 8.3); }); rodape(doc, validade);

    doc.addPage(); cabecalho(doc, 'Escolha a melhor forma de', 'realizar seu projeto.', 'Compare todas as opções de financiamento BelCred, cartão de crédito e pagamento à vista.', 'CONDIÇÕES DE PAGAMENTO', logo);
    doc.setTextColor(16, 47, 82); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Financiamento BelCred', 12, 83);
    doc.setFillColor(8, 46, 88); doc.roundedRect(12, 89, 186, 10, 4, 4, 'F'); doc.setTextColor(255,255,255); doc.setFontSize(7.5); doc.text('PRAZO',16,95.5); doc.text('PARCELA ESTIMADA',62,95.5); doc.text('TAXA INFORMADA',155,95.5);
    belcredPdf.forEach((item, i) => { const ry = 99 + i * 11.5; arredondar(doc, 12, ry, 186, 11.5, i % 2 ? [249,250,252] : [255,255,255]); doc.setTextColor(39,49,65); doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.text(`${item.parcelas}x`,16,ry+7.2); doc.setFont('helvetica','normal'); doc.text(moeda.format(item.valor),62,ry+7.2); doc.text(`${item.taxa} a.m.`,155,ry+7.2); });
    doc.setTextColor(16,47,82); doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Cartão de crédito',12,201); cartaoPdf.forEach((item,i)=>{ const col=i%3; const row=Math.floor(i/3); const x=12+col*63; const cy=207+row*12.5; arredondar(doc,x,cy,59,10.5,[255,255,255]); doc.setFontSize(7.3); doc.setTextColor(39,49,65); doc.text(`${item.parcelas}x de ${moeda.format(item.valor)}`,x+3,cy+6.6); });
    doc.setTextColor(100,110,125); doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.text(doc.splitTextToSize('Simulações sujeitas à análise, aprovação, taxas vigentes, disponibilidade e confirmação das instituições financeiras e operadoras.',184),12,261); rodape(doc, validade, 'Condições sujeitas à confirmação no momento da contratação.');

    doc.addPage(); cabecalho(doc, 'Equipamentos escolhidos para', 'desempenho e segurança.', 'Fotos reais dos principais componentes previstos para o sistema fotovoltaico desta proposta.', 'EQUIPAMENTOS', logo);
    arredondar(doc,12,84,90,105,[255,255,255]); adicionarImagemContida(doc, PAINEL_IMAGE, 20, 91, 74, 50); doc.setTextColor(16,47,82); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text('Painel fotovoltaico 620 Wp',16,149); doc.setFontSize(7.8); doc.text(doc.splitTextToSize(origem.marcaPlaca || 'Painel fotovoltaico Tier 1',80),16,157); doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.text(`• Potência: ${potenciaPainel} W`,16,171); doc.text(`• Quantidade: ${qtd} unidades`,16,177); doc.text('• Garantia: 15 anos',16,183);
    arredondar(doc,108,84,90,105,[255,255,255]); adicionarImagemContida(doc, microinversorImagem, 116, 91, 74, 50); doc.setTextColor(16,47,82); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text('Microinversor 2,25 kW',112,149); doc.setFontSize(7.8); doc.text(doc.splitTextToSize(origem.inversor || 'Microinversor 2,25 kW',80),112,157); doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.text('• Monitoramento individual',112,171); doc.text('• Configuração inclusa',112,177); doc.text('• Garantia: 15 anos',112,183);
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Garantias',12,204); [['PAINÉIS', '15 anos'], ['MICROINVERSOR', '15 anos'], ['INSTALAÇÃO', '1 ano']].forEach(([a,b],i)=>{ const x=12+i*63; arredondar(doc,x,211,59,30,i===1?[234,244,255]:[248,249,252],i===1?[34,112,181]:[220,226,235]); doc.setTextColor(95,109,128); doc.setFontSize(6.5); doc.text(a,x+4,219); doc.setTextColor(16,47,82); doc.setFontSize(10); doc.text(b,x+4,230); });
    arredondar(doc,12,249,186,14,[255,251,230],[235,203,74]); doc.setTextColor(80,69,24); doc.setFontSize(6.8); doc.text(doc.splitTextToSize('A MM Energia Solar atua há mais de cinco anos no mercado solar. As garantias dos equipamentos seguem as condições dos fabricantes; a instalação possui garantia de 1 ano.',176),17,255); rodape(doc, validade);

    doc.addPage(); cabecalho(doc, 'Seu projeto acompanhado', 'do início ao pós-venda.', 'Um processo organizado por uma empresa especializada há mais de cinco anos no mercado solar.', 'ETAPAS DO PROJETO', logo);
    [['1. Vistoria técnica','Validação do local, telhado e condições elétricas.'],['2. Projeto executivo','Dimensionamento, documentação e engenharia.'],['3. Instalação','Montagem, cabeamento, proteções e testes.'],['4. Homologação','Solicitação e acompanhamento junto à concessionária.'],['5. Monitoramento','Configuração do aplicativo e orientação ao cliente.'],['6. Pós-venda','Suporte da MM Energia Solar após a entrega.']].forEach(([a,b],i)=>{ const x=i%2===0?12:106; const cy=84+Math.floor(i/2)*48; arredondar(doc,x,cy,92,38,[255,255,255]); doc.setTextColor(16,47,82); doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text(a,x+5,cy+11); doc.setTextColor(80,94,112); doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.text(doc.splitTextToSize(b,80),x+5,cy+20); });
    arredondar(doc,12,233,186,28,[248,249,252],[255,194,15]); doc.setTextColor(16,47,82); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text('OBSERVAÇÕES',17,242); doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.text(doc.splitTextToSize(origem.observacoes || '',176),17,249); rodape(doc, validade);
    const blob = doc.output('blob'); return new File([blob], `Proposta MM Energia Solar - ${arquivoSeguro(origem.cliente)}.pdf`, { type: 'application/pdf' });
  };

  const baixarPdf = (arquivo) => { const url = URL.createObjectURL(arquivo); const link = document.createElement('a'); link.href = url; link.download = arquivo.name; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const gerarESalvar = async () => { if (!validarNome()) return; setSalvando(true); try { const arquivo = await criarArquivoPdf(); baixarPdf(arquivo); const resultado = await salvarProposta('Gerada'); setMensagem(resultado.saved ? 'Proposta salva e PDF gerado.' : resultado.warning); } finally { setSalvando(false); } };
  const enviarWhatsApp = async () => {
    if (!validarNome()) return;
    let telefone = somenteNumeros(dados.telefone);
    if (!telefone) { setMensagem('Informe o WhatsApp do cliente para abrir a conversa correta.'); return; }
    if (telefone.length <= 11) telefone = `55${telefone}`;
    setSalvando(true);
    try {
      const arquivo = await criarArquivoPdf();
      baixarPdf(arquivo);
      const texto = encodeURIComponent(`Olá, ${dados.cliente.trim()}! Segue sua proposta da MM Energia Solar. O PDF foi preparado para envio.`);
      window.open(`https://wa.me/${telefone}?text=${texto}`, '_blank', 'noopener,noreferrer');
      const resultado = await salvarProposta('Enviada');
      setMensagem(resultado.saved ? 'PDF baixado e conversa do cliente aberta no WhatsApp. Anexe o arquivo baixado.' : resultado.warning);
    } catch { setMensagem('Não foi possível preparar o PDF e abrir o contato.'); } finally { setSalvando(false); }
  };
  const baixarHistorico = async (item) => baixarPdf(await criarArquivoPdf(item.proposal_data || dados));
  const fecharVenda = async (proposal) => { if (!window.confirm(`Confirmar a venda para ${proposal.client_name} e gerar a Ordem de Serviço?`)) return; setFechandoId(proposal.id); try { const { proposal: updated, serviceOrder } = await closeProposalAsSale(proposal.id); setHistorico((rows) => rows.map((row) => row.id === proposal.id ? { ...row, ...updated, serviceOrder } : row)); setMensagem(`Venda fechada. OS nº ${serviceOrder.order_number} criada com sucesso.`); } catch (error) { setMensagem(error?.message || 'Não foi possível fechar a venda.'); } finally { setFechandoId(null); } };
  const excluir = async (id) => { if (!window.confirm('Excluir esta proposta do histórico?') || !supabase) return; await supabase.from('sales_proposals').delete().eq('id', id); carregarDados(); };
  const filtrado = historico.filter((item) => `${item.client_name} ${item.phone}`.toLowerCase().includes(busca.toLowerCase()));
  const actionButton = { minHeight: 46, padding: '8px 14px', borderRadius: 12, fontSize: 14, lineHeight: 1.2, flex: '0 1 230px' };

  return <section className="finance-panel">
    <div className="finance-panel-header proposal-no-print"><div><h2>Proposta profissional ERP 2.0</h2><p>PDF com logo, fotos reais, garantias, BelCred, cartão e WhatsApp Business.</p></div></div>
    <div className="proposal-print-area"><div className="finance-form">
      <label className="finance-field proposal-no-print"><span>Cliente do CRM</span><select value={clienteId} onChange={(event) => selecionarCliente(event.target.value)}><option value="">Preencher manualmente</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.name} · {cliente.phone}</option>)}</select></label>
      <label className="finance-field"><span>Nome do cliente *</span><input name="cliente" value={dados.cliente} onChange={atualizar} /></label><label className="finance-field proposal-no-print"><span>WhatsApp</span><input name="telefone" value={dados.telefone} onChange={atualizar} /></label><label className="finance-field"><span>Cidade/UF</span><input name="cidade" value={dados.cidade} onChange={atualizar} /></label><label className="finance-field"><span>Sistema</span><input value={`${quantidadePlacas} painéis · ${potenciaSistema.toFixed(2)} kWp`} readOnly /></label><label className="finance-field"><span>Geração estimada</span><input value={`${Number(dados.geracaoMensal || geracaoCalculada).toLocaleString('pt-BR')} kWh/mês`} readOnly /></label><label className="finance-field proposal-no-print"><span>Validade (dias)</span><input type="number" name="validade" value={dados.validade} onChange={atualizar} /></label><label className="finance-field finance-field-wide"><span>Itens e observações</span><textarea name="observacoes" value={dados.observacoes} onChange={atualizar} rows="3" /></label>
    </div><div className="pricing-highlight"><span>Valor total da proposta</span><strong className="proposal-total-value">{moeda.format(valor)}</strong></div>
    <div className="proposal-payment-grid"><div className="proposal-payment-card"><span>Financiamento BelCred</span><strong>{paymentOptions.belcred.installments}x de {moeda.format(paymentOptions.belcred.installmentValue)}</strong><div className="proposal-card-options">{belcred.map((item) => <button type="button" className="proposal-card-option" key={item.parcelas} onClick={() => setPlanoBelcred(item.parcelas)} style={{ border: item.parcelas === planoBelcred ? '2px solid #1f6fb2' : undefined }}>{item.parcelas}x de {moeda.format(item.valor)}</button>)}</div></div><div className="proposal-payment-card"><span>Cartão de crédito</span><div className="proposal-card-options">{opcoesCartao.map((item) => <div className="proposal-card-option" key={item.parcelas}>{item.parcelas}x de {moeda.format(item.valorParcela)}</div>)}</div></div></div>
    <div className="proposal-payment-grid" style={{ marginTop: 14 }}><div className="proposal-payment-card"><span>Garantia da placa</span><strong>15 anos</strong></div><div className="proposal-payment-card"><span>Garantia do microinversor</span><strong>15 anos</strong></div><div className="proposal-payment-card"><span>Garantia da instalação</span><strong>1 ano</strong></div></div></div>
    {mensagem && <p className="finance-notice proposal-no-print" style={{ fontWeight: 800 }}>{mensagem}</p>}
    <div className="proposal-no-print" style={{ marginTop: 18, border: '1px solid #dce5ef', borderRadius: 18, padding: 16 }}><div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}><Sparkles size={20} /><strong>Proposta pronta</strong></div><div className="finance-actions" style={{ gap: 10, flexWrap: 'wrap' }}><button className="finance-button" style={actionButton} type="button" disabled={salvando} onClick={gerarESalvar}><FileDown size={18} /> {salvando ? 'Gerando...' : 'Gerar PDF'}</button><button className="finance-button" style={actionButton} type="button" disabled={salvando} onClick={enviarWhatsApp}><WhatsAppBusinessIcon size={20} /> Enviar no WhatsApp</button></div><div style={{ marginTop: 10, color: '#667085', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}><ShieldCheck size={15} /> O PDF é baixado e a conversa do número salvo é aberta diretamente.</div></div>
    <div className="proposal-no-print" style={{ marginTop: 24, borderTop: '1px solid #dce5ef', paddingTop: 20 }}><div className="finance-panel-header"><div><h2>Histórico de propostas</h2><p>Feche a venda e gere a OS diretamente daqui.</p></div><button type="button" onClick={carregarDados}><RefreshCw size={20} /></button></div><label className="finance-field"><span>Pesquisar</span><div style={{ display: 'flex', gap: 8 }}><Search size={18} /><input value={busca} onChange={(event) => setBusca(event.target.value)} /></div></label>{filtrado.map((item) => <div className="finance-list-item" key={item.id}><div><strong>{item.client_name}</strong><span>{new Date(item.created_at).toLocaleDateString('pt-BR')} · {moeda.format(item.total_amount)} · {item.status}</span></div><div className="finance-actions"><button type="button" onClick={() => baixarHistorico(item)}><FileDown size={16} /> PDF</button>{item.serviceOrder || item.status === 'Venda Fechada' ? <button type="button" onClick={() => navigate('/app/ordens-servico')}><CheckCircle2 size={16} /> {item.serviceOrder ? `Abrir OS #${item.serviceOrder.order_number}` : 'Venda fechada'}</button> : <button type="button" disabled={fechandoId === item.id} onClick={() => fecharVenda(item)}><Wrench size={16} /> {fechandoId === item.id ? 'Gerando OS...' : 'Fechar venda e gerar OS'}</button>}<button type="button" className="finance-delete" onClick={() => excluir(item.id)}><Trash2 size={16} /> Excluir</button></div></div>)}{!filtrado.length && <div className="finance-empty">Nenhuma proposta encontrada.</div>}</div>
  </section>;
}
