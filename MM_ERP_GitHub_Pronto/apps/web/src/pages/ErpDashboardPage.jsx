import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { financeDatabase } from '../services/financeDatabaseService.js';
import { equipmentService } from '../services/equipmentService.js';

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(valor || 0));

function ErpDashboardPage() {
  const { user } = useAuth();
  const [movimentos, setMovimentos] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [quantidadeEquipamentos, setQuantidadeEquipamentos] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const podeVerFinanceiro = ['admin', 'financeiro'].includes(user?.role);
  const podeVerEquipamentos = ['admin', 'engenharia'].includes(user?.role);

  useEffect(() => {
    let ativo = true;

    async function carregarDashboard() {
      setCarregando(true);
      setErro('');
      const erros = [];

      if (podeVerFinanceiro) {
        try {
          const [transactions, payables, receivables] = await Promise.all([
            financeDatabase.listTransactions(),
            financeDatabase.listPayables(),
            financeDatabase.listReceivables(),
          ]);
          if (ativo) {
            setMovimentos(transactions);
            setContasPagar(payables);
            setContasReceber(receivables);
          }
        } catch (error) {
          erros.push(`Financeiro: ${error.message}`);
        }
      }

      if (podeVerEquipamentos) {
        try {
          const equipamentos = await equipmentService.list();
          if (ativo) setQuantidadeEquipamentos(equipamentos.length);
        } catch (error) {
          erros.push(`Equipamentos: ${error.message}`);
        }
      }

      if (ativo) {
        setErro(erros.length ? `Não foi possível carregar parte do Dashboard. ${erros.join(' | ')}` : '');
        setCarregando(false);
      }
    }

    carregarDashboard();
    return () => { ativo = false; };
  }, [podeVerFinanceiro, podeVerEquipamentos]);

  const dados = useMemo(() => {
    const entradas = movimentos
      .filter((item) => item.transaction_type === 'entrada')
      .reduce((soma, item) => soma + Number(item.amount || 0), 0);
    const saidas = movimentos
      .filter((item) => item.transaction_type === 'saida')
      .reduce((soma, item) => soma + Number(item.amount || 0), 0);
    const aPagar = contasPagar
      .filter((item) => item.status === 'pendente')
      .reduce((soma, item) => soma + Number(item.amount || 0), 0);
    const aReceber = contasReceber
      .filter((item) => item.status === 'pendente')
      .reduce((soma, item) => soma + Number(item.amount || 0), 0);
    const hoje = new Date().toISOString().slice(0, 10);
    const vencendoHoje = contasPagar.filter(
      (item) => item.status === 'pendente' && String(item.due_date).slice(0, 10) === hoje,
    );
    const totalVencendoHoje = vencendoHoje.reduce(
      (soma, item) => soma + Number(item.amount || 0),
      0,
    );

    return {
      vencendoHoje,
      totalVencendoHoje,
      saldo: entradas - saidas,
      aPagar,
      aReceber,
      projetado: entradas - saidas + aReceber - aPagar,
    };
  }, [movimentos, contasPagar, contasReceber]);

  const atalhos = [
    podeVerFinanceiro && ['/app', 'Abrir financeiro', 'Lançar entradas, despesas e vencimentos.'],
    ['admin', 'financeiro', 'comercial'].includes(user?.role) && ['/app/precos', 'Calcular preço de kit', 'Formar preço para 4, 6, 8 placas ou outra quantidade.'],
    podeVerEquipamentos && ['/app/equipamentos', 'Cadastrar equipamentos', 'Salvar placas, inversores e custos de referência.'],
    podeVerFinanceiro && ['/app/tributos', 'Simular tributação', 'Comparar modelo atual com IBS, CBS e split payment.'],
  ].filter(Boolean);

  return <FinanceLayout title="Dashboard do MM ERP" subtitle="Visão rápida da empresa com dados centralizados no Supabase.">
    {erro && <p className="finance-notice">{erro}</p>}
    {carregando && <div className="finance-empty">Carregando indicadores autorizados...</div>}

    {!carregando && podeVerFinanceiro && dados.vencendoHoje.length > 0 && (
      <section className="finance-panel tax-warning">
        <h2>Boletos vencendo hoje</h2>
        <p>
          Você tem <strong>{dados.vencendoHoje.length} boleto(s)</strong> vencendo hoje,
          no total de <strong>{formatarMoeda(dados.totalVencendoHoje)}</strong>.
        </p>
        <Link className="finance-button inline-button" to="/app">Ver contas a pagar</Link>
      </section>
    )}

    {!carregando && podeVerFinanceiro && <section className="finance-grid">
      <StatCard label="Saldo atual" value={formatarMoeda(dados.saldo)} helper="Entradas menos saídas" tone="primary" />
      <StatCard label="A receber" value={formatarMoeda(dados.aReceber)} helper="Receitas pendentes" tone="positive" />
      <StatCard label="A pagar" value={formatarMoeda(dados.aPagar)} helper="Despesas pendentes" tone="negative" />
      <StatCard label="Saldo projetado" value={formatarMoeda(dados.projetado)} helper="Inclui contas futuras" tone="warning" />
    </section>}

    <section className="erp-shortcut-grid">
      {atalhos.map(([to, title, description]) => <Link className="erp-shortcut" to={to} key={to}><strong>{title}</strong><span>{description}</span><b>Acessar →</b></Link>)}
    </section>

    <section className="finance-two-columns">
      <article className="finance-panel"><h2>Módulos disponíveis para seu perfil</h2>
        {atalhos.map(([, title]) => <div className="finance-list-item" key={title}><div><strong>{title}</strong><span>Acesso autorizado</span></div><span className="finance-badge paga">Ativo</span></div>)}
      </article>
      {podeVerEquipamentos ? (
        <article className="finance-panel"><h2>Catálogo central</h2><div className="dashboard-big-number">{quantidadeEquipamentos ?? '—'}</div><p className="dashboard-note">equipamentos cadastrados no Supabase, disponíveis no celular e no computador.</p><Link className="finance-button inline-button" to="/app/equipamentos">Gerenciar equipamentos</Link></article>
      ) : (
        <article className="finance-panel"><h2>Segurança por perfil</h2><div className="dashboard-big-number">RBAC</div><p className="dashboard-note">O Dashboard consulta somente os módulos permitidos para o seu cargo, sem tentar acessar dados financeiros ou operacionais restritos.</p></article>
      )}
    </section>
  </FinanceLayout>;
}

export default ErpDashboardPage;
