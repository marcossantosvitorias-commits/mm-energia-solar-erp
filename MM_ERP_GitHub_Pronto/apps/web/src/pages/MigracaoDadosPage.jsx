import React, { useMemo, useState } from 'react';
import { DatabaseBackup, Download, ShieldCheck, Upload, CloudUpload } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import {
  collectLocalErpData,
  downloadLocalErpBackup,
  getMigrationStatus,
  restoreLocalErpBackup,
} from '../services/localDataSafety.js';
import { migrateLocalDataToSupabase } from '../services/supabaseMigrationService.js';
import { isSupabaseConfigured } from '../lib/supabase.js';

const LABELS = {
  'mm-erp-clients': 'Clientes e leads',
  'mm-erp-movimentacoes-v2': 'Movimentações financeiras',
  'mm-erp-contas-pagar-v2': 'Contas a pagar',
  'mm-erp-contas-receber-v2': 'Contas a receber',
  'mm-erp-equipamentos-v2': 'Equipamentos',
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
  const [migrationStatus, setMigrationStatus] = useState(() => getMigrationStatus());
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = useMemo(
    () => Object.entries(snapshot.data).map(([key, value]) => ({
      key,
      label: LABELS[key] || key,
      count: countValue(value),
    })),
    [snapshot],
  );

  const totalRecords = rows.reduce((total, row) => total + row.count, 0);

  const refresh = () => {
    setSnapshot(collectLocalErpData());
    setMigrationStatus(getMigrationStatus());
  };

  const handleBackup = () => {
    const backup = downloadLocalErpBackup();
    setSnapshot(backup);
    setMessage('Backup baixado. Guarde o arquivo em local seguro antes de migrar.');
  };

  const handleRestore = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const backup = JSON.parse(await file.text());
      const restoredKeys = restoreLocalErpBackup(backup);
      refresh();
      setMessage(`${restoredKeys} conjuntos de dados foram restaurados no navegador. Recarregue o ERP para visualizar tudo.`);
    } catch (error) {
      setMessage(error?.message || 'Não foi possível restaurar o backup.');
    }
  };

  const handleMigration = async () => {
    if (!isSupabaseConfigured) {
      setMessage('As variáveis do Supabase ainda não foram configuradas na publicação da Hostinger.');
      return;
    }

    const confirmed = window.confirm(
      'Confirma a cópia dos dados locais para o Supabase? Os dados do navegador serão preservados e nada será apagado.',
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage('Copiando dados para o banco central...');
    try {
      const summary = await migrateLocalDataToSupabase();
      refresh();
      setMessage(`${summary.records} registros processados com segurança. Os dados locais continuam preservados.`);
    } catch (error) {
      setMessage(error?.message || 'Não foi possível concluir a migração. Nenhum dado local foi apagado.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FinanceLayout
      title="Proteção e migração dos dados"
      subtitle="Faça backup e copie os dados já cadastrados para o Supabase sem apagar o conteúdo do navegador."
    >
      <section className="finance-grid">
        <article className="finance-stat-card tone-primary">
          <span>Registros locais encontrados</span>
          <strong>{totalRecords}</strong>
          <small>{rows.length} conjuntos de dados no navegador</small>
        </article>
        <article className="finance-stat-card">
          <span>Banco central</span>
          <strong>{isSupabaseConfigured ? 'Configurado' : 'Pendente'}</strong>
          <small>Supabase PostgreSQL</small>
        </article>
        <article className="finance-stat-card tone-positive">
          <span>Dados locais</span>
          <strong>Preservados</strong>
          <small>A migração não remove o localStorage</small>
        </article>
        <article className="finance-stat-card tone-warning">
          <span>Última migração</span>
          <strong>{migrationStatus?.completedAt ? 'Concluída' : 'Ainda não feita'}</strong>
          <small>{migrationStatus?.completedAt ? new Date(migrationStatus.completedAt).toLocaleString('pt-BR') : 'Faça o backup primeiro'}</small>
        </article>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Etapas de segurança</h2>
            <p>Siga a ordem abaixo. A cópia para o Supabase é de mão única e não apaga os dados atuais.</p>
          </div>
          <ShieldCheck size={24} />
        </div>

        <div className="finance-panel-actions">
          <button type="button" className="finance-secondary-button" onClick={handleBackup}>
            <Download size={16} /> Baixar backup JSON
          </button>
          <label className="finance-secondary-button finance-import-button">
            <Upload size={16} /> Restaurar backup
            <input type="file" accept="application/json,.json" onChange={handleRestore} />
          </label>
          <button type="button" className="finance-button" onClick={handleMigration} disabled={busy}>
            <CloudUpload size={16} /> {busy ? 'Migrando...' : 'Copiar para o Supabase'}
          </button>
          <button type="button" className="finance-secondary-button" onClick={refresh}>
            <DatabaseBackup size={16} /> Atualizar contagem
          </button>
        </div>

        {message ? <p className="crm-message">{message}</p> : null}
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <div>
            <h2>Dados encontrados neste navegador</h2>
            <p>Somente os módulos compatíveis serão copiados agora; os demais permanecem protegidos no backup.</p>
          </div>
        </div>
        <div className="finance-table-wrapper">
          <table className="finance-table">
            <thead><tr><th>Módulo</th><th>Chave local</th><th>Registros</th><th>Destino atual</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.key}>
                  <td><strong>{row.label}</strong></td>
                  <td>{row.key}</td>
                  <td>{row.count}</td>
                  <td>{['mm-erp-clients', 'mm-erp-movimentacoes-v2', 'mm-erp-contas-pagar-v2', 'mm-erp-contas-receber-v2'].includes(row.key) ? 'Supabase + navegador' : 'Backup local protegido'}</td>
                </tr>
              )) : <tr><td className="finance-empty-cell" colSpan="4">Nenhum dado local encontrado neste navegador.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </FinanceLayout>
  );
}
