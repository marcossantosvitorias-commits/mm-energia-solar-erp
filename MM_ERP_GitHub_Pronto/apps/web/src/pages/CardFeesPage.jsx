import React, { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { cardFeeService } from '../services/cardFeeService.js';

const PROVIDER = 'My Gateway';

export default function CardFeesPage() {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const canEdit = ['admin', 'financeiro'].includes(user?.role);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await cardFeeService.list(PROVIDER);
        if (active) setFees(data);
      } catch (error) {
        if (active) setMessage(`Não foi possível carregar as taxas: ${error.message}`);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const average = useMemo(() => {
    if (!fees.length) return 0;
    return fees.reduce((sum, item) => sum + Number(item.fee_percent || 0), 0) / fees.length;
  }, [fees]);

  const updateFee = (installments, value) => {
    setFees((current) => current.map((item) => (
      item.installments === installments ? { ...item, fee_percent: value } : item
    )));
  };

  async function save() {
    if (!canEdit) return;
    setSaving(true);
    try {
      const saved = await cardFeeService.saveMany(PROVIDER, fees);
      setFees(saved.sort((a, b) => a.installments - b.installments));
      setMessage('Taxas de cartão atualizadas no Supabase.');
    } catch (error) {
      setMessage(`Não foi possível salvar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FinanceLayout title="Taxas de cartão" subtitle="Tabela usada para formar preços parcelados sem reduzir a margem da empresa.">
      {message && <p className="finance-notice">{message}</p>}
      {loading ? <div className="finance-empty">Carregando taxas...</div> : (
        <>
          <section className="finance-grid">
            <article className="finance-panel"><span>Operadora</span><strong className="dashboard-big-number">{PROVIDER}</strong></article>
            <article className="finance-panel"><span>Planos ativos</span><strong className="dashboard-big-number">{fees.length}</strong></article>
            <article className="finance-panel"><span>Taxa média</span><strong className="dashboard-big-number">{average.toFixed(2).replace('.', ',')}%</strong></article>
          </section>

          <section className="finance-panel">
            <div className="finance-panel-header">
              <div><h2>Tabela de parcelamento</h2><p>Valores cadastrados conforme a tabela enviada da My Gateway.</p></div>
              {canEdit && <button type="button" className="finance-button inline-button" onClick={save} disabled={saving}><Save size={16} /> {saving ? 'Salvando...' : 'Salvar taxas'}</button>}
            </div>
            <div className="finance-table-wrapper">
              <table className="finance-table">
                <thead><tr><th>Parcelamento</th><th>Taxa</th><th>Exemplo sobre R$ 10.000,00</th></tr></thead>
                <tbody>
                  {fees.map((item) => {
                    const gross = 10000 / (1 - Number(item.fee_percent || 0) / 100);
                    return (
                      <tr key={item.installments}>
                        <td><strong>{item.installments === 1 ? 'Crédito à vista' : `${item.installments}x`}</strong></td>
                        <td><input type="number" step="0.01" min="0" value={item.fee_percent} disabled={!canEdit} onChange={(event) => updateFee(item.installments, event.target.value)} />%</td>
                        <td>{gross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · {item.installments}x de {(gross / item.installments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </FinanceLayout>
  );
}
