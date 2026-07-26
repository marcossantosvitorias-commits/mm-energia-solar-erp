import React, { useEffect, useMemo, useState } from 'react';
import FinanceLayout from '../components/finance/FinanceLayout.jsx';
import FinanceTable from '../components/finance/FinanceTable.jsx';
import { gerarId, formatarMoeda } from '../components/finance/storage.js';
import { productsDatabase } from '../services/erpDatabaseService.js';

const CHAVE = 'mm-erp-equipamentos-v1';
const DATA_BELENUS = '24/07/2026';
const DATA_SOOLLAR = '24/07/2026';

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

const catalogoSoollar = [
  { tipo: 'Conector', marca: 'Soollar', modelo: 'MC4 macho e fêmea - cód. 45788', potencia: 0, custo: 5.00 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit garra de aterramento com 2 peças - cód. 427256', potencia: 0, custo: 9.89 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit grampo final com 4 peças - cód. 366968', potencia: 0, custo: 19.90 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit fixação para microinversor com 2 unidades - cód. 373839', potencia: 0, custo: 19.90 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit suporte para microinversor com 2 unidades - cód. 391010', potencia: 0, custo: 29.90 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit junção para perfil 2,40 m / 2,70 m com 2 unidades - cód. 391009', potencia: 0, custo: 29.90 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit grampo intermediário com parafuso inox - 6 unidades - cód. 391007', potencia: 0, custo: 29.90 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Perfil alumínio 27,8 x 45 mm x 2,36 m - cód. 566317', potencia: 0, custo: 35.00 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Perfil 27,8 x 45 mm x 2,36 m - cód. 525714', potencia: 0, custo: 35.00 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Perfil alumínio 27,8 x 45 mm x 2,70 m para estrutura inox - cód. 363714', potencia: 0, custo: 35.00 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit telha fibrocimento M10 x 250 para 4 módulos - cód. 391004', potencia: 0, custo: 99.00 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit telha fibrocimento parafuso inox/madeira para 4 módulos - cód. 391003', potencia: 0, custo: 99.00 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit telha metálica mini-trilho 42 cm para 4 módulos - cód. 391005', potencia: 0, custo: 99.90 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit telha fibrocimento inox/metal para 4 módulos - cód. 361048', potencia: 0, custo: 120.00 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit em L telha metálica para 4 módulos - cód. 417636', potencia: 0, custo: 120.00 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit telha fibrocimento inox/madeira para 4 módulos - cód. 361046', potencia: 0, custo: 120.00 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit mini-trilho 42 cm telhado metálico para 4 módulos - cód. 361049', potencia: 0, custo: 140.00 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit telha cerâmica com prolongador para 4 módulos - cód. 391006', potencia: 0, custo: 160.00 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit mini-trilho alto para microinversor 30 x 10 cm - cód. 427255', potencia: 0, custo: 199.90 },
  { tipo: 'Estrutura', marca: 'Soollar', modelo: 'Kit estrutura solo monoposte para 4 módulos - cód. 616074', potencia: 0, custo: 1000.00 },

  { tipo: 'Cabo', marca: 'Soollar', modelo: 'Cabo solar 4 mm vermelho - 25 m - cód. 97082', potencia: 0, custo: 100.00 },
  { tipo: 'Cabo', marca: 'Soollar', modelo: 'Cabo solar 4 mm preto - 25 m - cód. 97081', potencia: 0, custo: 100.00 },
  { tipo: 'Cabo', marca: 'Soollar', modelo: 'Cabo solar 6 mm preto - 25 m - cód. 97079', potencia: 0, custo: 125.00 },
  { tipo: 'Cabo', marca: 'Soollar', modelo: 'Cabo solar 6 mm vermelho - 25 m - cód. 97080', potencia: 0, custo: 125.00 },
  { tipo: 'Cabo', marca: 'Soollar', modelo: 'Cabo solar 6 mm verde - 50 m - cód. 392784', potencia: 0, custo: 250.00 },
  { tipo: 'Cabo', marca: 'Soollar', modelo: 'Cabo solar 6 mm preto - 100 m - cód. 52140', potencia: 0, custo: 500.00 },
  { tipo: 'Cabo', marca: 'Soollar', modelo: 'Cabo solar 6 mm vermelho - 100 m - cód. 52209', potencia: 0, custo: 500.00 },
  { tipo: 'Cabo', marca: 'Soollar', modelo: 'Bobina cabo solar 6 mm preto - 500 m - cód. 52142', potencia: 0, custo: 2500.00 },
  { tipo: 'Cabo', marca: 'Soollar', modelo: 'Bobina cabo solar 6 mm vermelho - 500 m - cód. 52211', potencia: 0, custo: 2500.00 },

  { tipo: 'Proteção elétrica', marca: 'Clamper', modelo: 'DPS Front V 275 V 20 kA - cód. 388156', potencia: 0, custo: 32.90 },
  { tipo: 'Proteção elétrica', marca: 'Clamper', modelo: 'DPS Front V 275 V 45 kA - cód. 404689', potencia: 0, custo: 36.90 },
  { tipo: 'Proteção elétrica', marca: 'Clamper', modelo: 'Filtro de linha DPS 127/220 V 10 A 5 tomadas - cód. 404690', potencia: 0, custo: 69.90 },
  { tipo: 'Proteção elétrica', marca: 'Clamper', modelo: 'DPS Solar 1000 V 40 kA - cód. 466838', potencia: 0, custo: 129.89 },
  { tipo: 'Proteção elétrica', marca: 'Clamper', modelo: 'Front Box AC 275 V 25 A 20 kA 2P IP65 - cód. 387955', potencia: 0, custo: 249.90 },
  { tipo: 'Proteção elétrica', marca: 'Clamper', modelo: 'Front Box AC 275 V 32 A 20 kA 2P IP65 - cód. 382018', potencia: 0, custo: 259.90 },
  { tipo: 'Proteção elétrica', marca: 'Clamper', modelo: 'Front Box AC 275 V 40 A 20 kA 2P IP65 - cód. 382030', potencia: 0, custo: 309.90 },
  { tipo: 'Proteção elétrica', marca: 'Clamper', modelo: 'Front Box AC 275 V 50 A 20 kA 3P IP65 - cód. 392057', potencia: 0, custo: 429.90 },
  { tipo: 'Proteção elétrica', marca: 'Clamper', modelo: 'String Box SB 1000 V 32 A 1E/1S - cód. 49672', potencia: 0, custo: 460.01 },
  { tipo: 'Proteção elétrica', marca: 'Clamper', modelo: 'String Box SB 1000 V 32 A 2E/2S - cód. 44765', potencia: 0, custo: 539.90 },
  { tipo: 'Proteção elétrica', marca: 'Clamper', modelo: 'String Box SB 1000 V 20 A 4E/2S 4D - cód. 385175', potencia: 0, custo: 650.01 },
  { tipo: 'Proteção elétrica', marca: 'Clamper', modelo: 'String Box SB 1000 V 32 A 3E/3S P24 - cód. 45787', potencia: 0, custo: 899.91 },

  { tipo: 'Placa', marca: 'TSUN', modelo: 'N-Type bifacial 30 mm - cód. 574558', potencia: 600, custo: 480.00 },
  { tipo: 'Placa', marca: 'RenePV', modelo: 'Bifacial 30 mm - cód. 563445', potencia: 615, custo: 492.00 },
  { tipo: 'Placa', marca: 'Hanersun', modelo: 'Bifacial 30 mm Tier 1 - cód. 658138', potencia: 620, custo: 496.00 },
  { tipo: 'Placa', marca: 'TSUN', modelo: 'N-Type bifacial 30 mm - cód. 493651', potencia: 620, custo: 496.00 },
  { tipo: 'Placa', marca: 'NPlus', modelo: 'Bifacial 30 mm - cód. 658183', potencia: 620, custo: 496.00 },
  { tipo: 'Placa', marca: 'RenePV', modelo: 'Bifacial 30 mm - cód. 563396', potencia: 620, custo: 496.00 },
  { tipo: 'Placa', marca: 'TSUN', modelo: 'N-Type bifacial 30 mm - cód. 624530', potencia: 630, custo: 504.00 },
  { tipo: 'Placa', marca: 'TCL', modelo: 'Bifacial 30 mm Tier 1 - cód. 676783', potencia: 615, custo: 504.30 },
  { tipo: 'Placa', marca: 'RenePV', modelo: 'Bifacial 30 mm - cód. 657999', potencia: 680, custo: 544.00 },
  { tipo: 'Placa', marca: 'RenePV', modelo: 'Bifacial 30 mm - cód. 658000', potencia: 690, custo: 552.00 },
  { tipo: 'Placa', marca: 'ZNShine', modelo: 'HJT bifacial 30 mm - cód. 475536', potencia: 700, custo: 700.00 },

  { tipo: 'Microinversor', marca: 'SAJ', modelo: 'M2-2.25K-S4 220 V - cód. 676657', potencia: 2250, custo: 699.91 },
  { tipo: 'Microinversor', marca: 'Deye', modelo: 'S2.25K-G4 220 V - cód. 655554', potencia: 2250, custo: 699.99 },
  { tipo: 'Inversor', marca: 'Deye', modelo: 'AFCI monofásico on-grid 220 V 1 MPPT - cód. 490056', potencia: 3000, custo: 999.82 },
  { tipo: 'Inversor', marca: 'SAJ', modelo: 'AFCI R5 on-grid 220 V 1 MPPT - cód. 346901', potencia: 3000, custo: 1199.56 },
  { tipo: 'Inversor', marca: 'Deye', modelo: 'AFCI monofásico on-grid 220 V 2 MPPT - cód. 663723', potencia: 6000, custo: 1199.56 },
  { tipo: 'Inversor', marca: 'Deye', modelo: 'AFCI monofásico on-grid 220 V 2 MPPT - cód. 490071', potencia: 6000, custo: 1199.56 },
  { tipo: 'Inversor', marca: 'SAJ', modelo: 'AFCI R5 monofásico 220 V 2 MPPT - cód. 349940', potencia: 6000, custo: 1399.31 },
  { tipo: 'Inversor', marca: 'Auxsol', modelo: 'AFCI monofásico 220 V 1 MPPT - cód. 581908', potencia: 3300, custo: 1428.00 },
  { tipo: 'Inversor', marca: 'SAJ', modelo: 'AFCI R5 monofásico 220 V 2 MPPT - cód. 657996', potencia: 7300, custo: 1899.90 },
  { tipo: 'Inversor', marca: 'SAJ', modelo: 'AFCI R6 monofásico 220 V 3 MPPT - cód. 349944', potencia: 10000, custo: 1999.65 },
  { tipo: 'Inversor', marca: 'Deye', modelo: 'AFCI on-grid 380 V 2 MPPT - cód. 490222', potencia: 15000, custo: 1999.65 },
  { tipo: 'Inversor', marca: 'Auxsol', modelo: 'AFCI monofásico 220 V 2 MPPT - cód. 581912', potencia: 10000, custo: 2917.21 },
  { tipo: 'Inversor', marca: 'Deye', modelo: 'AFCI on-grid 220 V 2 MPPT - cód. 490089', potencia: 15000, custo: 2999.47 },
  { tipo: 'Inversor', marca: 'SAJ', modelo: 'AFCI R6-T2-32 on-grid 380 V 2 MPPT - cód. 413568', potencia: 15000, custo: 2999.47 },
  { tipo: 'Inversor', marca: 'SAJ', modelo: 'AFCI R6 on-grid 220 V 2 MPPT - cód. 347680', potencia: 15000, custo: 3999.29 },
  { tipo: 'Inversor', marca: 'SAJ', modelo: 'Trifásico AFCI R6 on-grid 220 V T4 - cód. 249215', potencia: 25000, custo: 4999.11 },
  { tipo: 'Inversor', marca: 'Deye', modelo: 'AFCI on-grid 220 V 3 MPPT - cód. 490611', potencia: 25000, custo: 5334.61 },

  { tipo: 'Inversor off-grid', marca: 'Deye', modelo: '220 V 2 MPPT - cód. 646379', potencia: 3600, custo: 3182.75 },
  { tipo: 'Inversor híbrido', marca: 'SAJ', modelo: 'H2 monofásico 220 V 2 MPPT - cód. 322525', potencia: 5000, custo: 3999.29 },
  { tipo: 'Inversor híbrido', marca: 'Deye', modelo: 'Monofásico 220 V 2 MPPT - cód. 642044', potencia: 7500, custo: 4999.11 },
  { tipo: 'Inversor híbrido', marca: 'SAJ', modelo: 'H2 monofásico 220 V 2 MPPT - cód. 657986', potencia: 7500, custo: 4999.11 },
  { tipo: 'Inversor híbrido', marca: 'Deye', modelo: 'Monofásico 220 V 2 MPPT - cód. 622176', potencia: 6000, custo: 5998.94 },
  { tipo: 'Inversor híbrido', marca: 'Deye', modelo: 'Monofásico 220 V 2 MPPT - cód. 642108', potencia: 10000, custo: 5999.48 },
  { tipo: 'Inversor híbrido', marca: 'SAJ', modelo: 'H2 monofásico 220 V 2 MPPT - cód. 657987', potencia: 10000, custo: 5999.48 },
  { tipo: 'Inversor híbrido', marca: 'Deye', modelo: 'Bifásico 127/220 V 2 MPPT - cód. 642341', potencia: 6000, custo: 6999.86 },

  { tipo: 'Driver solar', marca: 'SAJ', modelo: 'Monofásico 220 V - cód. 432542', potencia: 2200, custo: 999.82 },
  { tipo: 'Driver solar', marca: 'SAJ', modelo: 'Trifásico 380 V - cód. 432545', potencia: 5500, custo: 1499.90 },
  { tipo: 'Driver solar', marca: 'SAJ', modelo: 'Trifásico 380 V - cód. 432548', potencia: 7500, custo: 1699.90 },
  { tipo: 'Driver solar', marca: 'SAJ', modelo: 'Trifásico 380 V - cód. 432553', potencia: 11000, custo: 2399.89 },
  { tipo: 'Driver solar', marca: 'SAJ', modelo: 'Trifásico 380 V - cód. 432554', potencia: 15000, custo: 2999.47 },
  { tipo: 'Driver solar', marca: 'SAJ', modelo: 'Trifásico 380 V - cód. 432560', potencia: 22000, custo: 3999.90 },

  { tipo: 'Monitoramento', marca: 'SAJ', modelo: 'Zero-grid SEC-C-S100 monofásico 100 A - cód. 658012', potencia: 0, custo: 1000.00 },
  { tipo: 'Monitoramento', marca: 'SAJ', modelo: 'Zero-grid SEC-C-T80 trifásico 80 A - cód. 658018', potencia: 0, custo: 1599.90 },
  { tipo: 'Monitoramento', marca: 'SAJ', modelo: 'Zero-grid SEC-C-T100 trifásico 100 A - cód. 658019', potencia: 0, custo: 1790.90 },
  { tipo: 'Monitoramento', marca: 'SAJ', modelo: 'Zero-grid SEC-C-T250 trifásico 250 A - cód. 658020', potencia: 0, custo: 1900.01 },
  { tipo: 'Bateria', marca: 'SAJ', modelo: 'Baixa tensão B3-5.0KWH-LV 48 V - cód. 383670', potencia: 5000, custo: 3999.90 },
].map((item) => ({
  ...item,
  id: gerarId(),
  estoque: 0,
  fornecedor: 'Soollar Distribuidora',
  atualizadoEm: DATA_SOOLLAR,
}));

