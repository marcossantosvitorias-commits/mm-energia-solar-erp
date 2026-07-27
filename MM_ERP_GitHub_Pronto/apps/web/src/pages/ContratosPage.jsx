import React, { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, FileCheck2, Mail, MessageCircle, RefreshCw, Search, UserRound } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { carregarDados, formatarData, formatarMoeda, salvarDados } from '../components/finance/storage.js';
import { listClients } from '../services/clientService.js';
import { downloadContractPdf, generateContractPdf } from '../services/contractPdfService.js';
import { listAutentiqueContracts, sendContractToAutentique } from '../services/autentiqueService.js';
import './ContratosPage.css';

const CHAVE_CONTRATOS = 'mm-erp-contratos-v1';
const CHAVE_RECEBER = 'mm-erp-contas-receber-v2';

const contratoOsvaldo = {
  id: 'contrato-osvaldo-cestari-2026', cliente: 'Osvaldo Herminio Cestari Filho', documento: '130.796.368-48',
  endereco: 'R. Sebastião Francisco Arruda, 663 - Vila Operária, Barra Bonita/SP', assinatura: '2026-07-20',
  prazoLimite: '2026-09-27', prazoDias: 69, status: 'assinado', valorTotal: 12908, recebido: 6454, aReceber: 6454,
  sistema: '8 módulos bifaciais e 2 microinversores de 2,25 kW', pagamento: '50% na assinatura e 50% no dia da instalação',
  validacao: 'https://valida.ae/cb4fe3bc4c6b6dbd3fca9a85fc229fe810a791180b34f415b', origem: 'ERP',
};

const EMPTY_FORM = {
  clientId: '', clientName: '', clientDocument: '', clientPhone: '', clientEmail: '', clientAddress: '',
  installationAddress: '', totalValue: '', paymentTerms: '',
  systemDescription: 'Sistema solar fotovoltaico conforme proposta comercial aprovada.',
  components: 'Módulos fotovoltaicos, inversor ou microinversores, estrutura de fixação, DPS, disjuntor, cabos, projeto, ART, homologação e monitoramento via web.',
};

function carregarContratos() {
  const salvos = carregarDados(CHAVE_CONTRATOS, []);
  if (!salvos.some((item) => item.id === contratoOsvaldo.id)) return [contratoOsvaldo, ...salvos];
  return salvos;
}

function fullAddress(client) {
  return [client.address, client.city, client.state, client.zipCode ? `CEP ${client.zipCode}` : ''].filter(Boolean).join(', ');
}

