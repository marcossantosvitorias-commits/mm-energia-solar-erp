import React, { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Phone, Plus, Radar, Search, Trash2 } from 'lucide-react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';

const STORAGE_KEY = 'mm-erp-radar-solar-v1';
const emptyForm = {
  nome: '',
  cidade: 'Bauru',
  bairro: '',
  telefone: '',
  tipo: 'Comercial',
  consumo: '',
  observacoes: '',
};

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ProspeccaoSolarPage() {
  const [prospects, setProspects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setProspects(Array.isArray(saved) ? saved : []);
    } catch {
      setProspects([]);
    }
  }, []);

  const persistir = (items) => {
    setProspects(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const adicionar = (event) => {
    event.preventDefault();
    if (!form.nome.trim()) return;
    persistir([
      {
        id: crypto.randomUUID(),
        ...form,
        nome: form.nome.trim(),
        status: 'Novo',
        criadoEm: new Date().toISOString(),
      },
      ...prospects,
    ]);
    setForm(emptyForm);
  };

  const atualizarStatus = (id, novoStatus) => {
    persistir(prospects.map((item) => item.id === id ? { ...item, status: novoStatus } : item));
  };

  const excluir = (id) => {
    if (!window.confirm('Excluir esta oportunidade do Radar Solar?')) return;
    persistir(prospects.filter((item) => item.id !== id));
  };

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return prospects.filter((item) => {
      const correspondeStatus = status === 'todos' || item.status === status;
      const correspondeBusca = !termo || [item.nome, item.cidade, item.bairro, item.telefone, item.tipo]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo));
      return correspondeStatus && correspondeBusca;
    });
  }, [prospects, busca, status]);

  const totalConsumo = prospects.reduce((soma, item) => soma + Number(item.consumo || 0), 0);

  return (
    <FinanceLayout
      title="Radar Solar"
      subtitle="Prospecção comercial de empresas e imóveis com potencial para energia solar."
    >
      <section className="finance-dashboard-grid">
        <article className="finance-kpi-card"><span>Oportunidades</span><strong>{prospects.length}</strong><small>prospectos cadastrados</small></article>
        <article className="finance-kpi-card"><span>Em contato</span><strong>{prospects.filter((item) => item.status === 'Contato').length}</strong><small>abordagens em andamento</small></article>
        <article className="finance-kpi-card"><span>Consumo mapeado</span><strong>{moeda.format(totalConsumo)}</strong><small>estimativa mensal informada</small></article>
      </section>

      <section className="finance-panel" style={{ marginTop: 18 }}>
        <div className="finance-panel-header">
          <div><h2><Radar size={22} /> Nova oportunidade</h2><p>Cadastre rapidamente um imóvel ou empresa identificado para prospecção.</p></div>
        </div>
        <form className="finance-form" onSubmit={adicionar}>
          <label className="finance-field"><span>Nome da empresa ou responsável *</span><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></label>
          <label className="finance-field"><span>Tipo</span><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option>Comercial</option><option>Residencial</option><option>Rural</option><option>Industrial</option></select></label>
          <label className="finance-field"><span>Cidade</span><input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></label>
          <label className="finance-field"><span>Bairro</span><input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></label>
          <label className="finance-field"><span>WhatsApp</span><input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} inputMode="tel" /></label>
          <label className="finance-field"><span>Conta/consumo estimado (R$)</span><input type="number" min="0" step="0.01" value={form.consumo} onChange={(e) => setForm({ ...form, consumo: e.target.value })} /></label>
          <label className="finance-field finance-field-wide"><span>Observações</span><textarea rows="3" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></label>
          <div className="finance-actions"><button className="finance-button" type="submit"><Plus size={18} /> Adicionar ao radar</button></div>
        </form>
      </section>

      <section className="finance-panel" style={{ marginTop: 18 }}>
        <div className="finance-panel-header"><div><h2>Oportunidades mapeadas</h2><p>Acompanhe o estágio de cada prospecção comercial.</p></div></div>
        <div className="finance-form">
          <label className="finance-field"><span>Pesquisar</span><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Search size={18} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, cidade, bairro ou telefone" /></div></label>
          <label className="finance-field"><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos</option><option>Novo</option><option>Contato</option><option>Visita</option><option>Proposta</option><option>Fechado</option><option>Descartado</option></select></label>
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          {filtrados.map((item) => (
            <article className="finance-list-item" key={item.id}>
              <div>
                <strong style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Building2 size={17} /> {item.nome}</strong>
                <span><MapPin size={14} /> {[item.bairro, item.cidade].filter(Boolean).join(' · ') || 'Local não informado'}</span>
                {item.telefone && <span><Phone size={14} /> {item.telefone}</span>}
                <span>{item.tipo} · {item.consumo ? `Conta estimada: ${moeda.format(item.consumo)}` : 'Consumo não informado'}</span>
                {item.observacoes && <small>{item.observacoes}</small>}
              </div>
              <div className="finance-actions">
                <select value={item.status} onChange={(e) => atualizarStatus(item.id, e.target.value)} aria-label="Status da oportunidade"><option>Novo</option><option>Contato</option><option>Visita</option><option>Proposta</option><option>Fechado</option><option>Descartado</option></select>
                {item.telefone && <button type="button" onClick={() => window.open(`https://wa.me/55${String(item.telefone).replace(/\D/g, '').replace(/^55/, '')}`, '_blank')}><Phone size={16} /> WhatsApp</button>}
                <button type="button" className="finance-delete" onClick={() => excluir(item.id)}><Trash2 size={16} /> Excluir</button>
              </div>
            </article>
          ))}
          {!filtrados.length && <div className="finance-empty">Nenhuma oportunidade encontrada no Radar Solar.</div>}
        </div>
      </section>
    </FinanceLayout>
  );
}
