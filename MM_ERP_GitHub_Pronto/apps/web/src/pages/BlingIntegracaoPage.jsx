import React, { useMemo, useState } from 'react';
import { CheckCircle2, FileCheck2, RefreshCw, UploadCloud } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import {
  converterArquivoBling,
  detectarTipoBling,
  lerCSVBling,
  nomeTipoBling,
} from '../components/bling/blingImporters.js';
import { blingDatabase } from '../services/erpDatabaseService.js';
import { financeDatabase } from '../services/financeDatabaseService.js';
import './BlingIntegracaoPage.css';

const tiposEsperados = ['contatos', 'produtos', 'saldos', 'caixa', 'pagar', 'receber', 'compras', 'vendas'];

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

    if (!window.confirm(`Importar ${validos.reduce((soma, arquivo) => soma + arquivo.registros.length, 0)} registros do Bling? Registros com o mesmo ID serão atualizados, não duplicados.`)) return;

    setImportando(true);
    try {
      const resumo = [];
      for (const arquivo of validos) {
        let resultado;
        if (arquivo.tipo === 'contatos') resultado = await blingDatabase.contacts(arquivo.registros);
        if (arquivo.tipo === 'produtos') resultado = await blingDatabase.products(arquivo.registros);
        if (arquivo.tipo === 'saldos') resultado = await blingDatabase.stock(arquivo.registros);
        if (arquivo.tipo === 'caixa') resultado = await financeDatabase.importTransactions(arquivo.registros);
        if (arquivo.tipo === 'pagar') resultado = await financeDatabase.importPayables(arquivo.registros);
        if (arquivo.tipo === 'receber') resultado = await financeDatabase.importReceivables(arquivo.registros);
        if (arquivo.tipo === 'compras') resultado = await blingDatabase.purchases(arquivo.registros);
        if (arquivo.tipo === 'vendas') resultado = await blingDatabase.sales(arquivo.registros);
        await blingDatabase.registerImport(arquivo.nome, arquivo.tipo, arquivo.registros.length);
        resumo.push(`${nomeTipoBling(arquivo.tipo)}: ${resultado?.saved ?? arquivo.registros.length} gravados`);
      }
      setMensagem(`Importação concluída no Supabase. ${resumo.join(' · ')}.`);
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
      subtitle="Importe os relatórios CSV do Bling com validação e controle de duplicidades."
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
          <p>Você pode escolher os oito CSVs ao mesmo tempo. O ERP reconhece cada relatório automaticamente.</p>
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
            <RefreshCw size={16} /> {importando ? 'Importando...' : 'Confirmar importação'}
          </button>
        </div>
        {mensagem ? <p className="crm-message">{mensagem}</p> : null}
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Como os dados serão distribuídos</h2>
            <p>O ID original do Bling é preservado para que a próxima importação atualize o registro existente.</p>
          </div>
        </div>
        <div className="bling-map">
          <div><strong>Contatos</strong><span>Base de contatos importados do Bling</span></div>
          <div><strong>Produtos + estoque</strong><span>Catálogo de equipamentos e quantidades</span></div>
          <div><strong>Caixa e bancos</strong><span>Fluxo de caixa do Financeiro</span></div>
          <div><strong>Contas a pagar</strong><span>Fornecedores, vencimentos e baixas</span></div>
          <div><strong>Contas a receber</strong><span>Clientes, vencimentos e recebimentos</span></div>
          <div><strong>Compras e vendas</strong><span>Histórico comercial preservado para novos módulos</span></div>
        </div>
      </section>

      <aside className="bling-security-note">
        Os CSVs são processados no navegador e os registros validados são gravados diretamente no Supabase com controle de acesso.
      </aside>
    </FinanceLayout>
  );
}

export default BlingIntegracaoPage;
