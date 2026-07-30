import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { financeDatabase } from '../services/financeDatabaseService.js';
import { equipmentService } from '../services/equipmentService.js';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(Number(valor || 0));

const hojeSaoPaulo = () => new Date().toLocaleDateString('en-CA', {
  timeZone: 'America/Sao_Paulo',
});

function ErpDashboardPage() {
  const { user } = useAuth();
  const [movimentos, setMovimentos] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [quantidadeEquipamentos, setQuantidadeEquipamentos] = useState(null);
  const [comercial, setComercial] = useState({
    clientes: [],
    compromissosHoje: [],
    retornosAtrasados: [],
    propostasMes: [],
  });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const podeVerFinanceiro = ['admin', 'financeiro'].includes(user?.role);
  const podeVerEquipamentos = ['admin', 'engenharia'].includes(user?.role);
  const podeVerComercial = ['admin', 'financeiro', 'comercial'].includes(user?.role);

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

      if (podeVerComercial) {
        try {
          if (!isSupabaseConfigured || !supabase) throw new Error('Supabase não configurado.');
          const hoje = hojeSaoPaulo();
          const inicioHoje = new Date(`${hoje}T00:00:00-03:00`).toISOString();
          const fimHoje = new Date(`${hoje}T23:59:59-03:00`).toISOString();
          const inicioMes = new Date();
          inicioMes.setDate(1);
          inicioMes.setHours(0, 0, 0, 0);

          const [clientesResult, agendaResult, retornosResult, propostasResult] = await Promise.all([
            supabase.from('clients').select('id, status'),
            supabase.from('appointments').select('id, client_name, appointment_type, appointment_at, status')
              .gte('appointment_at', inicioHoje).lte('appointment_at', fimHoje).neq('status', 'Concluído'),
            supabase.from('client_interactions').select('id, description, next_action_at, clients(name)')
              .not('next_action_at', 'is', null).lt('next_action_at', new Date().toISOString()),
            supabase.from('sales_proposals').select('id, total_amount, status, created_at')
              .gte('created_at', inicioMes.toISOString()),
          ]);
          const falha = [clientesResult, agendaResult, retornosResult, propostasResult].find((result) => result.error);
          if (falha?.error) throw falha.error;
          if (ativo) {
            setComercial({
              clientes: clientesResult.data || [],
              compromissosHoje: agendaResult.data || [],
              retornosAtrasados: retornosResult.data || [],
              propostasMes: propostasResult.data || [],
            });
          }
        } catch (error) {
          erros.push(`Comercial: ${error.message}`);
        }
      }

      if (ativo) {
        setErro(erros.length ? `Não foi possível carregar parte do Dashboard. ${erros.join(' | ')}` : '');
        setCarregando(false);
      }
    }

    carregarDashboard();
    return () => { ativo = false; };
  }, [podeVerFinanceiro, podeVerEquipamentos, podeVerComercial]);

  const dados = useMemo(() => {
    const entradas = movimentos.filter((item) => item.transaction_type === 'entrada')
      .reduce((soma, item) => soma + Number(item.amount || 0), 0);
    const saidas = movimentos.filter((item) => item.transaction_type === 'saida')
      .reduce((soma, item) => soma + Number(item.amount || 0), 0);
    const aPagar = contasPagar.filter((item) => item.status === 'pendente')
      .reduce((soma, item) => soma + Number(item.amount || 0), 0);
    const aReceber = contasReceber.filter((item) => item.status === 'pendente')
      .reduce((soma, item) => soma + Number(item.amount || 0), 0);
    const hoje = new Date().toISOString().slice(0, 10);
    const vencendoHoje = contasPagar.filter(
      (item) => item.status === 'pendente' && String(item.due_date).slice(0, 10) === hoje,
    );
    return {
      vencendoHoje,
      totalVencendoHoje: vencendoHoje.reduce((soma, item) => soma + Number(item.amount || 0), 0),
      saldo: entradas - saidas,
      aPagar,
      aReceber,
      projetado: entradas - saidas + aReceber - aPagar,
    };
  }, [movimentos, contasPagar, contasReceber]);

  const dadosComerciais = useMemo(() => {
    const ativos = comercial.clientes.filter((item) => !['cliente', 'perdido'].includes(item.status)).length;
    const clientesFechados = comercial.clientes.filter((item) => item.status === 'cliente').length;
    const valorPropostas = comercial.propostasMes.reduce((soma, item) => soma + Number(item.total_amount || 0), 0);
    return { ativos, clientesFechados, valorPropostas };
  }, [comercial]);

  const atalhos = [
    podeVerFinanceiro && ['/app', 'Abrir financeiro', 'Lançar entradas, despesas e vencimentos.'],
    podeVerComercial && ['/app/clientes', 'Abrir CRM', 'Acompanhar leads, clientes e histórico comercial.'],
    podeVerComercial && ['/app/agenda', 'Abrir agenda', 'Ver retornos, reuniões e visitas.'],
    podeVerComercial && ['/app/precos', 'Calcular preço de kit', 'Formar preço à vista, cartão e financiamento.'],
    podeVerEquipamentos && ['/app/equipamentos', 'Cadastrar equipamentos', 'Salvar placas, inversores e custos de referência.'],
    podeVerFinanceiro && ['/app/tributos', 'Simular tributação', 'Comparar impostos e condições comerciais.'],
  ].filter(Boolean);

  return <FinanceLayout title="Dashboard do MM ERP" subtitle="Visão financeira, comercial e operacional centralizada no Supabase.">
    {erro && <p className="finance-notice">{erro}</p>}
    {carregando && <div className="finance-empty">Carregando indicadores autorizados...</div>}

    {!carregando && podeVerFinanceiro && dados.vencendoHoje.length > 0 && (
      <section className="finance-panel tax-warning">
        <h2>Boletos vencendo hoje</h2>
        <p>Você tem <strong>{dados.vencendoHoje.length} boleto(s)</strong> vencendo hoje, no total de <strong>{formatarMoeda(dados.totalVencendoHoje)}</strong>.</p>
        <Link className="finance-button inline-button" to="/app">Ver contas a pagar</Link>
      </section>
    )}

    {!carregando && podeVerFinanceiro && <section className="finance-grid">
      <StatCard label="Saldo atual" value={formatarMoeda(dados.saldo)} helper="Entradas menos saídas" tone="primary" />
      <StatCard label="A receber" value={formatarMoeda(dados.aReceber)} helper="Receitas pendentes" tone="positive" />
      <StatCard label="A pagar" value={formatarMoeda(dados.aPagar)} helper="Despesas pendentes" tone="negative" />
      <StatCard label="Saldo projetado" value={formatarMoeda(dados.projetado)} helper="Inclui contas futuras" tone="warning" />
    </section>}

    {!carregando && podeVerComercial && <>
      <section className="finance-grid">
        <StatCard label="Oportunidades ativas" value={dadosComerciais.ativos} helper="Leads em andamento" tone="primary" />
        <StatCard label="Clientes fechados" value={dadosComerciais.clientesFechados} helper="Cadastros na etapa cliente" tone="positive" />
        <StatCard label="Propostas no mês" value={formatarMoeda(dadosComerciais.valorPropostas)} helper={`${comercial.propostasMes.length} proposta(s)`} tone="warning" />
        <StatCard label="Pendências comerciais" value={comercial.compromissosHoje.length + comercial.retornosAtrasados.length} helper="Hoje e atrasadas" tone="negative" />
      </section>

      {(comercial.compromissosHoje.length > 0 || comercial.retornosAtrasados.length > 0) && <section className="finance-two-columns">
        <article className="finance-panel">
          <h2>Compromissos de hoje</h2>
          {comercial.compromissosHoje.length ? comercial.compromissosHoje.map((item) => (
            <div className="finance-list-item" key={item.id}><div><strong>{item.client_name}</strong><span>{item.appointment_type} · {new Date(item.appointment_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</span></div><span className="finance-badge pendente">Hoje</span></div>
          )) : <div className="finance-empty">Nenhum compromisso hoje.</div>}
          <Link className="finance-button inline-button" to="/app/agenda">Abrir agenda</Link>
        </article>
        <article className="finance-panel">
          <h2>Retornos atrasados</h2>
          {comercial.retornosAtrasados.length ? comercial.retornosAtrasados.slice(0, 5).map((item) => (
            <div className="finance-list-item" key={item.id}><div><strong>{item.clients?.name || 'Cliente'}</strong><span>{item.description}</span></div><span className="finance-badge vencida">Atrasado</span></div>
          )) : <div className="finance-empty">Nenhum retorno atrasado.</div>}
          <Link className="finance-button inline-button" to="/app/agenda">Resolver pendências</Link>
        </article>
      </section>}
    </>}

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
        <article className="finance-panel"><h2>Segurança por perfil</h2><div className="dashboard-big-number">RBAC</div><p className="dashboard-note">O Dashboard consulta somente os módulos permitidos para o seu cargo.</p></article>
      )}
    </section>
  </FinanceLayout>;
}

export default ErpDashboardPage;
