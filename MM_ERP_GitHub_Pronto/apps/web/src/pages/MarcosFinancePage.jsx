import React, { useEffect, useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import FinanceTable from '../components/finance/FinanceTable.jsx';
import {
  carregarDados,
  salvarDados,
  gerarId,
  dataHoje,
  formatarMoeda,
  formatarData,
  exportarCSV,
} from '../components/finance/storage.js';

const CHAVE = 'mm-erp-marcos-v2';

function MarcosFinancePage() {
  const [movimentacoes, setMovimentacoes] = useState(() =>
    carregarDados(CHAVE, [])
  );

  const [form, setForm] = useState({
    descricao: '',
    tipo: 'saida',
    categoria: 'Supermercado',
    valor: '',
    data: dataHoje(),
    formaPagamento: 'PIX',
  });

  useEffect(() => salvarDados(CHAVE, movimentacoes), [movimentacoes]);

  const totais = useMemo(() => {
    const entradas = movimentacoes
      .filter((item) => item.tipo === 'entrada')
      .reduce((total, item) => total + Number(item.valor), 0);

    const saidas = movimentacoes
      .filter((item) => item.tipo === 'saida')
      .reduce((total, item) => total + Number(item.valor), 0);

    return {
      entradas,
      saidas,
      saldo: entradas - saidas,
    };
  }, [movimentacoes]);

  function atualizar(event) {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
  }

  function salvar(event) {
    event.preventDefault();

    if (!form.descricao.trim() || Number(form.valor) <= 0) {
      alert('Preencha a descrição e informe um valor válido.');
      return;
    }

    setMovimentacoes((atuais) => [
      {
        id: gerarId(),
        ...form,
        valor: Number(form.valor),
      },
      ...atuais,
    ]);

    setForm({
      descricao: '',
      tipo: 'saida',
      categoria: 'Supermercado',
      valor: '',
      data: dataHoje(),
      formaPagamento: 'PIX',
    });
  }

  function excluir(id) {
    if (!window.confirm('Deseja excluir este lançamento pessoal?')) return;
    setMovimentacoes((atuais) => atuais.filter((item) => item.id !== id));
  }

  const colunas = [
    { key: 'data', label: 'Data', render: (item) => formatarData(item.data) },
    { key: 'descricao', label: 'Descrição', render: (item) => item.descricao },
    { key: 'categoria', label: 'Categoria', render: (item) => item.categoria },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (item) => (
        <span className={`finance-badge ${item.tipo}`}>
          {item.tipo === 'entrada' ? 'Entrada' : 'Despesa'}
        </span>
      ),
    },
    { key: 'pagamento', label: 'Pagamento', render: (item) => item.formaPagamento },
    { key: 'valor', label: 'Valor', render: (item) => formatarMoeda(item.valor) },
    {
      key: 'acoes',
      label: 'Ações',
      render: (item) => (
        <button className="finance-delete" onClick={() => excluir(item.id)}>
          Excluir
        </button>
      ),
    },
  ];

  return (
    <FinanceLayout
      title="Financeiro do Marcos"
      subtitle="Controle pessoal separado da MM Energia Solar."
      theme="marcos"
    >
      <section className="finance-grid">
        <StatCard label="Saldo pessoal" value={formatarMoeda(totais.saldo)} helper="Entradas menos despesas" tone="primary" />
        <StatCard label="Entradas" value={formatarMoeda(totais.entradas)} helper="Valores recebidos" tone="positive" />
        <StatCard label="Despesas" value={formatarMoeda(totais.saidas)} helper="Valores gastos" tone="negative" />
        <StatCard label="Lançamentos" value={movimentacoes.length} helper="Registros pessoais" tone="warning" />
      </section>

      <section className="finance-panel">
        <h2>Novo lançamento pessoal</h2>

        <form className="finance-form" onSubmit={salvar}>
          <label className="finance-field finance-field-wide">
            <span>Descrição</span>
            <input name="descricao" value={form.descricao} onChange={atualizar} placeholder="Ex.: Supermercado, combustível ou salário" />
          </label>

          <label className="finance-field">
            <span>Tipo</span>
            <select name="tipo" value={form.tipo} onChange={atualizar}>
              <option value="entrada">Entrada</option>
              <option value="saida">Despesa</option>
            </select>
          </label>

          <label className="finance-field">
            <span>Categoria</span>
            <select name="categoria" value={form.categoria} onChange={atualizar}>
              <option>Supermercado</option>
              <option>Moradia</option>
              <option>Combustível</option>
              <option>Veículo</option>
              <option>Saúde</option>
              <option>Lazer</option>
              <option>Restaurante</option>
              <option>Cartão de crédito</option>
              <option>Empréstimo</option>
              <option>Salário</option>
              <option>Retirada da empresa</option>
              <option>Outros</option>
            </select>
          </label>

          <label className="finance-field">
            <span>Valor</span>
            <input type="number" min="0" step="0.01" name="valor" value={form.valor} onChange={atualizar} placeholder="0,00" />
          </label>

          <label className="finance-field">
            <span>Data</span>
            <input type="date" name="data" value={form.data} onChange={atualizar} />
          </label>

          <label className="finance-field">
            <span>Forma de pagamento</span>
            <select name="formaPagamento" value={form.formaPagamento} onChange={atualizar}>
              <option>PIX</option>
              <option>Dinheiro</option>
              <option>Cartão de crédito</option>
              <option>Cartão de débito</option>
              <option>Transferência</option>
              <option>Boleto</option>
            </select>
          </label>

          <div className="finance-actions finance-field-wide">
            <button className="finance-button" type="submit">Salvar lançamento</button>
          </div>
        </form>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <h2>Movimentações pessoais</h2>

          <button
            className="finance-secondary-button"
            onClick={() =>
              exportarCSV(
                'financeiro-marcos.csv',
                movimentacoes.map((item) => ({
                  Data: formatarData(item.data),
                  Descrição: item.descricao,
                  Categoria: item.categoria,
                  Tipo: item.tipo,
                  Pagamento: item.formaPagamento,
                  Valor: item.valor,
                }))
              )
            }
          >
            Exportar CSV
          </button>
        </div>

        <FinanceTable columns={colunas} rows={movimentacoes} emptyText="Nenhuma movimentação pessoal cadastrada." />
      </section>
    </FinanceLayout>
  );
}

export default MarcosFinancePage;
