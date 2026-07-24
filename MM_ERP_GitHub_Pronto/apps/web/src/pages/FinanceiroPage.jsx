import React, { useEffect, useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import FinanceTable from '../components/finance/FinanceTable.jsx';
import { dataHoje, formatarData, formatarMoeda } from '../components/finance/storage.js';
import { financeDatabase } from '../services/financeDatabaseService.js';

const vazio = { descricao: '', tipo: 'entrada', categoria: 'Outros', valor: '', data: dataHoje(), formaPagamento: 'PIX' };

function mapTransaction(x) {
  return { id: x.id, descricao: x.description, tipo: x.transaction_type, categoria: x.category, valor: Number(x.amount), data: x.transaction_date, formaPagamento: x.payment_method };
}
function mapPayable(x) {
  return { id: x.id, descricao: x.description, fornecedor: x.supplier, categoria: x.category, valor: Number(x.amount), vencimento: x.due_date, status: x.status };
}
function mapReceivable(x) {
  return { id: x.id, descricao: x.description, cliente: x.client_name, categoria: x.category, valor: Number(x.amount), vencimento: x.due_date, status: x.status };
}

export default function FinanceiroPage() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      setErro('');
      const [m, p, r] = await Promise.all([
        financeDatabase.listTransactions(), financeDatabase.listPayables(), financeDatabase.listReceivables(),
      ]);
      setMovimentacoes(m.map(mapTransaction));
      setContasPagar(p.map(mapPayable));
      setContasReceber(r.map(mapReceivable));
    } catch (error) {
      setErro(error.message);
    }
  }
  useEffect(() => { carregar(); }, []);

  const totais = useMemo(() => {
    const entradas = movimentacoes.filter((x) => x.tipo === 'entrada').reduce((s, x) => s + x.valor, 0);
    const saidas = movimentacoes.filter((x) => x.tipo === 'saida').reduce((s, x) => s + x.valor, 0);
    const pagar = contasPagar.filter((x) => x.status === 'pendente').reduce((s, x) => s + x.valor, 0);
    const receber = contasReceber.filter((x) => x.status === 'pendente').reduce((s, x) => s + x.valor, 0);
    return { entradas, saidas, pagar, receber, saldo: entradas - saidas };
  }, [movimentacoes, contasPagar, contasReceber]);

  async function salvar(event) {
    event.preventDefault();
    if (!form.descricao.trim() || Number(form.valor) <= 0) return;
    await financeDatabase.saveTransaction({ ...form, valor: Number(form.valor), origem: 'Cadastro manual' });
    setForm(vazio);
    await carregar();
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este lançamento?')) return;
    await financeDatabase.deleteTransaction(id);
    await carregar();
  }

  const colMov = [
    { key: 'data', label: 'Data', render: (x) => formatarData(x.data) },
    { key: 'descricao', label: 'Descrição' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'valor', label: 'Valor', render: (x) => formatarMoeda(x.valor) },
    { key: 'acao', label: 'Ação', render: (x) => <button className="finance-delete" onClick={() => excluir(x.id)}>Excluir</button> },
  ];
  const colConta = (pessoa) => [
    { key: 'vencimento', label: 'Vencimento', render: (x) => formatarData(x.vencimento) },
    { key: 'descricao', label: 'Descrição' },
    { key: pessoa, label: pessoa === 'fornecedor' ? 'Fornecedor' : 'Cliente' },
    { key: 'status', label: 'Status' },
    { key: 'valor', label: 'Valor', render: (x) => formatarMoeda(x.valor) },
  ];

  return (
    <FinanceLayout title="Financeiro" subtitle="Dados centralizados no Supabase em tempo real para todos os usuários.">
      {erro ? <p className="crm-message">{erro}</p> : null}
      <section className="finance-stats">
        <StatCard title="Entradas" value={formatarMoeda(totais.entradas)} />
        <StatCard title="Saídas" value={formatarMoeda(totais.saidas)} />
        <StatCard title="Saldo" value={formatarMoeda(totais.saldo)} />
        <StatCard title="A pagar" value={formatarMoeda(totais.pagar)} />
        <StatCard title="A receber" value={formatarMoeda(totais.receber)} />
      </section>
      <section className="finance-panel">
        <h2>Novo lançamento</h2>
        <form className="finance-form-grid" onSubmit={salvar}>
          <input name="descricao" value={form.descricao} placeholder="Descrição" onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option value="entrada">Entrada</option><option value="saida">Saída</option></select>
          <input type="number" step="0.01" value={form.valor} placeholder="Valor" onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          <button className="finance-button" type="submit">Salvar no Supabase</button>
        </form>
      </section>
      <section className="finance-panel"><h2>Fluxo de caixa</h2><FinanceTable columns={colMov} rows={movimentacoes} emptyText="Nenhum lançamento." /></section>
      <section className="finance-panel"><h2>Contas a pagar</h2><FinanceTable columns={colConta('fornecedor')} rows={contasPagar} emptyText="Nenhuma conta." /></section>
      <section className="finance-panel"><h2>Contas a receber</h2><FinanceTable columns={colConta('cliente')} rows={contasReceber} emptyText="Nenhuma conta." /></section>
    </FinanceLayout>
  );
}