function mapAutentique(document) {
  const signatures = document.signatures || [];
  const signer = signatures[0] || {};
  const signedAt = signatures.map((item) => item.signed?.created_at).filter(Boolean).sort().at(-1) || '';
  const rejectedAt = signatures.map((item) => item.rejected?.created_at).filter(Boolean).sort().at(-1) || '';
  const allSigned = signatures.length > 0 && signatures.every((item) => item.signed?.created_at);
  const status = rejectedAt ? 'recusado' : allSigned ? 'assinado' : signatures.some((item) => item.viewed?.created_at) ? 'visualizado' : 'enviado';
  return {
    id: `autentique-${document.id}`,
    autentiqueId: document.id,
    cliente: signer.name || signer.user?.name || document.name || 'Documento do Autentique',
    documento: '',
    endereco: '',
    assinatura: signedAt || document.created_at,
    criadoEm: document.created_at,
    prazoDias: 69,
    prazoLimite: '',
    status,
    valorTotal: 0,
    recebido: 0,
    aReceber: 0,
    sistema: document.name || 'Contrato importado do Autentique',
    pagamento: 'Não informado no Autentique',
    validacao: document.files?.signed || signer.link?.short_link || document.files?.original || '',
    arquivoOriginal: document.files?.original || '',
    arquivoAssinado: document.files?.signed || '',
    email: signer.email || signer.user?.email || '',
    origem: 'Autentique',
    sincronizadoEm: new Date().toISOString(),
  };
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState(carregarContratos);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => { listClients().then(setClientes).catch((error) => setMensagem(error.message)); }, []);
  useEffect(() => { salvarDados(CHAVE_CONTRATOS, contratos); }, [contratos]);

  useEffect(() => {
    const contas = carregarDados(CHAVE_RECEBER, []);
    const idParcela = 'contrato-osvaldo-cestari-parcela-2';
    if (!contas.some((item) => item.id === idParcela)) {
      salvarDados(CHAVE_RECEBER, [{
        id: idParcela, descricao: 'Saldo do contrato solar - Osvaldo Cestari', cliente: contratoOsvaldo.cliente,
        categoria: 'Venda de sistema solar', valor: contratoOsvaldo.aReceber, vencimento: contratoOsvaldo.prazoLimite,
        status: 'pendente', origem: 'Contrato assinado', observacoes: 'Receber no dia da instalação. Prazo contratual de até 69 dias corridos.',
      }, ...contas]);
    }
  }, []);

  const selecionarCliente = (id) => {
    const client = clientes.find((item) => item.id === id);
    if (!client) return setForm(EMPTY_FORM);
    const address = fullAddress(client);
    setForm((current) => ({ ...current, clientId: client.id, clientName: client.name || '', clientDocument: client.document || '', clientPhone: client.phone || '', clientEmail: client.email || '', clientAddress: address, installationAddress: address }));
  };

  const atualizar = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const validar = (deliveryMethod = null) => {
    if (!form.clientName || !form.clientDocument || !form.installationAddress) return setMensagem('Selecione um cliente com nome, CPF/CNPJ e endereço da instalação.'), false;
    if (Number(form.totalValue) <= 0 || !form.paymentTerms.trim()) return setMensagem('Informe o valor do contrato e a forma de pagamento.'), false;
    if (deliveryMethod === 'email' && !form.clientEmail) return setMensagem('O cliente selecionado não possui e-mail cadastrado.'), false;
    if (deliveryMethod === 'whatsapp' && !form.clientPhone) return setMensagem('O cliente selecionado não possui WhatsApp cadastrado.'), false;
    return true;
  };

  const salvarRegistro = (autentique = {}) => {
    const novo = {
      id: crypto.randomUUID(), cliente: form.clientName, documento: form.clientDocument, endereco: form.installationAddress,
      assinatura: new Date().toISOString().slice(0, 10), prazoDias: 69, prazoLimite: '', status: autentique.documentId ? 'enviado' : 'rascunho',
      valorTotal: Number(form.totalValue), recebido: 0, aReceber: Number(form.totalValue), sistema: form.systemDescription,
      pagamento: form.paymentTerms, validacao: autentique.signingLink || '', autentiqueId: autentique.documentId || '', origem: 'ERP',
    };
    setContratos((current) => [novo, ...current]);
  };

  const baixarPdf = async () => {
    if (!validar()) return;
    setMensagem('Gerando contrato em PDF...');
    try { await downloadContractPdf(form); salvarRegistro(); setMensagem('Contrato gerado e incluído no histórico.'); }
    catch (error) { setMensagem(error.message || 'Não foi possível gerar o PDF.'); }
  };

  const enviarAutentique = async (deliveryMethod) => {
    if (!validar(deliveryMethod)) return;
    setEnviando(true);
    setMensagem('Gerando PDF e enviando ao Autentique...');
    try {
      const pdf = await generateContractPdf(form);
      const result = await sendContractToAutentique({ blob: pdf.blob, fileName: pdf.fileName, contract: form, deliveryMethod });
      salvarRegistro(result);
      setMensagem('Contrato enviado ao Autentique e incluído no histórico.');
    } catch (error) { setMensagem(error.message || 'Não foi possível enviar ao Autentique.'); }
    finally { setEnviando(false); }
  };

  const sincronizarAutentique = async () => {
    setSincronizando(true);
    setMensagem('Buscando todos os contratos no Autentique...');
    try {
      const documents = await listAutentiqueContracts({ limit: 60, pages: 10 });
      const importados = documents.map(mapAutentique);
      setContratos((atuais) => {
        const mapa = new Map(atuais.map((item) => [item.autentiqueId ? `autentique-${item.autentiqueId}` : item.id, item]));
        importados.forEach((item) => mapa.set(item.id, { ...mapa.get(item.id), ...item }));
        return Array.from(mapa.values()).sort((a, b) => new Date(b.assinatura || b.criadoEm || 0) - new Date(a.assinatura || a.criadoEm || 0));
      });
      setMensagem(`${importados.length} contrato(s) sincronizado(s) do Autentique.`);
    } catch (error) { setMensagem(error.message || 'Não foi possível sincronizar os contratos.'); }
    finally { setSincronizando(false); }
  };

  const filtrados = useMemo(() => contratos.filter((item) => `${item.cliente} ${item.documento} ${item.status} ${item.origem}`.toLowerCase().includes(busca.toLowerCase())), [contratos, busca]);
  const totais = useMemo(() => contratos.reduce((acc, item) => ({ total: acc.total + Number(item.valorTotal || 0), recebido: acc.recebido + Number(item.recebido || 0), receber: acc.receber + Number(item.aReceber || 0) }), { total: 0, recebido: 0, receber: 0 }), [contratos]);

  return <FinanceLayout title="Contratos" subtitle="Gere contratos, envie para assinatura e sincronize o histórico do Autentique.">
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
        <div><h2>Histórico de todos os contratos</h2><p>Contratos do ERP e documentos existentes no Autentique.</p></div>
        <button className="finance-button" type="button" disabled={sincronizando} onClick={sincronizarAutentique}><RefreshCw size={17} className={sincronizando ? 'spin' : ''} /> {sincronizando ? 'Sincronizando...' : 'Atualizar do Autentique'}</button>
      </div>
      <label className="contracts-search"><Search size={17} /><input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar cliente, CPF, status ou origem" /></label>
      <div className="contracts-list" style={{ marginTop: 16 }}>
        {filtrados.map((contrato) => <article className="contract-card" key={contrato.id}>
          <div className="contract-card-heading"><FileCheck2 size={24} /><div><h3>{contrato.cliente}</h3><span>{contrato.assinatura ? `${contrato.status === 'assinado' ? 'Assinado' : 'Criado'} em ${formatarData(String(contrato.assinatura).slice(0, 10))}` : 'Sem data'}</span></div><span className={`finance-badge ${contrato.status === 'assinado' ? 'paga' : 'pendente'}`}>{contrato.status || 'rascunho'}</span></div>
          <div className="contract-details"><div><span>Origem</span><strong>{contrato.origem || 'ERP'}</strong></div><div><span>CPF/CNPJ</span><strong>{contrato.documento || 'Não informado'}</strong></div><div><span>Documento</span><strong>{contrato.sistema}</strong></div><div><span>Valor</span><strong>{contrato.valorTotal ? formatarMoeda(contrato.valorTotal) : 'Não informado'}</strong></div></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            {contrato.arquivoAssinado ? <a className="finance-button contract-link" href={contrato.arquivoAssinado} target="_blank" rel="noreferrer"><Download size={16} /> Abrir PDF assinado</a> : null}
            {contrato.validacao ? <a className="finance-secondary-button contract-link" href={contrato.validacao} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir documento</a> : null}
          </div>
        </article>)}
        {!filtrados.length ? <div className="agenda-empty"><UserRound size={36} /><strong>Nenhum contrato encontrado</strong></div> : null}
      </div>
    </section>
  </FinanceLayout>;
}