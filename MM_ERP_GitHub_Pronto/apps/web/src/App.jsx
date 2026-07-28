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
import MigracaoDadosPage from './pages/MigracaoDadosPage.jsx';
import BlingIntegracaoPage from './pages/BlingIntegracaoPage.jsx';
import ContratosPage from './pages/ContratosPage.jsx';
import AgendaPage from './pages/AgendaPage.jsx';
import MonitoramentoSolarPage from './pages/MonitoramentoSolarPage.jsx';

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

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />

        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/app/dashboard" element={privateRoute(<ErpDashboardPage />)} />
          <Route path="/app/clientes" element={privateRoute(<ClientesPage />, ROLES.COMMERCIAL)} />
          <Route path="/app/agenda" element={privateRoute(<AgendaPage />, ROLES.COMMERCIAL)} />
          <Route path="/app/monitoramento" element={privateRoute(<MonitoramentoSolarPage />, ROLES.OPERATIONAL)} />
          <Route path="/app" element={privateRoute(<FinanceiroPage />, ROLES.FINANCIAL)} />
          <Route path="/app/precos" element={privateRoute(<CotacoesBelenusPage pricingMode />, ROLES.COMMERCIAL)} />
          <Route path="/app/equipamentos" element={privateRoute(<EquipamentosPage />, ROLES.OPERATIONAL)} />
          <Route path="/app/tributos" element={privateRoute(<TributosPage />, ROLES.FINANCIAL)} />
          <Route path="/app/marcos" element={privateRoute(<MarcosFinancePage />, ROLES.ADMIN)} />
          <Route path="/app/belcred" element={privateRoute(<BelCredSimuladorPage />, ROLES.COMMERCIAL)} />
          <Route path="/app/cotacoes-belenus" element={privateRoute(<CotacoesBelenusPage />, ROLES.COMMERCIAL)} />
          <Route path="/app/migracao-dados" element={privateRoute(<MigracaoDadosPage />, ROLES.ADMIN)} />
          <Route path="/app/bling" element={privateRoute(<BlingIntegracaoPage />, ROLES.FINANCIAL)} />
          <Route path="/app/contratos" element={privateRoute(<ContratosPage />, ROLES.COMMERCIAL)} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
