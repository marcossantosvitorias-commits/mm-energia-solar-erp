import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const CHAVE = 'mm-erp-pessoa-fisica-contas-v1';
const CHAVE_FINANCAS = 'mm-erp-pessoa-fisica-financas-v1';
const ESCOPO = 'personal-marcos';
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const CONTAS_PADRAO = [
  'Energia', 'COHAB', 'Claro TV', 'IPTU Bauru', 'IPTU Cascavel', 'Consórcio',
  'Cartão Nubank', 'Cartão Nubank Manu', 'Neon', 'Maira', 'Álbum', 'Shopee',
  'Terreno 01', 'Terreno 02', 'Combustível',
];

const CONTAS_MAIRA = [
  { descricao: 'Ótica', parcela: '1/3', valor: 66.68 },
  { descricao: 'Lavacar', parcela: '', valor: 100 },
  { descricao: 'Mecânica Robson', parcela: '2x', valor: 165 },
  { descricao: 'Azul', parcela: '3/10', valor: 56.99 },
  { descricao: 'Mercado Livre', parcela: '4/5', valor: 55.80 },
  { descricao: 'Curso', parcela: '6/10', valor: 89.70 },
  { descricao: 'Mercado Livre', parcela: '10/12', valor: 100 },
  { descricao: 'Pintura', parcela: '', valor: 67.13 },
  { descricao: 'Sala', parcela: '1/3', valor: 131.67 },
];

const TOTAL_MAIRA_PADRAO = Number(CONTAS_MAIRA.reduce((total, item) => total + item.valor, 0).toFixed(2));

const CONTAS_RECORRENTES_2026 = {
  'Cartão Nubank': { dia: 5, valor: 326 },
  Shopee: { dia: 6, valor: 221.24 },
  Consórcio: { dia: 7, valor: 871.5 },
  'Cartão Nubank Manu': { dia: 10, valor: 300 },
  COHAB: { dia: 10, valor: 636 },
  Maira: { dia: 11, valor: TOTAL_MAIRA_PADRAO },
  'Terreno 01': { dia: 20, valor: 210.39 },
  'Terreno 02': { dia: 20, valor: 331.07 },
  'Claro TV': { dia: 21, valor: 237.1 },
  Neon: { dia: 21, valor: 72.29 },
  Álbum: { dia: 24, valor: 232 },
  Energia: { dia: 28, valor: 26.95 },
  Combustível: { dia: 30, valor: 600 },
};

