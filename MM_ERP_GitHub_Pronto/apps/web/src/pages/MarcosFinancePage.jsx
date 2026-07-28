import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import StatCard from '../components/finance/StatCard.jsx';

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
      subtitle="Contas pessoais organizadas por mês, vencimento e pagamento."
      theme="marcos"
    >
      <section className="finance-panel" style={{ marginBottom: 16 }}>
        <label className="finance-field" style={{ maxWidth: 320 }}>
          <span>Mês das contas</span>
          <input type="month" value={mes} onChange={(event) => setMes(event.target.value)} />
        </label>
      </section>

      <section className="finance-grid" style={{ marginBottom: 18 }}>
        <StatCard label="Total para pagar no mês" value={moeda.format(totais.total)} helper="Soma de todas as contas" tone="primary" />
        <StatCard label="Já pago" value={moeda.format(totais.pago)} helper="Contas marcadas como pagas" tone="positive" />
        <StatCard label="Ainda falta pagar" value={moeda.format(totais.restante)} helper="Valor necessário para quitar o mês" tone="negative" />
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Contas do mês</h2>
            <p>Preencha o vencimento, o valor e marque quando pagar.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {contas.map((conta) => (
            <article
              key={conta.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(150px, 1.4fr) repeat(3, minmax(125px, 1fr)) auto auto',
                gap: 10,
                alignItems: 'end',
                padding: 14,
                border: `1px solid ${conta.pago ? '#a7e5c3' : '#dde4ec'}`,
                borderRadius: 14,
                background: conta.pago ? '#f0fff6' : '#fff',
              }}
              className="personal-bill-row"
            >
              <label className="finance-field">
                <span>Conta</span>
                <input value={conta.nome} onChange={(event) => atualizarConta(conta.id, 'nome', event.target.value)} />
              </label>
              <label className="finance-field">
                <span>Vencimento</span>
                <input type="date" value={conta.vencimento} onChange={(event) => atualizarConta(conta.id, 'vencimento', event.target.value)} />
              </label>
              <label className="finance-field">
                <span>Valor</span>
                <input type="number" min="0" step="0.01" placeholder="0,00" value={conta.valor} onChange={(event) => atualizarConta(conta.id, 'valor', event.target.value)} />
              </label>
              <label className="finance-field">
                <span>Data do pagamento</span>
                <input type="date" value={conta.dataPagamento} onChange={(event) => atualizarConta(conta.id, 'dataPagamento', event.target.value)} />
              </label>
              <button
                type="button"
                onClick={() => alternarPago(conta.id)}
                style={{ minHeight: 46, padding: '0 14px', border: 0, borderRadius: 10, background: conta.pago ? '#15834f' : '#e8eef5', color: conta.pago ? '#fff' : '#172033', fontWeight: 800 }}
              >
                <CheckCircle2 size={18} /> {conta.pago ? 'Pago' : 'Marcar pago'}
              </button>
              <button type="button" className="finance-delete" onClick={() => excluirConta(conta.id)} aria-label={`Excluir ${conta.nome}`}>
                <Trash2 size={18} />
              </button>
            </article>
          ))}
        </div>

        <form onSubmit={adicionarConta} style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <input
            value={novaConta}
            onChange={(event) => setNovaConta(event.target.value)}
            placeholder="Nome de outra conta"
            style={{ flex: '1 1 240px', minHeight: 46 }}
          />
          <button className="finance-button" type="submit"><Plus size={18} /> Adicionar conta</button>
        </form>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .personal-bill-row {
            grid-template-columns: 1fr !important;
          }
          .personal-bill-row button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </FinanceLayout>
  );
}
