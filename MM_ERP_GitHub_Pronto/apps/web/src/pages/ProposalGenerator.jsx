import React, { useEffect, useMemo, useState } from 'react';
import { FileDown, MessageCircle, RefreshCw, Search, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';
import { createClientInteraction, listClients } from '../services/clientService.js';

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

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
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
  const [planoBelcred, setPlanoBelcred] = useState(96);

  const valor = Number(dados.valorProposta || precoRecomendado || 0);
  const potenciaSistema = (quantidadePlacas * Number(dados.potenciaPlaca || 0)) / 1000;
  const geracaoCalculada = calcularGeracaoPorPainel(dados.potenciaPlaca) * quantidadePlacas;
  const belcred = useMemo(() => BELCRED.map((opcao) => ({ ...opcao, valor: valor * opcao.fator })), [valor]);
  const belcredSelecionado = belcred.find((item) => item.parcelas === Number(planoBelcred)) || belcred.at(-1);

  const carregarDados = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const [clientsResult, proposalsResult] = await Promise.all([
      listClients(),
      supabase.from('sales_proposals').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setClientes(clientsResult);
    if (proposalsResult.error) setMensagem(`Não foi possível carregar o histórico: ${proposalsResult.error.message}`);
    else setHistorico(proposalsResult.data || []);
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
    setDados((atual) => ({
      ...atual,
      cliente: cliente.name,
      telefone: cliente.phone,
      cidade: [cliente.city, cliente.state].filter(Boolean).join('/') || atual.cidade,
    }));
  };

  const atualizar = (event) => {
    const { name, value } = event.target;
    setDados((atual) => name === 'potenciaPlaca'
      ? { ...atual, potenciaPlaca: value, geracaoMensal: Math.round(calcularGeracaoPorPainel(value) * quantidadePlacas) }
      : { ...atual, [name]: value });
  };

  const validarCliente = () => {
    if (!dados.cliente.trim()) { window.alert('Selecione ou informe o cliente.'); return false; }
    if (somenteNumeros(dados.telefone).length < 10) { window.alert('Informe o WhatsApp do cliente com DDD.'); return false; }
    return true;
  };

  const paymentOptions = {
    cash: { total: valor },
    card: {
      installments: Number(parcelasCartao || 1),
      feePercent: Number(taxaCartao || 0),
      total: Number(precoCartao || valor),
      installmentValue: Number(valorParcelaCartao || precoCartao || valor),
    },
    belcred: {
      installments: belcredSelecionado?.parcelas || 96,
      monthlyRate: belcredSelecionado?.taxa || '',
      installmentValue: belcredSelecionado?.valor || 0,
    },
  };

  const payload = (status = 'Gerada') => ({
    client_id: clienteId || null,
    client_name: dados.cliente.trim(), phone: somenteNumeros(dados.telefone), city: dados.cidade || null,
    status, total_amount: valor, panel_count: Number(quantidadePlacas || 0), panel_power_w: Number(dados.potenciaPlaca || 0),
    system_power_kw: potenciaSistema, monthly_generation_kwh: Number(dados.geracaoMensal || geracaoCalculada),
    panel_model: dados.marcaPlaca, inverter_model: dados.inversor, validity_days: Number(dados.validade || 7),
    notes: dados.observacoes || null, sent_at: status === 'Enviada' ? new Date().toISOString() : null,
    proposal_data: { ...dados, clienteId, quantidadePlacas, potenciaSistema, paymentOptions },
  });

  const salvarProposta = async (status = 'Gerada') => {
    if (!validarCliente()) return null;
    if (!isSupabaseConfigured || !supabase) return null;
    setSalvando(true);
    setMensagem('Salvando proposta no Supabase...');
    const { data, error } = await supabase.from('sales_proposals').insert(payload(status)).select('*').single();
    if (!error && clienteId) {
      await createClientInteraction(clienteId, {
        type: 'proposta',
        description: `Proposta ${status.toLowerCase()} no valor de ${moeda.format(valor)}. Cartão em ${paymentOptions.card.installments}x de ${moeda.format(paymentOptions.card.installmentValue)}.`,
        nextActionAt: '',
      });
    }
    setSalvando(false);
    if (error) { setMensagem(`Erro ao salvar proposta: ${error.message}`); return null; }
    setMensagem(status === 'Enviada' ? 'Proposta enviada e registrada no CRM.' : 'Proposta salva e registrada no CRM.');
    await carregarDados();
    return data;
  };

  const abrirPdf = (proposta = dados) => {
    const base = proposta.proposal_data || proposta;
    const cliente = base.cliente || proposta.client_name || dados.cliente;
    const telefone = base.telefone || proposta.phone || dados.telefone;
    const cidade = base.cidade || proposta.city || dados.cidade;
    const valorPdf = Number(base.valorProposta || proposta.total_amount || valor);
    const pagamentos = base.paymentOptions || paymentOptions;
    const janela = window.open('', '_blank');
    if (!janela) return;
    const logoUrl = `${window.location.origin}/logo-mm.png`;
    const data = new Intl.DateTimeFormat('pt-BR').format(new Date());
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Proposta - ${escapeHtml(cliente)}</title><style>*{box-sizing:border-box}body{margin:0;background:#e8edf4;font-family:Arial;color:#172033}.page{width:210mm;min-height:297mm;margin:16px auto;background:#fff}.head{padding:38px 48px;background:#08274d;color:#fff}.head img{width:150px}.head h1{font-size:30px}.content{padding:34px 48px}.grid,.payments{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.card{border:1px solid #dce5ef;border-radius:12px;padding:14px}.card small{display:block;color:#667085}.price{margin:20px 0;padding:20px;border-radius:14px;background:#fff7d6;border:1px solid #efd264;font-size:28px;font-weight:800;color:#08274d}.equipment{margin-top:20px;padding:16px;border-left:5px solid #f7bd16;background:#f7f9fc}.footer{padding:25px 48px;background:#08274d;color:#fff}.actions{position:fixed;right:18px;bottom:18px}.actions button{padding:15px 20px;border:0;border-radius:12px;background:#f7bd16;font-weight:800}@media print{body{background:#fff}.page{margin:0}.actions{display:none}@page{size:A4;margin:0}}</style></head><body><main class="page"><section class="head"><img src="${logoUrl}"><h1>Proposta personalizada para ${escapeHtml(cliente)}</h1><p>Energia solar completa, instalada e homologada.</p></section><section class="content"><div class="grid"><div class="card"><small>Cliente</small><strong>${escapeHtml(cliente)}</strong></div><div class="card"><small>WhatsApp</small><strong>${escapeHtml(telefone)}</strong></div><div class="card"><small>Cidade</small><strong>${escapeHtml(cidade)}</strong></div><div class="card"><small>Sistema</small><strong>${quantidadePlacas} painéis • ${potenciaSistema.toFixed(2).replace('.', ',')} kWp</strong></div><div class="card"><small>Geração estimada</small><strong>${Number(dados.geracaoMensal || geracaoCalculada).toLocaleString('pt-BR')} kWh/mês</strong></div><div class="card"><small>Validade</small><strong>${dados.validade} dias</strong></div></div><div class="price">À vista: ${moeda.format(valorPdf)}</div><h3>Formas de pagamento</h3><div class="payments"><div class="card"><small>Cartão sem juros</small><strong>${pagamentos.card.installments}x de ${moeda.format(pagamentos.card.installmentValue)}</strong><small>Total ${moeda.format(pagamentos.card.total)}</small></div><div class="card"><small>Financiamento BelCred</small><strong>${pagamentos.belcred.installments}x de ${moeda.format(pagamentos.belcred.installmentValue)}</strong><small>Estimativa sujeita à aprovação</small></div><div class="card"><small>À vista</small><strong>${moeda.format(pagamentos.cash.total)}</strong><small>Pagamento conforme negociação</small></div></div><div class="equipment"><h3>Equipamentos e serviços</h3><p><b>Painéis:</b> ${escapeHtml(dados.marcaPlaca)}</p><p><b>Inversor:</b> ${escapeHtml(dados.inversor)}</p><p>${escapeHtml(dados.observacoes)}</p></div></section><footer class="footer">MM Energia Solar • Bauru/SP • Emitida em ${data}</footer></main><div class="actions"><button onclick="window.print()">Salvar em PDF / Imprimir</button></div></body></html>`);
    janela.document.close();
  };

  const gerarESalvar = async () => { const registro = await salvarProposta('Gerada'); if (registro) abrirPdf(registro); };
  const enviarWhatsApp = async () => {
    const registro = await salvarProposta('Enviada');
    if (!registro) return;
    abrirPdf(registro);
    const texto = `Olá, ${dados.cliente.trim()}!\nSegue sua proposta da MM Energia Solar.\nÀ vista: ${moeda.format(valor)}.\nCartão: ${paymentOptions.card.installments}x de ${moeda.format(paymentOptions.card.installmentValue)} sem juros.`;
    window.open(`https://wa.me/${numeroComPais(dados.telefone)}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
  };
  const excluir = async (id) => {
    if (!window.confirm('Excluir esta proposta do histórico?')) return;
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
    <div className="pricing-highlight"><span>BelCred em {paymentOptions.belcred.installments}x</span><strong>{moeda.format(paymentOptions.belcred.installmentValue)} por mês</strong></div>
    {mensagem && <p className="finance-notice">{mensagem}</p>}

    <div style={{ marginTop: 18, border: '1px solid #dce5ef', borderRadius: 18, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}><Sparkles size={20} /><strong>Proposta pronta</strong></div>
      <div className="finance-actions"><button className="finance-button" type="button" disabled={salvando} onClick={gerarESalvar}><FileDown size={20} /> Salvar e gerar PDF</button><button className="finance-button" type="button" disabled={salvando} onClick={enviarWhatsApp}><MessageCircle size={20} /> Enviar pelo WhatsApp</button></div>
      <div style={{ marginTop: 10, color: '#667085', fontSize: 12 }}><ShieldCheck size={15} /> Os dados são salvos no Supabase e no histórico do cliente.</div>
    </div>

    <div style={{ marginTop: 24, borderTop: '1px solid #dce5ef', paddingTop: 20 }}>
      <div className="finance-panel-header"><div><h2>Histórico de propostas</h2><p>Consulte ou gere novamente o PDF.</p></div><button type="button" onClick={carregarDados}><RefreshCw size={20} /></button></div>
      <label className="finance-field"><span>Pesquisar</span><div style={{ display: 'flex', gap: 8 }}><Search size={18} /><input value={busca} onChange={(event) => setBusca(event.target.value)} /></div></label>
      {filtrado.map((item) => <div className="finance-list-item" key={item.id}><div><strong>{item.client_name}</strong><span>{new Date(item.created_at).toLocaleDateString('pt-BR')} · {moeda.format(item.total_amount)}</span></div><div className="finance-actions"><button type="button" onClick={() => abrirPdf(item)}><FileDown size={16} /> PDF</button><button type="button" className="finance-delete" onClick={() => excluir(item.id)}><Trash2 size={16} /> Excluir</button></div></div>)}
      {!filtrado.length && <div className="finance-empty">Nenhuma proposta encontrada.</div>}
    </div>
  </section>;
}
