import React, { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, FileCheck2, Mail, MessageCircle, Search, Send, UserRound } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { carregarDados, formatarData, formatarMoeda, salvarDados } from '../components/finance/storage.js';
import { listClients } from '../services/clientService.js';
import { downloadContractPdf, generateContractPdf } from '../services/contractPdfService.js';
import { sendContractToAutentique } from '../services/autentiqueService.js';
import './ContratosPage.css';

const CHAVE_CONTRATOS = 'mm-erp-contratos-v1';
const CHAVE_RECEBER = 'mm-erp-contas-receber-v2';

const contratoOsvaldo = {
  id: 'contrato-osvaldo-cestari-2026',
  cliente: 'Osvaldo Herminio Cestari Filho',
  documento: '130.796.368-48',
  endereco: 'R. Sebastião Francisco Arruda, 663 - Vila Operária, Barra Bonita/SP',
  assinatura: '2026-07-20',
  prazoLimite: '2026-09-27',
  prazoDias: 69,
  status: 'assinado',
  valorTotal: 12908,
  recebido: 6454,
  aReceber: 6454,
  sistema: '8 módulos bifaciais e 2 microinversores de 2,25 kW',
  pagamento: '50% na assinatura e 50% no dia da instalação',
  validacao: 'https://valida.ae/cb4fe3bc4c6b6dbd3fca9a85fc229fe810a791180b34f415b',
};

const EMPTY_FORM = {
  clientId: '', clientName: '', clientDocument: '', clientPhone: '', clientEmail: '',
  clientAddress: '', installationAddress: '', totalValue: '',
  paymentTerms: '',
  systemDescription: 'Sistema solar fotovoltaico conforme proposta comercial aprovada.',
  components: 'Módulos fotovoltaicos, inversor ou microinversores, estrutura de fixação, DPS, disjuntor, cabos, projeto, ART, homologação e monitoramento via web.',
};

function carregarContratos() {
  const salvos = carregarDados(CHAVE_CONTRATOS, []);
  if (!salvos.some((item) => item.id === contratoOsvaldo.id)) return [contratoOsvaldo, ...salvos];
  return salvos.map((item) => item.id === contratoOsvaldo.id ? { ...item, prazoDias: 69 } : item);
}

