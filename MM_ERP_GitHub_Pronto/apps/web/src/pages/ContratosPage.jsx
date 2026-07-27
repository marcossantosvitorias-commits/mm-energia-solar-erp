import React, { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, FileCheck2, Mail, MessageCircle, RefreshCw, Search, UserRound } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { formatarData, formatarMoeda } from '../components/finance/storage.js';
import { listClients } from '../services/clientService.js';
import { downloadContractPdf, generateContractPdf } from '../services/contractPdfService.js';
import {
  listStoredContracts,
  saveLocalContract,
  sendContractToAutentique,
  syncAutentiqueContracts,
} from '../services/autentiqueService.js';
import './ContratosPage.css';

const EMPTY_FORM = {
  clientId: '', clientName: '', clientDocument: '', clientPhone: '', clientEmail: '', clientAddress: '',
  installationAddress: '', totalValue: '', paymentTerms: '',
  systemDescription: 'Sistema solar fotovoltaico conforme proposta comercial aprovada.',
  components: 'Módulos fotovoltaicos, inversor ou microinversores, estrutura de fixação, DPS, disjuntor, cabos, projeto, ART, homologação e monitoramento via web.',
};

function fullAddress(client) {
  return [client.address, client.city, client.state, client.zipCode ? `CEP ${client.zipCode}` : ''].filter(Boolean).join(', ');
}

