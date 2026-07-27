import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileCheck2, RefreshCw, UploadCloud } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
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
import { blingDatabase } from '../services/erpDatabaseService.js';
import { financeDatabase } from '../services/financeDatabaseService.js';
import './BlingIntegracaoPage.css';

const tiposEsperados = ['contatos', 'produtos', 'saldos', 'caixa', 'pagar', 'receber', 'compras', 'vendas'];

async function salvarArquivoNoBanco(arquivo) {
  switch (arquivo.tipo) {
    case 'contatos':
      return blingDatabase.contacts(arquivo.registros);
    case 'produtos':
      return blingDatabase.products(arquivo.registros);
    case 'caixa':
      return financeDatabase.importTransactions(arquivo.registros);
    case 'pagar':
      return financeDatabase.importPayables(arquivo.registros);
    case 'receber':
      return financeDatabase.importReceivables(arquivo.registros);
    case 'compras':
      return blingDatabase.purchases(arquivo.registros);
    case 'vendas':
      return blingDatabase.sales(arquivo.registros);
    default:
      return { saved: 0 };
  }
}

function BlingIntegracaoPage() {
  const [arquivos, setArquivos] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [importando, setImportando] = useState(false);

  const porTipo = useMemo(
    () => Object.fromEntries(arquivos.map((arquivo) => [arquivo.tipo, arquivo])),
    [arquivos],
  );

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

  async function importar() {
    const validos = arquivos.filter((arquivo) => arquivo.tipo && !arquivo.erro);
    if (!validos.length) {
      setMensagem('Selecione pelo menos um arquivo CSV válido do Bling.');
      return;
    }

    const total = validos.reduce((soma, arquivo) => soma + arquivo.registros.length, 0);
    if (!window.confirm(`Importar ${total} registros do Bling para o banco de dados? Registros com o mesmo ID serão atualizados, não duplicados.`)) return;

    setImportando(true);
    setMensagem('Salvando os dados no banco...');

    try {
      const resumo = [];
      let equipamentosAtualizados = null;

      for (const arquivo of validos.filter((item) => item.tipo !== 'saldos')) {
        const resultadoBanco = await salvarArquivoNoBanco(arquivo);
        const falhas = Number(resultadoBanco?.failed || 0);
        const salvos = Number(resultadoBanco?.saved ?? arquivo.registros.length);

        const chave = BLING_STORAGE_KEYS[arquivo.tipo];
        if (chave) {
          const resultadoLocal = mesclarPorId(lerLocal(chave), arquivo.registros);
          localStorage.setItem(chave, JSON.stringify(resultadoLocal.dados));
          if (arquivo.tipo === 'produtos') equipamentosAtualizados = resultadoLocal.dados;
        }

        await blingDatabase.registerImport(arquivo.nome, arquivo.tipo, salvos);
        resumo.push(`${nomeTipoBling(arquivo.tipo)}: ${salvos} salvos${falhas ? ` e ${falhas} com erro` : ''}`);
      }

      const arquivoSaldos = porTipo.saldos;
      if (arquivoSaldos) {
        const resultadoBanco = await blingDatabase.stock(arquivoSaldos.registros);
        const equipamentos = equipamentosAtualizados || lerLocal(BLING_STORAGE_KEYS.produtos);
        const resultadoLocal = aplicarSaldos(equipamentos, arquivoSaldos.registros);
        localStorage.setItem(BLING_STORAGE_KEYS.produtos, JSON.stringify(resultadoLocal.dados));
        await blingDatabase.registerImport(arquivoSaldos.nome, arquivoSaldos.tipo, resultadoBanco.saved);
        resumo.push(`Estoque: ${resultadoBanco.saved} registros enviados ao banco`);
      }

      const historico = lerLocal(BLING_STORAGE_KEYS.historico);
      historico.unshift({
        id: crypto.randomUUID(),
        data: new Date().toISOString(),
        arquivos: validos.map((arquivo) => arquivo.nome),
        registros: total,
        destino: 'Supabase',
      });
      localStorage.setItem(BLING_STORAGE_KEYS.historico, JSON.stringify(historico.slice(0, 30)));

      setMensagem(`Importação concluída no banco de dados. ${resumo.join(' · ')}.`);
    } catch (error) {
      console.error('Erro ao importar dados do Bling:', error);
      setMensagem(error?.message || 'Não foi possível salvar os dados do Bling no banco.');
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
      subtitle="Importe os relatórios CSV do Bling diretamente para o banco de dados do ERP."
    >
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
          <h2>Selecionar arquivos do Bling</h2>
          <p>Você pode escolher os oito CSVs ao mesmo tempo. O ERP reconhece cada relatório e salva os dados no Supabase.</p>
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
          <button type="button" className="finance-secondary-button" onClick={limparSelecao}>
            Limpar seleção
          </button>
          <button type="button" className="finance-button" onClick={importar} disabled={importando || !arquivos.length}>
            <RefreshCw size={16} /> {importando ? 'Salvando no banco...' : 'Confirmar importação'}
          </button>
        </div>
        {mensagem ? <p className="crm-message">{mensagem}</p> : null}
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Como os dados serão distribuídos</h2>
            <p>O ID original do Bling é preservado para atualizar o registro existente sem duplicá-lo.</p>
          </div>
        </div>
        <div className="bling-map">
          <div><strong>Contatos</strong><span>Clientes e fornecedores no banco central</span></div>
          <div><strong>Produtos + estoque</strong><span>Catálogo, custos, preços e quantidades</span></div>
          <div><strong>Caixa e bancos</strong><span>Movimentações do financeiro</span></div>
          <div><strong>Contas a pagar</strong><span>Fornecedores, vencimentos e baixas</span></div>
          <div><strong>Contas a receber</strong><span>Clientes, vencimentos e recebimentos</span></div>
          <div><strong>Compras e vendas</strong><span>Pedidos e histórico comercial</span></div>
        </div>
      </section>

      <aside className="bling-security-note">
        Os CSVs são processados no navegador e enviados somente ao banco Supabase da MM Energia Solar. Nenhum dado de cliente é gravado no GitHub.
      </aside>
    </FinanceLayout>
  );
}

export default BlingIntegracaoPage;
