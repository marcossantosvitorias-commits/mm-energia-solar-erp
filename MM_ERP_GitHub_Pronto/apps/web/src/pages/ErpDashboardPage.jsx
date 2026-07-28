import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { financeDatabase } from '../services/financeDatabaseService.js';

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(valor || 0));

function ErpDashboardPage() {
  const [movimentos, setMovimentos] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregarDashboard() {
      setCarregando(true);
      try {
        const [transactions, payables, receivables] = await Promise.all([
          financeDatabase.listTransactions(),
          financeDatabase.listPayables(),
          financeDatabase.listReceivables(),
        ]);

        if (!ativo) return;
        setMovimentos(transactions);
        setContasPagar(payables);
        setContasReceber(receivables);
        setErro('');
      } catch (error) {
        if (ativo) setErro(`Não foi possível carregar o Dashboard: ${error.message}`);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarDashboard();
    return () => { ativo = false; };
  }, []);

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
    ['/app', 'Abrir financeiro', 'Lançar entradas, despesas e vencimentos.'],
    ['/app/precos', 'Calcular preço de kit', 'Formar preço para 4, 6, 8 placas ou outra quantidade.'],
    ['/app/equipamentos', 'Cadastrar equipamentos', 'Salvar placas, inversores e custos de referência.'],
    ['/app/tributos', 'Simular tributação', 'Comparar modelo atual com IBS, CBS e split payment.'],
  ];

  return <FinanceLayout title="Dashboard do MM ERP" subtitle="Visão rápida da empresa com dados centralizados no Supabase.">
    {erro && <p className="finance-notice">{erro}</p>}
    {carregando && <div className="finance-empty">Carregando indicadores do banco...</div>}

    {!carregando && dados.vencendoHoje.length > 0 && (
      <section className="finance-panel tax-warning">
        <h2>Boletos vencendo hoje</h2>
        <p>
          Você tem <strong>{dados.vencendoHoje.length} boleto(s)</strong> vencendo hoje,
          no total de <strong>{formatarMoeda(dados.totalVencendoHoje)}</strong>.
        </p>
        <Link className="finance-button inline-button" to="/app">Ver contas a pagar</Link>
      </section>
    )}

    {!carregando && <section className="finance-grid">
      <StatCard label="Saldo atual" value={formatarMoeda(dados.saldo)} helper="Entradas menos saídas" tone="primary" />
      <StatCard label="A receber" value={formatarMoeda(dados.aReceber)} helper="Receitas pendentes" tone="positive" />
      <StatCard label="A pagar" value={formatarMoeda(dados.aPagar)} helper="Despesas pendentes" tone="negative" />
      <StatCard label="Saldo projetado" value={formatarMoeda(dados.projetado)} helper="Inclui contas futuras" tone="warning" />
    </section>}

    <section className="erp-shortcut-grid">
      {atalhos.map(([to, title, description]) => <Link className="erp-shortcut" to={to} key={to}><strong>{title}</strong><span>{description}</span><b>Acessar →</b></Link>)}
    </section>

    <section className="finance-two-columns">
      <article className="finance-panel"><h2>Estrutura da versão 1.0</h2>
        {['Financeiro empresarial e pessoal', 'Formação de preço dos kits', 'Cadastro de equipamentos', 'Simulador tributário e split payment'].map((item) => <div className="finance-list-item" key={item}><div><strong>{item}</strong><span>Módulo disponível</span></div><span className="finance-badge paga">Ativo</span></div>)}
      </article>
      <article className="finance-panel"><h2>Fonte dos indicadores</h2><div className="dashboard-big-number">Supabase</div><p className="dashboard-note">Saldo, contas a pagar, contas a receber e vencimentos agora são calculados diretamente pelos registros centrais do ERP, sem depender dos dados salvos neste navegador.</p><Link className="finance-button inline-button" to="/app">Gerenciar financeiro</Link></article>
    </section>
  </FinanceLayout>;
}

export default ErpDashboardPage;
