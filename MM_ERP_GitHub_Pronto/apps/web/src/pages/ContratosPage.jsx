import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileCheck2, Search } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { formatarData, formatarMoeda } from '../components/finance/storage.js';
import { contractsDatabase } from '../services/businessDatabaseService.js';
import './ContratosPage.css';

export default function ContratosPage() {
  const [contratos, setContratos] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    contractsDatabase.list()
      .then((dados) => { if (ativo) setContratos(dados); })
      .catch((error) => { if (ativo) setErro(error.message); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

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
    <FinanceLayout title="Contratos" subtitle="Contratos e valores carregados diretamente do Supabase.">
      {erro ? <p className="crm-message">{erro}</p> : null}
      <section className="finance-grid">
        <StatCard label="Total contratado" value={formatarMoeda(totais.total)} helper={`${contratos.length} contrato(s)`} tone="primary" />
        <StatCard label="Já recebido" value={formatarMoeda(totais.recebido)} helper="Pagamentos confirmados" tone="positive" />
        <StatCard label="A receber" value={formatarMoeda(totais.receber)} helper="Integrado ao Financeiro" tone="warning" />
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Contratos cadastrados</h2>
            <p>O saldo pendente é mantido em Contas a receber no mesmo banco.</p>
          </div>
          <label className="contracts-search">
            <Search size={17} />
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar cliente ou CPF" />
          </label>
        </div>

        {carregando ? <p>Carregando contratos...</p> : null}
        {!carregando && !filtrados.length ? <p>Nenhum contrato encontrado.</p> : null}

        <div className="contracts-list">
          {filtrados.map((contrato) => (
            <article className="contract-card" key={contrato.id}>
              <div className="contract-card-heading">
                <FileCheck2 size={24} />
                <div>
                  <h3>{contrato.cliente}</h3>
                  <span>Assinado em {formatarData(contrato.assinatura)}</span>
                </div>
                <span className={`finance-badge ${contrato.status === 'assinado' ? 'paga' : ''}`}>{contrato.status}</span>
              </div>

              <div className="contract-details">
                <div><span>CPF</span><strong>{contrato.documento || '-'}</strong></div>
                <div><span>Sistema</span><strong>{contrato.sistema || '-'}</strong></div>
                <div><span>Endereço da obra</span><strong>{contrato.endereco || '-'}</strong></div>
                <div><span>Condição</span><strong>{contrato.pagamento || '-'}</strong></div>
              </div>

              <div className="contract-payments">
                <div className="received">
                  <span>Valor recebido</span>
                  <strong>{formatarMoeda(contrato.recebido)}</strong>
                </div>
                <div className="pending">
                  <span>A receber no dia da instalação</span>
                  <strong>{formatarMoeda(contrato.aReceber)}</strong>
                  <small>Previsão máxima: {formatarData(contrato.prazoLimite)}</small>
                </div>
              </div>

              {contrato.validacao ? (
                <a className="finance-secondary-button contract-link" href={contrato.validacao} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} /> Validar contrato assinado
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </FinanceLayout>
  );
}
