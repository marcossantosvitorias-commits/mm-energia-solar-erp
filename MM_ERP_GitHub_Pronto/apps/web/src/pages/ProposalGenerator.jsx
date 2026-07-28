import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileDown, MessageCircle, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Wrench } from 'lucide-react';
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
const numeroComPais = (valor = '') => {
  const numero = somenteNumeros(valor);
  return numero.startsWith('55') ? numero : `55${numero}`;
};
const calcularGeracaoPorPainel = (potenciaW) => (Number(potenciaW || 0) * IRRADIACAO_MEDIA * FATOR_DESEMPENHO * DIAS_MES) / 1000;

export default function ProposalGenerator({
  quantidadePlacas,
  precoRecomendado,
  modulo,
  inversor,
  potenciaSistemaKw,
  precoCartao = 0,
  parcelasCartao = 12,
  valorParcelaCartao = 0,
  taxaCartao = 0,
}) {
  const navigate = useNavigate();
  const potenciaInicial = Math.round((Number(potenciaSistemaKw || 0) * 1000) / quantidadePlacas) || 620;
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [dados, setDados] = useState({
    cliente: '', cidade: 'Bauru/SP', telefone: '', potenciaPlaca: potenciaInicial,
    marcaPlaca: modulo || 'Painel solar', inversor: inversor || 'Inversor solar',
    geracaoMensal: Math.round(calcularGeracaoPorPainel(potenciaInicial) * quantidadePlacas),
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
  const geracaoCalculada = calcularGeracaoPorPainel(dados.potenciaPlaca) * quantidadePlacas;
  const belcred = useMemo(() => BELCRED.map((opcao) => ({ ...opcao, valor: valor * opcao.fator })), [valor]);
  const belcredSelecionado = belcred.find((item) => item.parcelas === Number(planoBelcred)) || belcred.at(-1);

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
      setHistorico((proposalsResult.data || []).map((proposal) => ({
        ...proposal,
        serviceOrder: orders.find((order) => order.proposal_id === proposal.id) || null,
      })));
    } catch {
      // O gerador continua funcionando mesmo quando o histórico ainda não está disponível.
    }
  };

  useEffect(() => { carregarDados(); }, []);
  useEffect(() => {
    setDados((atual) => ({
      ...atual,
      valorProposta: Number(precoRecomendado || 0).toFixed(2),
      marcaPlaca: modulo || atual.marcaPlaca,
      inversor: inversor || atual.inversor,
    }));
  }, [precoRecomendado, modulo, inversor]);

  const selecionarCliente = (id) => {
    setClienteId(id);
    const cliente = clientes.find((item) => item.id === id);
    if (!cliente) return;
    setDados((atual) => ({ ...atual, cliente: cliente.name, telefone: cliente.phone, cidade: [cliente.city, cliente.state].filter(Boolean).join('/') || atual.cidade }));
  };

  const atualizar = ({ target: { name, value } }) => {
    setDados((atual) => name === 'potenciaPlaca'
      ? { ...atual, potenciaPlaca: value, geracaoMensal: Math.round(calcularGeracaoPorPainel(value) * quantidadePlacas) }
      : { ...atual, [name]: value });
  };

  const paymentOptions = {
    cash: { total: valor },
    card: { installments: Number(parcelasCartao || 1), feePercent: Number(taxaCartao || 0), total: Number(precoCartao || valor), installmentValue: Number(valorParcelaCartao || precoCartao || valor) },
    belcred: { installments: belcredSelecionado?.parcelas || 96, monthlyRate: belcredSelecionado?.taxa || '', installmentValue: belcredSelecionado?.valor || 0 },
  };

  const payload = (status = 'Gerada') => ({
    client_id: clienteId || null, client_name: dados.cliente.trim(), phone: somenteNumeros(dados.telefone), city: dados.cidade || null,
    status, total_amount: valor, panel_count: Number(quantidadePlacas || 0), panel_power_w: Number(dados.potenciaPlaca || 0),
    system_power_kw: potenciaSistema, monthly_generation_kwh: Number(dados.geracaoMensal || geracaoCalculada),
    panel_model: dados.marcaPlaca, inverter_model: dados.inversor, validity_days: Number(dados.validade || 7),
    notes: dados.observacoes || null, sent_at: status === 'Enviada' ? new Date().toISOString() : null,
    proposal_data: { ...dados, clienteId, quantidadePlacas, potenciaSistema, paymentOptions },
  });

  const validar = () => {
    if (!dados.cliente.trim()) {
      setMensagem('Informe o nome do cliente.');
      return false;
    }
    if (somenteNumeros(dados.telefone).length < 10) {
      setMensagem('Informe o WhatsApp com DDD.');
      return false;
    }
    return true;
  };

  const salvarProposta = async (status = 'Gerada') => {
    if (!validar()) return { saved: false, blocked: true };
    if (!isSupabaseConfigured || !supabase) {
      return { saved: false, warning: 'A proposta será gerada, mas não foi registrada porque o Supabase não está disponível.' };
    }

    setSalvando(true);
    try {
      const { data, error } = await supabase.from('sales_proposals').insert(payload(status)).select('*').single();
      if (error) {
        return { saved: false, warning: `A proposta será gerada, mas não foi registrada no CRM: ${error.message}` };
      }
      if (clienteId) {
        try {
          await createClientInteraction(clienteId, { type: 'proposta', description: `Proposta ${status.toLowerCase()} no valor de ${moeda.format(valor)}.`, nextActionAt: '' });
        } catch {
          // A proposta já foi salva; falha no histórico do cliente não bloqueia PDF ou WhatsApp.
        }
      }
      await carregarDados();
      return { saved: true, data };
    } catch (error) {
      return { saved: false, warning: `A proposta será gerada, mas não foi registrada no CRM: ${error?.message || 'erro inesperado'}` };
    } finally {
      setSalvando(false);
    }
  };

  const abrirPdf = () => {
    setMensagem('Abrindo a janela de impressão. Escolha “Salvar como PDF”.');
    window.setTimeout(() => window.print(), 100);
  };

  const gerarESalvar = async () => {
    if (!validar()) return;
    const resultado = await salvarProposta('Gerada');
    if (resultado.blocked) return;
    setMensagem(resultado.saved ? 'Proposta salva. Abrindo PDF...' : resultado.warning);
    abrirPdf();
  };

  const enviarWhatsApp = async () => {
    if (!validar()) return;
    const texto = `Olá, ${dados.cliente.trim()}!\nSegue sua proposta da MM Energia Solar.\nÀ vista: ${moeda.format(valor)}.\nCartão: ${paymentOptions.card.installments}x de ${moeda.format(paymentOptions.card.installmentValue)} sem juros.`;
    const whatsappUrl = `https://wa.me/${numeroComPais(dados.telefone)}?text=${encodeURIComponent(texto)}`;
    const novaJanela = window.open('about:blank', '_blank');
    const resultado = await salvarProposta('Enviada');
    if (resultado.blocked) {
      novaJanela?.close();
      return;
    }
    setMensagem(resultado.saved ? 'Proposta registrada. Abrindo WhatsApp...' : resultado.warning);
    if (novaJanela) {
      novaJanela.opener = null;
      novaJanela.location.href = whatsappUrl;
    } else {
      window.location.href = whatsappUrl;
    }
  };

  const fecharVenda = async (proposal) => {
    if (!window.confirm(`Confirmar a venda para ${proposal.client_name} e gerar a Ordem de Serviço?`)) return;
    setFechandoId(proposal.id);
    setMensagem('Fechando venda e gerando Ordem de Serviço...');
    try {
      const { proposal: updated, serviceOrder } = await closeProposalAsSale(proposal.id);
      setHistorico((rows) => rows.map((row) => row.id === proposal.id ? { ...row, ...updated, serviceOrder } : row));
      setMensagem(`Venda fechada. OS nº ${serviceOrder.order_number} criada com sucesso.`);
    } catch (error) {
      setMensagem(error?.message || 'Não foi possível fechar a venda.');
    } finally {
      setFechandoId(null);
    }
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir esta proposta do histórico?')) return;
    if (!supabase) return;
    await supabase.from('sales_proposals').delete().eq('id', id);
    carregarDados();
  };

  const filtrado = historico.filter((item) => `${item.client_name} ${item.phone}`.toLowerCase().includes(busca.toLowerCase()));

  return <section className="finance-panel">
    <div className="finance-panel-header"><div><h2>Gerador de proposta para o cliente</h2><p>Selecione o cliente, gere o PDF e registre tudo no CRM.</p></div></div>
    <div className="finance-form">
      <label className="finance-field"><span>Cliente do CRM</span><select value={clienteId} onChange={(event) => selecionarCliente(event.target.value)}><option value="">Preencher manualmente</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.name} · {cliente.phone}</option>)}</select></label>
      <label className="finance-field"><span>Nome do cliente *</span><input name="cliente" value={dados.cliente} onChange={atualizar} /></label>
      <label className="finance-field"><span>WhatsApp *</span><input name="telefone" value={dados.telefone} onChange={atualizar} /></label>
      <label className="finance-field"><span>Cidade/UF</span><input name="cidade" value={dados.cidade} onChange={atualizar} /></label>
      <label className="finance-field"><span>Potência de cada painel (W)</span><input type="number" name="potenciaPlaca" value={dados.potenciaPlaca} onChange={atualizar} /></label>
      <label className="finance-field"><span>Marca/modelo dos painéis</span><input name="marcaPlaca" value={dados.marcaPlaca} onChange={atualizar} /></label>
      <label className="finance-field"><span>Inversor</span><input name="inversor" value={dados.inversor} onChange={atualizar} /></label>
      <label className="finance-field"><span>Geração estimada</span><input type="number" name="geracaoMensal" value={dados.geracaoMensal} onChange={atualizar} /></label>
      <label className="finance-field"><span>Valor à vista</span><input type="number" step="0.01" name="valorProposta" value={dados.valorProposta} onChange={atualizar} /></label>
      <label className="finance-field"><span>BelCred para proposta</span><select value={planoBelcred} onChange={(event) => setPlanoBelcred(Number(event.target.value))}>{belcred.map((item) => <option value={item.parcelas} key={item.parcelas}>{item.parcelas}x de {moeda.format(item.valor)}</option>)}</select></label>
      <label className="finance-field"><span>Validade (dias)</span><input type="number" name="validade" value={dados.validade} onChange={atualizar} /></label>
      <label className="finance-field finance-field-wide"><span>Itens e observações</span><textarea name="observacoes" value={dados.observacoes} onChange={atualizar} rows="3" /></label>
    </div>
    <div className="pricing-highlight"><span>À vista</span><strong>{moeda.format(valor)}</strong></div>
    <div className="pricing-highlight"><span>Cartão em {paymentOptions.card.installments}x sem juros</span><strong>{paymentOptions.card.installments}x de {moeda.format(paymentOptions.card.installmentValue)} • total {moeda.format(paymentOptions.card.total)}</strong></div>
    {mensagem && <p className="finance-notice">{mensagem}</p>}
    <div style={{ marginTop: 18, border: '1px solid #dce5ef', borderRadius: 18, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}><Sparkles size={20} /><strong>Proposta pronta</strong></div>
      <div className="finance-actions"><button className="finance-button" type="button" disabled={salvando} onClick={gerarESalvar}><FileDown size={20} /> Salvar e gerar PDF</button><button className="finance-button" type="button" disabled={salvando} onClick={enviarWhatsApp}><MessageCircle size={20} /> Enviar pelo WhatsApp</button></div>
      <div style={{ marginTop: 10, color: '#667085', fontSize: 12 }}><ShieldCheck size={15} /> O PDF e o WhatsApp funcionam mesmo se o histórico do Supabase estiver temporariamente indisponível.</div>
    </div>
    <div style={{ marginTop: 24, borderTop: '1px solid #dce5ef', paddingTop: 20 }}>
      <div className="finance-panel-header"><div><h2>Histórico de propostas</h2><p>Feche a venda e gere a OS diretamente daqui.</p></div><button type="button" onClick={carregarDados}><RefreshCw size={20} /></button></div>
      <label className="finance-field"><span>Pesquisar</span><div style={{ display: 'flex', gap: 8 }}><Search size={18} /><input value={busca} onChange={(event) => setBusca(event.target.value)} /></div></label>
      {filtrado.map((item) => <div className="finance-list-item" key={item.id}>
        <div><strong>{item.client_name}</strong><span>{new Date(item.created_at).toLocaleDateString('pt-BR')} · {moeda.format(item.total_amount)} · {item.status}</span></div>
        <div className="finance-actions">
          <button type="button" onClick={abrirPdf}><FileDown size={16} /> PDF</button>
          {item.serviceOrder || item.status === 'Venda Fechada'
            ? <button type="button" onClick={() => navigate('/app/ordens-servico')}><CheckCircle2 size={16} /> {item.serviceOrder ? `Abrir OS #${item.serviceOrder.order_number}` : 'Venda fechada'}</button>
            : <button type="button" disabled={fechandoId === item.id} onClick={() => fecharVenda(item)}><Wrench size={16} /> {fechandoId === item.id ? 'Gerando OS...' : 'Fechar venda e gerar OS'}</button>}
          <button type="button" className="finance-delete" onClick={() => excluir(item.id)}><Trash2 size={16} /> Excluir</button>
        </div>
      </div>)}
      {!filtrado.length && <div className="finance-empty">Nenhuma proposta encontrada.</div>}
    </div>
  </section>;
}
