import React, { useEffect, useMemo, useState } from 'react';
import { CloudUpload, DatabaseBackup, Download, ShieldCheck } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { collectLocalErpData, downloadLocalErpBackup } from '../services/localDataSafety.js';
import { migrateLocalDataToSupabase } from '../services/supabaseMigrationService.js';
import { settingsDatabase } from '../services/businessDatabaseService.js';
import { isSupabaseConfigured } from '../lib/supabase.js';

const LABELS = {
  'mm-erp-clients': 'Clientes e leads',
  'mm-erp-movimentacoes-v2': 'Movimentações da empresa',
  'mm-erp-contas-pagar-v2': 'Contas a pagar',
  'mm-erp-contas-receber-v2': 'Contas a receber',
  'mm-erp-marcos-v2': 'Financeiro do Marcos',
  'mm-erp-equipamentos-v1': 'Equipamentos',
  'mm-erp-equipamentos-v2': 'Equipamentos',
  'mm-erp-contratos-v1': 'Contratos',
  'mm-erp-cotacoes-belenus-config-v1': 'Configuração de preços Belenus',
  'mm-erp-tributos-v2': 'Tributos',
  'mm-erp-belcred-simulacoes': 'Simulações BelCred',
  'mm-erp-belenus-cotacoes': 'Cotações Belenus',
};

function countValue(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  return value === null || value === undefined || value === '' ? 0 : 1;
}

export default function MigracaoDadosPage() {
  const [snapshot, setSnapshot] = useState(() => collectLocalErpData());
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    settingsDatabase.get('browser_data_migration', null)
      .then(setMigrationStatus)
      .catch(() => {});
  }, []);

  const rows = useMemo(
    () => Object.entries(snapshot.data).map(([key, value]) => ({ key, label: LABELS[key] || key, count: countValue(value) })),
    [snapshot],
  );
  const totalRecords = rows.reduce((total, row) => total + row.count, 0);

  const refresh = () => setSnapshot(collectLocalErpData());

  const handleBackup = () => {
    const backup = downloadLocalErpBackup();
    setSnapshot(backup);
    setMessage('Backup baixado. Guarde o arquivo até confirmar os dados no Supabase.');
  };

  const handleMigration = async () => {
    if (!isSupabaseConfigured) {
      setMessage('As variáveis do Supabase ainda não foram configuradas na publicação da Hostinger.');
      return;
    }

    const confirmed = window.confirm(
      'Confirma a migração? Primeiro todos os dados serão gravados no Supabase. Somente após sucesso, os dados antigos do navegador serão removidos.',
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage('Migrando e verificando os dados no banco central...');
    try {
      const summary = await migrateLocalDataToSupabase({ clearAfterSuccess: true });
      setMigrationStatus(summary);
      setSnapshot(collectLocalErpData());
      setMessage(`${summary.records} registros processados no Supabase e ${summary.localKeysRemoved} conjuntos antigos removidos do navegador.`);
    } catch (error) {
      setMessage(error?.message || 'Não foi possível concluir a migração. Os dados locais não foram apagados.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FinanceLayout title="Migração para o Supabase" subtitle="Transfira os dados antigos e elimine a dependência do armazenamento local.">
      <section className="finance-grid">
        <article className="finance-stat-card tone-primary"><span>Registros locais encontrados</span><strong>{totalRecords}</strong><small>{rows.length} conjuntos antigos no navegador</small></article>
        <article className="finance-stat-card"><span>Banco central</span><strong>{isSupabaseConfigured ? 'Configurado' : 'Pendente'}</strong><small>Supabase PostgreSQL</small></article>
        <article className="finance-stat-card tone-positive"><span>Fonte oficial</span><strong>Supabase</strong><small>Todos os módulos do ERP</small></article>
        <article className="finance-stat-card tone-warning"><span>Última migração</span><strong>{migrationStatus?.completedAt ? 'Concluída' : 'Ainda não feita'}</strong><small>{migrationStatus?.completedAt ? new Date(migrationStatus.completedAt).toLocaleString('pt-BR') : 'Baixe o backup antes de começar'}</small></article>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header"><div><h2>Migração segura</h2><p>O navegador só é limpo depois que todas as gravações no Supabase terminam sem erro.</p></div><ShieldCheck size={24} /></div>
        <div className="finance-panel-actions">
          <button type="button" className="finance-secondary-button" onClick={handleBackup}><Download size={16} /> Baixar backup JSON</button>
          <button type="button" className="finance-button" onClick={handleMigration} disabled={busy || !isSupabaseConfigured}><CloudUpload size={16} /> {busy ? 'Migrando...' : 'Migrar e limpar navegador'}</button>
          <button type="button" className="finance-secondary-button" onClick={refresh}><DatabaseBackup size={16} /> Atualizar contagem</button>
        </div>
        {message ? <p className="crm-message">{message}</p> : null}
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header"><div><h2>Dados encontrados neste navegador</h2><p>Todos os conjuntos são enviados ao banco; formatos antigos desconhecidos ficam preservados como dados legados.</p></div></div>
        <div className="finance-table-wrapper">
          <table className="finance-table">
            <thead><tr><th>Módulo</th><th>Chave local</th><th>Registros</th><th>Destino</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((row) => <tr key={row.key}><td><strong>{row.label}</strong></td><td>{row.key}</td><td>{row.count}</td><td>Supabase</td></tr>) : <tr><td className="finance-empty-cell" colSpan="4">Nenhum dado empresarial permanece neste navegador.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </FinanceLayout>
  );
}
