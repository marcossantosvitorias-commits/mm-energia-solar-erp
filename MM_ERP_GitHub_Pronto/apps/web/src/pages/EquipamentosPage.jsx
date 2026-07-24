import React, { useEffect, useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import FinanceTable from '../components/finance/FinanceTable.jsx';
import { carregarDados, salvarDados, gerarId, formatarMoeda } from '../components/finance/storage.js';

const CHAVE = 'mm-erp-equipamentos-v1';
const DATA_BELENUS = '24/07/2026';

const iniciais = [
  { id: gerarId(), tipo: 'Placa', marca: 'TSUN', modelo: '620W bifacial', potencia: 620, custo: 650, estoque: 0, fornecedor: 'Cadastro anterior' },
  { id: gerarId(), tipo: 'Microinversor', marca: 'Deye', modelo: '2.25 kW G4', potencia: 2250, custo: 2200, estoque: 0, fornecedor: 'Cadastro anterior' },
  { id: gerarId(), tipo: 'Inversor', marca: 'SAJ', modelo: '6 kW 2 MPPT', potencia: 6000, custo: 3500, estoque: 0, fornecedor: 'Cadastro anterior' },
];

const catalogoBelenus = [
  { tipo: 'Microinversor', marca: 'Deye', modelo: 'Monofásico 4 MPPT 220 V 2,25 kW', potencia: 2250, custo: 1298.64 },
  { tipo: 'Microinversor', marca: 'Enphase', modelo: 'Monofásico 220 V 475 W', potencia: 475, custo: 362.71 },
  { tipo: 'Microinversor', marca: 'HCC', modelo: 'Monofásico 4 MPPT 220 V 2,5 kW', potencia: 2500, custo: 1302.96 },
  { tipo: 'Microinversor', marca: 'Growatt', modelo: 'Monofásico 4 MPPT 220 V 2,25 kW', potencia: 2250, custo: 1103.37 },
  { tipo: 'Microinversor', marca: 'Growatt', modelo: 'Monofásico 4 MPPT 220 V 2,5 kW', potencia: 2500, custo: 1176.93 },
  { tipo: 'Microinversor', marca: 'FoxESS', modelo: 'Monofásico 4 MPPT 220 V 1,875 kW', potencia: 1875, custo: 1228.93 },
  { tipo: 'Microinversor', marca: 'Hoymiles', modelo: 'Monofásico 4 MPPT 220 V 2,25 kW', potencia: 2250, custo: 1295.56 },
  { tipo: 'Microinversor', marca: 'Hoymiles', modelo: 'Monofásico 4 MPPT 220 V 2 kW', potencia: 2000, custo: 1040.97 },
  { tipo: 'Microinversor', marca: 'Sungrow', modelo: 'Monofásico 4 MPPT 220 V 2,5 kW', potencia: 2500, custo: 1554.67 },

  { tipo: 'Inversor híbrido', marca: 'FoxESS', modelo: 'Monofásico 2 MPPT 220 V 5 kW', potencia: 5000, custo: 8129.50 },
  { tipo: 'Inversor híbrido', marca: 'FoxESS', modelo: 'Monofásico 3 MPPT 220 V 7,5 kW', potencia: 7500, custo: 13867.96 },
  { tipo: 'Inversor híbrido', marca: 'Deye', modelo: 'Monofásico 2 MPPT 220 V 8 kW', potencia: 8000, custo: 9627.00 },
  { tipo: 'Inversor híbrido', marca: 'FoxESS', modelo: 'Monofásico 4 MPPT 220 V 10,5 kW', potencia: 10500, custo: 13304.42 },
  { tipo: 'Inversor híbrido', marca: 'Deye', modelo: 'Monofásico 3 MPPT 220 V 12 kW', potencia: 12000, custo: 13927.06 },

  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Garra de aterramento - 2 peças alumínio', potencia: 0, custo: 7.00 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Suporte para fixação de microinversor - 1 peça', potencia: 0, custo: 4.53 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Gancho telha colonial com prolongador - 2 peças', potencia: 0, custo: 60.45 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Gancho ajustável colonial com prolongador - 2 peças', potencia: 0, custo: 29.95 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Grampo final 30 mm - 4 peças alumínio', potencia: 0, custo: 9.10 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Grampo final 30 mm para telha zipada - 4 peças', potencia: 0, custo: 12.26 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Grampo final 40 mm - 4 peças alumínio', potencia: 0, custo: 13.09 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Grampo final 40 mm para estrutura de solo - 4 peças', potencia: 0, custo: 16.21 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Grampo intermediário - 2 peças alumínio', potencia: 0, custo: 9.30 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Grampo intermediário para telha zipada - 3 peças', potencia: 0, custo: 7.00 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Haste solar 8 mm x 200 mm - 2 peças inox', potencia: 0, custo: 17.33 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Haste solar 8 mm x 250 mm - 2 peças inox', potencia: 0, custo: 20.29 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Mini trilho para telha - 2 peças alumínio', potencia: 0, custo: 25.46 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Mini trilho aço para telha metálica e microinversor 300 mm', potencia: 0, custo: 40.01 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Suporte em L para fibrocimento - 2 peças', potencia: 0, custo: 17.05 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Suporte em L para telha shingle - 2 peças', potencia: 0, custo: 27.03 },
  { tipo: 'Estrutura', marca: 'Belenergy', modelo: 'Suporte em L para telha metálica - 2 peças', potencia: 0, custo: 18.20 },
].map((item) => ({
  ...item,
  id: gerarId(),
  estoque: 0,
  fornecedor: 'Belenus',
  atualizadoEm: DATA_BELENUS,
}));

