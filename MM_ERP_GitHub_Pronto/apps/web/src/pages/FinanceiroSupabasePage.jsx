import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import { financeDatabase } from '../services/financeDatabaseService.js';
import { dataHoje, formatarData, formatarMoeda, gerarId } from '../components/finance/storage.js';

const EMPTY_TRANSACTION = {
  descricao: '', tipo: 'entrada', categoria: 'Venda de sistema solar', valor: '',
  data: dataHoje(), formaPagamento: 'PIX',
};
const EMPTY_PAYABLE = {
  descricao: '', fornecedor: '', categoria: 'Fornecedor', valor: '', vencimento: dataHoje(),
};
const EMPTY_RECEIVABLE = {
  descricao: '', cliente: '', categoria: 'Venda de sistema solar', valor: '', vencimento: dataHoje(),
};

function mapTransaction(row) {
  return {
    id: row.id,
    externalId: row.external_id,
    descricao: row.description,
    tipo: row.transaction_type,
    categoria: row.category,
    valor: Number(row.amount || 0),
    data: row.transaction_date,
    formaPagamento: row.payment_method,
    origem: row.origin,
  };
}

function mapPayable(row) {
  return {
    id: row.id,
    externalId: row.external_id,
    descricao: row.description,
    fornecedor: row.supplier,
    categoria: row.category,
    valor: Number(row.amount || 0),
    vencimento: row.due_date,
    dataPagamento: row.paid_date,
    status: row.status,
    origem: row.origin,
  };
}

function mapReceivable(row) {
  return {
    id: row.id,
    externalId: row.external_id,
    descricao: row.description,
    cliente: row.client_name,
    categoria: row.category,
    valor: Number(row.amount || 0),
    vencimento: row.due_date,
    dataRecebimento: row.received_date,
    status: row.status,
    formaPagamento: row.payment_method,
    origem: row.origin,
  };
}