function mapContract(row) {
  const payload = row.payload || {};
  return {
    id: row.id,
    externalId: row.external_id,
    autentiqueId: row.autentique_id,
    cliente: row.client_name || 'Cliente',
    documento: row.client_document || '',
    telefone: row.client_phone || '',
    email: row.client_email || '',
    endereco: payload.endereco || '',
    assinatura: row.signed_date || row.signed_at || row.created_at,
    criadoEm: row.created_at,
    status: row.status || 'rascunho',
    valorTotal: Number(row.total_amount || 0),
    recebido: Number(row.amount_received || 0),
    aReceber: Number(row.amount_receivable || 0),
    sistema: payload.sistema || row.title || 'Contrato de energia solar',
    pagamento: payload.pagamento || '',
    validacao: row.signed_file_url || row.document_url || row.signing_url || row.original_file_url || '',
    arquivoOriginal: row.original_file_url || '',
    arquivoAssinado: row.signed_file_url || '',
    origem: row.source || 'ERP',
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
      setClientes(clients);
      setContratos(stored.map(mapContract));
    } catch (error) {
      setMensagem(error.message || 'Não foi possível carregar os contratos do banco.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarTudo(); }, []);

  const selecionarCliente = (id) => {
    const client = clientes.find((item) => item.id === id);
    if (!client) return setForm(EMPTY_FORM);
    const address = fullAddress(client);
    setForm((current) => ({
      ...current,
      clientId: client.id,
      clientName: client.name || '',
      clientDocument: client.document || '',
      clientPhone: client.phone || '',
      clientEmail: client.email || '',
      clientAddress: address,
      installationAddress: address,
    }));
  };

  const atualizar = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const validar = (deliveryMethod = null) => {
    if (!form.clientName || !form.clientDocument || !form.installationAddress) {
      setMensagem('Selecione um cliente com nome, CPF/CNPJ e endereço da instalação.');
      return false;
    }
    if (Number(form.totalValue) <= 0 || !form.paymentTerms.trim()) {
      setMensagem('Informe o valor do contrato e a forma de pagamento.');
      return false;
    }
    if (deliveryMethod === 'email' && !form.clientEmail) {
      setMensagem('O cliente selecionado não possui e-mail cadastrado.');
      return false;
    }
    if (deliveryMethod === 'whatsapp' && !form.clientPhone) {
      setMensagem('O cliente selecionado não possui WhatsApp cadastrado.');
      return false;
    }
    return true;
  };

  const baixarPdf = async () => {
    if (!validar()) return;
    setMensagem('Gerando contrato e salvando no banco...');
    try {
      await downloadContractPdf(form);
      await saveLocalContract({ ...form, status: 'rascunho' });
      await carregarTudo();
      setMensagem('Contrato gerado e salvo no Supabase.');
    } catch (error) {
      setMensagem(error.message || 'Não foi possível gerar o PDF.');
    }
  };

  const enviarAutentique = async (deliveryMethod) => {
    if (!validar(deliveryMethod)) return;
    setEnviando(true);
    setMensagem('Gerando PDF, enviando ao Autentique e salvando no banco...');
    try {
      const pdf = await generateContractPdf(form);
      const result = await sendContractToAutentique({ blob: pdf.blob, fileName: pdf.fileName, contract: form, deliveryMethod });
      await saveLocalContract({
        ...form,
        externalId: `autentique-${result.documentId}`,
        status: 'enviado',
        documentUrl: result.signingLink,
      });
      await carregarTudo();
      setMensagem('Contrato enviado e salvo no Supabase.');
    } catch (error) {
      setMensagem(error.message || 'Não foi possível enviar ao Autentique.');
    } finally {
      setEnviando(false);
    }
  };

  const sincronizarAutentique = async () => {
    setSincronizando(true);
    setMensagem('Buscando contratos, clientes, telefones e e-mails no Autentique...');
    try {
      const result = await syncAutentiqueContracts({ limit: 60, pages: 20 });
      await carregarTudo();
      setMensagem(`${result.imported || 0} contrato(s) gravado(s) no banco e ${result.failed || 0} com pendência.`);
    } catch (error) {
      setMensagem(error.message || 'Não foi possível sincronizar os contratos.');
    } finally {
      setSincronizando(false);
    }
  };

  const filtrados = useMemo(() => contratos.filter((item) =>
    `${item.cliente} ${item.documento} ${item.telefone} ${item.email} ${item.status} ${item.origem}`
      .toLowerCase().includes(busca.toLowerCase())), [contratos, busca]);

  const totais = useMemo(() => contratos.reduce((acc, item) => ({
    total: acc.total + Number(item.valorTotal || 0),
    recebido: acc.recebido + Number(item.recebido || 0),
    receber: acc.receber + Number(item.aReceber || 0),
  }), { total: 0, recebido: 0, receber: 0 }), [contratos]);

  return <FinanceLayout title="Contratos" subtitle="Contratos e clientes armazenados no Supabase e sincronizados com o Autentique.">
    <section className="finance-grid">
      <StatCard label="Total contratado" value={formatarMoeda(totais.total)} helper={`${contratos.length} contrato(s)`} tone="primary" />
      <StatCard label="Já recebido" value={formatarMoeda(totais.recebido)} helper="Pagamentos confirmados" tone="positive" />
      <StatCard label="A receber" value={formatarMoeda(totais.receber)} helper="Contratos e parcelas" tone="warning" />
    </section>

    <section className="finance-panel contract-generator">
      <div className="finance-panel-header"><div><h2>Novo contrato</h2><p>Selecione o cliente e envie para assinatura.</p></div><FileCheck2 size={24} /></div>
      <div className="contract-form-grid">
        <label className="finance-field finance-field-wide"><span>Cliente cadastrado</span><select value={form.clientId} onChange={(event) => selecionarCliente(event.target.value)}><option value="">Selecione o cliente</option>{clientes.map((client) => <option key={client.id} value={client.id}>{client.name} - {client.document || 'sem CPF/CNPJ'}</option>)}</select></label>
        <label className="finance-field"><span>Nome</span><input value={form.clientName} readOnly /></label>
        <label className="finance-field"><span>CPF/CNPJ</span><input value={form.clientDocument} readOnly /></label>
        <label className="finance-field"><span>WhatsApp</span><input value={form.clientPhone} readOnly /></label>
        <label className="finance-field"><span>E-mail</span><input value={form.clientEmail} readOnly /></label>
        <label className="finance-field finance-field-wide"><span>Local da instalação</span><input name="installationAddress" value={form.installationAddress} onChange={atualizar} /></label>
        <label className="finance-field"><span>Valor total</span><input type="number" min="0" step="0.01" name="totalValue" value={form.totalValue} onChange={atualizar} /></label>
        <label className="finance-field"><span>Prazo de execução</span><input value="69 dias corridos" readOnly /></label>
        <label className="finance-field finance-field-wide"><span>Forma de pagamento</span><textarea name="paymentTerms" value={form.paymentTerms} onChange={atualizar} rows="3" /></label>
        <label className="finance-field finance-field-wide"><span>Descrição do sistema</span><textarea name="systemDescription" value={form.systemDescription} onChange={atualizar} rows="2" /></label>
        <label className="finance-field finance-field-wide"><span>Componentes e serviços inclusos</span><textarea name="components" value={form.components} onChange={atualizar} rows="3" /></label>
      </div>
      <div className="contract-generator-actions">
        <button className="finance-secondary-button" type="button" onClick={baixarPdf}><Download size={17} /> Gerar PDF</button>
        <button className="finance-button whatsapp-contract" type="button" disabled={enviando} onClick={() => enviarAutentique('whatsapp')}><MessageCircle size={17} /> Enviar no WhatsApp</button>
        <button className="finance-button" type="button" disabled={enviando} onClick={() => enviarAutentique('email')}><Mail size={17} /> Enviar por e-mail</button>
      </div>
      {mensagem ? <p className="crm-message contract-message">{mensagem}</p> : null}
    </section>

    <section className="finance-panel">
      <div className="finance-panel-header">
        <div><h2>Histórico de todos os contratos</h2><p>Todos os registros abaixo são carregados diretamente do Supabase.</p></div>
        <button className="finance-button" type="button" disabled={sincronizando} onClick={sincronizarAutentique}><RefreshCw size={17} /> {sincronizando ? 'Atualizando...' : 'Atualizar do Autentique'}</button>
      </div>
      <label className="contracts-search"><Search size={17} /><input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar cliente, telefone, e-mail, CPF ou status" /></label>
      {carregando ? <p className="crm-message">Carregando contratos do banco...</p> : null}
      <div className="contracts-list">
        {filtrados.map((contrato) => <article className="contract-card" key={contrato.id}>
          <div className="contract-card-heading"><FileCheck2 size={24} /><div><h3>{contrato.cliente}</h3><span>{contrato.assinatura ? `Data: ${formatarData(String(contrato.assinatura).slice(0, 10))}` : 'Sem data'}</span></div><span className={`finance-badge ${contrato.status === 'assinado' ? 'paga' : 'pendente'}`}>{contrato.status}</span></div>
          <div className="contract-details">
            <div><span>CPF/CNPJ</span><strong>{contrato.documento || '-'}</strong></div>
            <div><span>Telefone</span><strong>{contrato.telefone || '-'}</strong></div>
            <div><span>E-mail</span><strong>{contrato.email || '-'}</strong></div>
            <div><span>Endereço</span><strong>{contrato.endereco || 'Não informado no Autentique'}</strong></div>
            <div><span>Sistema</span><strong>{contrato.sistema || '-'}</strong></div>
            <div><span>Origem</span><strong>{contrato.origem}</strong></div>
          </div>
          <div className="contract-payments"><div className="received"><span>Recebido</span><strong>{formatarMoeda(contrato.recebido)}</strong></div><div className="pending"><span>A receber</span><strong>{formatarMoeda(contrato.aReceber)}</strong></div></div>
          {contrato.validacao ? <a className="finance-secondary-button contract-link" href={contrato.validacao} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir contrato ou assinatura</a> : null}
        </article>)}
        {!carregando && !filtrados.length ? <div className="agenda-empty"><UserRound size={36} /><strong>Nenhum contrato encontrado</strong></div> : null}
      </div>
    </section>
  </FinanceLayout>;
}
