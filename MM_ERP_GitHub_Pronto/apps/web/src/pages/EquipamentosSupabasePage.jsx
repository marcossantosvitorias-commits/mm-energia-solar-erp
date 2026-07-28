import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import FinanceTable from '../components/finance/FinanceTable.jsx';
import { equipmentService } from '../services/equipmentService.js';

const STORAGE_KEY = 'mm-erp-equipamentos-v1';
const EMPTY_FORM = {
  tipo: 'Placa', fornecedor: '', marca: '', modelo: '', potencia: '', custo: '', estoque: '',
};

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
}).format(Number(valor || 0));

const formatarData = (valor) => {
  if (!valor) return '-';
  const [ano, mes, dia] = String(valor).slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
};

function EquipamentosSupabasePage() {
  const [itens, setItens] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busca, setBusca] = useState('');
  const [fornecedor, setFornecedor] = useState('Todos');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setItens(await equipmentService.list());
      setMensagem('');
    } catch (error) {
      setMensagem(`Não foi possível carregar os equipamentos: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const fornecedores = useMemo(() => [
    'Todos',
    ...Array.from(new Set(itens.map((item) => item.supplier).filter(Boolean))).sort(),
  ], [itens]);

  const filtrados = useMemo(() => itens.filter((item) => {
    const texto = `${item.type} ${item.brand} ${item.model} ${item.supplier || ''}`.toLowerCase();
    return texto.includes(busca.toLowerCase()) && (fornecedor === 'Todos' || item.supplier === fornecedor);
  }), [itens, busca, fornecedor]);

  const atualizar = (event) => setForm((atual) => ({ ...atual, [event.target.name]: event.target.value }));

  async function salvar(event) {
    event.preventDefault();
    if (!form.marca.trim() || !form.modelo.trim() || Number(form.custo) <= 0) {
      setMensagem('Preencha marca, modelo e um custo válido.');
      return;
    }
    setSalvando(true);
    try {
      await equipmentService.save({
        ...form,
        potencia: Number(form.potencia || 0),
        custo: Number(form.custo),
        estoque: Number(form.estoque || 0),
        priceDate: new Date().toISOString().slice(0, 10),
      });
      setForm(EMPTY_FORM);
      await carregar();
      setMensagem('Equipamento salvo no Supabase.');
    } catch (error) {
      setMensagem(`Erro ao salvar: ${error.message}`);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este equipamento do banco de dados?')) return;
    try {
      await equipmentService.remove(id);
      await carregar();
      setMensagem('Equipamento excluído.');
    } catch (error) {
      setMensagem(`Erro ao excluir: ${error.message}`);
    }
  }

  async function importarDoNavegador() {
    let locais = [];
    try {
      locais = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      setMensagem('Os dados locais estão inválidos e não puderam ser lidos.');
      return;
    }
    if (!locais.length) {
      setMensagem('Nenhum equipamento salvo neste navegador foi encontrado.');
      return;
    }
    setSalvando(true);
    setMensagem('Importando equipamentos locais...');
    try {
      const resultado = await equipmentService.importMany(locais);
      await carregar();
      setMensagem(`${resultado.saved} equipamento(s) importado(s); ${resultado.failed} falha(s).`);
    } finally {
      setSalvando(false);
    }
  }

  const columns = [
    { key: 'type', label: 'Tipo', render: (item) => item.type },
    { key: 'brand', label: 'Marca', render: (item) => item.brand },
    { key: 'model', label: 'Modelo', render: (item) => item.model },
    { key: 'supplier', label: 'Fornecedor', render: (item) => item.supplier || '-' },
    { key: 'power', label: 'Potência', render: (item) => Number(item.power_w) ? `${Number(item.power_w)} W` : '-' },
    { key: 'cost', label: 'Custo', render: (item) => formatarMoeda(item.unit_cost) },
    { key: 'date', label: 'Preço em', render: (item) => formatarData(item.price_date) },
    { key: 'stock', label: 'Estoque', render: (item) => Number(item.stock_quantity || 0) },
    { key: 'action', label: 'Ação', render: (item) => <button className="finance-delete" onClick={() => excluir(item.id)}>Excluir</button> },
  ];

  return (
    <FinanceLayout title="Cadastro de equipamentos" subtitle="Catálogo centralizado no Supabase, disponível no celular e no computador.">
      {mensagem && <p className="finance-notice">{mensagem}</p>}
      <section className="finance-panel">
        <div className="finance-panel-header">
          <h2>Novo equipamento</h2>
          <button type="button" className="finance-secondary-button" onClick={importarDoNavegador} disabled={salvando}>
            Importar dados deste navegador
          </button>
        </div>
        <form className="finance-form" onSubmit={salvar}>
          <label className="finance-field"><span>Tipo</span><select name="tipo" value={form.tipo} onChange={atualizar}>{['Placa','Inversor','Inversor híbrido','Inversor off-grid','Microinversor','Estrutura','Cabo','Conector','Proteção elétrica','Driver solar','Monitoramento','Bateria','Outro'].map((tipo) => <option key={tipo}>{tipo}</option>)}</select></label>
          <label className="finance-field"><span>Fornecedor</span><input name="fornecedor" value={form.fornecedor} onChange={atualizar} /></label>
          <label className="finance-field"><span>Marca</span><input name="marca" value={form.marca} onChange={atualizar} required /></label>
          <label className="finance-field"><span>Modelo</span><input name="modelo" value={form.modelo} onChange={atualizar} required /></label>
          <label className="finance-field"><span>Potência em watts</span><input type="number" name="potencia" value={form.potencia} onChange={atualizar} /></label>
          <label className="finance-field"><span>Custo unitário</span><input type="number" min="0.01" step="0.01" name="custo" value={form.custo} onChange={atualizar} required /></label>
          <label className="finance-field"><span>Quantidade em estoque</span><input type="number" min="0" step="0.001" name="estoque" value={form.estoque} onChange={atualizar} /></label>
          <div className="finance-actions finance-field-wide"><button className="finance-button" disabled={salvando}>Salvar equipamento</button></div>
        </form>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <h2>Catálogo ({filtrados.length})</h2>
          <div className="finance-panel-actions">
            <select className="finance-filter" value={fornecedor} onChange={(event) => setFornecedor(event.target.value)}>{fornecedores.map((item) => <option key={item}>{item}</option>)}</select>
            <input className="finance-filter catalog-search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar produto, marca ou fornecedor" />
          </div>
        </div>
        {carregando ? <div className="finance-empty">Carregando catálogo do banco...</div> : <FinanceTable columns={columns} rows={filtrados} emptyText="Nenhum equipamento encontrado." />}
      </section>
    </FinanceLayout>
  );
}

export default EquipamentosSupabasePage;