function carregarEquipamentos() {
  const salvos = carregarDados(CHAVE, iniciais);
  const existentes = new Set(
    salvos.map((item) =>
      `${item.fornecedor || ''}|${item.tipo}|${item.marca}|${item.modelo}`.toLowerCase(),
    ),
  );
  const novos = catalogoBelenus.filter(
    (item) =>
      !existentes.has(
        `${item.fornecedor}|${item.tipo}|${item.marca}|${item.modelo}`.toLowerCase(),
      ),
  );
  return [...salvos, ...novos];
}

function EquipamentosPage() {
  const [itens, setItens] = useState(carregarEquipamentos);
  const [busca, setBusca] = useState('');
  const [fornecedor, setFornecedor] = useState('Todos');
  const [form, setForm] = useState({
    tipo: 'Placa',
    marca: '',
    modelo: '',
    potencia: '',
    custo: '',
    estoque: '',
    fornecedor: '',
  });

  useEffect(() => salvarDados(CHAVE, itens), [itens]);

  const fornecedores = useMemo(
    () => [
      'Todos',
      ...Array.from(new Set(itens.map((item) => item.fornecedor).filter(Boolean))).sort(),
    ],
    [itens],
  );

  const filtrados = useMemo(
    () =>
      itens.filter((item) => {
        const correspondeBusca = `${item.tipo} ${item.marca} ${item.modelo} ${item.fornecedor || ''}`
          .toLowerCase()
          .includes(busca.toLowerCase());
        const correspondeFornecedor =
          fornecedor === 'Todos' || item.fornecedor === fornecedor;
        return correspondeBusca && correspondeFornecedor;
      }),
    [itens, busca, fornecedor],
  );

  const atualizar = (event) =>
    setForm((atual) => ({ ...atual, [event.target.name]: event.target.value }));

  const salvar = (event) => {
    event.preventDefault();
    if (!form.marca.trim() || !form.modelo.trim() || Number(form.custo) <= 0) {
      return alert('Preencha marca, modelo e custo.');
    }
    setItens((atual) => [
      {
        id: gerarId(),
        ...form,
        potencia: Number(form.potencia || 0),
        custo: Number(form.custo),
        estoque: Number(form.estoque || 0),
        atualizadoEm: new Date().toLocaleDateString('pt-BR'),
      },
      ...atual,
    ]);
    setForm({
      tipo: 'Placa',
      marca: '',
      modelo: '',
      potencia: '',
      custo: '',
      estoque: '',
      fornecedor: '',
    });
  };

  const excluir = (id) => {
    if (confirm('Excluir este equipamento?')) {
      setItens((atual) => atual.filter((item) => item.id !== id));
    }
  };

  const columns = [
    { key: 'tipo', label: 'Tipo', render: (item) => item.tipo },
    { key: 'marca', label: 'Marca', render: (item) => item.marca },
    { key: 'modelo', label: 'Modelo', render: (item) => item.modelo },
    { key: 'fornecedor', label: 'Fornecedor', render: (item) => item.fornecedor || '-' },
    { key: 'potencia', label: 'Potência', render: (item) => item.potencia ? `${item.potencia} W` : '-' },
    { key: 'custo', label: 'Custo', render: (item) => formatarMoeda(item.custo) },
    { key: 'atualizado', label: 'Preço em', render: (item) => item.atualizadoEm || '-' },
    { key: 'estoque', label: 'Estoque', render: (item) => item.estoque },
    { key: 'acao', label: 'Ação', render: (item) => <button className="finance-delete" onClick={() => excluir(item.id)}>Excluir</button> },
  ];

  return (
    <FinanceLayout
      title="Cadastro de equipamentos"
      subtitle="Base de custos de placas, inversores e estruturas por fornecedor."
    >
      <section className="finance-panel">
        <h2>Novo equipamento</h2>
        <form className="finance-form" onSubmit={salvar}>
          <label className="finance-field">
            <span>Tipo</span>
            <select name="tipo" value={form.tipo} onChange={atualizar}>
              <option>Placa</option>
              <option>Inversor</option>
              <option>Inversor híbrido</option>
              <option>Microinversor</option>
              <option>Estrutura</option>
              <option>Proteção elétrica</option>
              <option>Outro</option>
            </select>
          </label>
          <label className="finance-field">
            <span>Fornecedor</span>
            <input name="fornecedor" value={form.fornecedor} onChange={atualizar} placeholder="Ex.: Belenus" />
          </label>
          <label className="finance-field">
            <span>Marca</span>
            <input name="marca" value={form.marca} onChange={atualizar} placeholder="Ex.: Deye" />
          </label>
          <label className="finance-field">
            <span>Modelo</span>
            <input name="modelo" value={form.modelo} onChange={atualizar} placeholder="Ex.: 2,25 kW G4" />
          </label>
          <label className="finance-field">
            <span>Potência em watts</span>
            <input type="number" name="potencia" value={form.potencia} onChange={atualizar} placeholder="620" />
          </label>
          <label className="finance-field">
            <span>Custo unitário</span>
            <input type="number" step="0.01" name="custo" value={form.custo} onChange={atualizar} />
          </label>
          <label className="finance-field">
            <span>Quantidade em estoque</span>
            <input type="number" name="estoque" value={form.estoque} onChange={atualizar} />
          </label>
          <div className="finance-actions finance-field-wide">
            <button className="finance-button">Salvar equipamento</button>
          </div>
        </form>
      </section>

      <section className="finance-panel">
        <div className="finance-panel-header">
          <h2>Catálogo ({filtrados.length})</h2>
          <div className="finance-panel-actions">
            <select
              className="finance-filter"
              value={fornecedor}
              onChange={(event) => setFornecedor(event.target.value)}
            >
              {fornecedores.map((item) => <option key={item}>{item}</option>)}
            </select>
            <input
              className="finance-filter catalog-search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar produto, marca ou fornecedor"
            />
          </div>
        </div>
        <FinanceTable
          columns={columns}
          rows={filtrados}
          emptyText="Nenhum equipamento encontrado."
        />
      </section>
    </FinanceLayout>
  );
}

export default EquipamentosPage;
