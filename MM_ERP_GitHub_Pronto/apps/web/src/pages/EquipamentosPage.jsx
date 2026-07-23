import React, { useEffect, useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import FinanceTable from '../components/finance/FinanceTable.jsx';
import { carregarDados, salvarDados, gerarId, formatarMoeda } from '../components/finance/storage.js';

const CHAVE = 'mm-erp-equipamentos-v1';
const iniciais = [
  { id: gerarId(), tipo: 'Placa', marca: 'TSUN', modelo: '620W bifacial', potencia: 620, custo: 650, estoque: 0 },
  { id: gerarId(), tipo: 'Microinversor', marca: 'Deye', modelo: '2.25 kW G4', potencia: 2250, custo: 2200, estoque: 0 },
  { id: gerarId(), tipo: 'Inversor', marca: 'SAJ', modelo: '6 kW 2 MPPT', potencia: 6000, custo: 3500, estoque: 0 },
];

function EquipamentosPage() {
  const [itens, setItens] = useState(() => carregarDados(CHAVE, iniciais));
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState({ tipo: 'Placa', marca: '', modelo: '', potencia: '', custo: '', estoque: '' });
  useEffect(() => salvarDados(CHAVE, itens), [itens]);
  const filtrados = useMemo(() => itens.filter(i => `${i.tipo} ${i.marca} ${i.modelo}`.toLowerCase().includes(busca.toLowerCase())), [itens, busca]);
  const atualizar = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const salvar = e => { e.preventDefault(); if (!form.marca.trim() || !form.modelo.trim() || Number(form.custo) <= 0) return alert('Preencha marca, modelo e custo.'); setItens(v => [{ id: gerarId(), ...form, potencia: Number(form.potencia || 0), custo: Number(form.custo), estoque: Number(form.estoque || 0) }, ...v]); setForm({ tipo: 'Placa', marca: '', modelo: '', potencia: '', custo: '', estoque: '' }); };
  const excluir = id => { if (confirm('Excluir este equipamento?')) setItens(v => v.filter(i => i.id !== id)); };
  const columns = [
    { key: 'tipo', label: 'Tipo', render: i => i.tipo }, { key: 'marca', label: 'Marca', render: i => i.marca }, { key: 'modelo', label: 'Modelo', render: i => i.modelo },
    { key: 'potencia', label: 'Potência', render: i => i.potencia ? `${i.potencia} W` : '-' }, { key: 'custo', label: 'Custo', render: i => formatarMoeda(i.custo) }, { key: 'estoque', label: 'Estoque', render: i => i.estoque },
    { key: 'acao', label: 'Ação', render: i => <button className="finance-delete" onClick={() => excluir(i.id)}>Excluir</button> },
  ];
  return <FinanceLayout title="Cadastro de equipamentos" subtitle="Mantenha uma base de custos de placas, inversores e estruturas.">
    <section className="finance-panel"><h2>Novo equipamento</h2><form className="finance-form" onSubmit={salvar}>
      <label className="finance-field"><span>Tipo</span><select name="tipo" value={form.tipo} onChange={atualizar}><option>Placa</option><option>Inversor</option><option>Microinversor</option><option>Estrutura</option><option>Proteção elétrica</option><option>Outro</option></select></label>
      <label className="finance-field"><span>Marca</span><input name="marca" value={form.marca} onChange={atualizar} placeholder="Ex.: Deye" /></label>
      <label className="finance-field"><span>Modelo</span><input name="modelo" value={form.modelo} onChange={atualizar} placeholder="Ex.: 2.25 kW G4" /></label>
      <label className="finance-field"><span>Potência em watts</span><input type="number" name="potencia" value={form.potencia} onChange={atualizar} placeholder="620" /></label>
      <label className="finance-field"><span>Custo unitário</span><input type="number" step="0.01" name="custo" value={form.custo} onChange={atualizar} /></label>
      <label className="finance-field"><span>Quantidade em estoque</span><input type="number" name="estoque" value={form.estoque} onChange={atualizar} /></label>
      <div className="finance-actions finance-field-wide"><button className="finance-button">Salvar equipamento</button></div>
    </form></section>
    <section className="finance-panel"><div className="finance-panel-header"><h2>Catálogo</h2><input className="finance-filter catalog-search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar equipamento" /></div><FinanceTable columns={columns} rows={filtrados} emptyText="Nenhum equipamento encontrado." /></section>
  </FinanceLayout>;
}
export default EquipamentosPage;
