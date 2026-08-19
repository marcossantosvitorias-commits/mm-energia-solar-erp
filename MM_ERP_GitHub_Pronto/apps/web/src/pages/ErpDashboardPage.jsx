import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { carregarDados, formatarMoeda } from '../components/finance/storage.js';
import { listClients } from '../services/clientService.js';

function sameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function ErpDashboardPage() {
  const [reminders, setReminders] = useState([]);

  const dados = useMemo(() => {
    const movimentos = carregarDados('mm-erp-movimentacoes-v2', []);
    const pagar = carregarDados('mm-erp-contas-pagar-v2', []);
    const receber = carregarDados('mm-erp-contas-receber-v2', []);
    const equipamentos = carregarDados('mm-erp-equipamentos-v1', []);
    const entradas = movimentos.filter(i => i.tipo === 'entrada').reduce((s, i) => s + Number(i.valor || 0), 0);
    const saidas = movimentos.filter(i => i.tipo === 'saida').reduce((s, i) => s + Number(i.valor || 0), 0);
    const aPagar = pagar.filter(i => i.status === 'pendente').reduce((s, i) => s + Number(i.valor || 0), 0);
    const aReceber = receber.filter(i => i.status === 'pendente').reduce((s, i) => s + Number(i.valor || 0), 0);
    const hoje = new Date().toISOString().slice(0, 10);
    const vencendoHoje = pagar.filter(i => i.status === 'pendente' && String(i.vencimento).slice(0, 10) === hoje);
    const totalVencendoHoje = vencendoHoje.reduce((s, i) => s + Number(i.valor || 0), 0);
    return { vencendoHoje, totalVencendoHoje, saldo: entradas - saidas, aPagar, aReceber, projetado: entradas - saidas + aReceber - aPagar, equipamentos: equipamentos.length };
  }, []);

  useEffect(() => {
    let active = true;
    const loadReminders = async () => {
      try {
        const clients = await listClients();
        if (!active) return;
        const pending = clients
          .filter((client) => client.nextContactAt && !client.reminderDone)
          .sort((a, b) => new Date(a.nextContactAt) - new Date(b.nextContactAt));
        setReminders(pending);
      } catch (error) {
        console.warn('Não foi possível carregar os retornos comerciais:', error);
      }
    };
    loadReminders();
    const onChanged = () => loadReminders();
    window.addEventListener('mm-erp-reminders-changed', onChanged);
    return () => {
      active = false;
      window.removeEventListener('mm-erp-reminders-changed', onChanged);
    };
  }, []);

  const now = new Date();
  const overdue = reminders.filter((item) => new Date(item.nextContactAt) < now && !sameLocalDay(new Date(item.nextContactAt), now));
  const today = reminders.filter((item) => sameLocalDay(new Date(item.nextContactAt), now));
  const priorityReminders = [...overdue, ...today].slice(0, 5);

  const atalhos = [
    ['/app', 'Abrir financeiro', 'Lançar entradas, despesas e vencimentos.'],
    ['/app/precos', 'Calcular preço de kit', 'Formar preço para 4, 6, 8 placas ou outra quantidade.'],
    ['/app/clientes', 'Clientes e retornos', 'Cadastrar leads e programar o próximo contato.'],
    ['/app/equipamentos', 'Cadastrar equipamentos', 'Salvar placas, inversores e custos de referência.'],
    ['/app/tributos', 'Simular tributação', 'Comparar modelo atual com IBS, CBS e split payment.'],
  ];

  return <FinanceLayout title="Dashboard do MM ERP" subtitle="Visão rápida da empresa e acesso aos principais cálculos.">
    {(overdue.length > 0 || today.length > 0) && (
      <section className="finance-panel tax-warning">
        <h2>Retornos de clientes</h2>
        <p>
          Você tem <strong>{today.length} retorno(s) para hoje</strong>
          {overdue.length > 0 ? <> e <strong>{overdue.length} atrasado(s)</strong></> : null}.
        </p>
        {priorityReminders.map((client) => (
          <div className="finance-list-item" key={`${client.id}-${client.nextContactAt}`}>
            <div>
              <strong>{client.name}</strong>
              <span>{formatDateTime(client.nextContactAt)} • {client.reminderNote || 'Entrar em contato com o cliente'}</span>
            </div>
            <span className={`finance-badge ${new Date(client.nextContactAt) < now ? 'pendente' : 'recebida'}`}>
              {new Date(client.nextContactAt) < now ? 'Pendente' : 'Hoje'}
            </span>
          </div>
        ))}
        <Link className="finance-button inline-button" to="/app/clientes">Ver clientes e retornos</Link>
      </section>
    )}

    {dados.vencendoHoje.length > 0 && (
      <section className="finance-panel tax-warning">
        <h2>Boletos vencendo hoje</h2>
        <p>
          Você tem <strong>{dados.vencendoHoje.length} boleto(s)</strong> vencendo hoje,
          no total de <strong>{formatarMoeda(dados.totalVencendoHoje)}</strong>.
        </p>
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
      <article className="finance-panel"><h2>Estrutura da versão 1.0</h2>
        {['Financeiro empresarial e pessoal', 'Formação de preço dos kits', 'Cadastro de equipamentos', 'Simulador tributário e split payment'].map(i => <div className="finance-list-item" key={i}><div><strong>{i}</strong><span>Módulo disponível</span></div><span className="finance-badge paga">Ativo</span></div>)}
      </article>
      <article className="finance-panel"><h2>Base cadastrada</h2><div className="dashboard-big-number">{dados.equipamentos}</div><p className="dashboard-note">equipamentos salvos no catálogo. Cadastre placas, inversores, microinversores e estruturas para consultar custos rapidamente.</p><Link className="finance-button inline-button" to="/app/equipamentos">Gerenciar equipamentos</Link></article>
    </section>
  </FinanceLayout>;
}
export default ErpDashboardPage;
