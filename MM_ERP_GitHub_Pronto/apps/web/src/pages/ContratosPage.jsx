import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Download, ExternalLink, Eye, FileCheck2, Mail, MessageCircle, Plus, RefreshCw, Search, Send, UserRound, XCircle } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { formatarMoeda } from '../components/finance/storage.js';
import { createClient, listClients } from '../services/clientService.js';
import { downloadContractPdf, generateContractPdf } from '../services/contractPdfService.js';
import { listStoredContracts, saveLocalContract, sendContractToAutentique, syncAutentiqueContracts } from '../services/autentiqueService.js';
import './ContratosPage.css';

const EMPTY_FORM = {
  clientId: '', clientName: '', clientDocument: '', clientPhone: '', clientEmail: '', clientAddress: '',
  installationAddress: '', totalValue: '', paymentTerms: '', executionTerm: '69 dias corridos',
  panelQuantity: '', panelModel: '', panelPowerW: '',
  inverterType: 'Inversor', inverterQuantity: '1', inverterModel: '', inverterPowerKw: '',
  roofStructure: 'Telha cerâmica', roofStructureOther: '',
  systemDescription: 'Sistema solar fotovoltaico conforme proposta comercial aprovada.',
  components: '',
};

const EMPTY_CLIENT = {
  name: '', document: '', phone: '', email: '', address: '', zipCode: '', city: '', state: 'SP',
  customerType: 'residencial', status: 'cliente', monthlyBill: 0, notes: 'Cliente cadastrado diretamente pela tela de contratos.',
};

const ROOF_OPTIONS = ['Telha cerâmica', 'Fibrocimento', 'Telha metálica/trapezoidal', 'Telha zipada', 'Laje', 'Solo', 'Outro'];

