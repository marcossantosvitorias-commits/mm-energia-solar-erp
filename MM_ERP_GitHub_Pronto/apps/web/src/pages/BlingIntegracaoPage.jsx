import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileCheck2, Link2, RefreshCw, Send, Unplug, UploadCloud } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import {
  aplicarSaldos,
  BLING_STORAGE_KEYS,
  converterArquivoBling,
  detectarTipoBling,
  lerCSVBling,
  lerLocal,
  mesclarPorId,
  nomeTipoBling,
} from '../components/bling/blingImporters.js';
import './BlingIntegracaoPage.css';

const tiposEsperados = ['contatos', 'produtos', 'saldos', 'caixa', 'pagar', 'receber', 'compras', 'vendas'];

function BlingIntegracaoPage() {
  const [arquivos, setArquivos] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [importando, setImportando] = useState(false);
  const [status, setStatus] = useState({ loading: true, connected: false, successfulSyncs: 0, connection: null });
  const [sincronizando, setSincronizando] = useState(false);

  const porTipo = useMemo(
    () => Object.fromEntries(arquivos.map((arquivo) => [arquivo.tipo, arquivo])),
    [arquivos],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('bling') === 'connected') setMensagem('Bling conectado com sucesso.');
    if (params.get('bling') === 'error') setMensagem(`Não foi possível conectar: ${params.get('message') || 'erro desconhecido'}`);
    carregarStatus();
  }, []);

  async function invocarBling(action) {
    if (!isSupabaseConfigured) throw new Error('Supabase ainda não está configurado na publicação do ERP.');
    const { data, error } = await supabase.functions.invoke('bling-api', { body: { action } });
    if (error) throw new Error(error.message || 'Falha ao acessar a integração com o Bling.');
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function carregarStatus() {
    try {
      const data = await invocarBling('status');
      setStatus({ loading: false, ...data });
    } catch (error) {
      setStatus({ loading: false, connected: false, successfulSyncs: 0, connection: null });
      setMensagem(error?.message || 'Não foi possível verificar a conexão com o Bling.');
    }
  }

  async function conectarBling() {
    try {
      setMensagem('Preparando autorização segura...');
      const { data, error } = await supabase.functions.invoke('bling-oauth-start');
      if (error || !data?.url) throw new Error(error?.message || data?.error || 'Não foi possível iniciar a autorização.');
      window.location.assign(data.url);
    } catch (error) {
      setMensagem(error?.message || 'Não foi possível conectar ao Bling.');
    }
  }

  async function desconectarBling() {
    if (!window.confirm('Desconectar o Bling? Os dados já enviados permanecerão no Bling e no ERP.')) return;
    try {
      await invocarBling('disconnect');
      setStatus({ loading: false, connected: false, successfulSyncs: 0, connection: null });
      setMensagem('Bling desconectado. Nenhum dado foi apagado.');
    } catch (error) {
      setMensagem(error?.message || 'Não foi possível desconectar.');
    }
  }

  async function sincronizarClientes() {
    if (!window.confirm('Enviar ao Bling os clientes que ainda não possuem ID de sincronização? Os clientes já enviados serão ignorados.')) return;
    setSincronizando(true);
    setMensagem('Sincronizando clientes com o Bling...');
    try {
      const resultado = await invocarBling('sync-clients');
      setMensagem(`${resultado.success} clientes enviados. ${resultado.failed} falharam. ${resultado.total} analisados.`);
      await carregarStatus();
    } catch (error) {
      setMensagem(error?.message || 'Não foi possível sincronizar os clientes.');
    } finally {
      setSincronizando(false);
    }
  }

  async function selecionarArquivos(event) {
    const selecionados = Array.from(event.target.files || []);
    event.target.value = '';
    setMensagem('');

    const lidos = [];
    for (const arquivo of selecionados) {
      try {
        const linhas = lerCSVBling(await arquivo.text());
        const tipo = detectarTipoBling(arquivo.name, linhas);
        if (!tipo) throw new Error('tipo não reconhecido');
        const registros = converterArquivoBling(tipo, linhas);
        lidos.push({ nome: arquivo.name, tipo, registros, erro: '' });
      } catch (error) {
        lidos.push({ nome: arquivo.name, tipo: null, registros: [], erro: error.message });
      }
    }

    setArquivos((atuais) => {
      const mapa = new Map(atuais.map((item) => [item.tipo || item.nome, item]));
      lidos.forEach((item) => mapa.set(item.tipo || item.nome, item));
      return Array.from(mapa.values());
    });
  }

  function importar() {
    const validos = arquivos.filter((arquivo) => arquivo.tipo && !arquivo.erro);
    if (!validos.length) {
      setMensagem('Selecione pelo menos um arquivo CSV válido do Bling.');
      return;
    }

    if (!window.confirm(`Importar ${validos.reduce((soma, arquivo) => soma + arquivo.registros.length, 0)} registros do Bling? Registros com o mesmo ID serão atualizados, não duplicados.`)) return;

    setImportando(true);
    try {
      const resumo = [];
      let equipamentosAtualizados = null;

      validos.forEach((arquivo) => {
        if (arquivo.tipo === 'saldos') return;
        const chave = BLING_STORAGE_KEYS[arquivo.tipo];
        const resultado = mesclarPorId(lerLocal(chave), arquivo.registros);
        localStorage.setItem(chave, JSON.stringify(resultado.dados));
        resumo.push(`${nomeTipoBling(arquivo.tipo)}: ${resultado.adicionados} novos e ${resultado.atualizados} atualizados`);
        if (arquivo.tipo === 'produtos') equipamentosAtualizados = resultado.dados;
      });

      const arquivoSaldos = porTipo.saldos;
      if (arquivoSaldos) {
        const equipamentos = equipamentosAtualizados || lerLocal(BLING_STORAGE_KEYS.produtos);
        const resultado = aplicarSaldos(equipamentos, arquivoSaldos.registros);
        localStorage.setItem(BLING_STORAGE_KEYS.produtos, JSON.stringify(resultado.dados));
        resumo.push(`Estoque: ${resultado.atualizados} produtos atualizados`);
      }

      const historico = lerLocal(BLING_STORAGE_KEYS.historico);
      historico.unshift({
        id: crypto.randomUUID(),
        data: new Date().toISOString(),
        arquivos: validos.map((arquivo) => arquivo.nome),
        registros: validos.reduce((soma, arquivo) => soma + arquivo.registros.length, 0),
      });
      localStorage.setItem(BLING_STORAGE_KEYS.historico, JSON.stringify(historico.slice(0, 30)));
      setMensagem(`Importação concluída. ${resumo.join(' · ')}. Recarregue o ERP para atualizar todos os painéis.`);
    } catch (error) {
      setMensagem(error?.message || 'Não foi possível concluir a importação.');
    } finally {
      setImportando(false);
    }
  }

  function limparSelecao() {
    setArquivos([]);
    setMensagem('');
  }

  return (
    <FinanceLayout
      title="Integração com o Bling"
      subtitle="Conecte a API oficial para enviar dados do MM ERP ao Bling sem apagar os cadastros existentes."
    >
      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Conexão oficial com a API</h2>
            <p>Os tokens ficam somente nas Edge Functions do Supabase e nunca são expostos no navegador ou no GitHub.</p>
          </div>
          <span className={status.connected ? 'finance-success' : 'finance-warning'}>
            {status.loading ? 'Verificando...' : status.connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>

        <div className="bling-actions">
          {!status.connected ? (
            <button type="button" className="finance-button" onClick={conectarBling}>
              <Link2 size={16} /> Conectar ao Bling
            </button>
          ) : (
            <>
              <button type="button" className="finance-button" onClick={sincronizarClientes} disabled={sincronizando}>
                <Send size={16} /> {sincronizando ? 'Enviando clientes...' : 'Enviar clientes ao Bling'}
              </button>
              <button type="button" className="finance-secondary-button" onClick={desconectarBling}>
                <Unplug size={16} /> Desconectar
              </button>
            </>
          )}
        </div>
        {status.connected ? <p className="crm-message">Sincronizações concluídas: {status.successfulSyncs || 0}. Clientes que já possuem ID do Bling não são reenviados.</p> : null}
        {mensagem ? <p className="crm-message">{mensagem}</p> : null}
      </section>

      <section className="bling-status-grid">
        {tiposEsperados.map((tipo) => {
          const arquivo = porTipo[tipo];
          return (
            <article className={arquivo ? 'ready' : ''} key={tipo}>
              {arquivo ? <CheckCircle2 size={20} /> : <FileCheck2 size={20} />}
              <div>
                <strong>{nomeTipoBling(tipo)}</strong>
                <span>{arquivo ? `${arquivo.registros.length} registros · ${arquivo.nome}` : 'Aguardando CSV'}</span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="finance-panel bling-import-panel">
        <div className="bling-drop">
          <UploadCloud size={38} />
          <h2>Importação manual de segurança</h2>
          <p>O recurso de CSV continua disponível durante a implantação da API e não apaga nenhuma informação.</p>
          <label className="finance-button finance-import-button">
            Escolher arquivos
            <input type="file" accept=".csv,text/csv" multiple onChange={selecionarArquivos} />
          </label>
        </div>

        {arquivos.some((arquivo) => arquivo.erro) && (
          <div className="bling-errors">
            {arquivos.filter((arquivo) => arquivo.erro).map((arquivo) => (
              <p key={arquivo.nome}><strong>{arquivo.nome}:</strong> {arquivo.erro}</p>
            ))}
          </div>
        )}

        <div className="bling-actions">
          <button type="button" className="finance-secondary-button" onClick={limparSelecao}>Limpar seleção</button>
          <button type="button" className="finance-button" onClick={importar} disabled={importando || !arquivos.length}>
            <RefreshCw size={16} /> {importando ? 'Importando...' : 'Confirmar importação'}
          </button>
        </div>
      </section>

      <aside className="bling-security-note">
        A sincronização é inicialmente manual e não destrutiva. Nenhum cliente local é apagado; o ERP apenas registra o ID devolvido pelo Bling para impedir duplicidades.
      </aside>
    </FinanceLayout>
  );
}

export default BlingIntegracaoPage;
