import React, { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';

const CHAVE = 'mm-erp-pessoa-fisica-contas-v1';
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const CONTAS_PADRAO = [
  'Energia',
  'COHAB',
  'Claro TV',
  'IPTU Bauru',
  'IPTU Cascavel',
  'Consórcio',
  'Cartão Nubank',
  'Cartão Nubank Manu',
  'Neon',
  'Maira',
  'Álbum',
  'Shopee',
  'Terreno 01',
  'Terreno 02',
];

const PARCELAS_TERRENOS = {
  '2026-01': { 'Terreno 01': 469.06, 'Terreno 02': 738.12 },
  '2026-02': { 'Terreno 01': 469.06, 'Terreno 02': 738.12 },
  '2026-03': { 'Terreno 01': 469.06, 'Terreno 02': 738.12 },
  '2026-04': { 'Terreno 01': 469.06, 'Terreno 02': 738.12 },
  '2026-05': { 'Terreno 01': 469.06, 'Terreno 02': 738.12 },
  '2026-06': { 'Terreno 01': 210.39, 'Terreno 02': 331.07 },
  '2026-07': { 'Terreno 01': 210.39, 'Terreno 02': 331.07 },
  '2026-08': { 'Terreno 01': 210.39, 'Terreno 02': 331.07 },
  '2026-09': { 'Terreno 01': 210.39, 'Terreno 02': 331.07 },
  '2026-10': { 'Terreno 01': 210.39, 'Terreno 02': 331.07 },
  '2026-11': { 'Terreno 01': 210.39, 'Terreno 02': 331.07 },
};

const mesAtual = () => new Date().toISOString().slice(0, 7);
const idNovo = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const vencimentoDoMes = (mes) => PARCELAS_TERRENOS[mes] ? `${mes}-20` : '';

function carregar() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) || '{}');
  } catch {
    return {};
  }
}

function criarContasDoMes(mes) {
  const parcelas = PARCELAS_TERRENOS[mes] || {};
  return CONTAS_PADRAO.map((nome) => ({
    id: idNovo(),
    nome,
    vencimento: parcelas[nome] ? vencimentoDoMes(mes) : '',
    dataPagamento: '',
    valor: parcelas[nome] ?? '',
    pago: false,
  }));
}

function completarParcelasDoMes(contas, mes) {
  const parcelas = PARCELAS_TERRENOS[mes];
  if (!parcelas) return contas;

  return contas.map((conta) => {
    const valorParcela = parcelas[conta.nome];
    if (!valorParcela) return conta;
    return {
      ...conta,
      vencimento: conta.vencimento || vencimentoDoMes(mes),
      valor: conta.valor === '' || conta.valor == null ? valorParcela : conta.valor,
    };
  });
}

