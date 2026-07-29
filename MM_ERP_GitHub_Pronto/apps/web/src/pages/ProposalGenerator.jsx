import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileDown, MessageCircle, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Wrench } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';
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

function arredondar(doc, x, y, w, h, fill = [246, 248, 252], stroke = [220, 226, 235]) {
  doc.setFillColor(...fill);
  doc.setDrawColor(...stroke);
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');
}

function cabecalhoAzul(doc, titulo, destaque, subtitulo, selo) {
  doc.setFillColor(8, 46, 88);
  doc.rect(0, 0, 210, 72, 'F');
  doc.setFillColor(16, 65, 112);
  doc.circle(190, 8, 27, 'F');
  doc.circle(198, 4, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('MM', 12, 18);
  doc.setFontSize(7.5);
  doc.roundedRect(157, 10, 39, 9, 4, 4, 'S');
  doc.text(selo, 176.5, 15.7, { align: 'center' });
  doc.setFontSize(21);
  doc.text(titulo, 12, 33);
  doc.setTextColor(255, 194, 15);
  doc.text(destaque, 12, 43);
  doc.setTextColor(225, 234, 244);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(doc.splitTextToSize(subtitulo, 178), 12, 53);
}

function rodape(doc, validade, texto = 'Projeto, instalação, homologação e pós-venda.') {
  doc.setFillColor(8, 46, 88);
  doc.rect(0, 266, 210, 31, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('MM Energia Solar • Bauru/SP', 198, 278, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Proposta emitida em ${hoje()} • Validade: ${validade} dias`, 198, 284, { align: 'right' });
  doc.text(texto, 198, 289, { align: 'right' });
}

export default function ProposalGenerator({ quantidadePlacas, precoRecomendado, modulo, inversor, potenciaSistemaKw, precoCartao = 0, taxaCartao = 0 }) {
  const navigate = useNavigate();
  const potenciaInicial = Math.round((Number(potenciaSistemaKw || 0) * 1000) / quantidadePlacas) || 620;
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [dados, setDados] = useState({
    cliente: '', cidade: 'Bauru/SP', telefone: '', potenciaPlaca: potenciaInicial,
    marcaPlaca: modulo || 'Painel solar', inversor: inversor || 'Inversor solar',
    geracaoMensal: Math.round(gerarPorPainel(potenciaInicial) * quantidadePlacas),
    valorProposta: Number(precoRecomendado || 0).toFixed(2), validade: 7,
    observacoes: 'Projeto executivo, instalação, homologação junto à concessionária, estrutura, proteções elétricas e pós-venda inclusos.',
  });
  const [historico, setHistorico] = useState([]);
  const [busca, setBusca] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [fechandoId, setFechandoId] = useState(null);
  const [planoBelcred, setPlanoBelcred] = useState(96);

  const valor = Number(dados.valorProposta || precoRecomendado || 0);
  const potenciaSistema = (quantidadePlacas * Number(dados.potenciaPlaca || 0)) / 1000;
  const geracaoCalculada = gerarPorPainel(dados.potenciaPlaca) * quantidadePlacas;
  const geracaoUnitaria = gerarPorPainel(dados.potenciaPlaca);
  const belcred = useMemo(() => BELCRED.map((opcao) => ({ ...opcao, valor: valor * opcao.fator })), [valor]);
  const belcredSelecionado = belcred.find((item) => item.parcelas === Number(planoBelcred)) || belcred.at(-1);
  const totalCartao = Number(precoCartao || valor);
  const opcoesCartao = useMemo(() => Array.from({ length: 10 }, (_, index) => ({ parcelas: index + 12, valorParcela: totalCartao / (index + 12) })), [totalCartao]);

  const carregarDados = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const [clientsResult, proposalsResult, ordersResult] = await Promise.all([
        listClients(),
        supabase.from('sales_proposals').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('service_orders').select('id, order_number, proposal_id, status'),
      ]);
      setClientes(clientsResult || []);
      if (proposalsResult.error) return;
      const orders = ordersResult.data || [];
      setHistorico((proposalsResult.data || []).map((proposal) => ({ ...proposal, serviceOrder: orders.find((order) => order.proposal_id === proposal.id) || null })));
    } catch {
      // Mantém o gerador funcionando mesmo sem histórico.
    }
  };

  useEffect(() => { carregarDados(); }, []);
  useEffect(() => {
    setDados((atual) => ({ ...atual, valorProposta: Number(precoRecomendado || 0).toFixed(2), marcaPlaca: modulo || atual.marcaPlaca, inversor: inversor || atual.inversor }));
  }, [precoRecomendado, modulo, inversor]);

  const selecionarCliente = (id) => {
    setClienteId(id);
    const cliente = clientes.find((item) => item.id === id);
    if (!cliente) return;
    setDados((atual) => ({ ...atual, cliente: cliente.name, telefone: cliente.phone, cidade: [cliente.city, cliente.state].filter(Boolean).join('/') || atual.cidade }));
  };

  const atualizar = ({ target: { name, value } }) => setDados((atual) => name === 'potenciaPlaca'
    ? { ...atual, potenciaPlaca: value, geracaoMensal: Math.round(gerarPorPainel(value) * quantidadePlacas) }
    : { ...atual, [name]: value });

  const paymentOptions = {
    cash: { total: valor },
    card: { feePercent: Number(taxaCartao || 0), total: totalCartao, options: opcoesCartao },
    belcred: { installments: belcredSelecionado?.parcelas || 96, monthlyRate: belcredSelecionado?.taxa || '', installmentValue: belcredSelecionado?.valor || 0 },
  };

  const payload = (status = 'Gerada') => ({
    client_id: clienteId || null, client_name: dados.cliente.trim(), phone: somenteNumeros(dados.telefone), city: dados.cidade || null,
    status, total_amount: valor, panel_count: Number(quantidadePlacas || 0), panel_power_w: Number(dados.potenciaPlaca || 0),
    system_power_kw: potenciaSistema, monthly_generation_kwh: Number(dados.geracaoMensal || geracaoCalculada), panel_model: dados.marcaPlaca,
    inverter_model: dados.inversor, validity_days: Number(dados.validade || 7), notes: dados.observacoes || null,
    sent_at: status === 'Enviada' ? new Date().toISOString() : null,
    proposal_data: { ...dados, clienteId, quantidadePlacas, potenciaSistema, paymentOptions },
  });

  const validarNome = () => {
    if (dados.cliente.trim()) return true;
    setMensagem('Informe o nome do cliente antes de gerar a proposta.');
    document.querySelector('input[name="cliente"]')?.focus();
    return false;
  };

  const salvarProposta = async (status = 'Gerada') => {
    if (!isSupabaseConfigured || !supabase) return { saved: false, warning: 'O PDF foi gerado, mas a proposta não foi registrada porque o Supabase não está disponível.' };
    setSalvando(true);
    try {
      const { data, error } = await supabase.from('sales_proposals').insert(payload(status)).select('*').single();
      if (error) return { saved: false, warning: `O PDF foi gerado, mas a proposta não foi registrada no CRM: ${error.message}` };
      if (clienteId) {
        try { await createClientInteraction(clienteId, { type: 'proposta', description: `Proposta ${status.toLowerCase()} no valor de ${moeda.format(valor)}.`, nextActionAt: '' }); } catch { /* não bloqueia */ }
      }
      await carregarDados();
      return { saved: true, data };
    } catch (error) {
      return { saved: false, warning: `O PDF foi gerado, mas a proposta não foi registrada no CRM: ${error?.message || 'erro inesperado'}` };
    } finally { setSalvando(false); }
  };

  const criarArquivoPdf = (origem = dados) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const qtd = Number(origem.quantidadePlacas || quantidadePlacas || 0);
    const potenciaPainel = Number(origem.potenciaPlaca || dados.potenciaPlaca || 0);
    const potencia = (qtd * potenciaPainel) / 1000;
    const geracao = Number(origem.geracaoMensal || gerarPorPainel(potenciaPainel) * qtd);
    const geracaoPainel = gerarPorPainel(potenciaPainel);
    const validade = Number(origem.validade || 7);
    const valorPdf = Number(origem.valorProposta || valor || 0);
    const belcredPdf = BELCRED.map((opcao) => ({ ...opcao, valor: valorPdf * opcao.fator }));

    cabecalhoAzul(doc, 'Energia solar pensada para', 'economizar todos os meses.', 'Solução fotovoltaica completa, com equipamentos de qualidade, instalação especializada, homologação e suporte pós-venda.', 'PROPOSTA COMERCIAL');
    let y = 79;
    [['CLIENTE', origem.cliente || '-'], ['LOCAL', origem.cidade || '-'], ['CONTATO', origem.telefone || '-']].forEach(([rotulo, conteudo]) => {
      arredondar(doc, 12, y, 186, 14, [20, 66, 112], [61, 101, 143]);
      doc.setTextColor(195, 213, 232); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.text(rotulo, 16, y + 5);
      doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.text(String(conteudo), 16, y + 11); y += 17;
    });

    doc.setTextColor(16, 47, 82); doc.setFontSize(12); doc.text('Resumo do sistema', 12, 136);
    const cards = [
      ['QUANTIDADE', `${qtd} painéis`], ['POTÊNCIA INSTALADA', `${potencia.toFixed(2).replace('.', ',')} kWp`],
      ['GERAÇÃO ESTIMADA', `${Math.round(geracao).toLocaleString('pt-BR')} kWh/mês`], ['GERAÇÃO POR PAINEL', `${geracaoPainel.toFixed(2).replace('.', ',')} kWh/mês`],
    ];
    cards.forEach(([a, b], i) => {
      const x = i % 2 === 0 ? 12 : 106; const cy = i < 2 ? 141 : 167;
      arredondar(doc, x, cy, 92, 22); doc.setTextColor(95, 109, 128); doc.setFontSize(6.5); doc.text(a, x + 4, cy + 7);
      doc.setTextColor(25, 39, 59); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(b, x + 4, cy + 15);
    });
    arredondar(doc, 12, 194, 186, 28, [255, 251, 230], [235, 203, 74]);
    doc.setTextColor(101, 89, 31); doc.setFontSize(7); doc.text('INVESTIMENTO TOTAL', 16, 202);
    doc.setTextColor(25, 39, 59); doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text('Projeto completo instalado e homologado', 16, 208);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.text(moeda.format(valorPdf), 16, 218);
    doc.setFontSize(12); doc.text('Escopo incluso', 12, 230);
    [['Projeto', 'Dimensionamento e documentação técnica'], ['Instalação', 'Estrutura, cabeamento e proteções'], ['Homologação', 'Processo junto à concessionária'], ['Pós-venda', 'Suporte após a entrega do sistema']].forEach(([a, b], i) => {
      const x = i % 2 === 0 ? 12 : 106; const cy = i < 2 ? 235 : 249;
      arredondar(doc, x, cy, 92, 11, [255, 255, 255]); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.text(a, x + 3, cy + 4.5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.7); doc.text(b, x + 3, cy + 8.3);
    });
    rodape(doc, validade);

    doc.addPage();
    doc.setTextColor(16, 47, 82); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Simulação de financiamento BelCred', 12, 18);
    doc.setFillColor(8, 46, 88); doc.roundedRect(12, 25, 186, 11, 4, 4, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.text('PRAZO', 16, 32); doc.text('PARCELA ESTIMADA', 64, 32); doc.text('TAXA INFORMADA', 156, 32);
    belcredPdf.forEach((item, i) => {
      const ry = 36 + i * 14; arredondar(doc, 12, ry, 186, 14, i % 2 ? [249, 250, 252] : [255, 255, 255]);
      doc.setTextColor(39, 49, 65); doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.text(`${item.parcelas}x`, 16, ry + 9);
      doc.setFont('helvetica', 'normal'); doc.text(moeda.format(item.valor), 64, ry + 9); doc.text(`${item.taxa} a.m.`, 156, ry + 9);
    });
    doc.setTextColor(100, 110, 125); doc.setFontSize(7.2); doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize('A simulação BelCred é meramente indicativa. Valores, taxas, prazo, IOF, disponibilidade e aprovação estão sujeitos à análise de crédito e confirmação da instituição financeira.', 184), 12, 155);
    rodape(doc, validade);

    doc.addPage();
    cabecalhoAzul(doc, 'Equipamentos selecionados para', 'desempenho e segurança.', 'Conheça os principais componentes previstos para o sistema fotovoltaico desta proposta.', 'DETALHES TÉCNICOS');
    doc.setTextColor(16, 47, 82); doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Painel fotovoltaico', 12, 84);
    arredondar(doc, 12, 90, 90, 73, [255, 255, 255]);
    doc.setFillColor(226, 235, 245); doc.roundedRect(25, 96, 64, 27, 2, 2, 'F');
    doc.setTextColor(45, 68, 92); doc.setFontSize(8); doc.text('IMAGEM DO PAINEL', 57, 111, { align: 'center' });
    doc.setTextColor(25, 39, 59); doc.setFontSize(10); doc.text(origem.marcaPlaca || 'Painel fotovoltaico', 16, 131);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(doc.splitTextToSize('Módulo fotovoltaico de alta potência para geração residencial ou comercial, conforme modelo informado.', 81), 16, 137);
    doc.text(`• Potência nominal: ${potenciaPainel} W`, 16, 148); doc.text(`• Quantidade: ${qtd} unidades`, 16, 153); doc.text(`• Potência total: ${potencia.toFixed(2).replace('.', ',')} kWp`, 16, 158);

    arredondar(doc, 108, 90, 90, 73, [255, 255, 255]);
    doc.setFillColor(232, 233, 236); doc.roundedRect(121, 96, 64, 27, 2, 2, 'F');
    doc.setTextColor(45, 68, 92); doc.setFontSize(8); doc.text('IMAGEM DO INVERSOR', 153, 111, { align: 'center' });
    doc.setTextColor(25, 39, 59); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(origem.inversor || 'Inversor solar', 112, 131);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(doc.splitTextToSize('Equipamento responsável pela conversão da energia produzida pelos painéis para utilização no imóvel e compensação na rede elétrica.', 81), 112, 137);
    doc.text('• Monitoramento do sistema', 112, 151); doc.text('• Proteção e conversão de energia', 112, 156); doc.text('• Instalação e configuração inclusas', 112, 161);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Garantias e segurança', 12, 175);
    [['Módulos fotovoltaicos', 'Garantia conforme fabricante e ficha técnica'], ['Microinversor/inversor', 'Garantia conforme fabricante e modelo'], ['Instalação', 'Garantia de serviço e mão de obra'], ['Homologação', 'Acompanhamento até a conclusão do processo']].forEach(([a, b], i) => {
      const x = i % 2 === 0 ? 12 : 106; const cy = i < 2 ? 181 : 197; arredondar(doc, x, cy, 92, 13);
      doc.setFontSize(7); doc.text(a, x + 3, cy + 5); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.text(b, x + 3, cy + 10); doc.setFont('helvetica', 'bold');
    });
    doc.setFontSize(12); doc.text('Etapas do projeto', 12, 218);
    [['1. Vistoria', 'Validação do local e condições elétricas'], ['2. Projeto', 'Dimensionamento e documentação'], ['3. Instalação', 'Montagem e testes do sistema'], ['4. Homologação', 'Solicitação junto à concessionária']].forEach(([a, b], i) => {
      const x = i % 2 === 0 ? 12 : 106; const cy = i < 2 ? 224 : 239; arredondar(doc, x, cy, 92, 12, [255, 255, 255]); doc.setFontSize(7); doc.text(a, x + 3, cy + 5); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.text(b, x + 3, cy + 9); doc.setFont('helvetica', 'bold');
    });
    arredondar(doc, 12, 254, 186, 10, [248, 249, 252], [255, 194, 15]); doc.setFontSize(6.5); doc.text('Observações da proposta', 16, 258); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.text(doc.splitTextToSize(origem.observacoes || '', 173), 16, 262);

    doc.addPage();
    doc.setTextColor(95, 105, 120); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize('As imagens dos equipamentos são ilustrativas e podem variar conforme lote, disponibilidade de estoque e atualização do fabricante, mantendo-se as especificações técnicas e a qualidade acordadas. A geração apresentada é estimada e pode variar conforme orientação, inclinação, sombreamento, clima, temperatura, perdas elétricas e condições reais da instalação.', 184), 12, 20);
    doc.setFillColor(8, 46, 88); doc.rect(0, 95, 210, 55, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('MM Energia Solar • Bauru/SP', 198, 118, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Energia limpa, economia e acompanhamento profissional.', 198, 129, { align: 'right' });
    doc.text(`Validade comercial: ${validade} dias.`, 198, 139, { align: 'right' });

    const blob = doc.output('blob');
    return new File([blob], `Proposta MM Energia Solar - ${arquivoSeguro(origem.cliente)}.pdf`, { type: 'application/pdf' });
  };

  const baixarPdf = (arquivo) => {
    const url = URL.createObjectURL(arquivo); const link = document.createElement('a');
    link.href = url; link.download = arquivo.name; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const gerarESalvar = async () => {
    if (!validarNome()) return;
    const arquivo = criarArquivoPdf(); baixarPdf(arquivo);
    const resultado = await salvarProposta('Gerada');
    setMensagem(resultado.saved ? 'Proposta completa salva e PDF gerado.' : resultado.warning);
  };

  const enviarWhatsApp = async () => {
    if (!validarNome()) return;
    const arquivo = criarArquivoPdf();
    try {
      if (!navigator.share || !navigator.canShare?.({ files: [arquivo] })) {
        baixarPdf(arquivo); setMensagem('O PDF foi baixado. Anexe-o no WhatsApp Business pelo botão de clipe.'); return;
      }
      await navigator.share({ files: [arquivo], title: `Proposta MM Energia Solar - ${dados.cliente.trim()}`, text: `Olá, ${dados.cliente.trim()}! Segue em anexo sua proposta da MM Energia Solar.` });
      const resultado = await salvarProposta('Enviada');
      setMensagem(resultado.saved ? 'PDF compartilhado e proposta registrada como enviada.' : resultado.warning);
    } catch (error) {
      if (error?.name === 'AbortError') { setMensagem('Compartilhamento cancelado.'); return; }
      baixarPdf(arquivo); setMensagem('Não foi possível compartilhar automaticamente. O PDF foi baixado.');
    }
  };

  const fecharVenda = async (proposal) => {
    if (!window.confirm(`Confirmar a venda para ${proposal.client_name} e gerar a Ordem de Serviço?`)) return;
    setFechandoId(proposal.id);
    try {
      const { proposal: updated, serviceOrder } = await closeProposalAsSale(proposal.id);
      setHistorico((rows) => rows.map((row) => row.id === proposal.id ? { ...row, ...updated, serviceOrder } : row));
      setMensagem(`Venda fechada. OS nº ${serviceOrder.order_number} criada com sucesso.`);
    } catch (error) { setMensagem(error?.message || 'Não foi possível fechar a venda.'); } finally { setFechandoId(null); }
  };

  const excluir = async (id) => { if (!window.confirm('Excluir esta proposta do histórico?') || !supabase) return; await supabase.from('sales_proposals').delete().eq('id', id); carregarDados(); };
  const filtrado = historico.filter((item) => `${item.client_name} ${item.phone}`.toLowerCase().includes(busca.toLowerCase()));

  return <section className="finance-panel">
    <div className="finance-panel-header proposal-no-print"><div><h2>Gerador de proposta para o cliente</h2><p>Gere a proposta comercial completa em PDF e registre tudo no CRM.</p></div></div>
    <div className="proposal-print-area">
      <div className="finance-form">
        <label className="finance-field proposal-no-print"><span>Cliente do CRM</span><select value={clienteId} onChange={(event) => selecionarCliente(event.target.value)}><option value="">Preencher manualmente</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.name} · {cliente.phone}</option>)}</select></label>
        <label className="finance-field"><span>Nome do cliente *</span><input name="cliente" value={dados.cliente} onChange={atualizar} /></label>
        <label className="finance-field proposal-no-print"><span>WhatsApp</span><input name="telefone" value={dados.telefone} onChange={atualizar} /></label>
        <label className="finance-field"><span>Cidade/UF</span><input name="cidade" value={dados.cidade} onChange={atualizar} /></label>
        <label className="finance-field"><span>Sistema</span><input value={`${quantidadePlacas} painéis · ${potenciaSistema.toFixed(2)} kWp`} readOnly /></label>
        <label className="finance-field"><span>Geração estimada</span><input value={`${Number(dados.geracaoMensal || geracaoCalculada).toLocaleString('pt-BR')} kWh/mês`} readOnly /></label>
        <label className="finance-field proposal-no-print"><span>Validade (dias)</span><input type="number" name="validade" value={dados.validade} onChange={atualizar} /></label>
        <label className="finance-field finance-field-wide"><span>Itens e observações</span><textarea name="observacoes" value={dados.observacoes} onChange={atualizar} rows="3" /></label>
      </div>
      <div className="pricing-highlight"><span>Valor total da proposta</span><strong className="proposal-total-value">{moeda.format(valor)}</strong></div>
      <div className="proposal-payment-grid">
        <div className="proposal-payment-card"><span>Financiamento BelCred</span><strong>{paymentOptions.belcred.installments}x de {moeda.format(paymentOptions.belcred.installmentValue)}</strong><select className="proposal-no-print" value={planoBelcred} onChange={(event) => setPlanoBelcred(Number(event.target.value))} style={{ width: '100%', marginTop: 10 }}>{belcred.map((item) => <option value={item.parcelas} key={item.parcelas}>{item.parcelas}x de {moeda.format(item.valor)}</option>)}</select></div>
        <div className="proposal-payment-card"><span>Cartão de crédito</span><div className="proposal-card-options">{opcoesCartao.map((item) => <div className="proposal-card-option" key={item.parcelas}>{item.parcelas}x de {moeda.format(item.valorParcela)}</div>)}</div></div>
      </div>
    </div>
    {mensagem && <p className="finance-notice proposal-no-print" style={{ fontWeight: 800 }}>{mensagem}</p>}
    <div className="proposal-no-print" style={{ marginTop: 18, border: '1px solid #dce5ef', borderRadius: 18, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}><Sparkles size={20} /><strong>Proposta pronta</strong></div>
      <div className="finance-actions"><button className="finance-button" type="button" disabled={salvando} onClick={gerarESalvar}><FileDown size={20} /> Salvar e gerar PDF completo</button><button className="finance-button" type="button" disabled={salvando} onClick={enviarWhatsApp}><MessageCircle size={20} /> Compartilhar PDF no WhatsApp Business</button></div>
      <div style={{ marginTop: 10, color: '#667085', fontSize: 12 }}><ShieldCheck size={15} /> PDF comercial em 4 páginas, com resumo, financiamento, equipamentos, garantias e etapas.</div>
    </div>
    <div className="proposal-no-print" style={{ marginTop: 24, borderTop: '1px solid #dce5ef', paddingTop: 20 }}>
      <div className="finance-panel-header"><div><h2>Histórico de propostas</h2><p>Feche a venda e gere a OS diretamente daqui.</p></div><button type="button" onClick={carregarDados}><RefreshCw size={20} /></button></div>
      <label className="finance-field"><span>Pesquisar</span><div style={{ display: 'flex', gap: 8 }}><Search size={18} /><input value={busca} onChange={(event) => setBusca(event.target.value)} /></div></label>
      {filtrado.map((item) => <div className="finance-list-item" key={item.id}><div><strong>{item.client_name}</strong><span>{new Date(item.created_at).toLocaleDateString('pt-BR')} · {moeda.format(item.total_amount)} · {item.status}</span></div><div className="finance-actions"><button type="button" onClick={() => baixarPdf(criarArquivoPdf(item.proposal_data || dados))}><FileDown size={16} /> PDF</button>{item.serviceOrder || item.status === 'Venda Fechada' ? <button type="button" onClick={() => navigate('/app/ordens-servico')}><CheckCircle2 size={16} /> {item.serviceOrder ? `Abrir OS #${item.serviceOrder.order_number}` : 'Venda fechada'}</button> : <button type="button" disabled={fechandoId === item.id} onClick={() => fecharVenda(item)}><Wrench size={16} /> {fechandoId === item.id ? 'Gerando OS...' : 'Fechar venda e gerar OS'}</button>}<button type="button" className="finance-delete" onClick={() => excluir(item.id)}><Trash2 size={16} /> Excluir</button></div></div>)}
      {!filtrado.length && <div className="finance-empty">Nenhuma proposta encontrada.</div>}
    </div>
  </section>;
}
