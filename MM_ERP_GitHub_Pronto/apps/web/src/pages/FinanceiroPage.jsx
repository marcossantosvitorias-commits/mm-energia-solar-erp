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
import {
  importarOFX,
  importarContasCSV,
  mesclarSemDuplicar,
} from '../components/finance/importers.js';
import {
  movimentacoesSantanderJulho2026,
  contasPagarSantander2026,
} from '../components/finance/seedSantanderJul2026.js';

const CHAVE_MOVIMENTACOES = 'mm-erp-movimentacoes-v2';
const CHAVE_PAGAR = 'mm-erp-contas-pagar-v2';
const CHAVE_RECEBER = 'mm-erp-contas-receber-v2';
const CHAVE_CARGA_SANTANDER = 'mm-erp-carga-santander-julho-2026-v1';
const CHAVE_NOTIFICACAO_BOLETOS = 'mm-erp-notificacao-boletos';

function chaveMes(data) {
  return String(data || '').slice(0, 7) || 'sem-data';
}

function nomeMes(chave) {
  if (chave === 'sem-data') return 'Sem vencimento';
  const [ano, mes] = chave.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(ano, mes - 1, 1))
    .replace(/^./, (letra) => letra.toUpperCase());
}

function carregarComCargaInicial(chave, carga, tipo) {
  const atuais = carregarDados(chave, []);
  const chaveMigracao = `${CHAVE_CARGA_SANTANDER}-${tipo}`;

  try {
    if (localStorage.getItem(chaveMigracao)) return atuais;

    if (
      tipo === 'movimentacoes' &&
      atuais.some((item) => item.origem === 'OFX Santander')
    ) {
      localStorage.setItem(chaveMigracao, 'concluida');
      return atuais;
    }

    const resultado = mesclarSemDuplicar(atuais, carga).dados;
    localStorage.setItem(chaveMigracao, 'concluida');
    return resultado;
  } catch {
    return atuais;
  }
}

