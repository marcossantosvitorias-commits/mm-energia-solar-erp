import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileCheck2, Search } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { carregarDados, formatarData, formatarMoeda, salvarDados } from '../components/finance/storage.js';
import './ContratosPage.css';

const CHAVE_CONTRATOS = 'mm-erp-contratos-v1';
const CHAVE_RECEBER = 'mm-erp-contas-receber-v2';

const contratoOsvaldo = {
  id: 'contrato-osvaldo-cestari-2026',
  cliente: 'Osvaldo Herminio Cestari Filho',
  documento: '130.796.368-48',
  endereco: 'R. Sebastião Francisco Arruda, 663 - Vila Operária, Barra Bonita/SP',
  assinatura: '2026-07-20',
  prazoLimite: '2026-09-18',
  status: 'assinado',
  valorTotal: 12908,
  recebido: 6454,
  aReceber: 6454,
  sistema: '8 módulos bifaciais e 2 microinversores de 2,25 kW',
  pagamento: '50% na assinatura e 50% no dia da instalação',
  validacao: 'https://valida.ae/cb4fe3bc4c6b6dbd3fca9a85fc229fe810a791180b34f415b',
};

function carregarContratos() {
  const salvos = carregarDados(CHAVE_CONTRATOS, []);
  return salvos.some((item) => item.id === contratoOsvaldo.id)
    ? salvos
    : [contratoOsvaldo, ...salvos];
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState(carregarContratos);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    salvarDados(CHAVE_CONTRATOS, contratos);

    const contas = carregarDados(CHAVE_RECEBER, []);
    const idParcela = 'contrato-osvaldo-cestari-parcela-2';
    if (!contas.some((item) => item.id === idParcela)) {
      salvarDados(CHAVE_RECEBER, [
        {
          id: idParcela,
          descricao: 'Saldo do contrato solar - Osvaldo Cestari',
          cliente: contratoOsvaldo.cliente,
          categoria: 'Venda de sistema solar',
          valor: contratoOsvaldo.aReceber,
          vencimento: contratoOsvaldo.prazoLimite,
          status: 'pendente',
          origem: 'Contrato assinado',
          observacoes: 'Receber no dia da instalação. A data registrada é o prazo contratual máximo.',
        },
        ...contas,
      ]);
    }
  }, [contratos]);

  const filtrados = useMemo(
    () => contratos.filter((item) =>
      `${item.cliente} ${item.documento} ${item.status}`.toLowerCase().includes(busca.toLowerCase())
    ),
    [contratos, busca],
  );

  const totais = useMemo(() => contratos.reduce(
    (acc, item) => ({
      total: acc.total + Number(item.valorTotal || 0),
      recebido: acc.recebido + Number(item.recebido || 0),
      receber: acc.receber + Number(item.aReceber || 0),
    }),
    { total: 0, recebido: 0, receber: 0 },
  ), [contratos]);

  return (
    <FinanceLayout
      title="Contratos"
      subtitle="Contratos assinados, valores recebidos e saldos pendentes."
    >
      <section className="finance-grid">
        <StatCard label="Total contratado" value={formatarMoeda(totais.total)} helper={`${contratos.length} contrato(s)`} tone="primary" />
        <StatCard label="Já recebido" value={formatarMoeda(totais.recebido)} helper="Pagamentos confirmados" tone="positive" />
        <StatCard label="A receber" value={formatarMoeda(totais.receber)} helper="Enviado ao Financeiro" tone="warning" />
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Contratos cadastrados</h2>
            <p>O saldo pendente aparece automaticamente em Contas a receber.</p>
          </div>
          <label className="contracts-search">
            <Search size={17} />
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar cliente ou CPF" />
          </label>
        </div>

        <div className="contracts-list">
          {filtrados.map((contrato) => (
            <article className="contract-card" key={contrato.id}>
              <div className="contract-card-heading">
                <FileCheck2 size={24} />
                <div>
                  <h3>{contrato.cliente}</h3>
                  <span>Assinado em {formatarData(contrato.assinatura)}</span>
                </div>
                <span className="finance-badge paga">Assinado</span>
              </div>

              <div className="contract-details">
                <div><span>CPF</span><strong>{contrato.documento}</strong></div>
                <div><span>Sistema</span><strong>{contrato.sistema}</strong></div>
                <div><span>Endereço da obra</span><strong>{contrato.endereco}</strong></div>
                <div><span>Condição</span><strong>{contrato.pagamento}</strong></div>
              </div>

              <div className="contract-payments">
                <div className="received">
                  <span>Entrada considerada recebida</span>
                  <strong>{formatarMoeda(contrato.recebido)}</strong>
                </div>
                <div className="pending">
                  <span>A receber no dia da instalação</span>
                  <strong>{formatarMoeda(contrato.aReceber)}</strong>
                  <small>Previsão máxima: {formatarData(contrato.prazoLimite)}</small>
                </div>
              </div>

              <a className="finance-secondary-button contract-link" href={contrato.validacao} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> Validar contrato assinado
              </a>
            </article>
          ))}
        </div>
      </section>
    </FinanceLayout>
  );
}
