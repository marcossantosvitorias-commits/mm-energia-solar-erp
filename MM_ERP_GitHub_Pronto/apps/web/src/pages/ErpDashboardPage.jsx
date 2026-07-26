import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { formatarMoeda } from '../components/finance/storage.js';
import { financeDatabase } from '../services/financeDatabaseService.js';
import { productsDatabase } from '../services/erpDatabaseService.js';

function ErpDashboardPage() {
  const [base, setBase] = useState({ movimentos: [], pagar: [], receber: [], equipamentos: [] });
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    Promise.all([
      financeDatabase.listTransactions('company'),
      financeDatabase.listPayables('company'),
      financeDatabase.listReceivables('company'),
      productsDatabase.list(),
    ]).then(([movimentos, pagar, receber, equipamentos]) => {
      if (ativo) setBase({ movimentos, pagar, receber, equipamentos });
    }).catch((error) => {
      if (ativo) setErro(error.message);
    });
    return () => { ativo = false; };
  }, []);

  const dados = useMemo(() => {
    const entradas = base.movimentos.filter((item) => item.transaction_type === 'entrada').reduce((soma, item) => soma + Number(item.amount || 0), 0);
    const saidas = base.movimentos.filter((item) => item.transaction_type === 'saida').reduce((soma, item) => soma + Number(item.amount || 0), 0);
    const aPagar = base.pagar.filter((item) => item.status === 'pendente').reduce((soma, item) => soma + Number(item.amount || 0), 0);
    const aReceber = base.receber.filter((item) => item.status === 'pendente').reduce((soma, item) => soma + Number(item.amount || 0), 0);
    const hoje = new Date().toISOString().slice(0, 10);
    const vencendoHoje = base.pagar.filter((item) => item.status === 'pendente' && String(item.due_date).slice(0, 10) === hoje);
    const totalVencendoHoje = vencendoHoje.reduce((soma, item) => soma + Number(item.amount || 0), 0);
    return {
      vencendoHoje,
      totalVencendoHoje,
      saldo: entradas - saidas,
      aPagar,
      aReceber,
      projetado: entradas - saidas + aReceber - aPagar,
      equipamentos: base.equipamentos.length,
    };
  }, [base]);

  const atalhos = [
    ['/app', 'Abrir financeiro', 'Lançar entradas, despesas e vencimentos.'],
    ['/app/precos', 'Calcular preço de kit', 'Formar preço usando as cotações Belenus.'],
    ['/app/equipamentos', 'Cadastrar equipamentos', 'Salvar placas, inversores e custos de referência.'],
    ['/app/tributos', 'Simular tributação', 'Comparar modelo atual com IBS, CBS e split payment.'],
  ];

  return <FinanceLayout title="Dashboard do MM ERP" subtitle="Dados atualizados diretamente do Supabase.">
    {erro ? <p className="crm-message">{erro}</p> : null}
    {dados.vencendoHoje.length > 0 && (
      <section className="finance-panel tax-warning">
        <h2>Boletos vencendo hoje</h2>
        <p>Você tem <strong>{dados.vencendoHoje.length} boleto(s)</strong> vencendo hoje, no total de <strong>{formatarMoeda(dados.totalVencendoHoje)}</strong>.</p>
        <Link className="finance-button inline-button" to="/app">Ver contas a pagar</Link>
      </section>
    )}

    <section className="finance-grid">
      <StatCard label="Saldo atual" value={formatarMoeda(dados.saldo)} helper="Entradas menos saídas" tone="primary" />
      <StatCard label="A receber" value={formatarMoeda(dados.aReceber)} helper="Receitas pendentes" tone="positive" />
      <StatCard label="A pagar" value={formatarMoeda(dados.aPagar)} helper="Despesas pendentes" tone="negative" />
      <StatCard label="Saldo projetado" value={formatarMoeda(dados.projetado)} helper="Inclui contas futuras" tone="warning" />
    </section>

    <section className="erp-shortcut-grid">
      {atalhos.map(([to, title, description]) => <Link className="erp-shortcut" to={to} key={to}><strong>{title}</strong><span>{description}</span><b>Acessar →</b></Link>)}
    </section>

    <section className="finance-two-columns">
      <article className="finance-panel"><h2>Módulos centralizados</h2>
        {['Financeiro empresarial e pessoal', 'Formação de preço dos kits', 'Contratos e clientes', 'Equipamentos e Bling'].map((item) => <div className="finance-list-item" key={item}><div><strong>{item}</strong><span>Dados no Supabase</span></div><span className="finance-badge paga">Ativo</span></div>)}
      </article>
      <article className="finance-panel"><h2>Base cadastrada</h2><div className="dashboard-big-number">{dados.equipamentos}</div><p className="dashboard-note">equipamentos salvos no catálogo central.</p><Link className="finance-button inline-button" to="/app/equipamentos">Gerenciar equipamentos</Link></article>
    </section>
  </FinanceLayout>;
}

export default ErpDashboardPage;