export default function MarcosFinancePage() {
  const [mes, setMes] = useState(mesAtual());
  const [dados, setDados] = useState(carregar);
  const [novaConta, setNovaConta] = useState('');

  const contas = dados[mes] || criarContasDoMes(mes);

  useEffect(() => {
    setDados((atual) => {
      const existentes = atual[mes] || criarContasDoMes(mes);
      const completas = completarParcelasDoMes(existentes, mes);
      return { ...atual, [mes]: completas };
    });
  }, [mes]);

  useEffect(() => {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  }, [dados]);

  const atualizarConta = (id, campo, valor) => {
    setDados((atual) => ({
      ...atual,
      [mes]: (atual[mes] || criarContasDoMes(mes)).map((conta) =>
        conta.id === id
          ? {
              ...conta,
              [campo]: valor,
              ...(campo === 'dataPagamento' ? { pago: Boolean(valor) } : {}),
            }
          : conta
      ),
    }));
  };

  const alternarPago = (id) => {
    setDados((atual) => ({
      ...atual,
      [mes]: (atual[mes] || []).map((conta) =>
        conta.id === id
          ? {
              ...conta,
              pago: !conta.pago,
              dataPagamento: !conta.pago && !conta.dataPagamento
                ? new Date().toISOString().slice(0, 10)
                : conta.dataPagamento,
            }
          : conta
      ),
    }));
  };

  const adicionarConta = (event) => {
    event.preventDefault();
    if (!novaConta.trim()) return;
    setDados((atual) => ({
      ...atual,
      [mes]: [
        ...(atual[mes] || criarContasDoMes(mes)),
        { id: idNovo(), nome: novaConta.trim(), vencimento: '', dataPagamento: '', valor: '', pago: false },
      ],
    }));
    setNovaConta('');
  };

  const excluirConta = (id) => {
    if (!window.confirm('Excluir esta conta deste mês?')) return;
    setDados((atual) => ({
      ...atual,
      [mes]: (atual[mes] || []).filter((conta) => conta.id !== id),
    }));
  };

  const totais = useMemo(() => {
    const total = contas.reduce((soma, conta) => soma + Number(conta.valor || 0), 0);
    const pago = contas.filter((conta) => conta.pago).reduce((soma, conta) => soma + Number(conta.valor || 0), 0);
    return { total, pago, restante: total - pago };
  }, [contas]);

  return (
    <FinanceLayout
      title="Pessoa Física"
      subtitle="Contas pessoais do mês."
      theme="marcos"
    >
      <section className="pf-topo">
        <label className="pf-mes">
          <span>Mês</span>
          <input type="month" value={mes} onChange={(event) => setMes(event.target.value)} />
        </label>

        <div className="pf-resumo">
          <div><span>Total</span><strong>{moeda.format(totais.total)}</strong></div>
          <div><span>Pago</span><strong>{moeda.format(totais.pago)}</strong></div>
          <div className="pf-restante"><span>Falta</span><strong>{moeda.format(totais.restante)}</strong></div>
        </div>
      </section>

      <section className="pf-painel">
        <div className="pf-cabecalho">
          <span>Conta</span>
          <span>Venc.</span>
          <span>Valor</span>
          <span>Pago</span>
        </div>

        <div className="pf-lista">
          {contas.map((conta) => (
            <article key={conta.id} className={`pf-linha ${conta.pago ? 'paga' : ''}`}>
              <input
                className="pf-nome"
                aria-label="Nome da conta"
                value={conta.nome}
                onChange={(event) => atualizarConta(conta.id, 'nome', event.target.value)}
              />
              <input
                className="pf-data"
                aria-label={`Vencimento de ${conta.nome}`}
                type="date"
                value={conta.vencimento}
                onChange={(event) => atualizarConta(conta.id, 'vencimento', event.target.value)}
              />
              <input
                className="pf-valor"
                aria-label={`Valor de ${conta.nome}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={conta.valor}
                onChange={(event) => atualizarConta(conta.id, 'valor', event.target.value)}
              />
              <button
                type="button"
                className={`pf-check ${conta.pago ? 'ativo' : ''}`}
                onClick={() => alternarPago(conta.id)}
                aria-label={conta.pago ? `Desmarcar ${conta.nome}` : `Marcar ${conta.nome} como paga`}
              >
                <Check size={17} />
              </button>

              {conta.pago && (
                <div className="pf-pagamento">
                  <span>Pago em</span>
                  <input
                    type="date"
                    value={conta.dataPagamento}
                    onChange={(event) => atualizarConta(conta.id, 'dataPagamento', event.target.value)}
                  />
                  <button type="button" onClick={() => excluirConta(conta.id)} aria-label={`Excluir ${conta.nome}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>

        <form className="pf-adicionar" onSubmit={adicionarConta}>
          <input
            value={novaConta}
            onChange={(event) => setNovaConta(event.target.value)}
            placeholder="Adicionar outra conta"
          />
          <button type="submit"><Plus size={17} /> Adicionar</button>
        </form>
      </section>

      <style>{`
        .pf-topo {
          display: grid;
          grid-template-columns: 210px 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        .pf-mes, .pf-resumo, .pf-painel {
          background: #fff;
          border: 1px solid #dce3eb;
          border-radius: 14px;
        }
        .pf-mes {
          padding: 10px 12px;
        }
        .pf-mes span {
          display: block;
          margin-bottom: 5px;
          color: #657184;
          font-size: 12px;
          font-weight: 800;
        }
        .pf-mes input {
          width: 100%;
          min-height: 38px;
          border: 1px solid #d7dee8;
          border-radius: 9px;
          padding: 0 9px;
          font-size: 15px;
        }
        .pf-resumo {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          overflow: hidden;
        }
        .pf-resumo div {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
          padding: 9px 12px;
          border-left: 1px solid #e4e9ef;
        }
        .pf-resumo div:first-child { border-left: 0; }
        .pf-resumo span { color: #707b8b; font-size: 11px; font-weight: 800; }
        .pf-resumo strong { color: #08264d; font-size: clamp(17px, 2.2vw, 24px); line-height: 1.15; }
        .pf-resumo .pf-restante { background: #fff9df; }
        .pf-painel { padding: 8px; }
        .pf-cabecalho, .pf-linha {
          display: grid;
          grid-template-columns: minmax(130px, 1.5fr) 145px 115px 44px;
          gap: 7px;
          align-items: center;
        }
        .pf-cabecalho {
          padding: 4px 7px 7px;
          color: #6e7888;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .pf-lista { display: grid; gap: 5px; }
        .pf-linha {
          padding: 5px;
          border: 1px solid #e1e6ed;
          border-radius: 10px;
          background: #fff;
        }
        .pf-linha.paga { border-color: #a9dfbf; background: #f3fff7; }
        .pf-linha input {
          width: 100%;
          min-width: 0;
          height: 36px;
          border: 1px solid #dbe2ea;
          border-radius: 8px;
          padding: 0 8px;
          background: #fff;
          font-size: 14px;
        }
        .pf-nome { font-weight: 800; }
        .pf-check {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border: 0;
          border-radius: 9px;
          background: #e7edf4;
          color: #536174;
        }
        .pf-check.ativo { background: #16834f; color: #fff; }
        .pf-pagamento {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
          padding-top: 3px;
          color: #557063;
          font-size: 12px;
          font-weight: 800;
        }
        .pf-pagamento input { width: 150px; height: 32px; }
        .pf-pagamento button {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border: 0;
          border-radius: 8px;
          background: #ffe8e8;
          color: #a52d2d;
        }
        .pf-adicionar { display: flex; gap: 7px; margin-top: 8px; }
        .pf-adicionar input {
          flex: 1;
          min-width: 0;
          height: 38px;
          border: 1px solid #dbe2ea;
          border-radius: 9px;
          padding: 0 10px;
        }
        .pf-adicionar button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 38px;
          padding: 0 13px;
          border: 0;
          border-radius: 9px;
          background: #08264d;
          color: #fff;
          font-weight: 900;
        }
        @media (max-width: 700px) {
          .pf-topo { grid-template-columns: 1fr; gap: 7px; margin-bottom: 7px; }
          .pf-mes { padding: 7px 9px; }
          .pf-mes span { display: none; }
          .pf-mes input { min-height: 34px; }
          .pf-resumo div { padding: 7px 8px; }
          .pf-resumo strong { font-size: 15px; }
          .pf-painel { padding: 5px; border-radius: 10px; }
          .pf-cabecalho { display: none; }
          .pf-lista { gap: 4px; }
          .pf-linha {
            grid-template-columns: minmax(102px, 1.4fr) 92px 82px 34px;
            gap: 4px;
            padding: 4px;
            border-radius: 8px;
          }
          .pf-linha input { height: 32px; padding: 0 5px; font-size: 12px; }
          .pf-data { font-size: 10px !important; }
          .pf-check { width: 32px; height: 32px; border-radius: 7px; }
          .pf-pagamento { padding: 1px 2px 0; }
          .pf-pagamento input { width: 128px; height: 30px; }
          .pf-adicionar { margin-top: 6px; }
          .pf-adicionar input, .pf-adicionar button { height: 34px; min-height: 34px; font-size: 12px; }
        }
        @media (max-width: 390px) {
          .pf-linha { grid-template-columns: minmax(88px, 1.4fr) 84px 72px 32px; }
          .pf-resumo strong { font-size: 13px; }
        }
      `}</style>
    </FinanceLayout>
  );
}
