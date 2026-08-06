import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';
import FinanceTable from '../components/finance/FinanceTable.jsx';
import { dataHoje, formatarMoeda, formatarData, exportarCSV } from '../components/finance/storage.js';
import { financeDatabase } from '../services/financeDatabaseService.js';

const ESCOPO = 'personal-marcos';
const FORM_INICIAL = {
  descricao: '', tipo: 'saida', categoria: 'Supermercado', valor: '', data: dataHoje(), formaPagamento: 'PIX',
};

const CONTAS_MAIRA = [
  { descricao: 'Ótica', parcela: '1/3', valor: 66.68 },
  { descricao: 'Lavacar', parcela: '', valor: 100.00 },
  { descricao: 'Mecânica Robson', parcela: '2x', valor: 165.00 },
  { descricao: 'Azul', parcela: '3/10', valor: 56.99 },
  { descricao: 'Mercado Livre', parcela: '4/5', valor: 55.80 },
  { descricao: 'Curso', parcela: '6/10', valor: 89.70 },
  { descricao: 'Mercado Livre', parcela: '10/12', valor: 100.00 },
  { descricao: 'Pintura', parcela: '', valor: 67.13 },
  { descricao: 'Sala', parcela: '1/3', valor: 131.67 },
];

function mapear(row) {
  return {
    id: row.id,
    descricao: row.description,
    tipo: row.transaction_type,
    categoria: row.category,
    valor: Number(row.amount || 0),
    data: row.transaction_date,
    formaPagamento: row.payment_method,
  };
}

