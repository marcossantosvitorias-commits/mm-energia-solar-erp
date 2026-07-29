import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';

import LoginPage from './pages/LoginPage.jsx';
import FinanceiroPage from './pages/FinanceiroSupabasePage.jsx';
import MarcosFinancePage from './pages/MarcosFinancePage.jsx';
import ErpDashboardPage from './pages/ErpDashboardPage.jsx';
import EquipamentosPage from './pages/EquipamentosSupabasePage.jsx';
import TributosPage from './pages/TributosPage.jsx';
import ClientesPage from './pages/ClientesPage.jsx';
import BelCredSimuladorPage from './pages/BelCredSimuladorPage.jsx';
import CotacoesBelenusPage from './pages/CotacoesBelenusSupabasePage.jsx';
import CardFeesPage from './pages/CardFeesPage.jsx';
import MigracaoDadosPage from './pages/MigracaoDadosPage.jsx';
import BlingIntegracaoPage from './pages/BlingIntegracaoPage.jsx';
import ContratosPage from './pages/ContratosPage.jsx';
import AgendaPage from './pages/AgendaPage.jsx';
import MonitoramentoSolarPage from './pages/MonitoramentoSolarPage.jsx';
import OrdensServicoPage from './pages/OrdensServicoPage.jsx';
import PreparacaoInstalacaoPage from './pages/PreparacaoInstalacaoPage.jsx';
import ExecucaoInstalacaoMobilePage from './pages/ExecucaoInstalacaoMobilePage.jsx';
import FinalizacaoInstalacaoMobilePage from './pages/FinalizacaoInstalacaoMobilePage.jsx';
import PosVendaPage from './pages/PosVendaPage.jsx';
import FluxosKanbanPage from './pages/FluxosKanbanPage.jsx';
import CalculadoraSolarPublicaPage from './pages/CalculadoraSolarPublicaPage.jsx';
import CalculadoraSolarErpPage from './pages/CalculadoraSolarErpPage.jsx';
import PropostasPage from './pages/PropostasPage.jsx';
import PropostaPdfPage from './pages/PropostaPdfPage.jsx';
import PropostaPublicaPage from './pages/PropostaPublicaPage.jsx';
import HybridKitsPage from './pages/HybridKitsPage.jsx';

const ROLES = {
  ALL: ['admin', 'financeiro', 'comercial', 'engenharia'],
  COMMERCIAL: ['admin', 'financeiro', 'comercial'],
  FINANCIAL: ['admin', 'financeiro'],
  OPERATIONAL: ['admin', 'engenharia'],
  ADMIN: ['admin'],
};

const privateRoute = (element, roles = ROLES.ALL) => (
  <ProtectedRoute roles={roles}>{element}</ProtectedRoute>
);

const routerBase = import.meta.env.BASE_URL === '/'
  ? '/'
  : import.meta.env.BASE_URL.replace(/\/$/, '');

function App() {
  return (
    <AuthProvider>
      <Router basename={routerBase}>
        <ScrollToTop />

        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/simulacao-solar" element={<CalculadoraSolarPublicaPage />} />
          <Route path="/proposta/:token" element={<PropostaPublicaPage />} />

          <Route path="/app/dashboard" element={privateRoute(<ErpDashboardPage />)} />
          <Route path="/app/fluxos" element={privateRoute(<FluxosKanbanPage />)} />
          <Route path="/app/clientes" element={privateRoute(<ClientesPage />, ROLES.COMMERCIAL)} />
          <Route path="/app/calculadora-solar" element={privateRoute(<CalculadoraSolarErpPage />, ROLES.COMMERCIAL)} />
          <Route path="/app/propostas" element={privateRoute(<PropostasPage />, ROLES.COMMERCIAL)} />
          <Route path="/app/propostas/:id/pdf" element={privateRoute(<PropostaPdfPage />, ROLES.COMMERCIAL)} />
          <Route path="/app/agenda" element={privateRoute(<AgendaPage />, ROLES.COMMERCIAL)} />
          <Route path="/app/ordens-servico" element={privateRoute(<OrdensServicoPage />, ROLES.ALL)} />
          <Route path="/app/ordens-servico/:id/preparacao" element={privateRoute(<PreparacaoInstalacaoPage />, ROLES.ALL)} />
          <Route path="/app/ordens-servico/:id/campo" element={privateRoute(<ExecucaoInstalacaoMobilePage />, ROLES.ALL)} />
          <Route path="/app/ordens-servico/:id/finalizacao" element={privateRoute(<FinalizacaoInstalacaoMobilePage />, ROLES.ALL)} />
          <Route path="/app/pos-venda" element={privateRoute(<PosVendaPage />, ROLES.ALL)} />
          <Route path="/app/monitoramento" element={privateRoute(<MonitoramentoSolarPage />, ROLES.OPERATIONAL)} />
          <Route path="/app" element={privateRoute(<FinanceiroPage />, ROLES.FINANCIAL)} />
          <Route path="/app/precos" element={privateRoute(<CotacoesBelenusPage pricingMode />, ROLES.COMMERCIAL)} />
          <Route path="/app/kits-hibridos" element={privateRoute(<HybridKitsPage />, ROLES.COMMERCIAL)} />
          <Route path="/app/equipamentos" element={privateRoute(<EquipamentosPage />, ROLES.OPERATIONAL)} />
          <Route path="/app/tributos" element={privateRoute(<TributosPage />, ROLES.FINANCIAL)} />
          <Route path="/app/marcos-finance" element={privateRoute(<MarcosFinancePage />, ROLES.FINANCIAL)} />
          <Route path="/app/marcos" element={privateRoute(<MarcosFinancePage />, ROLES.FINANCIAL)} />
          <Route path="/app/belcred" element={privateRoute(<BelCredSimuladorPage />, ROLES.COMMERCIAL)} />
          <Route path="/app/taxas-cartao" element={privateRoute(<CardFeesPage />, ROLES.FINANCIAL)} />
          <Route path="/app/migracao" element={privateRoute(<MigracaoDadosPage />, ROLES.ADMIN)} />
          <Route path="/app/bling" element={privateRoute(<BlingIntegracaoPage />, ROLES.FINANCIAL)} />
          <Route path="/app/contratos" element={privateRoute(<ContratosPage />, ROLES.COMMERCIAL)} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;