const MESES_RECORRENTES = new Set(['2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);

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
  '2026-12': { 'Terreno 01': 210.39, 'Terreno 02': 331.07 },
};

const CONTAS_CONFIRMADAS = {
  '2026-06': {
    Energia: { vencimento: '2026-06-18', dataPagamento: '2026-06-18', valor: 184.14, pago: true },
    'Claro TV': { vencimento: '2026-06-22', dataPagamento: '2026-06-22', valor: 235.20, pago: true },
    'Cartão Nubank': { vencimento: '2026-06-11', dataPagamento: '2026-06-11', valor: 327.17, pago: true },
    Maira: { vencimento: '2026-06-11', dataPagamento: '2026-06-11', valor: 550, pago: true },
    'Terreno 01': { vencimento: '2026-06-20', dataPagamento: '2026-06-22', valor: 210.39, pago: true },
    'Terreno 02': { vencimento: '2026-06-20', dataPagamento: '2026-06-22', valor: 331.07, pago: true },
  },
};

const FINANCAS_CONFIRMADAS = {
  '2026-06': { recebimentos: 8163.91, compras: 8021.97, saldoInicial: 24.20, saldoFinal: 166.14 },
};

const mesAtual = () => new Date().toISOString().slice(0, 7);
const idNovo = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const vencimentoDoMes = (mes) => PARCELAS_TERRENOS[mes] ? `${mes}-20` : '';
const vazio = (valor) => valor === '' || valor == null;
const dataDoMes = (mes, dia) => `${mes}-${String(dia).padStart(2, '0')}`;
const recorrenteDoMes = (nome, mes) => MESES_RECORRENTES.has(mes) ? CONTAS_RECORRENTES_2026[nome] : null;

function carregar(chave) {
  try { return JSON.parse(localStorage.getItem(chave) || '{}'); } catch { return {}; }
}

function criarConta(nome, mes) {
  const recorrente = recorrenteDoMes(nome, mes);
  const parcela = PARCELAS_TERRENOS[mes]?.[nome];
  const confirmada = CONTAS_CONFIRMADAS[mes]?.[nome];
  return {
    id: idNovo(), nome,
    vencimento: confirmada?.vencimento || (recorrente ? dataDoMes(mes, recorrente.dia) : (parcela ? vencimentoDoMes(mes) : '')),
    dataPagamento: confirmada?.dataPagamento || '',
    valor: confirmada?.valor ?? recorrente?.valor ?? parcela ?? '',
    pago: confirmada?.pago ?? false,
  };
}

function criarContasDoMes(mes) {
  return CONTAS_PADRAO.map((nome) => criarConta(nome, mes));
}

function completarContasDoMes(contas, mes) {
  const porNome = new Map(contas.map((conta) => [conta.nome, conta]));
  const todas = CONTAS_PADRAO.map((nome) => porNome.get(nome) || criarConta(nome, mes));
  const extras = contas.filter((conta) => !CONTAS_PADRAO.includes(conta.nome));
  return [...todas, ...extras].map((conta) => {
    const recorrente = recorrenteDoMes(conta.nome, mes);
    const parcela = PARCELAS_TERRENOS[mes]?.[conta.nome];
    const confirmada = CONTAS_CONFIRMADAS[mes]?.[conta.nome];
    return {
      ...conta,
      vencimento: vazio(conta.vencimento) ? (confirmada?.vencimento || (recorrente ? dataDoMes(mes, recorrente.dia) : (parcela ? vencimentoDoMes(mes) : ''))) : conta.vencimento,
      dataPagamento: vazio(conta.dataPagamento) ? (confirmada?.dataPagamento || '') : conta.dataPagamento,
      valor: vazio(conta.valor) ? (confirmada?.valor ?? recorrente?.valor ?? parcela ?? '') : conta.valor,
      pago: conta.pago || Boolean(confirmada?.pago),
    };
  });
}

function criarFinancasDoMes(mes) {
  return FINANCAS_CONFIRMADAS[mes] || { recebimentos: '', compras: '', saldoInicial: '', saldoFinal: '' };
}

function completarFinancasDoMes(atual, mes) {
  const confirmada = criarFinancasDoMes(mes);
  return {
    recebimentos: vazio(atual?.recebimentos) ? confirmada.recebimentos : atual.recebimentos,
    compras: vazio(atual?.compras) ? confirmada.compras : atual.compras,
    saldoInicial: vazio(atual?.saldoInicial) ? confirmada.saldoInicial : atual.saldoInicial,
    saldoFinal: vazio(atual?.saldoFinal) ? confirmada.saldoFinal : atual.saldoFinal,
  };
}

function proximoMes(mes) {
  const [ano, numero] = mes.split('-').map(Number);
  return new Date(Date.UTC(ano, numero, 1)).toISOString().slice(0, 10);
}

export default function MarcosFinancePage() {
  const [mes, setMes] = useState(mesAtual());
  const [dados, setDados] = useState(() => carregar(CHAVE));
  const [financas, setFinancas] = useState(() => carregar(CHAVE_FINANCAS));
  const [novaConta, setNovaConta] = useState('');
  const [aviso, setAviso] = useState('');
  const [mairaAberta, setMairaAberta] = useState(false);

  const contas = dados[mes] || criarContasDoMes(mes);
  const resumoFinanceiro = financas[mes] || criarFinancasDoMes(mes);
  const totalMaira = useMemo(() => Number(CONTAS_MAIRA.reduce((total, item) => total + item.valor, 0).toFixed(2)), []);

  const contasOrdenadas = useMemo(() => [...contas].sort((a, b) => {
    const dataA = a.pago ? (a.dataPagamento || a.vencimento) : a.vencimento;
    const dataB = b.pago ? (b.dataPagamento || b.vencimento) : b.vencimento;
    if (!dataA && !dataB) return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    if (!dataA) return 1;
    if (!dataB) return -1;
    const comparacaoData = dataA.localeCompare(dataB);
    return comparacaoData || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
  }), [contas]);

  useEffect(() => {
    setDados((atual) => {
      const contasCompletas = completarContasDoMes(atual[mes] || criarContasDoMes(mes), mes);
      const contasSincronizadas = contasCompletas.map((conta) => String(conta.nome || '').trim().toLowerCase() === 'maira'
        ? { ...conta, valor: totalMaira }
        : conta);
      return { ...atual, [mes]: contasSincronizadas };
    });
    setFinancas((atual) => ({ ...atual, [mes]: completarFinancasDoMes(atual[mes], mes) }));
    setMairaAberta(false);
  }, [mes, totalMaira]);

  useEffect(() => {
    let ativo = true;
    async function carregarSupabase() {
      if (!isSupabaseConfigured || !supabase) return;
      setAviso('Atualizando dados do banco...');
      const inicio = `${mes}-01`;
      const fim = proximoMes(mes);
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('id, external_id, description, category, amount, transaction_date, payment_method, origin')
        .eq('scope', ESCOPO)
        .gte('transaction_date', inicio)
        .lt('transaction_date', fim)
        .order('transaction_date', { ascending: true });
      if (!ativo) return;
      if (error) { setAviso(`Não foi possível ler o Supabase: ${error.message}`); return; }
      if (!data?.length) { setAviso('Nenhum lançamento encontrado no banco para este mês.'); return; }
      const importadas = data.map((item) => ({
        id: item.id || item.external_id || idNovo(),
        nome: item.description || item.category || 'Despesa',
        vencimento: String(item.transaction_date || '').slice(0, 10),
        dataPagamento: String(item.transaction_date || '').slice(0, 10),
        valor: Number(item.amount || 0), pago: true, importada: true,
      }));
      const totalCompras = importadas.reduce((soma, item) => soma + Number(item.valor || 0), 0);
      setDados((atual) => ({ ...atual, [mes]: importadas }));
      setFinancas((atual) => {
        const existente = completarFinancasDoMes(atual[mes], mes);
        const recebimentos = Number(existente.recebimentos || 0);
        const saldoInicial = Number(existente.saldoInicial || 0);
        return { ...atual, [mes]: { ...existente, compras: Number(totalCompras.toFixed(2)), saldoFinal: Number((saldoInicial + recebimentos - totalCompras).toFixed(2)) } };
      });
      setAviso(`${importadas.length} lançamentos carregados do Supabase — ${moeda.format(totalCompras)} pagos.`);
    }
    carregarSupabase();
    return () => { ativo = false; };
  }, [mes]);

  useEffect(() => { localStorage.setItem(CHAVE, JSON.stringify(dados)); }, [dados]);
  useEffect(() => { localStorage.setItem(CHAVE_FINANCAS, JSON.stringify(financas)); }, [financas]);

  const atualizarConta = (id, campo, valor) => setDados((atual) => ({
    ...atual,
    [mes]: (atual[mes] || criarContasDoMes(mes)).map((conta) => conta.id === id ? { ...conta, [campo]: valor, ...(campo === 'dataPagamento' ? { pago: Boolean(valor) } : {}) } : conta),
  }));

  const atualizarFinancas = (campo, valor) => setFinancas((atual) => ({ ...atual, [mes]: { ...completarFinancasDoMes(atual[mes], mes), [campo]: valor } }));

  const alternarPago = (id) => setDados((atual) => ({
    ...atual,
    [mes]: (atual[mes] || []).map((conta) => conta.id === id ? {
      ...conta, pago: !conta.pago,
      dataPagamento: !conta.pago && !conta.dataPagamento ? new Date().toISOString().slice(0, 10) : conta.dataPagamento,
    } : conta),
  }));

  const adicionarConta = (event) => {
    event.preventDefault();
    if (!novaConta.trim()) return;
    setDados((atual) => ({
      ...atual,
      [mes]: [...(atual[mes] || criarContasDoMes(mes)), { id: idNovo(), nome: novaConta.trim(), vencimento: '', dataPagamento: '', valor: '', pago: false }],
    }));
    setNovaConta('');
  };

  const excluirConta = (id) => {
    if (!window.confirm('Excluir esta conta deste mês?')) return;
    setDados((atual) => ({ ...atual, [mes]: (atual[mes] || []).filter((conta) => conta.id !== id) }));
  };

  const totais = useMemo(() => {
    const aPagar = contas.reduce((soma, conta) => soma + Number(conta.valor || 0), 0);
    const pago = contas.filter((conta) => conta.pago).reduce((soma, conta) => soma + Number(conta.valor || 0), 0);
    return { aPagar, pago, restante: aPagar - pago };
  }, [contas]);

  const saldoMovimento = Number(resumoFinanceiro.recebimentos || 0) - Number(resumoFinanceiro.compras || 0);

  return (
    <FinanceLayout title="Pessoa Física" subtitle="Contas pessoais organizadas por mês." theme="marcos">
      {aviso ? <div className="pf-aviso">{aviso}</div> : null}
      <section className="pf-topo">
        <label className="pf-mes"><span>Mês</span><input type="month" value={mes} onChange={(event) => setMes(event.target.value)} /></label>
        <div className="pf-resumo">
          <div><span>A pagar</span><strong>{moeda.format(totais.aPagar)}</strong></div>
          <div><span>Pago</span><strong>{moeda.format(totais.pago)}</strong></div>
          <div className="pf-restante"><span>Falta</span><strong>{moeda.format(totais.restante)}</strong></div>
        </div>
      </section>

      <section className="pf-painel">
        <div className="pf-cabecalho"><span>Conta</span><span>Venc.</span><span>Valor</span><span>Pago</span></div>
        <div className="pf-lista">
          {contasOrdenadas.map((conta) => {
            const ehMaira = String(conta.nome || '').trim().toLowerCase() === 'maira';
            return (
              <article key={conta.id} className={`pf-linha ${conta.pago ? 'paga' : ''} ${ehMaira ? 'pf-linha-maira' : ''}`}>
                {ehMaira ? (
                  <div className="pf-maira-nome">
                    <input className="pf-nome" value={conta.nome} onChange={(event) => atualizarConta(conta.id, 'nome', event.target.value)} />
                    <button type="button" className="pf-seta" onClick={() => setMairaAberta((aberta) => !aberta)} aria-expanded={mairaAberta} aria-label="Abrir contas da Maira">
                      {mairaAberta ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
                    </button>
                  </div>
                ) : (
                  <input className="pf-nome" value={conta.nome} onChange={(event) => atualizarConta(conta.id, 'nome', event.target.value)} />
                )}
                <input className="pf-data" type="date" value={conta.vencimento} onChange={(event) => atualizarConta(conta.id, 'vencimento', event.target.value)} />
                <input className="pf-valor" type="number" min="0" step="0.01" placeholder="0,00" value={conta.valor} onChange={(event) => atualizarConta(conta.id, 'valor', event.target.value)} readOnly={ehMaira} />
                <button type="button" className={`pf-check ${conta.pago ? 'ativo' : ''}`} onClick={() => alternarPago(conta.id)}><Check size={17} /></button>

                {ehMaira && mairaAberta && (
                  <div className="pf-maira-detalhes">
                    <div className="pf-maira-titulo"><strong>Contas da Maira</strong><span>Total detalhado: {moeda.format(totalMaira)}</span></div>
                    {CONTAS_MAIRA.map((item, index) => (
                      <div className="pf-maira-item" key={`${item.descricao}-${index}`}>
                        <span>{item.descricao}</span><small>{item.parcela || 'À vista'}</small><strong>{moeda.format(item.valor)}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {conta.pago && (
                  <div className="pf-pagamento"><span>Pago em</span><input type="date" value={conta.dataPagamento} onChange={(event) => atualizarConta(conta.id, 'dataPagamento', event.target.value)} /><button type="button" onClick={() => excluirConta(conta.id)}><Trash2 size={16} /></button></div>
                )}
              </article>
            );
          })}
        </div>
        <form className="pf-adicionar" onSubmit={adicionarConta}><input value={novaConta} onChange={(event) => setNovaConta(event.target.value)} placeholder="Adicionar outra conta" /><button type="submit"><Plus size={17} /> Adicionar</button></form>
      </section>

      <section className="pf-financas">
        <div className="pf-financas-titulo"><div><strong>Finanças do mês</strong><span>Compras, recebimentos e saldo.</span></div><strong className={saldoMovimento >= 0 ? 'positivo' : 'negativo'}>{moeda.format(saldoMovimento)}</strong></div>
        <div className="pf-financas-grid">
          <label><span>Recebimentos no mês</span><input type="number" step="0.01" value={resumoFinanceiro.recebimentos} onChange={(event) => atualizarFinancas('recebimentos', event.target.value)} /></label>
          <label><span>Compras realizadas</span><input type="number" step="0.01" value={resumoFinanceiro.compras} onChange={(event) => atualizarFinancas('compras', event.target.value)} /></label>
          <label><span>Saldo inicial</span><input type="number" step="0.01" value={resumoFinanceiro.saldoInicial} onChange={(event) => atualizarFinancas('saldoInicial', event.target.value)} /></label>
          <label><span>Saldo final</span><input type="number" step="0.01" value={resumoFinanceiro.saldoFinal} onChange={(event) => atualizarFinancas('saldoFinal', event.target.value)} /></label>
        </div>
      </section>

      <style>{`
        .theme-marcos .finance-main,.theme-marcos .finance-content-scroll{background:#fff!important}.theme-marcos .finance-header{background:#fff!important}
        .pf-aviso{margin:0 0 8px;padding:9px 12px;border-radius:10px;background:#e8f3ff;color:#0b477d;font-weight:800}.pf-topo{display:grid;grid-template-columns:210px 1fr;gap:12px;margin-bottom:12px}.pf-mes,.pf-resumo,.pf-painel,.pf-financas{background:#fff;border:1px solid #dce3eb;border-radius:14px}.pf-mes{padding:10px 12px}.pf-mes span{display:block;margin-bottom:5px;color:#657184;font-size:12px;font-weight:800}.pf-mes input{width:100%;min-height:38px;border:1px solid #d7dee8;border-radius:9px;padding:0 9px;font-size:15px}.pf-resumo{display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden}.pf-resumo div{display:flex;flex-direction:column;justify-content:center;min-width:0;padding:9px 12px;border-left:1px solid #e4e9ef}.pf-resumo div:first-child{border-left:0}.pf-resumo span{color:#707b8b;font-size:11px;font-weight:800}.pf-resumo strong{color:#08264d;font-size:clamp(17px,2.2vw,24px);line-height:1.15}.pf-resumo .pf-restante{background:#fff9df}.pf-painel{padding:8px}.pf-cabecalho,.pf-linha{display:grid;grid-template-columns:minmax(130px,1.5fr) 145px 115px 44px;gap:7px;align-items:center}.pf-cabecalho{padding:4px 7px 7px;color:#6e7888;font-size:11px;font-weight:900;text-transform:uppercase}.pf-lista{display:grid;gap:5px}.pf-linha{padding:5px;border:1px solid #e1e6ed;border-radius:10px;background:#fff}.pf-linha.paga{border-color:#a9dfbf;background:#f3fff7}.pf-linha-maira{border-color:#e8c84b;background:#fffdf1}.pf-linha input{width:100%;min-width:0;height:36px;border:1px solid #dbe2ea;border-radius:8px;padding:0 8px;background:#fff;font-size:14px}.pf-nome{font-weight:800}.pf-maira-nome{position:relative;min-width:0}.pf-maira-nome .pf-nome{padding-right:38px}.pf-seta{position:absolute;right:3px;top:3px;display:grid;place-items:center;width:30px;height:30px;border:0;border-radius:7px;background:#fff4b8;color:#08264d;cursor:pointer}.pf-check{display:grid;place-items:center;width:36px;height:36px;border:0;border-radius:9px;background:#e7edf4;color:#536174}.pf-check.ativo{background:#16834f;color:#fff}.pf-maira-detalhes{grid-column:1/-1;padding:10px;border:1px solid #ead66d;border-radius:10px;background:#fff}.pf-maira-titulo{display:flex;justify-content:space-between;gap:10px;margin-bottom:7px;color:#08264d}.pf-maira-titulo span{font-size:12px;font-weight:800}.pf-maira-item{display:grid;grid-template-columns:minmax(120px,1fr) 70px 100px;gap:8px;align-items:center;padding:7px 4px;border-top:1px solid #edf0f3}.pf-maira-item:first-of-type{border-top:0}.pf-maira-item small{color:#697586}.pf-maira-item strong{text-align:right;color:#08264d}.pf-pagamento{grid-column:1/-1;display:flex;align-items:center;justify-content:flex-end;gap:7px;padding-top:3px;color:#557063;font-size:12px;font-weight:800}.pf-pagamento input{width:150px;height:32px}.pf-pagamento button{display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:8px;background:#ffe8e8;color:#a52d2d}.pf-adicionar{display:flex;gap:7px;margin-top:8px}.pf-adicionar input{flex:1;min-width:0;height:38px;border:1px solid #dbe2ea;border-radius:9px;padding:0 10px}.pf-adicionar button{display:inline-flex;align-items:center;gap:5px;min-height:38px;padding:0 13px;border:0;border-radius:9px;background:#08264d;color:#fff;font-weight:900}.pf-financas{margin-top:12px;padding:12px}.pf-financas-titulo{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.pf-financas-titulo div{display:flex;flex-direction:column}.pf-financas-titulo span{color:#718096;font-size:12px}.pf-financas-titulo>strong{font-size:20px}.pf-financas-titulo .positivo{color:#16834f}.pf-financas-titulo .negativo{color:#b03232}.pf-financas-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.pf-financas-grid label{display:flex;flex-direction:column;gap:5px}.pf-financas-grid span{color:#657184;font-size:11px;font-weight:800}.pf-financas-grid input{width:100%;height:38px;border:1px solid #dbe2ea;border-radius:8px;padding:0 8px;font-size:14px;font-weight:800;color:#08264d}
        @media(max-width:700px){.pf-topo{grid-template-columns:1fr;gap:7px;margin-bottom:7px}.pf-mes{padding:7px 9px}.pf-mes span{display:none}.pf-mes input{min-height:34px}.pf-resumo div{padding:7px 8px}.pf-resumo strong{font-size:15px}.pf-painel{padding:5px;border-radius:10px}.pf-cabecalho{display:none}.pf-lista{gap:4px}.pf-linha{grid-template-columns:minmax(102px,1.4fr) 92px 82px 34px;gap:4px;padding:4px;border-radius:8px}.pf-linha input{height:32px;padding:0 5px;font-size:12px}.pf-maira-nome .pf-nome{padding-right:34px}.pf-seta{width:26px;height:26px}.pf-data{font-size:10px!important}.pf-check{width:32px;height:32px;border-radius:7px}.pf-maira-detalhes{padding:8px}.pf-maira-titulo{flex-direction:column;gap:2px}.pf-maira-item{grid-template-columns:minmax(90px,1fr) 55px 82px;gap:5px;font-size:12px}.pf-pagamento{padding:1px 2px 0}.pf-pagamento input{width:128px;height:30px}.pf-adicionar{margin-top:6px}.pf-adicionar input,.pf-adicionar button{height:34px;min-height:34px;font-size:12px}.pf-financas{padding:9px;margin-top:8px}.pf-financas-titulo{margin-bottom:7px}.pf-financas-titulo>strong{font-size:16px}.pf-financas-grid{grid-template-columns:repeat(2,1fr);gap:6px}.pf-financas-grid input{height:34px;font-size:13px}}
        @media(max-width:390px){.pf-linha{grid-template-columns:minmax(88px,1.4fr) 84px 72px 32px}.pf-resumo strong{font-size:13px}.pf-maira-item{grid-template-columns:minmax(80px,1fr) 48px 76px}}
      `}</style>
    </FinanceLayout>
  );
}