function fullAddress(client) {
  return [client.address, client.city, client.state, client.zipCode ? `CEP ${client.zipCode}` : ''].filter(Boolean).join(', ');
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState(carregarContratos);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listClients().then(setClientes).catch((error) => setMensagem(error.message));
  }, []);

  useEffect(() => {
    salvarDados(CHAVE_CONTRATOS, contratos);
    const contas = carregarDados(CHAVE_RECEBER, []);
    const idParcela = 'contrato-osvaldo-cestari-parcela-2';
    const parcela = {
      id: idParcela,
      descricao: 'Saldo do contrato solar - Osvaldo Cestari', cliente: contratoOsvaldo.cliente,
      categoria: 'Venda de sistema solar', valor: contratoOsvaldo.aReceber,
      vencimento: contratoOsvaldo.prazoLimite, status: 'pendente', origem: 'Contrato assinado',
      observacoes: 'Receber no dia da instalação. Prazo contratual de até 69 dias corridos.',
    };
    const atualizadas = contas.some((item) => item.id === idParcela)
      ? contas.map((item) => item.id === idParcela ? { ...item, observacoes: parcela.observacoes } : item)
      : [parcela, ...contas];
    salvarDados(CHAVE_RECEBER, atualizadas);
  }, [contratos]);

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

  const salvarRegistro = (autentique = {}) => {
    const novo = {
      id: crypto.randomUUID(), cliente: form.clientName, documento: form.clientDocument,
      endereco: form.installationAddress, assinatura: new Date().toISOString().slice(0, 10),
      prazoDias: 69, prazoLimite: '', status: autentique.documentId ? 'enviado' : 'rascunho',
      valorTotal: Number(form.totalValue), recebido: 0, aReceber: Number(form.totalValue),
      sistema: form.systemDescription, pagamento: form.paymentTerms,
      validacao: autentique.signingLink || '', autentiqueId: autentique.documentId || '',
    };
    setContratos((current) => [novo, ...current]);
    return novo;
  };

  const baixarPdf = async () => {
    if (!validar()) return;
    setMensagem('Gerando contrato em PDF...');
    try {
      await downloadContractPdf(form);
      salvarRegistro();
      setMensagem('Contrato gerado e baixado em PDF.');
    } catch (error) {
      setMensagem(error.message || 'Não foi possível gerar o PDF.');
    }
  };

  const enviarAutentique = async (deliveryMethod) => {
    if (!validar(deliveryMethod)) return;
    setEnviando(true);
    setMensagem(`Gerando PDF e enviando para assinatura por ${deliveryMethod === 'whatsapp' ? 'WhatsApp' : 'e-mail'}...`);
    try {
      const pdf = await generateContractPdf(form);
      const result = await sendContractToAutentique({ blob: pdf.blob, fileName: pdf.fileName, contract: form, deliveryMethod });
      salvarRegistro(result);
      setMensagem(result.signingLink
        ? `Contrato enviado. Link de assinatura: ${result.signingLink}`
        : 'Contrato enviado ao Autentique para assinatura.');
    } catch (error) {
      setMensagem(error.message || 'Não foi possível enviar ao Autentique.');
    } finally {
      setEnviando(false);
    }
  };

  const filtrados = useMemo(() => contratos.filter((item) =>
    `${item.cliente} ${item.documento} ${item.status}`.toLowerCase().includes(busca.toLowerCase())), [contratos, busca]);

  const totais = useMemo(() => contratos.reduce((acc, item) => ({
    total: acc.total + Number(item.valorTotal || 0),
    recebido: acc.recebido + Number(item.recebido || 0),
    receber: acc.receber + Number(item.aReceber || 0),
  }), { total: 0, recebido: 0, receber: 0 }), [contratos]);

  return (
    <FinanceLayout title="Contratos" subtitle="Gere o PDF com os dados do cliente e envie para assinatura eletrônica.">
      <section className="finance-grid">
        <StatCard label="Total contratado" value={formatarMoeda(totais.total)} helper={`${contratos.length} contrato(s)`} tone="primary" />
        <StatCard label="Já recebido" value={formatarMoeda(totais.recebido)} helper="Pagamentos confirmados" tone="positive" />
        <StatCard label="A receber" value={formatarMoeda(totais.receber)} helper="Contratos e parcelas" tone="warning" />
      </section>

      <section className="finance-panel contract-generator">
        <div className="finance-panel-header">
          <div><h2>Novo contrato</h2><p>Selecione o cliente. Nome, CPF/CNPJ, telefone, e-mail e endereço serão preenchidos automaticamente.</p></div>
          <FileCheck2 size={24} />
        </div>

        <div className="contract-form-grid">
          <label className="finance-field finance-field-wide"><span>Cliente cadastrado</span><select value={form.clientId} onChange={(event) => selecionarCliente(event.target.value)}><option value="">Selecione o cliente</option>{clientes.map((client) => <option key={client.id} value={client.id}>{client.name} - {client.document || 'sem CPF/CNPJ'}</option>)}</select></label>
          <label className="finance-field"><span>Nome</span><input value={form.clientName} readOnly /></label>
          <label className="finance-field"><span>CPF/CNPJ</span><input value={form.clientDocument} readOnly /></label>
          <label className="finance-field"><span>WhatsApp</span><input value={form.clientPhone} readOnly /></label>
          <label className="finance-field"><span>E-mail</span><input value={form.clientEmail} readOnly /></label>
          <label className="finance-field finance-field-wide"><span>Endereço do cliente</span><input value={form.clientAddress} readOnly /></label>
          <label className="finance-field finance-field-wide"><span>Local da instalação</span><input name="installationAddress" value={form.installationAddress} onChange={atualizar} placeholder="Endereço completo da instalação" /></label>
          <label className="finance-field"><span>Valor total</span><input type="number" min="0" step="0.01" name="totalValue" value={form.totalValue} onChange={atualizar} placeholder="0,00" /></label>
          <label className="finance-field"><span>Prazo de execução</span><input value="69 dias corridos" readOnly /></label>
          <label className="finance-field finance-field-wide"><span>Forma de pagamento</span><textarea name="paymentTerms" value={form.paymentTerms} onChange={atualizar} rows="3" placeholder="Ex.: 50% via PIX na assinatura e 50% no dia da instalação, antes do início dos serviços." /></label>
          <label className="finance-field finance-field-wide"><span>Descrição do sistema</span><textarea name="systemDescription" value={form.systemDescription} onChange={atualizar} rows="2" /></label>
          <label className="finance-field finance-field-wide"><span>Componentes e serviços inclusos</span><textarea name="components" value={form.components} onChange={atualizar} rows="3" /></label>
        </div>

        <div className="contract-generator-actions">
          <button className="finance-secondary-button" type="button" onClick={baixarPdf}><Download size={17} /> Gerar PDF</button>
          <button className="finance-button whatsapp-contract" type="button" disabled={enviando} onClick={() => enviarAutentique('whatsapp')}><MessageCircle size={17} /> Enviar para assinar no WhatsApp</button>
          <button className="finance-button" type="button" disabled={enviando} onClick={() => enviarAutentique('email')}><Mail size={17} /> Enviar para assinar por e-mail</button>
        </div>
        {mensagem ? <p className="crm-message contract-message">{mensagem}</p> : null}
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div><h2>Contratos cadastrados</h2><p>Acompanhe rascunhos, contratos enviados e documentos assinados.</p></div>
          <label className="contracts-search"><Search size={17} /><input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar cliente ou CPF" /></label>
        </div>

        <div className="contracts-list">
          {filtrados.map((contrato) => (
            <article className="contract-card" key={contrato.id}>
              <div className="contract-card-heading"><FileCheck2 size={24} /><div><h3>{contrato.cliente}</h3><span>{contrato.assinatura ? `Criado em ${formatarData(contrato.assinatura)}` : 'Sem data'}</span></div><span className={`finance-badge ${contrato.status === 'assinado' ? 'paga' : 'pendente'}`}>{contrato.status || 'rascunho'}</span></div>
              <div className="contract-details"><div><span>CPF/CNPJ</span><strong>{contrato.documento}</strong></div><div><span>Sistema</span><strong>{contrato.sistema}</strong></div><div><span>Endereço da obra</span><strong>{contrato.endereco}</strong></div><div><span>Condição</span><strong>{contrato.pagamento}</strong></div></div>
              <div className="contract-payments"><div className="received"><span>Recebido</span><strong>{formatarMoeda(contrato.recebido)}</strong></div><div className="pending"><span>A receber</span><strong>{formatarMoeda(contrato.aReceber)}</strong><small>Prazo contratual: {contrato.prazoDias || 69} dias corridos</small></div></div>
              {contrato.validacao ? <a className="finance-secondary-button contract-link" href={contrato.validacao} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir assinatura ou validação</a> : null}
            </article>
          ))}
          {!filtrados.length ? <div className="agenda-empty"><UserRound size={36} /><strong>Nenhum contrato encontrado</strong></div> : null}
        </div>
      </section>
    </FinanceLayout>
  );
}