function FinanceiroSupabasePage() {
  const [secao, setSecao] = useState('dashboard');
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [formMovimento, setFormMovimento] = useState(EMPTY_TRANSACTION);
  const [formPagar, setFormPagar] = useState(EMPTY_PAYABLE);
  const [formReceber, setFormReceber] = useState(EMPTY_RECEIVABLE);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [transactions, payables, receivables] = await Promise.all([
        financeDatabase.listTransactions(),
        financeDatabase.listPayables(),
        financeDatabase.listReceivables(),
      ]);
      setMovimentacoes(transactions.map(mapTransaction));
      setContasPagar(payables.map(mapPayable));
      setContasReceber(receivables.map(mapReceivable));
      setMensagem('');
    } catch (error) {
      setMensagem(`Não foi possível carregar o financeiro: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const totais = useMemo(() => {
    const entradas = movimentacoes.filter((x) => x.tipo === 'entrada').reduce((s, x) => s + x.valor, 0);
    const saidas = movimentacoes.filter((x) => x.tipo === 'saida').reduce((s, x) => s + x.valor, 0);
    const pagar = contasPagar.filter((x) => x.status === 'pendente').reduce((s, x) => s + x.valor, 0);
    const receber = contasReceber.filter((x) => x.status === 'pendente').reduce((s, x) => s + x.valor, 0);
    return { entradas, saidas, pagar, receber, saldo: entradas - saidas, projetado: entradas - saidas + receber - pagar };
  }, [movimentacoes, contasPagar, contasReceber]);

  const atualizar = (setter) => (event) => {
    const { name, value } = event.target;
    setter((atual) => ({ ...atual, [name]: value }));
  };

  async function executar(acao, sucesso) {
    setSalvando(true);
    setMensagem('Salvando no banco de dados...');
    try {
      await acao();
      await carregar();
      setMensagem(sucesso);
      return true;
    } catch (error) {
      setMensagem(`Erro: ${error.message}`);
      return false;
    } finally {
      setSalvando(false);
    }
  }

  function validar(descricao, valor) {
    if (!descricao.trim() || Number(valor) <= 0) {
      setMensagem('Preencha a descrição e informe um valor válido.');
      return false;
    }
    return true;
  }

  async function salvarMovimento(event) {
    event.preventDefault();
    if (!validar(formMovimento.descricao, formMovimento.valor)) return;
    const ok = await executar(
      () => financeDatabase.saveTransaction({ ...formMovimento, externalId: gerarId(), valor: Number(formMovimento.valor), origem: 'Cadastro manual' }),
      'Lançamento salvo no Supabase.'
    );
    if (ok) setFormMovimento(EMPTY_TRANSACTION);
  }

  async function salvarContaPagar(event) {
    event.preventDefault();
    if (!validar(formPagar.descricao, formPagar.valor)) return;
    const ok = await executar(
      () => financeDatabase.savePayable({ ...formPagar, externalId: gerarId(), valor: Number(formPagar.valor), status: 'pendente', origem: 'Cadastro manual' }),
      'Conta a pagar salva no Supabase.'
    );
    if (ok) setFormPagar(EMPTY_PAYABLE);
  }

  async function salvarContaReceber(event) {
    event.preventDefault();
    if (!validar(formReceber.descricao, formReceber.valor)) return;
    const ok = await executar(
      () => financeDatabase.saveReceivable({ ...formReceber, externalId: gerarId(), valor: Number(formReceber.valor), status: 'pendente', origem: 'Cadastro manual' }),
      'Conta a receber salva no Supabase.'
    );
    if (ok) setFormReceber(EMPTY_RECEIVABLE);
  }

  async function excluir(tipo, id) {
    if (!window.confirm('Deseja excluir este registro do banco de dados?')) return;
    const actions = {
      movimento: () => financeDatabase.deleteTransaction(id),
      pagar: () => financeDatabase.deletePayable(id),
      receber: () => financeDatabase.deleteReceivable(id),
    };
    await executar(actions[tipo], 'Registro excluído do Supabase.');
  }

  async function pagar(conta) {
    if (!window.confirm(`Confirmar pagamento de ${formatarMoeda(conta.valor)}?`)) return;
    await executar(async () => {
      await financeDatabase.savePayable({ ...conta, externalId: conta.externalId, status: 'paga', dataPagamento: dataHoje() });
      await financeDatabase.saveTransaction({
        externalId: `pagamento-${conta.externalId || conta.id}`,
        descricao: conta.descricao,
        tipo: 'saida', categoria: conta.categoria, valor: conta.valor,
        data: dataHoje(), formaPagamento: 'Pagamento de conta', origem: 'Baixa de conta a pagar',
      });
    }, 'Pagamento registrado no Supabase.');
  }

  async function receber(conta) {
    if (!window.confirm(`Confirmar recebimento de ${formatarMoeda(conta.valor)}?`)) return;
    await executar(async () => {
      await financeDatabase.saveReceivable({ ...conta, externalId: conta.externalId, status: 'recebida', dataRecebimento: dataHoje() });
      await financeDatabase.saveTransaction({
        externalId: `recebimento-${conta.externalId || conta.id}`,
        descricao: conta.descricao,
        tipo: 'entrada', categoria: conta.categoria, valor: conta.valor,
        data: dataHoje(), formaPagamento: 'Recebimento', origem: 'Baixa de conta a receber',
      });
    }, 'Recebimento registrado no Supabase.');
  }

  const menu = [
    ['dashboard', 'Visão geral'], ['movimentos', 'Movimentações'], ['pagar', 'Contas a pagar'], ['receber', 'Contas a receber'],
  ];

  return (
    <FinanceLayout title="Financeiro" subtitle="Dados centralizados no Supabase, disponíveis no celular e no computador.">
      <div className="finance-tabs">
        {menu.map(([id, label]) => <button key={id} className={secao === id ? 'active' : ''} onClick={() => setSecao(id)}>{label}</button>)}
      </div>
      {mensagem && <p className="finance-notice">{mensagem}</p>}
      {carregando ? <div className="finance-empty">Carregando dados do banco...</div> : null}

      {!carregando && secao === 'dashboard' && <>
        <section className="finance-grid">
          <StatCard label="Saldo atual" value={formatarMoeda(totais.saldo)} helper="Entradas menos saídas" tone="primary" />
          <StatCard label="A receber" value={formatarMoeda(totais.receber)} helper="Receitas pendentes" tone="positive" />
          <StatCard label="A pagar" value={formatarMoeda(totais.pagar)} helper="Despesas pendentes" tone="negative" />
          <StatCard label="Saldo projetado" value={formatarMoeda(totais.projetado)} helper="Inclui valores futuros" tone="warning" />
        </section>
      </>}

      {!carregando && secao === 'movimentos' && <section className="finance-two-columns">
        <form className="finance-panel finance-form" onSubmit={salvarMovimento}>
          <h2>Novo lançamento</h2>
          <label>Descrição<input name="descricao" value={formMovimento.descricao} onChange={atualizar(setFormMovimento)} required /></label>
          <label>Tipo<select name="tipo" value={formMovimento.tipo} onChange={atualizar(setFormMovimento)}><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label>
          <label>Categoria<input name="categoria" value={formMovimento.categoria} onChange={atualizar(setFormMovimento)} /></label>
          <label>Valor<input name="valor" type="number" min="0.01" step="0.01" value={formMovimento.valor} onChange={atualizar(setFormMovimento)} required /></label>
          <label>Data<input name="data" type="date" value={formMovimento.data} onChange={atualizar(setFormMovimento)} required /></label>
          <label>Forma de pagamento<input name="formaPagamento" value={formMovimento.formaPagamento} onChange={atualizar(setFormMovimento)} /></label>
          <button className="finance-primary-button" disabled={salvando}>Salvar no banco</button>
        </form>
        <div className="finance-panel"><h2>Movimentações</h2>{movimentacoes.map((x) => <div className="finance-list-item" key={x.id}><div><strong>{x.descricao}</strong><span>{formatarData(x.data)} • {x.categoria}</span></div><strong>{formatarMoeda(x.valor)}</strong><button className="finance-delete" onClick={() => excluir('movimento', x.id)}>Excluir</button></div>)}</div>
      </section>}

      {!carregando && secao === 'pagar' && <section className="finance-two-columns">
        <form className="finance-panel finance-form" onSubmit={salvarContaPagar}>
          <h2>Nova conta a pagar</h2>
          <label>Descrição<input name="descricao" value={formPagar.descricao} onChange={atualizar(setFormPagar)} required /></label>
          <label>Fornecedor<input name="fornecedor" value={formPagar.fornecedor} onChange={atualizar(setFormPagar)} /></label>
          <label>Categoria<input name="categoria" value={formPagar.categoria} onChange={atualizar(setFormPagar)} /></label>
          <label>Valor<input name="valor" type="number" min="0.01" step="0.01" value={formPagar.valor} onChange={atualizar(setFormPagar)} required /></label>
          <label>Vencimento<input name="vencimento" type="date" value={formPagar.vencimento} onChange={atualizar(setFormPagar)} required /></label>
          <button className="finance-primary-button" disabled={salvando}>Salvar no banco</button>
        </form>
        <div className="finance-panel"><h2>Contas a pagar</h2>{contasPagar.map((x) => <div className="finance-list-item" key={x.id}><div><strong>{x.descricao}</strong><span>{formatarData(x.vencimento)} • {x.status}</span></div><strong>{formatarMoeda(x.valor)}</strong>{x.status === 'pendente' && <button className="finance-secondary-button" onClick={() => pagar(x)}>Pagar</button>}<button className="finance-delete" onClick={() => excluir('pagar', x.id)}>Excluir</button></div>)}</div>
      </section>}

      {!carregando && secao === 'receber' && <section className="finance-two-columns">
        <form className="finance-panel finance-form" onSubmit={salvarContaReceber}>
          <h2>Nova conta a receber</h2>
          <label>Descrição<input name="descricao" value={formReceber.descricao} onChange={atualizar(setFormReceber)} required /></label>
          <label>Cliente<input name="cliente" value={formReceber.cliente} onChange={atualizar(setFormReceber)} /></label>
          <label>Categoria<input name="categoria" value={formReceber.categoria} onChange={atualizar(setFormReceber)} /></label>
          <label>Valor<input name="valor" type="number" min="0.01" step="0.01" value={formReceber.valor} onChange={atualizar(setFormReceber)} required /></label>
          <label>Vencimento<input name="vencimento" type="date" value={formReceber.vencimento} onChange={atualizar(setFormReceber)} required /></label>
          <button className="finance-primary-button" disabled={salvando}>Salvar no banco</button>
        </form>
        <div className="finance-panel"><h2>Contas a receber</h2>{contasReceber.map((x) => <div className="finance-list-item" key={x.id}><div><strong>{x.descricao}</strong><span>{formatarData(x.vencimento)} • {x.status}</span></div><strong>{formatarMoeda(x.valor)}</strong>{x.status === 'pendente' && <button className="finance-secondary-button" onClick={() => receber(x)}>Receber</button>}<button className="finance-delete" onClick={() => excluir('receber', x.id)}>Excluir</button></div>)}</div>
      </section>}
    </FinanceLayout>
  );
}

export default FinanceiroSupabasePage;
