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
import EquipamentosPage from './pages/EquipamentosPage.jsx';
import TributosPage from './pages/TributosPage.jsx';
import ClientesPage from './pages/ClientesPage.jsx';
import BelCredSimuladorPage from './pages/BelCredSimuladorPage.jsx';
import CotacoesBelenusPage from './pages/CotacoesBelenusPage.jsx';
import MigracaoDadosPage from './pages/MigracaoDadosPage.jsx';
import BlingIntegracaoPage from './pages/BlingIntegracaoPage.jsx';
import ContratosPage from './pages/ContratosPage.jsx';
import AgendaPage from './pages/AgendaPage.jsx';
import MonitoramentoSolarPage from './pages/MonitoramentoSolarPage.jsx';

const privateRoute = (element) => (
  <ProtectedRoute>{element}</ProtectedRoute>
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
          <Route path="/app/clientes" element={privateRoute(<ClientesPage />)} />
          <Route path="/app/agenda" element={privateRoute(<AgendaPage />)} />
          <Route path="/app/monitoramento" element={privateRoute(<MonitoramentoSolarPage />)} />
          <Route path="/app" element={privateRoute(<FinanceiroPage />)} />
          <Route path="/app/precos" element={privateRoute(<CotacoesBelenusPage pricingMode />)} />
          <Route path="/app/equipamentos" element={privateRoute(<EquipamentosPage />)} />
          <Route path="/app/tributos" element={privateRoute(<TributosPage />)} />
          <Route path="/app/marcos" element={privateRoute(<MarcosFinancePage />)} />
          <Route path="/app/belcred" element={privateRoute(<BelCredSimuladorPage />)} />
          <Route path="/app/cotacoes-belenus" element={privateRoute(<CotacoesBelenusPage />)} />
          <Route path="/app/migracao-dados" element={privateRoute(<MigracaoDadosPage />)} />
          <Route path="/app/bling" element={privateRoute(<BlingIntegracaoPage />)} />
          <Route path="/app/contratos" element={privateRoute(<ContratosPage />)} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
