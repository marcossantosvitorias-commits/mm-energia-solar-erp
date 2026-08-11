import React, { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, FileCheck2, Mail, MessageCircle, RefreshCw, Search, UserRound } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { formatarData, formatarMoeda } from '../components/finance/storage.js';
import { listClients } from '../services/clientService.js';
import { downloadContractPdf, generateContractPdf } from '../services/contractPdfService.js';
import { listStoredContracts, saveLocalContract, sendContractToAutentique, syncAutentiqueContracts } from '../services/autentiqueService.js';
import './ContratosPage.css';

const EMPTY_FORM = {
  clientId: '', clientName: '', clientDocument: '', clientPhone: '', clientEmail: '', clientAddress: '',
  installationAddress: '', totalValue: '', paymentTerms: '',
  panelQuantity: '', panelModel: '', panelPowerW: '',
  inverterType: 'Inversor', inverterQuantity: '1', inverterModel: '', inverterPowerKw: '',
  roofStructure: 'Telha cerâmica', roofStructureOther: '',
  systemDescription: 'Sistema solar fotovoltaico conforme proposta comercial aprovada.',
  components: '',
};

const ROOF_OPTIONS = ['Telha cerâmica', 'Fibrocimento', 'Telha metálica/trapezoidal', 'Telha zipada', 'Laje', 'Solo', 'Outro'];

function fullAddress(client) {
  return [client.address, client.city, client.state, client.zipCode ? `CEP ${client.zipCode}` : ''].filter(Boolean).join(', ');
}

function mapContract(row) {
  const payload = row.payload || {};
  return {
    id: row.id, externalId: row.external_id, autentiqueId: row.autentique_id,
    cliente: row.client_name || 'Cliente', documento: row.client_document || '', telefone: row.client_phone || '', email: row.client_email || '',
    endereco: payload.endereco || '', assinatura: row.signed_date || row.signed_at || row.created_at, criadoEm: row.created_at,
    status: row.status || 'rascunho', valorTotal: Number(row.total_amount || 0), recebido: Number(row.amount_received || 0),
    aReceber: Number(row.amount_receivable || 0), sistema: payload.sistema || row.title || 'Contrato de energia solar',
    pagamento: payload.pagamento || '', validacao: row.signed_file_url || row.document_url || row.signing_url || row.original_file_url || '',
    arquivoOriginal: row.original_file_url || '', arquivoAssinado: row.signed_file_url || '', origem: row.source || 'ERP',
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
  const [form, setForm] = useState(EMPTY_FORM);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  async function carregarTudo() {
    setCarregando(true);
    try {
      const [clients, stored] = await Promise.all([listClients(), listStoredContracts()]);
      setClientes(clients); setContratos(stored.map(mapContract));
    } catch (error) { setMensagem(error.message || 'Não foi possível carregar os contratos do banco.'); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregarTudo(); }, []);

  const selecionarCliente = (id) => {
    const client = clientes.find((item) => item.id === id);
    if (!client) return setForm(EMPTY_FORM);
    const address = fullAddress(client);
    setForm((current) => ({ ...current, clientId: client.id, clientName: client.name || '', clientDocument: client.document || '', clientPhone: client.phone || '', clientEmail: client.email || '', clientAddress: address, installationAddress: address }));
  };
  const atualizar = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const validar = (deliveryMethod = null) => {
    if (!form.clientName || !form.clientDocument || !form.installationAddress) { setMensagem('Selecione um cliente com nome, CPF/CNPJ e endereço da instalação.'); return false; }
    if (Number(form.totalValue) <= 0 || !form.paymentTerms.trim()) { setMensagem('Informe o valor do contrato e a forma de pagamento.'); return false; }
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
    setSincronizando(true); setMensagem('Buscando contratos, clientes, telefones e e-mails no Autentique...');
    try {
      const result = await syncAutentiqueContracts({ limit: 60, pages: 20 });
      await carregarTudo(); setMensagem(`${result.imported || 0} contrato(s) gravado(s) no banco e ${result.failed || 0} com pendência.`);
    } catch (error) { setMensagem(error.message || 'Não foi possível sincronizar os contratos.'); }
    finally { setSincronizando(false); }
  };

  const filtrados = useMemo(() => contratos.filter((item) => `${item.cliente} ${item.documento} ${item.telefone} ${item.email} ${item.status} ${item.origem}`.toLowerCase().includes(busca.toLowerCase())), [contratos, busca]);

  return <FinanceLayout title="Contratos" subtitle="Crie contratos com os equipamentos do sistema e envie para assinatura.">
    <section className="finance-panel contract-generator">
      <div className="finance-panel-header"><div><h2>Novo contrato</h2><p>Selecione o cliente, informe os equipamentos e envie para assinatura.</p></div><FileCheck2 size={24} /></div>
      <div className="contract-form-grid">
        <label className="finance-field finance-field-wide"><span>Cliente cadastrado</span><select value={form.clientId} onChange={(event) => selecionarCliente(event.target.value)}><option value="">Selecione o cliente</option>{clientes.map((client) => <option key={client.id} value={client.id}>{client.name} - {client.document || 'sem CPF/CNPJ'}</option>)}</select></label>
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
        <label className="finance-field"><span>Prazo de execução</span><input value="69 dias corridos" readOnly /></label>
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
      <div className="finance-panel-header"><div><h2>Histórico de todos os contratos</h2><p>Registros carregados diretamente do Supabase.</p></div><button className="finance-button" type="button" disabled={sincronizando} onClick={sincronizarAutentique}><RefreshCw size={17} /> {sincronizando ? 'Atualizando...' : 'Atualizar do Autentique'}</button></div>
      <label className="contracts-search"><Search size={17} /><input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar cliente, telefone, e-mail, CPF ou status" /></label>
      {carregando ? <p className="crm-message">Carregando contratos do banco...</p> : null}
      <div className="contracts-list">
        {filtrados.map((contrato) => <article className="contract-card" key={contrato.id}>
          <div className="contract-card-heading"><FileCheck2 size={24} /><div><h3>{contrato.cliente}</h3><span>{contrato.assinatura ? `Data: ${formatarData(String(contrato.assinatura).slice(0, 10))}` : 'Sem data'}</span></div><span className={`finance-badge ${contrato.status === 'assinado' ? 'paga' : 'pendente'}`}>{contrato.status}</span></div>
          <div className="contract-details"><div><span>CPF/CNPJ</span><strong>{contrato.documento || '-'}</strong></div><div><span>Telefone</span><strong>{contrato.telefone || '-'}</strong></div><div><span>E-mail</span><strong>{contrato.email || '-'}</strong></div><div><span>Endereço</span><strong>{contrato.endereco || 'Não informado no Autentique'}</strong></div><div><span>Sistema</span><strong>{contrato.sistema || '-'}</strong></div><div><span>Origem</span><strong>{contrato.origem}</strong></div></div>
          <div className="contract-payments"><div className="received"><span>Recebido</span><strong>{formatarMoeda(contrato.recebido)}</strong></div><div className="pending"><span>A receber</span><strong>{formatarMoeda(contrato.aReceber)}</strong></div></div>
          {contrato.validacao ? <a className="finance-secondary-button contract-link" href={contrato.validacao} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir contrato ou assinatura</a> : null}
        </article>)}
        {!carregando && !filtrados.length ? <div className="agenda-empty"><UserRound size={36} /><strong>Nenhum contrato encontrado</strong></div> : null}
      </div>
    </section>
  </FinanceLayout>;
}