const STATUS_LABELS = {
  rascunho: 'Rascunho',
  enviado: 'Enviado ao cliente',
  visualizado: 'Cliente visualizou',
  assinado: 'Cliente assinou',
  recusado: 'Cliente recusou',
  expirado: 'Assinatura expirada',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

function normalizarStatus(status) {
  return String(status || 'rascunho').trim().toLowerCase();
}

function formatarDataHora(valor) {
  if (!valor) return '';
  const data = new Date(String(valor).length === 10 ? `${valor}T12:00:00` : valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function SignatureStep({ Icon, titulo, data, concluido, atual, pendente, negativo = false }) {
  const classe = negativo ? 'is-negative' : concluido ? 'is-complete' : atual ? 'is-current' : 'is-waiting';
  return <div className={`contract-signature-step ${classe}`}>
    <span className="contract-signature-icon"><Icon size={18} strokeWidth={2.4} /></span>
    <div>
      <strong>{titulo}</strong>
      <small>{data ? formatarDataHora(data) : concluido ? 'Confirmado pelo Autentique' : pendente}</small>
    </div>
  </div>;
}

function ContractSignatureStatus({ contrato }) {
  const status = normalizarStatus(contrato.status);
  const enviado = status !== 'rascunho';
  const visualizado = Boolean(contrato.visualizadoEm) || ['visualizado', 'assinado'].includes(status);
  const assinado = Boolean(contrato.assinadoEm) || status === 'assinado';
  const recusado = status === 'recusado';
  const finalizadoSemAssinatura = ['recusado', 'expirado', 'cancelado'].includes(status);
  const ultimaAtualizacao = contrato.sincronizadoEm || contrato.atualizadoEm;

  return <section className="contract-signature-status" aria-label={`Acompanhamento de assinatura: ${STATUS_LABELS[status] || status}`}>
    <div className="contract-signature-header">
      <div>
        <span>Acompanhamento da assinatura</span>
        <strong>{STATUS_LABELS[status] || status}</strong>
      </div>
      {contrato.autentiqueId ? <small>Dados do Autentique</small> : null}
    </div>

    <div className="contract-signature-flow">
      <SignatureStep
        Icon={enviado ? CheckCircle2 : Send}
        titulo="Enviado ao cliente"
        data={enviado ? contrato.enviadoEm : null}
        concluido={enviado}
        atual={!enviado}
        pendente="Ainda não enviado"
      />
      <SignatureStep
        Icon={visualizado ? CheckCircle2 : Eye}
        titulo="Cliente visualizou / leu"
        data={contrato.visualizadoEm}
        concluido={visualizado}
        atual={enviado && !visualizado && !finalizadoSemAssinatura}
        pendente={enviado ? 'Aguardando visualização' : 'Aguardando envio'}
      />
      {recusado ? <SignatureStep
        Icon={XCircle}
        titulo="Cliente recusou"
        data={contrato.recusadoEm}
        concluido
        negativo
        pendente="Recusado"
      /> : <SignatureStep
        Icon={assinado ? CheckCircle2 : finalizadoSemAssinatura ? Clock3 : FileCheck2}
        titulo={status === 'expirado' ? 'Assinatura expirada' : status === 'cancelado' ? 'Assinatura cancelada' : 'Cliente assinou'}
        data={assinado ? contrato.assinadoEm : null}
        concluido={assinado}
        atual={visualizado && !assinado && !finalizadoSemAssinatura}
        negativo={finalizadoSemAssinatura}
        pendente={visualizado ? 'Aguardando assinatura' : 'Aguardando visualização'}
      />}
    </div>

    {ultimaAtualizacao ? <p className="contract-sync-info">Última atualização: {formatarDataHora(ultimaAtualizacao)}</p> : null}
  </section>;
}

function fullAddress(client) {
  return [client.address, client.city, client.state, client.zipCode ? `CEP ${client.zipCode}` : ''].filter(Boolean).join(', ');
}

function mapContract(row) {
  const payload = row.payload || {};
  const status = normalizarStatus(row.status);
  return {
    id: row.id, externalId: row.external_id, autentiqueId: row.autentique_id,
    cliente: row.client_name || 'Cliente', documento: row.client_document || '', telefone: row.client_phone || '', email: row.client_email || '',
    endereco: payload.endereco || '', status, valorTotal: Number(row.total_amount || 0), recebido: Number(row.amount_received || 0),
    aReceber: Number(row.amount_receivable || 0), sistema: payload.sistema || row.title || 'Contrato de energia solar',
    pagamento: payload.pagamento || '', validacao: row.signed_file_url || row.document_url || row.signing_url || row.original_file_url || '',
    arquivoOriginal: row.original_file_url || '', arquivoAssinado: row.signed_file_url || '', origem: row.source || 'ERP',
    enviadoEm: row.created_at || null, visualizadoEm: row.viewed_at || null, assinadoEm: row.signed_at || row.signed_date || null,
    recusadoEm: row.rejected_at || null, sincronizadoEm: row.synced_at || null, atualizadoEm: row.updated_at || null,
  };
}

function buildDocumentForm(form) {
  const estrutura = form.roofStructure === 'Outro' ? (form.roofStructureOther || 'Outro tipo de estrutura') : form.roofStructure;
  const paineis = `${form.panelQuantity || 0} placa(s) fotovoltaica(s)${form.panelModel ? ` ${form.panelModel}` : ''}${form.panelPowerW ? ` de ${form.panelPowerW} W` : ''}`;
  const inversao = `${form.inverterQuantity || 1} ${form.inverterType || 'Inversor'}${form.inverterModel ? ` ${form.inverterModel}` : ''}${form.inverterPowerKw ? ` de ${form.inverterPowerKw} kW` : ''}`;
  const components = [paineis, inversao, `Estrutura para telhado: ${estrutura}`, 'DPS, disjuntores, cabos, conectores e proteções necessárias', 'Projeto, ART/TRT, homologação e monitoramento'].join('; ');
  const potenciaSistema = Number(form.panelQuantity || 0) * Number(form.panelPowerW || 0) / 1000;
  return {
    ...form,
    components,
    systemDescription: potenciaSistema > 0
      ? `Sistema solar fotovoltaico de aproximadamente ${potenciaSistema.toFixed(2).replace('.', ',')} kWp, conforme equipamentos especificados no contrato.`
      : form.systemDescription,
  };
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [form, setForm] = useState(EMPTY_FORM);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [mostrarCadastroCliente, setMostrarCadastroCliente] = useState(false);
  const [novoCliente, setNovoCliente] = useState(EMPTY_CLIENT);
  const [salvandoCliente, setSalvandoCliente] = useState(false);

  async function carregarTudo() {
    setCarregando(true);
    try {
      const [clients, stored] = await Promise.all([listClients(), listStoredContracts()]);
      setClientes(clients); setContratos(stored.map(mapContract));
    } catch (error) { setMensagem(error.message || 'Não foi possível carregar os contratos do banco.'); }
    finally { setCarregando(false); }
  }
  useEffect(() => { queueMicrotask(carregarTudo); }, []);

  const selecionarCliente = (id) => {
    const client = clientes.find((item) => item.id === id);
    if (!client) return setForm((current) => ({ ...EMPTY_FORM, executionTerm: current.executionTerm || EMPTY_FORM.executionTerm }));
    const address = fullAddress(client);
    setForm((current) => ({ ...current, clientId: client.id, clientName: client.name || '', clientDocument: client.document || '', clientPhone: client.phone || '', clientEmail: client.email || '', clientAddress: address, installationAddress: address }));
  };

  const atualizar = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const atualizarNovoCliente = (event) => setNovoCliente((current) => ({ ...current, [event.target.name]: event.target.value }));

  const cadastrarClienteAqui = async () => {
    if (!novoCliente.name.trim()) return setMensagem('Informe o nome do novo cliente.');
    if (!novoCliente.phone.trim()) return setMensagem('Informe o WhatsApp do novo cliente.');
    setSalvandoCliente(true);
    setMensagem('Salvando cliente...');
    try {
      const created = await createClient({ ...novoCliente, status: 'cliente' });
      const updatedClients = await listClients();
      setClientes(updatedClients);
      const address = fullAddress(created);
      setForm((current) => ({
        ...current,
        clientId: created.id,
        clientName: created.name || '',
        clientDocument: created.document || '',
        clientPhone: created.phone || '',
        clientEmail: created.email || '',
        clientAddress: address,
        installationAddress: address,
      }));
      setNovoCliente(EMPTY_CLIENT);
      setMostrarCadastroCliente(false);
      setMensagem('Cliente cadastrado e selecionado no contrato.');
    } catch (error) {
      setMensagem(error.message || 'Não foi possível cadastrar o cliente.');
    } finally {
      setSalvandoCliente(false);
    }
  };

  const validar = (deliveryMethod = null) => {
    if (!form.clientName || !form.clientDocument || !form.installationAddress) { setMensagem('Selecione um cliente com nome, CPF/CNPJ e endereço da instalação.'); return false; }
    if (Number(form.totalValue) <= 0 || !form.paymentTerms.trim()) { setMensagem('Informe o valor do contrato e a forma de pagamento.'); return false; }
    if (!form.executionTerm.trim()) { setMensagem('Informe o prazo de execução.'); return false; }
    if (Number(form.panelQuantity) <= 0 || Number(form.panelPowerW) <= 0) { setMensagem('Informe a quantidade e a potência das placas fotovoltaicas.'); return false; }
    if (!form.inverterType || Number(form.inverterQuantity) <= 0 || Number(form.inverterPowerKw) <= 0) { setMensagem('Informe o tipo, quantidade e potência do inversor ou microinversor.'); return false; }
    if (deliveryMethod === 'email' && !form.clientEmail) { setMensagem('O cliente selecionado não possui e-mail cadastrado.'); return false; }
    if (deliveryMethod === 'whatsapp' && !form.clientPhone) { setMensagem('O cliente selecionado não possui WhatsApp cadastrado.'); return false; }
    return true;
  };

  const baixarPdf = async () => {
    if (!validar()) return;
    setMensagem('Gerando contrato e salvando no banco...');
    try {
      const contractForm = buildDocumentForm(form);
      await downloadContractPdf(contractForm);
      await saveLocalContract({ ...contractForm, status: 'rascunho' });
      await carregarTudo(); setMensagem('Contrato gerado e salvo no Supabase.');
    } catch (error) { setMensagem(error.message || 'Não foi possível gerar o PDF.'); }
  };

  const enviarAutentique = async (deliveryMethod) => {
    if (!validar(deliveryMethod)) return;
    setEnviando(true); setMensagem('Gerando PDF, enviando ao Autentique e salvando no banco...');
    try {
      const contractForm = buildDocumentForm(form);
      const pdf = await generateContractPdf(contractForm);
      const result = await sendContractToAutentique({ blob: pdf.blob, fileName: pdf.fileName, contract: contractForm, deliveryMethod });
      await saveLocalContract({ ...contractForm, externalId: `autentique-${result.documentId}`, status: 'enviado', documentUrl: result.signingLink });
      await carregarTudo(); setMensagem('Contrato enviado e salvo no Supabase.');
    } catch (error) { setMensagem(error.message || 'Não foi possível enviar ao Autentique.'); }
    finally { setEnviando(false); }
  };

  const sincronizarAutentique = async () => {
    setSincronizando(true); setMensagem('Buscando contratos no Autentique...');
    try {
      const result = await syncAutentiqueContracts({ limit: 60, pages: 20 });
      await carregarTudo(); setMensagem(`${result.imported || 0} contrato(s) gravado(s) no banco e ${result.failed || 0} com pendência.`);
    } catch (error) { setMensagem(error.message || 'Não foi possível sincronizar os contratos.'); }
    finally { setSincronizando(false); }
  };

  const filtrados = useMemo(() => contratos.filter((item) => {
    const correspondeBusca = `${item.cliente} ${item.documento} ${item.telefone} ${item.email} ${item.status} ${STATUS_LABELS[item.status] || ''} ${item.origem}`.toLowerCase().includes(busca.toLowerCase());
    const correspondeStatus = filtroStatus === 'todos'
      || (filtroStatus === 'pendente' && ['rascunho', 'enviado'].includes(item.status))
      || item.status === filtroStatus;
    return correspondeBusca && correspondeStatus;
  }), [contratos, busca, filtroStatus]);

  return <FinanceLayout title="Contratos" subtitle="Crie contratos com os equipamentos do sistema e envie para assinatura.">
    <section className="finance-panel contract-generator">
      <div className="finance-panel-header"><div><h2>Novo contrato</h2><p>Selecione o cliente, informe os equipamentos e envie para assinatura.</p></div><FileCheck2 size={24} /></div>
      <div className="contract-form-grid">
        <label className="finance-field finance-field-wide"><span>Cliente cadastrado</span><select value={form.clientId} onChange={(event) => selecionarCliente(event.target.value)}><option value="">Selecione o cliente</option>{clientes.map((client) => <option key={client.id} value={client.id}>{client.name} - {client.document || 'sem CPF/CNPJ'}</option>)}</select></label>

        <div className="finance-field finance-field-wide">
          <button className="finance-secondary-button" type="button" onClick={() => setMostrarCadastroCliente((value) => !value)} style={{ width:'100%', justifyContent:'center' }}>
            <Plus size={17} /> {mostrarCadastroCliente ? 'Fechar cadastro' : 'Cadastrar novo cliente'}
          </button>
        </div>

        {mostrarCadastroCliente && <div className="finance-field-wide" style={{ padding:16, border:'1px solid #dfe5ec', borderRadius:16, background:'#f8fbff' }}>
          <h3 style={{ margin:'0 0 14px', color:'#0f2c52' }}>Novo cliente</h3>
          <div className="contract-form-grid">
            <label className="finance-field"><span>Nome *</span><input name="name" value={novoCliente.name} onChange={atualizarNovoCliente} placeholder="Nome completo" /></label>
            <label className="finance-field"><span>CPF/CNPJ</span><input name="document" value={novoCliente.document} onChange={atualizarNovoCliente} placeholder="CPF ou CNPJ" /></label>
            <label className="finance-field"><span>WhatsApp *</span><input name="phone" value={novoCliente.phone} onChange={atualizarNovoCliente} placeholder="(14) 99999-9999" /></label>
            <label className="finance-field"><span>E-mail</span><input name="email" value={novoCliente.email} onChange={atualizarNovoCliente} placeholder="cliente@email.com" /></label>
            <label className="finance-field finance-field-wide"><span>Endereço</span><input name="address" value={novoCliente.address} onChange={atualizarNovoCliente} placeholder="Rua, número e bairro" /></label>
            <label className="finance-field"><span>Cidade</span><input name="city" value={novoCliente.city} onChange={atualizarNovoCliente} /></label>
            <label className="finance-field"><span>UF</span><input name="state" maxLength="2" value={novoCliente.state} onChange={atualizarNovoCliente} /></label>
            <label className="finance-field"><span>CEP</span><input name="zipCode" value={novoCliente.zipCode} onChange={atualizarNovoCliente} /></label>
            <label className="finance-field"><span>Tipo</span><select name="customerType" value={novoCliente.customerType} onChange={atualizarNovoCliente}><option value="residencial">Residencial</option><option value="comercial">Comercial</option><option value="rural">Rural</option><option value="industrial">Industrial</option></select></label>
          </div>
          <button className="finance-button" type="button" disabled={salvandoCliente} onClick={cadastrarClienteAqui} style={{ width:'100%', justifyContent:'center', marginTop:14 }}>
            {salvandoCliente ? 'Salvando...' : 'Salvar cliente e usar neste contrato'}
          </button>
        </div>}

        <label className="finance-field"><span>Nome</span><input value={form.clientName} readOnly /></label>
        <label className="finance-field"><span>CPF/CNPJ</span><input value={form.clientDocument} readOnly /></label>
        <label className="finance-field"><span>WhatsApp</span><input value={form.clientPhone} readOnly /></label>
        <label className="finance-field"><span>E-mail</span><input value={form.clientEmail} readOnly /></label>
        <label className="finance-field finance-field-wide"><span>Local da instalação</span><input name="installationAddress" value={form.installationAddress} onChange={atualizar} /></label>
      </div>

      <div className="contract-equipment-box" style={{ marginTop:18, padding:16, border:'1px solid #dfe5ec', borderRadius:16, background:'#f8fbff' }}>
        <h3 style={{ margin:'0 0 14px', color:'#0f2c52' }}>Equipamentos do sistema</h3>
        <div className="contract-form-grid">
          <label className="finance-field"><span>Placas fotovoltaicas - quantidade</span><input type="number" min="1" step="1" name="panelQuantity" value={form.panelQuantity} onChange={atualizar} placeholder="Ex.: 8" /></label>
          <label className="finance-field"><span>Potência de cada placa (W)</span><input type="number" min="1" step="1" name="panelPowerW" value={form.panelPowerW} onChange={atualizar} placeholder="Ex.: 620" /></label>
          <label className="finance-field finance-field-wide"><span>Marca / modelo das placas</span><input name="panelModel" value={form.panelModel} onChange={atualizar} placeholder="Ex.: TCL Solar bifacial N-Type" /></label>

          <label className="finance-field"><span>Equipamento de conversão</span><select name="inverterType" value={form.inverterType} onChange={atualizar}><option>Inversor</option><option>Microinversor</option><option>Inversor híbrido</option></select></label>
          <label className="finance-field"><span>Quantidade</span><input type="number" min="1" step="1" name="inverterQuantity" value={form.inverterQuantity} onChange={atualizar} /></label>
          <label className="finance-field"><span>Potência do inversor/micro (kW)</span><input type="number" min="0.1" step="0.01" name="inverterPowerKw" value={form.inverterPowerKw} onChange={atualizar} placeholder="Ex.: 2,5" /></label>
          <label className="finance-field"><span>Marca / modelo</span><input name="inverterModel" value={form.inverterModel} onChange={atualizar} placeholder="Ex.: Growatt 2,5 kW" /></label>

          <label className="finance-field"><span>Estrutura para telhado</span><select name="roofStructure" value={form.roofStructure} onChange={atualizar}>{ROOF_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
          {form.roofStructure === 'Outro' && <label className="finance-field"><span>Descrever estrutura</span><input name="roofStructureOther" value={form.roofStructureOther} onChange={atualizar} placeholder="Digite o tipo de estrutura" /></label>}
        </div>
      </div>

      <div className="contract-form-grid" style={{ marginTop:18 }}>
        <label className="finance-field"><span>Valor total</span><input type="number" min="0" step="0.01" name="totalValue" value={form.totalValue} onChange={atualizar} /></label>
        <label className="finance-field"><span>Prazo de execução</span><input name="executionTerm" value={form.executionTerm} onChange={atualizar} placeholder="Ex.: 30 dias corridos" /></label>
        <label className="finance-field finance-field-wide"><span>Forma de pagamento</span><textarea name="paymentTerms" value={form.paymentTerms} onChange={atualizar} rows="3" /></label>
      </div>

      <div className="contract-generator-actions">
        <button className="finance-secondary-button" type="button" onClick={baixarPdf}><Download size={17} /> Gerar PDF</button>
        <button className="finance-button whatsapp-contract" type="button" disabled={enviando} onClick={() => enviarAutentique('whatsapp')}><MessageCircle size={17} /> Enviar no WhatsApp</button>
        <button className="finance-button" type="button" disabled={enviando} onClick={() => enviarAutentique('email')}><Mail size={17} /> Enviar por e-mail</button>
      </div>
      {mensagem ? <p className="crm-message contract-message">{mensagem}</p> : null}
    </section>

    <section className="finance-panel">
      <div className="finance-panel-header"><div><h2>Histórico de todos os contratos</h2><p>Acompanhe o envio, a visualização e a assinatura pelo status do Autentique.</p></div><button className="finance-button" type="button" disabled={sincronizando} onClick={sincronizarAutentique}><RefreshCw size={17} /> {sincronizando ? 'Atualizando...' : 'Atualizar status do Autentique'}</button></div>
      <div className="contracts-toolbar">
        <label className="contracts-search"><Search size={17} /><input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar cliente, telefone, e-mail, CPF ou status" /></label>
        <label className="contracts-status-filter"><span>Filtrar status</span><select value={filtroStatus} onChange={(event) => setFiltroStatus(event.target.value)}><option value="todos">Todos</option><option value="pendente">Aguardando cliente</option><option value="visualizado">Cliente visualizou</option><option value="assinado">Cliente assinou</option><option value="recusado">Cliente recusou</option><option value="expirado">Expirado</option><option value="cancelado">Cancelado</option><option value="rascunho">Rascunho</option></select></label>
      </div>
      {carregando ? <p className="crm-message">Carregando contratos do banco...</p> : null}
      <div className="contracts-list">
        {filtrados.map((contrato) => <article className="contract-card" key={contrato.id}>
          <div className="contract-card-heading"><FileCheck2 size={24} /><div><h3>{contrato.cliente}</h3><span>{contrato.assinadoEm ? `Assinado em ${formatarDataHora(contrato.assinadoEm)}` : contrato.enviadoEm ? `Enviado em ${formatarDataHora(contrato.enviadoEm)}` : 'Ainda não enviado'}</span></div><span className={`finance-badge contract-status-badge contract-status-${contrato.status}`}>{STATUS_LABELS[contrato.status] || contrato.status}</span></div>
          <ContractSignatureStatus contrato={contrato} />
          <div className="contract-details"><div><span>CPF/CNPJ</span><strong>{contrato.documento || '-'}</strong></div><div><span>Telefone</span><strong>{contrato.telefone || '-'}</strong></div><div><span>E-mail</span><strong>{contrato.email || '-'}</strong></div><div><span>Endereço</span><strong>{contrato.endereco || 'Não informado no Autentique'}</strong></div><div><span>Sistema</span><strong>{contrato.sistema || '-'}</strong></div><div><span>Origem</span><strong>{contrato.origem}</strong></div></div>
          <div className="contract-payments"><div className="received"><span>Recebido</span><strong>{formatarMoeda(contrato.recebido)}</strong></div><div className="pending"><span>A receber</span><strong>{formatarMoeda(contrato.aReceber)}</strong></div></div>
          {contrato.validacao ? <a className="finance-secondary-button contract-link" href={contrato.validacao} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir contrato ou assinatura</a> : null}
        </article>)}
        {!carregando && !filtrados.length ? <div className="agenda-empty"><UserRound size={36} /><strong>Nenhum contrato encontrado</strong></div> : null}
      </div>
    </section>
  </FinanceLayout>;
}
