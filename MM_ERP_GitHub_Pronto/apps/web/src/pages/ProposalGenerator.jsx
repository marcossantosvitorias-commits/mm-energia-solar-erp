import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, FileDown, MessageCircle, RefreshCw, Search, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { formatarMoeda } from '../components/finance/storage.js';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const BELCRED = [
  { parcelas: 24, taxa: '1,91%', fator: 730.42 / 12232.56 },
  { parcelas: 30, taxa: '1,97%', fator: 622.11 / 12232.56 },
  { parcelas: 36, taxa: '2,02%', fator: 551.80 / 12232.56 },
  { parcelas: 48, taxa: '2,06%', fator: 463.73 / 12232.56 },
  { parcelas: 60, taxa: '2,10%', fator: 415.01 / 12232.56 },
  { parcelas: 72, taxa: '2,19%', fator: 391.95 / 12232.56 },
  { parcelas: 84, taxa: '2,28%', fator: 380.78 / 12232.56 },
  { parcelas: 96, taxa: '2,32%', fator: 370.80 / 12232.56 },
];

const TAXAS_CARTAO = [4.59, 6.09, 6.65, 7.15, 7.69, 8.19, 9.09, 9.69, 10.25, 10.79, 11.39, 11.69, 12.55, 12.99, 13.69, 14.29, 14.85, 15.49, 16.39, 17.39, 18.28]
  .map((taxa, index) => ({ parcelas: index + 1, taxa }));

const IRRADIACAO_MEDIA = 5.2;
const FATOR_DESEMPENHO = 0.8;
const DIAS_MES = 30;
const DEFAULT_PANEL_IMAGE = 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=85';
const DEFAULT_INVERTER_IMAGE = 'https://www.deyeinverter.com/deyeinverter/2025/06/03/%E4%BA%A7%E5%93%81%E5%B0%81%E9%9D%A2-3-3.png';

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const somenteNumeros = (valor = '') => valor.replace(/\D/g, '');
const numeroComPais = (valor = '') => {
  const numero = somenteNumeros(valor);
  return numero.startsWith('55') ? numero : `55${numero}`;
};
const calcularGeracaoPorPainel = (potenciaW) => (Number(potenciaW || 0) * IRRADIACAO_MEDIA * FATOR_DESEMPENHO * DIAS_MES) / 1000;

const separarCidadeUf = (cidadeUf = '') => {
  const partes = String(cidadeUf || '').split('/').map((parte) => parte.trim()).filter(Boolean);
  if (partes.length >= 2) return { city: partes.slice(0, -1).join('/'), state: partes.at(-1).toUpperCase() };
  return { city: String(cidadeUf || '').trim() || null, state: null };
};