function EquipamentosPage() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
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

  async function carregarEquipamentos() {
    setCarregando(true);
    try {
      let dados = await productsDatabase.list();
      if (!dados.length) {
        const catalogo = [...iniciais, ...catalogoBelenus, ...catalogoSoollar].map((item) => ({
          ...item,
          externalId: `catalogo-${item.fornecedor || 'anterior'}-${item.marca}-${item.modelo}`.toLowerCase(),
          origem: 'Catálogo inicial',
        }));
        await productsDatabase.saveMany(catalogo);
        dados = await productsDatabase.list();
      }
      setItens(dados);
    } catch (error) {
      alert(error.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarEquipamentos(); }, []);

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

  const salvar = async (event) => {
    event.preventDefault();
    if (!form.marca.trim() || !form.modelo.trim() || Number(form.custo) <= 0) {
      return alert('Preencha marca, modelo e custo.');
    }
    await productsDatabase.saveMany([{
        id: gerarId(),
        ...form,
        potencia: Number(form.potencia || 0),
        custo: Number(form.custo),
        estoque: Number(form.estoque || 0),
        atualizadoEm: new Date().toLocaleDateString('pt-BR'),
      }]);
    await carregarEquipamentos();
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

  const excluir = async (id) => {
    if (confirm('Excluir este equipamento?')) {
      await productsDatabase.remove(id);
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
              <option>Inversor off-grid</option>
              <option>Microinversor</option>
              <option>Estrutura</option>
              <option>Cabo</option>
              <option>Conector</option>
              <option>Proteção elétrica</option>
              <option>Driver solar</option>
              <option>Monitoramento</option>
              <option>Bateria</option>
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