function FinanceiroPage() {
  const [secao, setSecao] = useState('dashboard');

  const [movimentacoes, setMovimentacoes] = useState(() =>
    carregarComCargaInicial(
      CHAVE_MOVIMENTACOES,
      movimentacoesSantanderJulho2026,
      'movimentacoes'
    )
  );

  const [contasPagar, setContasPagar] = useState(() =>
    carregarComCargaInicial(
      CHAVE_PAGAR,
      contasPagarSantander2026,
      'contas-pagar'
    )
  );

  const [contasReceber, setContasReceber] = useState(() =>
    carregarDados(CHAVE_RECEBER, [])
  );

  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [permissaoNotificacao, setPermissaoNotificacao] = useState(
    () => (typeof Notification !== 'undefined' ? Notification.permission : 'indisponivel')
  );
  const [mesSelecionadoPagar, setMesSelecionadoPagar] = useState(() => dataHoje().slice(0, 7));

  const [formMovimento, setFormMovimento] = useState({
    descricao: '',
    tipo: 'entrada',
    categoria: 'Venda de sistema solar',
    valor: '',
    data: dataHoje(),
    formaPagamento: 'PIX',
  });

  const [formPagar, setFormPagar] = useState({
    descricao: '',
    fornecedor: '',
    categoria: 'Fornecedor',
    valor: '',
    vencimento: dataHoje(),
  });

  const [formReceber, setFormReceber] = useState({
    descricao: '',
    cliente: '',
    categoria: 'Venda de sistema solar',
    valor: '',
    vencimento: dataHoje(),
  });

  useEffect(() => salvarDados(CHAVE_MOVIMENTACOES, movimentacoes), [movimentacoes]);
  useEffect(() => salvarDados(CHAVE_PAGAR, contasPagar), [contasPagar]);
  useEffect(() => salvarDados(CHAVE_RECEBER, contasReceber), [contasReceber]);

  const boletosVencendoHoje = useMemo(
    () => contasPagar.filter(
      (item) => item.status === 'pendente' && String(item.vencimento).slice(0, 10) === dataHoje()
    ),
    [contasPagar]
  );

  useEffect(() => {
    if (!boletosVencendoHoje.length || permissaoNotificacao !== 'granted') return;
    const chaveHoje = `${CHAVE_NOTIFICACAO_BOLETOS}-${dataHoje()}`;
    if (localStorage.getItem(chaveHoje)) return;

    const total = boletosVencendoHoje.reduce((soma, item) => soma + Number(item.valor || 0), 0);
    new Notification('Boletos vencendo hoje', {
      body: `${boletosVencendoHoje.length} boleto(s), total de ${formatarMoeda(total)}.`,
      icon: '/logo-mm.png',
    });
    localStorage.setItem(chaveHoje, 'enviada');
  }, [boletosVencendoHoje, permissaoNotificacao]);

  async function ativarNotificacoes() {
    if (typeof Notification === 'undefined') {
      alert('Este navegador não oferece notificações.');
      return;
    }
    const permissao = await Notification.requestPermission();
    setPermissaoNotificacao(permissao);
    if (permissao === 'granted') alert('Notificações de vencimento ativadas.');
  }

  const totais = useMemo(() => {
    const entradas = movimentacoes
      .filter((item) => item.tipo === 'entrada')
      .reduce((total, item) => total + Number(item.valor), 0);

    const saidas = movimentacoes
      .filter((item) => item.tipo === 'saida')
      .reduce((total, item) => total + Number(item.valor), 0);

    const pagar = contasPagar
      .filter((item) => item.status === 'pendente')
      .reduce((total, item) => total + Number(item.valor), 0);

    const receber = contasReceber
      .filter((item) => item.status === 'pendente')
      .reduce((total, item) => total + Number(item.valor), 0);

    return {
      entradas,
      saidas,
      pagar,
      receber,
      saldo: entradas - saidas,
      saldoProjetado: entradas - saidas + receber - pagar,
    };
  }, [movimentacoes, contasPagar, contasReceber]);

  const movimentosFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return movimentacoes;
    return movimentacoes.filter((item) => item.tipo === filtroTipo);
  }, [movimentacoes, filtroTipo]);

  const contasPagarPorMes = useMemo(() => {
    const ordenadas = [...contasPagar].sort(
      (a, b) => String(a.vencimento || '').localeCompare(String(b.vencimento || ''))
    );
    return ordenadas.reduce((grupos, item) => {
      const mes = chaveMes(item.vencimento);
      if (!grupos[mes]) grupos[mes] = [];
      grupos[mes].push(item);
      return grupos;
    }, {});
  }, [contasPagar]);

  const mesesComBoletos = useMemo(
    () => Object.keys(contasPagarPorMes).sort(),
    [contasPagarPorMes]
  );

  const boletosMesSelecionado = contasPagarPorMes[mesSelecionadoPagar] || [];

  const saldoProjetadoMes = useMemo(() => {
    const movimentosMes = movimentacoes.filter((item) => chaveMes(item.data) === mesSelecionadoPagar);
    const entradas = movimentosMes
      .filter((item) => item.tipo === 'entrada')
      .reduce((soma, item) => soma + Number(item.valor || 0), 0);
    const saidas = movimentosMes
      .filter((item) => item.tipo === 'saida')
      .reduce((soma, item) => soma + Number(item.valor || 0), 0);
    const pagar = contasPagar
      .filter((item) => item.status === 'pendente' && chaveMes(item.vencimento) === mesSelecionadoPagar)
      .reduce((soma, item) => soma + Number(item.valor || 0), 0);
    const receber = contasReceber
      .filter((item) => item.status === 'pendente' && chaveMes(item.vencimento) === mesSelecionadoPagar)
      .reduce((soma, item) => soma + Number(item.valor || 0), 0);
    return entradas - saidas + receber - pagar;
  }, [mesSelecionadoPagar, movimentacoes, contasPagar, contasReceber]);

  function atualizar(setter) {
    return (event) => {
      const { name, value } = event.target;
      setter((atual) => ({ ...atual, [name]: value }));
    };
  }

  function validar(descricao, valor) {
    if (!descricao.trim() || Number(valor) <= 0) {
      alert('Preencha a descrição e informe um valor válido.');
      return false;
    }

    return true;
  }

  async function importarExtrato(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;

    try {
      const conteudo = await arquivo.text();
      const { movimentacoes: importadas, ignorados } = importarOFX(conteudo);
      const resultado = mesclarSemDuplicar(movimentacoes, importadas);

      setMovimentacoes(resultado.dados);
      alert(
        `${resultado.adicionados} lançamentos importados. ` +
        `${resultado.duplicados} duplicados ignorados. ` +
        `${ignorados.length} transferências ContaMax desconsideradas.`
      );
    } catch (erro) {
      alert(`Não foi possível importar o OFX: ${erro.message}`);
    }
  }

  async function importarContas(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;

    try {
      const conteudo = await arquivo.text();
      const importadas = importarContasCSV(conteudo);
      const resultado = mesclarSemDuplicar(contasPagar, importadas);

      setContasPagar(resultado.dados);
      alert(
        `${resultado.adicionados} contas importadas. ` +
        `${resultado.duplicados} duplicadas ignoradas.`
      );
    } catch (erro) {
      alert(`Não foi possível importar as contas: ${erro.message}`);
    }
  }

  function salvarMovimento(event) {
    event.preventDefault();

    if (!validar(formMovimento.descricao, formMovimento.valor)) return;

    setMovimentacoes((atuais) => [
      {
        id: gerarId(),
        ...formMovimento,
        valor: Number(formMovimento.valor),
      },
      ...atuais,
    ]);

    setFormMovimento({
      descricao: '',
      tipo: 'entrada',
      categoria: 'Venda de sistema solar',
      valor: '',
      data: dataHoje(),
      formaPagamento: 'PIX',
    });
  }

  function salvarContaPagar(event) {
    event.preventDefault();

    if (!validar(formPagar.descricao, formPagar.valor)) return;

    setContasPagar((atuais) => [
      {
        id: gerarId(),
        ...formPagar,
        valor: Number(formPagar.valor),
        status: 'pendente',
      },
      ...atuais,
    ]);

    setFormPagar({
      descricao: '',
      fornecedor: '',
      categoria: 'Fornecedor',
      valor: '',
      vencimento: dataHoje(),
    });
  }

  function salvarContaReceber(event) {
    event.preventDefault();

    if (!validar(formReceber.descricao, formReceber.valor)) return;

    setContasReceber((atuais) => [
      {
        id: gerarId(),
        ...formReceber,
        valor: Number(formReceber.valor),
        status: 'pendente',
      },
      ...atuais,
    ]);

    setFormReceber({
      descricao: '',
      cliente: '',
      categoria: 'Venda de sistema solar',
      valor: '',
      vencimento: dataHoje(),
    });
  }

  function excluir(setter, id, mensagem) {
    if (!window.confirm(mensagem)) return;
    setter((atuais) => atuais.filter((item) => item.id !== id));
  }

  function pagarConta(conta) {
    if (!window.confirm(`Confirmar pagamento de ${formatarMoeda(conta.valor)}?`)) {
      return;
    }

    setContasPagar((atuais) =>
      atuais.map((item) =>
        item.id === conta.id ? { ...item, status: 'paga' } : item
      )
    );

    setMovimentacoes((atuais) => [
      {
        id: gerarId(),
        descricao: conta.descricao,
        tipo: 'saida',
        categoria: conta.categoria,
        valor: Number(conta.valor),
        data: dataHoje(),
        formaPagamento: 'Pagamento de conta',
      },
      ...atuais,
    ]);
  }

  function receberConta(conta) {
    if (!window.confirm(`Confirmar recebimento de ${formatarMoeda(conta.valor)}?`)) {
      return;
    }

    setContasReceber((atuais) =>
      atuais.map((item) =>
        item.id === conta.id ? { ...item, status: 'recebida' } : item
      )
    );

    setMovimentacoes((atuais) => [
      {
        id: gerarId(),
        descricao: conta.descricao,
        tipo: 'entrada',
        categoria: conta.categoria,
        valor: Number(conta.valor),
        data: dataHoje(),
        formaPagamento: 'Recebimento',
      },
      ...atuais,
    ]);
  }

  function Dashboard() {
    const proximasPagar = contasPagar
      .filter((item) => item.status === 'pendente')
      .slice(0, 5);

    const proximasReceber = contasReceber
      .filter((item) => item.status === 'pendente')
      .slice(0, 5);

    return (
      <>
        <section className="finance-grid">
          <StatCard label="Saldo atual" value={formatarMoeda(totais.saldo)} helper="Entradas menos saídas" tone="primary" />
          <StatCard label="A receber" value={formatarMoeda(totais.receber)} helper="Receitas pendentes" tone="positive" />
          <StatCard label="A pagar" value={formatarMoeda(totais.pagar)} helper="Despesas pendentes" tone="negative" />
          <StatCard label="Saldo projetado" value={formatarMoeda(totais.saldoProjetado)} helper="Inclui valores futuros" tone="warning" />
        </section>

        <section className="finance-two-columns">
          <article className="finance-panel">
            <div className="finance-panel-header">
              <h2>Próximas contas a pagar</h2>
              <button className="finance-secondary-button" onClick={() => setSecao('pagar')}>
                Ver todas
              </button>
            </div>

            {proximasPagar.length === 0 ? (
              <div className="finance-empty">Nenhuma conta pendente.</div>
            ) : (
              proximasPagar.map((item) => (
                <div className="finance-list-item" key={item.id}>
                  <div>
                    <strong>{item.descricao}</strong>
                    <span>{item.fornecedor || 'Sem fornecedor'} • {formatarData(item.vencimento)}</span>
                  </div>
                  <strong>{formatarMoeda(item.valor)}</strong>
                </div>
              ))
            )}
          </article>

          <article className="finance-panel">
            <div className="finance-panel-header">
              <h2>Próximas contas a receber</h2>
              <button className="finance-secondary-button" onClick={() => setSecao('receber')}>
                Ver todas
              </button>
            </div>

            {proximasReceber.length === 0 ? (
              <div className="finance-empty">Nenhuma receita pendente.</div>
            ) : (
              proximasReceber.map((item) => (
                <div className="finance-list-item" key={item.id}>
                  <div>
                    <strong>{item.descricao}</strong>
                    <span>{item.cliente || 'Sem cliente'} • {formatarData(item.vencimento)}</span>
                  </div>
                  <strong>{formatarMoeda(item.valor)}</strong>
                </div>
              ))
            )}
          </article>
        </section>
      </>
    );
  }

  const colunasMovimentos = [
    { key: 'data', label: 'Data', render: (item) => formatarData(item.data) },
    { key: 'descricao', label: 'Descrição', render: (item) => item.descricao },
    { key: 'categoria', label: 'Categoria', render: (item) => item.categoria },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (item) => (
        <span className={`finance-badge ${item.tipo}`}>
          {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
        </span>
      ),
    },
    { key: 'pagamento', label: 'Pagamento', render: (item) => item.formaPagamento },
    { key: 'valor', label: 'Valor', render: (item) => formatarMoeda(item.valor) },
    {
      key: 'acoes',
      label: 'Ações',
      render: (item) => (
        <button
          className="finance-delete"
          onClick={() =>
            excluir(setMovimentacoes, item.id, 'Deseja excluir este lançamento?')
          }
        >
          Excluir
        </button>
      ),
    },
  ];

  const colunasPagar = [
    { key: 'vencimento', label: 'Vencimento', render: (item) => formatarData(item.vencimento) },
    { key: 'descricao', label: 'Descrição', render: (item) => item.descricao },
    { key: 'fornecedor', label: 'Fornecedor', render: (item) => item.fornecedor || '-' },
    { key: 'categoria', label: 'Categoria', render: (item) => item.categoria },
    { key: 'valor', label: 'Valor', render: (item) => formatarMoeda(item.valor) },
    {
      key: 'status',
      label: 'Situação',
      render: (item) => (
        <span className={`finance-badge ${item.status}`}>
          {item.status === 'paga' ? 'Paga' : 'Pendente'}
        </span>
      ),
    },
    {
      key: 'acoes',
      label: 'Ações',
      render: (item) => (
        <div className="finance-row-actions">
          {item.status === 'pendente' && (
            <button className="finance-success" onClick={() => pagarConta(item)}>
              Pagar
            </button>
          )}
          <button
            className="finance-delete"
            onClick={() =>
              excluir(setContasPagar, item.id, 'Deseja excluir esta conta?')
            }
          >
            Excluir
          </button>
        </div>
      ),
    },
  ];

  const colunasReceber = [
    { key: 'vencimento', label: 'Vencimento', render: (item) => formatarData(item.vencimento) },
    { key: 'descricao', label: 'Descrição', render: (item) => item.descricao },
    { key: 'cliente', label: 'Cliente', render: (item) => item.cliente || '-' },
    { key: 'categoria', label: 'Categoria', render: (item) => item.categoria },
    { key: 'valor', label: 'Valor', render: (item) => formatarMoeda(item.valor) },
    {
      key: 'status',
      label: 'Situação',
      render: (item) => (
        <span className={`finance-badge ${item.status}`}>
          {item.status === 'recebida' ? 'Recebida' : 'Pendente'}
        </span>
      ),
    },
    {
      key: 'acoes',
      label: 'Ações',
      render: (item) => (
        <div className="finance-row-actions">
          {item.status === 'pendente' && (
            <button className="finance-success" onClick={() => receberConta(item)}>
              Receber
            </button>
          )}
          <button
            className="finance-delete"
            onClick={() =>
              excluir(setContasReceber, item.id, 'Deseja excluir esta receita?')
            }
          >
            Excluir
          </button>
        </div>
      ),
    },
  ];

  function Fluxo() {
    return (
      <>
        <section className="finance-panel">
          <h2>Novo lançamento</h2>

          <form className="finance-form" onSubmit={salvarMovimento}>
            <label className="finance-field finance-field-wide">
              <span>Descrição</span>
              <input name="descricao" value={formMovimento.descricao} onChange={atualizar(setFormMovimento)} placeholder="Ex.: Recebimento do cliente João" />
            </label>

            <label className="finance-field">
              <span>Tipo</span>
              <select name="tipo" value={formMovimento.tipo} onChange={atualizar(setFormMovimento)}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </label>

            <label className="finance-field">
              <span>Categoria</span>
              <select name="categoria" value={formMovimento.categoria} onChange={atualizar(setFormMovimento)}>
                <option>Venda de sistema solar</option>
                <option>Limpeza de painéis</option>
                <option>Manutenção</option>
                <option>Fornecedor</option>
                <option>Frete</option>
                <option>Combustível</option>
                <option>Engenharia</option>
                <option>Contabilidade</option>
                <option>Impostos</option>
                <option>Publicidade</option>
                <option>Outros</option>
              </select>
            </label>

            <label className="finance-field">
              <span>Valor</span>
              <input type="number" min="0" step="0.01" name="valor" value={formMovimento.valor} onChange={atualizar(setFormMovimento)} placeholder="0,00" />
            </label>

            <label className="finance-field">
              <span>Data</span>
              <input type="date" name="data" value={formMovimento.data} onChange={atualizar(setFormMovimento)} />
            </label>

            <label className="finance-field">
              <span>Forma de pagamento</span>
              <select name="formaPagamento" value={formMovimento.formaPagamento} onChange={atualizar(setFormMovimento)}>
                <option>PIX</option>
                <option>Dinheiro</option>
                <option>Cartão</option>
                <option>Transferência</option>
                <option>Boleto</option>
                <option>Financiamento</option>
              </select>
            </label>

            <div className="finance-actions finance-field-wide">
              <button className="finance-button" type="submit">Salvar lançamento</button>
            </div>
          </form>
        </section>

        <section className="finance-panel">
          <div className="finance-panel-header">
            <h2>Fluxo de caixa</h2>

            <div className="finance-panel-actions">
              <label className="finance-secondary-button finance-import-button">
                Importar OFX
                <input type="file" accept=".ofx,application/x-ofx" onChange={importarExtrato} />
              </label>

              <select className="finance-filter" value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value)}>
                <option value="todos">Todos</option>
                <option value="entrada">Entradas</option>
                <option value="saida">Saídas</option>
              </select>

              <button
                className="finance-secondary-button"
                onClick={() =>
                  exportarCSV(
                    'fluxo-caixa-mm.csv',
                    movimentosFiltrados.map((item) => ({
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
          </div>

          <FinanceTable columns={colunasMovimentos} rows={movimentosFiltrados} emptyText="Nenhum lançamento cadastrado." />
        </section>
      </>
    );
  }

  function ContasPagar() {
    return (
      <>
        <section className="finance-panel">
          <h2>Nova conta a pagar</h2>

          <form className="finance-form" onSubmit={salvarContaPagar}>
            <label className="finance-field finance-field-wide">
              <span>Descrição</span>
              <input name="descricao" value={formPagar.descricao} onChange={atualizar(setFormPagar)} placeholder="Ex.: Parcela Santander" />
            </label>

            <label className="finance-field">
              <span>Fornecedor</span>
              <input name="fornecedor" value={formPagar.fornecedor} onChange={atualizar(setFormPagar)} placeholder="Nome do fornecedor" />
            </label>

            <label className="finance-field">
              <span>Categoria</span>
              <select name="categoria" value={formPagar.categoria} onChange={atualizar(setFormPagar)}>
                <option>Fornecedor</option>
                <option>Empréstimo</option>
                <option>Contabilidade</option>
                <option>Engenharia</option>
                <option>Impostos</option>
                <option>Publicidade</option>
                <option>Frete</option>
                <option>Outros</option>
              </select>
            </label>

            <label className="finance-field">
              <span>Valor</span>
              <input type="number" min="0" step="0.01" name="valor" value={formPagar.valor} onChange={atualizar(setFormPagar)} placeholder="0,00" />
            </label>

            <label className="finance-field">
              <span>Vencimento</span>
              <input type="date" name="vencimento" value={formPagar.vencimento} onChange={atualizar(setFormPagar)} />
            </label>

            <div className="finance-actions finance-field-wide">
              <button className="finance-button" type="submit">Salvar conta</button>
            </div>
          </form>
        </section>

        <section className="finance-panel">
          <div className="finance-panel-header">
            <h2>Contas a pagar</h2>
            <div className="finance-panel-actions">
              <label className="finance-secondary-button finance-import-button">
                Importar CSV
                <input type="file" accept=".csv,text/csv" onChange={importarContas} />
              </label>
              <button
                className="finance-secondary-button"
                onClick={() =>
                  exportarCSV(
                    'contas-pagar-mm.csv',
                    contasPagar.map((item) => ({
                      Vencimento: formatarData(item.vencimento),
                      Descrição: item.descricao,
                      Fornecedor: item.fornecedor,
                      Categoria: item.categoria,
                      Valor: item.valor,
                      Situação: item.status,
                    }))
                  )
                }
              >
                Exportar CSV
              </button>
            </div>
          </div>

          {boletosVencendoHoje.length > 0 && (
            <div className="tax-warning">
              <strong>Vence hoje:</strong> {boletosVencendoHoje.length} boleto(s), total de{' '}
              {formatarMoeda(boletosVencendoHoje.reduce((soma, item) => soma + Number(item.valor || 0), 0))}.
            </div>
          )}

          {permissaoNotificacao !== 'granted' && permissaoNotificacao !== 'indisponivel' && (
            <button type="button" className="finance-secondary-button" onClick={ativarNotificacoes}>
              Ativar notificações de vencimento
            </button>
          )}

          <div className="finance-month-tabs" aria-label="Escolher mês dos boletos">
            {mesesComBoletos.map((mes) => (
              <button
                type="button"
                key={mes}
                className={mesSelecionadoPagar === mes ? 'active' : ''}
                onClick={() => setMesSelecionadoPagar(mes)}
              >
                {nomeMes(mes)}
              </button>
            ))}
          </div>

          <div className="finance-month-selected">
            <div>
              <span>Saldo projetado de {nomeMes(mesSelecionadoPagar)}</span>
              <strong className={saldoProjetadoMes >= 0 ? 'positive' : 'negative'}>
                {formatarMoeda(saldoProjetadoMes)}
              </strong>
            </div>
          </div>

          <div className="finance-month-group">
            <div className="finance-panel-header">
              <div>
                <h3>Boletos de {nomeMes(mesSelecionadoPagar)}</h3>
                <p>{boletosMesSelecionado.length} boleto(s) neste mês</p>
              </div>
            </div>
            <FinanceTable
              columns={colunasPagar}
              rows={boletosMesSelecionado}
              emptyText="Nenhum boleto cadastrado para este mês."
            />
          </div>
        </section>
      </>
    );
  }

  function ContasReceber() {
    return (
      <>
        <section className="finance-panel">
          <h2>Nova conta a receber</h2>

          <form className="finance-form" onSubmit={salvarContaReceber}>
            <label className="finance-field finance-field-wide">
              <span>Descrição</span>
              <input name="descricao" value={formReceber.descricao} onChange={atualizar(setFormReceber)} placeholder="Ex.: Parcela do cliente João" />
            </label>

            <label className="finance-field">
              <span>Cliente</span>
              <input name="cliente" value={formReceber.cliente} onChange={atualizar(setFormReceber)} placeholder="Nome do cliente" />
            </label>

            <label className="finance-field">
              <span>Categoria</span>
              <select name="categoria" value={formReceber.categoria} onChange={atualizar(setFormReceber)}>
                <option>Venda de sistema solar</option>
                <option>Limpeza de painéis</option>
                <option>Manutenção</option>
                <option>Projeto</option>
                <option>Outros</option>
              </select>
            </label>

            <label className="finance-field">
              <span>Valor</span>
              <input type="number" min="0" step="0.01" name="valor" value={formReceber.valor} onChange={atualizar(setFormReceber)} placeholder="0,00" />
            </label>

            <label className="finance-field">
              <span>Vencimento</span>
              <input type="date" name="vencimento" value={formReceber.vencimento} onChange={atualizar(setFormReceber)} />
            </label>

            <div className="finance-actions finance-field-wide">
              <button className="finance-button" type="submit">Salvar receita</button>
            </div>
          </form>
        </section>

        <section className="finance-panel">
          <div className="finance-panel-header">
            <h2>Contas a receber</h2>
            <button
              className="finance-secondary-button"
              onClick={() =>
                exportarCSV(
                  'contas-receber-mm.csv',
                  contasReceber.map((item) => ({
                    Vencimento: formatarData(item.vencimento),
                    Descrição: item.descricao,
                    Cliente: item.cliente,
                    Categoria: item.categoria,
                    Valor: item.valor,
                    Situação: item.status,
                  }))
                )
              }
            >
              Exportar CSV
            </button>
          </div>

          <FinanceTable columns={colunasReceber} rows={contasReceber} emptyText="Nenhuma receita cadastrada." />
        </section>
      </>
    );
  }

  function Relatorios() {
    const lucro = totais.entradas - totais.saidas;

    return (
      <>
        <section className="finance-grid">
          <StatCard label="Receitas realizadas" value={formatarMoeda(totais.entradas)} helper="Entradas confirmadas" tone="positive" />
          <StatCard label="Despesas realizadas" value={formatarMoeda(totais.saidas)} helper="Saídas confirmadas" tone="negative" />
          <StatCard label="Resultado atual" value={formatarMoeda(lucro)} helper="Receitas menos despesas" tone="primary" />
          <StatCard label="Resultado projetado" value={formatarMoeda(totais.saldoProjetado)} helper="Inclui contas futuras" tone="warning" />
        </section>

        <section className="finance-panel">
          <h2>Resumo financeiro</h2>
          <div className="finance-list-item">
            <div><strong>Total de lançamentos</strong><span>Entradas e saídas registradas</span></div>
            <strong>{movimentacoes.length}</strong>
          </div>
          <div className="finance-list-item">
            <div><strong>Contas a pagar pendentes</strong><span>Quantidade de despesas futuras</span></div>
            <strong>{contasPagar.filter((item) => item.status === 'pendente').length}</strong>
          </div>
          <div className="finance-list-item">
            <div><strong>Contas a receber pendentes</strong><span>Quantidade de receitas futuras</span></div>
            <strong>{contasReceber.filter((item) => item.status === 'pendente').length}</strong>
          </div>
        </section>
      </>
    );
  }

  const titulos = {
    dashboard: ['Dashboard financeiro', 'Visão geral da MM Energia Solar.'],
    fluxo: ['Fluxo de caixa', 'Registre e acompanhe todas as entradas e saídas.'],
    pagar: ['Contas a pagar', 'Controle despesas, vencimentos e pagamentos.'],
    receber: ['Contas a receber', 'Controle clientes, parcelas e recebimentos.'],
    relatorios: ['Relatórios financeiros', 'Resumo dos resultados atuais e projetados.'],
  };

  return (
    <FinanceLayout
      title={titulos[secao][0]}
      subtitle={titulos[secao][1]}
      theme="empresa"
      activeSection={secao}
      onSectionChange={setSecao}
    >
      {secao === 'dashboard' && <Dashboard />}
      {secao === 'fluxo' && <Fluxo />}
      {secao === 'pagar' && <ContasPagar />}
      {secao === 'receber' && <ContasReceber />}
      {secao === 'relatorios' && <Relatorios />}
    </FinanceLayout>
  );
}

export default FinanceiroPage;
