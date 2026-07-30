import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Copy, Check, Save, Trash2 } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { belcredService } from '../services/belcredService.js';
import { createClientInteraction, listClients } from '../services/clientService.js';
import './BelCredSimuladorPage.css';

const BASE_REFERENCIA = 16383.49;

const planos = [
  { parcelas: 24, taxa: 1.91, parcelaBase: 978.28 },
  { parcelas: 30, taxa: 1.97, parcelaBase: 833.22 },
  { parcelas: 36, taxa: 2.02, parcelaBase: 739.04 },
  { parcelas: 48, taxa: 2.06, parcelaBase: 621.09 },
  { parcelas: 60, taxa: 2.10, parcelaBase: 555.84 },
  { parcelas: 72, taxa: 2.19, parcelaBase: 524.95 },
  { parcelas: 84, taxa: 2.28, parcelaBase: 509.99 },
  { parcelas: 96, taxa: 2.32, parcelaBase: 496.62 },
];

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function lerMoeda(valor) {
  const apenasNumeros = String(valor).replace(/\D/g, '');
  return Number(apenasNumeros || 0) / 100;
}

function exibirCampo(valor) {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarData(valor) {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('pt-BR');
}

function BelCredSimuladorPage() {
  const [valor, setValor] = useState(BASE_REFERENCIA);
  const [copiado, setCopiado] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [filtroClienteId, setFiltroClienteId] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const clienteSelecionado = clientes.find((item) => item.id === clienteId);

  const simulacoes = useMemo(
    () =>
      planos.map((plano) => {
        const parcela = (valor / BASE_REFERENCIA) * plano.parcelaBase;
        return {
          ...plano,
          parcela,
          total: parcela * plano.parcelas,
        };
      }),
    [valor],
  );

  async function carregarDados(clientFilter = filtroClienteId) {
    setCarregando(true);
    try {
      const [clients, simulations] = await Promise.all([
        listClients(),
        belcredService.listSimulations(clientFilter || null),
      ]);
      setClientes(clients);
      setHistorico(simulations);
      setMensagem('');
    } catch (error) {
      setMensagem(`Não foi possível carregar os dados: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados('');
  }, []);

  async function aplicarFiltroCliente(event) {
    const value = event.target.value;
    setFiltroClienteId(value);
    setCarregando(true);
    try {
      setHistorico(await belcredService.listSimulations(value || null));
      setMensagem('');
    } catch (error) {
      setMensagem(`Não foi possível filtrar o histórico: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  }

  async function copiarSimulacao() {
    const texto = [
      `Simulação BelCred${clienteSelecionado ? ` - ${clienteSelecionado.name}` : ''}`,
      `Valor do projeto: ${moeda.format(valor)}`,
      '',
      ...simulacoes.map(
        ({ parcelas, parcela, taxa }) =>
          `${parcelas}x de ${moeda.format(parcela)} (${taxa.toFixed(2).replace('.', ',')}% a.m.)`,
      ),
      '',
      'Valores estimados, sujeitos à aprovação e às condições da financeira.',
    ].join('\n');

    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1800);
  }

  async function salvarSimulacao() {
    if (valor <= 0) return;
    setSalvando(true);
    setMensagem('Salvando simulação no Supabase...');
    try {
      await belcredService.saveSimulation({
        clientId: clienteId || null,
        projectValue: valor,
        simulation: {
          referenceBase: BASE_REFERENCIA,
          plans: simulacoes,
        },
      });

      if (clienteId) {
        const planoInicial = simulacoes[0];
        await createClientInteraction(clienteId, {
          type: 'financiamento',
          description: `Simulação BelCred salva para projeto de ${moeda.format(valor)}. Primeira opção: ${planoInicial.parcelas}x de ${moeda.format(planoInicial.parcela)}.`,
          nextActionAt: '',
        });
      }

      await carregarDados(filtroClienteId);
      setMensagem(clienteId
        ? 'Simulação salva e registrada no histórico comercial do cliente.'
        : 'Simulação salva no histórico geral.');
    } catch (error) {
      setMensagem(`Não foi possível salvar: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirSimulacao(id) {
    if (!window.confirm('Excluir esta simulação do histórico?')) return;
    try {
      await belcredService.removeSimulation(id);
      await carregarDados(filtroClienteId);
      setMensagem('Simulação excluída.');
    } catch (error) {
      setMensagem(`Não foi possível excluir: ${error.message}`);
    }
  }

  function reabrirSimulacao(item) {
    setValor(Number(item.project_value || 0));
    setClienteId(item.client_id || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <FinanceLayout
      title="Simulador BelCred"
      subtitle="Calcule, vincule ao cliente e salve as parcelas do financiamento."
      theme="empresa"
    >
      {mensagem && <p className="finance-notice">{mensagem}</p>}

      <section className="belcred-hero">
        <div className="belcred-logo">
          <img src="/belcred-logo.svg" alt="BelCred" />
        </div>

        <div className="belcred-value">
          <label htmlFor="cliente-belcred">Cliente do CRM</label>
          <select id="cliente-belcred" value={clienteId} onChange={(event) => setClienteId(event.target.value)}>
            <option value="">Simulação sem cliente vinculado</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.name} · {cliente.phone}
              </option>
            ))}
          </select>
          <small>Ao selecionar um cliente, a simulação também entra no histórico comercial.</small>
        </div>

        <div className="belcred-value">
          <label htmlFor="valor-financiado">Valor a financiar</label>
          <div className="belcred-money-input">
            <span>R$</span>
            <input
              id="valor-financiado"
              inputMode="decimal"
              value={exibirCampo(valor)}
              onChange={(event) => setValor(lerMoeda(event.target.value))}
              aria-label="Valor a financiar"
            />
          </div>
          <small>Digite o valor total do projeto.</small>
        </div>
      </section>

      <section className="finance-panel belcred-results">
        <div className="finance-panel-header">
          <div>
            <h2>Opções de financiamento</h2>
            <p>Parcelas calculadas para {moeda.format(valor)}</p>
          </div>
          <div className="finance-actions">
            <button type="button" className="belcred-copy" onClick={salvarSimulacao} disabled={!valor || salvando}>
              <Save size={17} />
              {salvando ? 'Salvando...' : 'Salvar simulação'}
            </button>
            <button type="button" className="belcred-copy" onClick={copiarSimulacao} disabled={!valor}>
              {copiado ? <Check size={17} /> : <Copy size={17} />}
              {copiado ? 'Copiado' : 'Copiar simulação'}
            </button>
          </div>
        </div>

        {valor > 0 ? (
          <div className="belcred-grid">
            {simulacoes.map(({ parcelas, taxa, parcela, total }) => (
              <article className="belcred-option" key={parcelas}>
                <div className="belcred-term">
                  <span>{parcelas}x</span>
                  <small>{taxa.toFixed(2).replace('.', ',')}% a.m.</small>
                </div>
                <div className="belcred-installment">
                  <small>Parcela estimada</small>
                  <strong>{moeda.format(parcela)}</strong>
                  <span>Total: {moeda.format(total)}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="belcred-empty">
            <Calculator size={28} />
            <p>Informe um valor para calcular as parcelas.</p>
          </div>
        )}
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Histórico de simulações</h2>
            <p>Últimas 30 simulações salvas no Supabase.</p>
          </div>
          <select className="finance-filter" value={filtroClienteId} onChange={aplicarFiltroCliente}>
            <option value="">Todos os clientes</option>
            {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.name}</option>)}
          </select>
        </div>
        {carregando ? (
          <div className="finance-empty">Carregando histórico...</div>
        ) : historico.length ? (
          historico.map((item) => {
            const melhorPlano = item.simulation?.plans?.[0];
            return (
              <div className="finance-list-item" key={item.id}>
                <div>
                  <strong>{moeda.format(item.project_value)}</strong>
                  <span>
                    {item.clients?.name || 'Sem cliente vinculado'} · {formatarData(item.created_at)}
                    {melhorPlano ? ` · ${melhorPlano.parcelas}x de ${moeda.format(melhorPlano.parcela)}` : ''}
                  </span>
                </div>
                <div className="finance-actions">
                  <button type="button" className="finance-secondary-button" onClick={() => reabrirSimulacao(item)}>Reabrir</button>
                  <button type="button" className="finance-delete" onClick={() => excluirSimulacao(item.id)}><Trash2 size={15} /> Excluir</button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="finance-empty">Nenhuma simulação salva para este filtro.</div>
        )}
      </section>

      <aside className="belcred-note">
        <strong>Importante:</strong> cálculo estimado com base nas condições da
        simulação BelCred de {moeda.format(BASE_REFERENCIA)}. Os valores finais
        podem variar após análise de crédito, tarifas e arredondamentos da financeira.
      </aside>
    </FinanceLayout>
  );
}

export default BelCredSimuladorPage;