function MarcosFinancePage() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [mairaAberta, setMairaAberta] = useState(false);

  async function carregar() {
    try {
      setErro('');
      setCarregando(true);
      const dados = await financeDatabase.listTransactions(ESCOPO);
      setMovimentacoes(dados.map(mapear));
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const totais = useMemo(() => {
    const entradas = movimentacoes.filter((item) => item.tipo === 'entrada').reduce((total, item) => total + Number(item.valor), 0);
    const saidas = movimentacoes.filter((item) => item.tipo === 'saida').reduce((total, item) => total + Number(item.valor), 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [movimentacoes]);

  const totalMaira = useMemo(() => CONTAS_MAIRA.reduce((total, item) => total + item.valor, 0), []);

  function atualizar(event) {
    const { name, value } = event.target;
    setForm((atual) => ({ ...atual, [name]: value }));
  }

  async function salvar(event) {
    event.preventDefault();
    if (!form.descricao.trim() || Number(form.valor) <= 0) {
      alert('Preencha a descrição e informe um valor válido.');
      return;
    }
    try {
      await financeDatabase.saveTransaction({
        ...form,
        externalId: `marcos-${crypto.randomUUID()}`,
        valor: Number(form.valor),
        escopo: ESCOPO,
        origem: 'Financeiro pessoal',
      });
      setForm(FORM_INICIAL);
      await carregar();
    } catch (error) {
      setErro(error.message);
    }
  }

  async function excluir(id) {
    if (!window.confirm('Deseja excluir este lançamento pessoal?')) return;
    try {
      await financeDatabase.deleteTransaction(id);
      await carregar();
    } catch (error) {
      setErro(error.message);
    }
  }

  const colunas = [
    { key: 'data', label: 'Data', render: (item) => formatarData(item.data) },
    { key: 'descricao', label: 'Descrição', render: (item) => item.descricao },
    { key: 'categoria', label: 'Categoria', render: (item) => item.categoria },
    { key: 'tipo', label: 'Tipo', render: (item) => <span className={`finance-badge ${item.tipo}`}>{item.tipo === 'entrada' ? 'Entrada' : 'Despesa'}</span> },
    { key: 'pagamento', label: 'Pagamento', render: (item) => item.formaPagamento },
    { key: 'valor', label: 'Valor', render: (item) => formatarMoeda(item.valor) },
    { key: 'acoes', label: 'Ações', render: (item) => <button className="finance-delete" onClick={() => excluir(item.id)}>Excluir</button> },
  ];

  return (
    <FinanceLayout title="Financeiro do Marcos" subtitle="Controle pessoal separado da empresa e salvo no Supabase." theme="marcos">
      {erro ? <p className="crm-message">{erro}</p> : null}
      <section className="finance-grid">
        <StatCard label="Saldo pessoal" value={formatarMoeda(totais.saldo)} helper="Entradas menos despesas" tone="primary" />
        <StatCard label="Entradas" value={formatarMoeda(totais.entradas)} helper="Valores recebidos" tone="positive" />
        <StatCard label="Despesas" value={formatarMoeda(totais.saidas)} helper="Valores gastos" tone="negative" />
        <StatCard label="Lançamentos" value={carregando ? '...' : movimentacoes.length} helper="Registros pessoais" tone="warning" />
      </section>

      <section className="finance-panel">
        <button
          type="button"
          onClick={() => setMairaAberta((aberta) => !aberta)}
          aria-expanded={mairaAberta}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: 0, background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Maira</h2>
            <span style={{ display: 'block', marginTop: 4, color: '#64748b' }}>Contas parceladas — total {formatarMoeda(totalMaira)}</span>
          </div>
          {mairaAberta ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
        </button>

        {mairaAberta && (
          <div style={{ marginTop: 16, overflowX: 'auto' }}>
            <table className="finance-table" style={{ width: '100%' }}>
              <thead><tr><th>Conta</th><th>Parcela</th><th style={{ textAlign: 'right' }}>Valor</th></tr></thead>
              <tbody>
                {CONTAS_MAIRA.map((item, index) => (
                  <tr key={`${item.descricao}-${index}`}>
                    <td>{item.descricao}</td>
                    <td>{item.parcela || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatarMoeda(item.valor)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan="2" style={{ fontWeight: 800 }}>Total das contas da Maira</td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatarMoeda(totalMaira)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="finance-panel">
        <h2>Novo lançamento pessoal</h2>
        <form className="finance-form" onSubmit={salvar}>
          <label className="finance-field finance-field-wide"><span>Descrição</span><input name="descricao" value={form.descricao} onChange={atualizar} placeholder="Ex.: Supermercado, combustível ou salário" /></label>
          <label className="finance-field"><span>Tipo</span><select name="tipo" value={form.tipo} onChange={atualizar}><option value="entrada">Entrada</option><option value="saida">Despesa</option></select></label>
          <label className="finance-field"><span>Categoria</span><select name="categoria" value={form.categoria} onChange={atualizar}>{['Supermercado','Moradia','Combustível','Veículo','Saúde','Lazer','Restaurante','Cartão de crédito','Empréstimo','Salário','Retirada da empresa','Outros'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="finance-field"><span>Valor</span><input type="number" min="0" step="0.01" name="valor" value={form.valor} onChange={atualizar} placeholder="0,00" /></label>
          <label className="finance-field"><span>Data</span><input type="date" name="data" value={form.data} onChange={atualizar} /></label>
          <label className="finance-field"><span>Forma de pagamento</span><select name="formaPagamento" value={form.formaPagamento} onChange={atualizar}>{['PIX','Dinheiro','Cartão de crédito','Cartão de débito','Transferência','Boleto'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <div className="finance-actions finance-field-wide"><button className="finance-button" type="submit">Salvar no Supabase</button></div>
        </form>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <h2>Movimentações pessoais</h2>
          <button className="finance-secondary-button" onClick={() => exportarCSV('financeiro-marcos.csv', movimentacoes.map((item) => ({ Data: formatarData(item.data), Descrição: item.descricao, Categoria: item.categoria, Tipo: item.tipo, Pagamento: item.formaPagamento, Valor: item.valor })))}>Exportar CSV</button>
        </div>
        <FinanceTable columns={colunas} rows={movimentacoes} emptyText={carregando ? 'Carregando movimentações...' : 'Nenhuma movimentação pessoal cadastrada.'} />
      </section>
    </FinanceLayout>
  );
}

export default MarcosFinancePage;