export default function ProposalGenerator({ quantidadePlacas, precoRecomendado, modulo, inversor, potenciaSistemaKw }) {
  const potenciaInicial = Math.round((Number(potenciaSistemaKw || 0) * 1000) / quantidadePlacas) || 620;
  const [dados, setDados] = useState({
    cliente: '', cidade: 'Bauru/SP', telefone: '', potenciaPlaca: potenciaInicial,
    marcaPlaca: modulo || 'TCL Solar bifacial N-Type 620 W',
    inversor: inversor || 'Microinversor Deye 2,25 kW 220 V',
    geracaoMensal: Math.round(calcularGeracaoPorPainel(potenciaInicial) * quantidadePlacas),
    valorProposta: Number(precoRecomendado || 0).toFixed(2), validade: 7,
    observacoes: 'Projeto executivo, instalação, homologação junto à concessionária, estrutura, proteções elétricas e pós-venda inclusos.',
    fotoPainel: DEFAULT_PANEL_IMAGE, fotoInversor: DEFAULT_INVERTER_IMAGE,
  });
  const [historico, setHistorico] = useState([]);
  const [busca, setBusca] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);

  const valor = Number(dados.valorProposta || precoRecomendado || 0);
  const potenciaSistema = (quantidadePlacas * Number(dados.potenciaPlaca || 0)) / 1000;
  const geracaoPorPainel = calcularGeracaoPorPainel(dados.potenciaPlaca);
  const geracaoCalculada = geracaoPorPainel * quantidadePlacas;
  const parcelas = useMemo(() => BELCRED.map((opcao) => ({ ...opcao, valor: valor * opcao.fator })), [valor]);
  const cartao = useMemo(() => TAXAS_CARTAO.map((opcao) => {
    const total = valor / (1 - opcao.taxa / 100);
    return { ...opcao, total, valorParcela: total / opcao.parcelas };
  }), [valor]);

  const carregarHistorico = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase.from('sales_proposals').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) setMensagem(`Não foi possível carregar o histórico: ${error.message}`);
    else setHistorico(data || []);
  };

  useEffect(() => {
    carregarHistorico();
    if (!isSupabaseConfigured || !supabase) return undefined;
    const canal = supabase.channel('sales-proposals-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_proposals' }, carregarHistorico)
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  const atualizar = (event) => {
    const { name, value } = event.target;
    setDados((atual) => name === 'potenciaPlaca'
      ? { ...atual, potenciaPlaca: value, geracaoMensal: Math.round(calcularGeracaoPorPainel(value) * quantidadePlacas) }
      : { ...atual, [name]: value });
  };

  const validarCliente = () => {
    if (!dados.cliente.trim()) { window.alert('Informe o nome do cliente.'); return false; }
    if (somenteNumeros(dados.telefone).length < 10) { window.alert('Informe o WhatsApp do cliente com DDD.'); return false; }
    return true;
  };

  const garantirCliente = async () => {
    const telefone = somenteNumeros(dados.telefone);
    const nome = dados.cliente.trim();
    const { city, state } = separarCidadeUf(dados.cidade);

    const { data: existentes, error: buscaError } = await supabase
      .from('clients')
      .select('id,name,phone,city,state,status')
      .limit(1)
      .or(`phone.eq.${telefone},phone.eq.${dados.telefone.trim()}`);

    if (buscaError) throw buscaError;

    const existente = existentes?.[0];
    if (existente) {
      const atualizacoes = {};
      if (nome && nome !== existente.name) atualizacoes.name = nome;
      if (telefone && telefone !== somenteNumeros(existente.phone || '')) atualizacoes.phone = telefone;
      if (city && city !== existente.city) atualizacoes.city = city;
      if (state && state !== existente.state) atualizacoes.state = state;
      if (existente.status === 'lead') atualizacoes.status = 'proposta';

      if (Object.keys(atualizacoes).length) {
        const { error: updateError } = await supabase.from('clients').update(atualizacoes).eq('id', existente.id);
        if (updateError) throw updateError;
      }
      return existente.id;
    }

    const { data: criado, error: createError } = await supabase.from('clients').insert({
      name: nome,
      phone: telefone,
      city,
      state,
      customer_type: 'residencial',
      status: 'proposta',
      monthly_bill: 0,
      notes: 'Cliente cadastrado automaticamente ao gerar proposta manual.',
    }).select('id').single();

    if (createError) throw createError;
    return criado.id;
  };

  const payload = (status = 'Gerada', clientId = null) => ({
    client_id: clientId,
    client_name: dados.cliente.trim(), phone: somenteNumeros(dados.telefone), city: dados.cidade || null,
    status, total_amount: valor, panel_count: Number(quantidadePlacas || 0), panel_power_w: Number(dados.potenciaPlaca || 0),
    system_power_kw: potenciaSistema, monthly_generation_kwh: Number(dados.geracaoMensal || geracaoCalculada),
    panel_model: dados.marcaPlaca, inverter_model: dados.inversor, validity_days: Number(dados.validade || 7),
    notes: dados.observacoes || null, sent_at: status === 'Enviada' ? new Date().toISOString() : null,
    proposal_data: { ...dados, quantidadePlacas, potenciaSistema, cartao, parcelas },
  });

  const salvarProposta = async (status = 'Gerada') => {
    if (!validarCliente()) return null;
    if (!isSupabaseConfigured || !supabase) {
      window.alert('O Supabase não está configurado. A proposta não será enviada para evitar perda de dados.');
      return null;
    }

    setSalvando(true);
    setMensagem('Cadastrando cliente e salvando proposta no Supabase...');
    try {
      const clientId = await garantirCliente();
      const { data, error } = await supabase.from('sales_proposals').insert(payload(status, clientId)).select('*').single();
      if (error) throw error;
      setMensagem(status === 'Enviada'
        ? 'Cliente cadastrado/atualizado e proposta registrada como enviada.'
        : 'Cliente cadastrado/atualizado e proposta salva no histórico.');
      await carregarHistorico();
      return data;
    } catch (error) {
      setMensagem(`Erro ao salvar cliente/proposta: ${error.message}`);
      return null;
    } finally {
      setSalvando(false);
    }
  };

  const abrirPdf = (proposta = dados) => {
    const cliente = proposta.cliente || proposta.client_name || '';
    const telefone = proposta.telefone || proposta.phone || '';
    const cidade = proposta.cidade || proposta.city || 'Bauru/SP';
    const valorPdf = Number(proposta.valorProposta || proposta.total_amount || valor);
    const painel = proposta.marcaPlaca || proposta.panel_model || dados.marcaPlaca;
    const inv = proposta.inversor || proposta.inverter_model || dados.inversor;
    const qtd = Number(proposta.quantidadePlacas || proposta.panel_count || quantidadePlacas);
    const potencia = Number(proposta.potenciaPlaca || proposta.panel_power_w || dados.potenciaPlaca);
    const geracao = Number(proposta.geracaoMensal || proposta.monthly_generation_kwh || dados.geracaoMensal);
    const observacoes = proposta.observacoes || proposta.notes || dados.observacoes;
    const validade = proposta.validade || proposta.validity_days || dados.validade;
    const janela = window.open('', '_blank');
    if (!janela) { window.alert('Permita a abertura de janelas para gerar o PDF.'); return; }
    const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}logo-mm.png`;
    const data = new Intl.DateTimeFormat('pt-BR').format(new Date());
    janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Proposta - ${escapeHtml(cliente)}</title><style>*{box-sizing:border-box}body{margin:0;background:#e8edf4;font-family:Arial;color:#172033}.page{width:210mm;min-height:297mm;margin:16px auto;background:#fff}.head{padding:38px 48px;background:linear-gradient(135deg,#08274d,#0d3c70);color:#fff}.head img{display:block;width:150px;height:auto;max-height:120px;object-fit:contain;object-position:left center}.head h1{font-size:31px;margin:28px 0 8px}.gold{color:#f7bd16}.content{padding:36px 48px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.card{border:1px solid #dce5ef;border-radius:12px;padding:14px}.card small{display:block;color:#667085}.price{margin:20px 0;padding:20px;border-radius:14px;background:#fff7d6;border:1px solid #efd264;font-size:30px;font-weight:800;color:#08274d}.equipment{margin-top:20px;padding:16px;border-left:5px solid #f7bd16;background:#f7f9fc}.footer{padding:25px 48px;background:#08274d;color:#fff}.actions{position:fixed;right:18px;bottom:18px}.actions button{padding:15px 20px;border:0;border-radius:12px;background:#f7bd16;font-weight:800}@media print{body{background:#fff}.page{margin:0}.actions{display:none}@page{size:A4;margin:0}}</style></head><body><main class="page"><section class="head"><img src="${logoUrl}" alt="MM Energia Solar"><h1>Proposta personalizada para <span class="gold">${escapeHtml(cliente)}</span></h1><p>Energia solar completa, instalada e homologada.</p></section><section class="content"><div class="grid"><div class="card"><small>Cliente</small><strong>${escapeHtml(cliente)}</strong></div><div class="card"><small>WhatsApp</small><strong>${escapeHtml(telefone)}</strong></div><div class="card"><small>Cidade</small><strong>${escapeHtml(cidade)}</strong></div><div class="card"><small>Sistema</small><strong>${qtd} painéis • ${(qtd * potencia / 1000).toFixed(2).replace('.', ',')} kWp</strong></div><div class="card"><small>Geração estimada</small><strong>${geracao.toLocaleString('pt-BR')} kWh/mês</strong></div><div class="card"><small>Validade</small><strong>${escapeHtml(validade)} dias</strong></div></div><div class="price">${formatarMoeda(valorPdf)}</div><div class="equipment"><h3>Equipamentos</h3><p><b>Painéis:</b> ${escapeHtml(painel)}</p><p><b>Inversor:</b> ${escapeHtml(inv)}</p><p>${escapeHtml(observacoes)}</p></div></section><footer class="footer">MM Energia Solar • Bauru/SP • Emitida em ${data}</footer></main><div class="actions"><button onclick="window.print()">Salvar em PDF / Imprimir</button></div></body></html>`);
    janela.document.close();
  };

  const gerarESalvar = async () => {
    const registro = await salvarProposta('Gerada');
    if (registro) abrirPdf(registro.proposal_data || registro);
  };

  const enviarWhatsApp = async () => {
    const registro = await salvarProposta('Enviada');
    if (!registro) return;
    abrirPdf(registro.proposal_data || registro);
    const texto = `Olá, ${dados.cliente.trim()}!\nSegue sua proposta personalizada da MM Energia Solar.\nFico à disposição para esclarecer qualquer dúvida.`;
    window.open(`https://wa.me/${numeroComPais(dados.telefone)}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
  };

  const reenviar = async (item) => {
    const texto = `Olá, ${item.client_name}!\nSegue sua proposta personalizada da MM Energia Solar.\nFico à disposição para esclarecer qualquer dúvida.`;
    await supabase.from('sales_proposals').update({ status: 'Enviada', sent_at: new Date().toISOString() }).eq('id', item.id);
    await carregarHistorico();
    window.open(`https://wa.me/${numeroComPais(item.phone)}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
  };

  const excluir = async (id) => {
    if (!window.confirm('Excluir esta proposta do histórico?')) return;
    const { error } = await supabase.from('sales_proposals').delete().eq('id', id);
    if (error) setMensagem(`Erro ao excluir: ${error.message}`); else carregarHistorico();
  };

  const filtrado = historico.filter((item) => `${item.client_name} ${item.phone} ${item.status}`.toLowerCase().includes(busca.toLowerCase()));
  const exemplo12 = cartao.find((item) => item.parcelas === 12);

  return <section className="finance-panel">
    <div className="finance-panel-header"><div><h2>Gerador de proposta para o cliente</h2><p>Preencha os dados. Ao gerar ou enviar, o cliente e a proposta são registrados no Supabase.</p></div></div>
    <div className="finance-form">
      <label className="finance-field"><span>Nome do cliente *</span><input name="cliente" value={dados.cliente} onChange={atualizar} placeholder="Nome completo" /></label>
      <label className="finance-field"><span>WhatsApp do cliente *</span><input name="telefone" value={dados.telefone} onChange={atualizar} placeholder="(14) 99999-9999" inputMode="tel" /></label>
      <label className="finance-field"><span>Cidade/UF</span><input name="cidade" value={dados.cidade} onChange={atualizar} /></label>
      <label className="finance-field"><span>Potência de cada painel (W)</span><input type="number" name="potenciaPlaca" value={dados.potenciaPlaca} onChange={atualizar} /></label>
      <label className="finance-field"><span>Marca/modelo dos painéis</span><input name="marcaPlaca" value={dados.marcaPlaca} onChange={atualizar} /></label>
      <label className="finance-field"><span>Inversor ou microinversor</span><input name="inversor" value={dados.inversor} onChange={atualizar} /></label>
      <label className="finance-field"><span>Geração estimada (kWh/mês)</span><input type="number" name="geracaoMensal" value={dados.geracaoMensal} onChange={atualizar} /></label>
      <label className="finance-field"><span>Valor final da proposta</span><input type="number" step="0.01" name="valorProposta" value={dados.valorProposta} onChange={atualizar} /></label>
      <label className="finance-field"><span>Validade da proposta (dias)</span><input type="number" name="validade" value={dados.validade} onChange={atualizar} /></label>
      <label className="finance-field"><span>Foto do painel (URL)</span><input name="fotoPainel" value={dados.fotoPainel} onChange={atualizar} /></label>
      <label className="finance-field"><span>Foto do inversor/microinversor (URL)</span><input name="fotoInversor" value={dados.fotoInversor} onChange={atualizar} /></label>
      <label className="finance-field"><span>Itens e observações</span><textarea name="observacoes" value={dados.observacoes} onChange={atualizar} rows="3" /></label>
    </div>
    <div className="pricing-highlight"><span>Geração estimada</span><strong>{Math.round(geracaoCalculada).toLocaleString('pt-BR')} kWh/mês</strong></div>
    <div className="pricing-highlight"><span><CreditCard size={17} /> Cartão em 12x com taxa de 11,69%</span><strong>12x de {formatarMoeda(exemplo12?.valorParcela || 0)} • total {formatarMoeda(exemplo12?.total || 0)}</strong></div>
    <div className="pricing-highlight"><span>BelCred: exemplo em 96x</span><strong>{formatarMoeda(parcelas.find((item) => item.parcelas === 96)?.valor || 0)}</strong></div>
    {mensagem && <p style={{ padding: 12, borderRadius: 12, background: '#f1f6fb' }}>{mensagem}</p>}
    <div style={{ marginTop: 18, border: '1px solid #dce5ef', borderRadius: 18, padding: 16, background: 'linear-gradient(135deg, #f8fbff, #fffdf3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: '#0b2b52' }}><Sparkles size={20} /><strong>Proposta pronta</strong></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
        <button type="button" disabled={salvando} onClick={gerarESalvar} style={{ minHeight: 58, border: 0, borderRadius: 16, background: '#08274d', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><FileDown size={21} />Salvar e gerar PDF</button>
        <button type="button" disabled={salvando} onClick={enviarWhatsApp} style={{ minHeight: 58, border: 0, borderRadius: 16, background: '#1f9d55', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><MessageCircle size={21} />Enviar para WhatsApp Business</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, color: '#667085', fontSize: 12 }}><ShieldCheck size={15} /> Cliente e proposta são salvos no Supabase antes do PDF ou envio</div>
    </div>

    <div style={{ marginTop: 24, borderTop: '1px solid #dce5ef', paddingTop: 20 }}>
      <div className="finance-panel-header"><div><h2>Histórico de propostas geradas ou enviadas</h2><p>Ficam aqui as propostas salvas no Supabase, com status Gerada ou Enviada.</p></div><button type="button" onClick={carregarHistorico} title="Atualizar" style={{ border: 0, background: 'transparent' }}><RefreshCw size={20} /></button></div>
      <label className="finance-field" style={{ maxWidth: 420 }}><span>Pesquisar cliente, telefone ou status</span><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Search size={18} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite para pesquisar" /></div></label>
      <div style={{ overflowX: 'auto', marginTop: 14 }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr><th style={{ textAlign: 'left', padding: 10 }}>Data</th><th style={{ textAlign: 'left', padding: 10 }}>Cliente</th><th style={{ textAlign: 'left', padding: 10 }}>WhatsApp</th><th style={{ textAlign: 'left', padding: 10 }}>Valor</th><th style={{ textAlign: 'left', padding: 10 }}>Status</th><th style={{ textAlign: 'left', padding: 10 }}>Ações</th></tr></thead><tbody>
        {filtrado.map((item) => <tr key={item.id} style={{ borderTop: '1px solid #e5e9ef' }}><td style={{ padding: 10 }}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</td><td style={{ padding: 10 }}><strong>{item.client_name}</strong></td><td style={{ padding: 10 }}>{item.phone}</td><td style={{ padding: 10 }}>{formatarMoeda(Number(item.total_amount || 0))}</td><td style={{ padding: 10 }}><strong>{item.status}</strong></td><td style={{ padding: 10 }}><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" onClick={() => abrirPdf(item.proposal_data || item)}><FileDown size={16} /> PDF</button><button type="button" onClick={() => reenviar(item)}><MessageCircle size={16} /> Reenviar</button><button type="button" onClick={() => excluir(item.id)}><Trash2 size={16} /> Excluir</button></div></td></tr>)}
        {!filtrado.length && <tr><td colSpan="6" style={{ padding: 18, textAlign: 'center', color: '#667085' }}>Nenhuma proposta encontrada.</td></tr>}
      </tbody></table></div>
    </div>
  </section>;
}
