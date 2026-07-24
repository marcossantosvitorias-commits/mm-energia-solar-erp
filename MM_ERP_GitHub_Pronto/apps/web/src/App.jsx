import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import ScrollToTop from './components/ScrollToTop';
import MetaPixel from './components/MetaPixel.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';

import HomePage from './pages/HomePage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import ObrasRealizadasPage from './pages/ObrasRealizadasPage.jsx';
import CalculadoraPage from './pages/CalculadoraPage.jsx';
import OfertasPage from './pages/OfertasPage.jsx';
import LoginPage from './pages/LoginPage.jsx';

import FinanceiroPage from './pages/FinanceiroPage.jsx';
import MarcosFinancePage from './pages/MarcosFinancePage.jsx';
import PrecificacaoKitsPage from './pages/PrecificacaoKitsPage.jsx';
import ErpDashboardPage from './pages/ErpDashboardPage.jsx';
import EquipamentosPage from './pages/EquipamentosPage.jsx';
import TributosPage from './pages/TributosPage.jsx';
import ClientesPage from './pages/ClientesPage.jsx';

const privateRoute = (element) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <MetaPixel />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/obras" element={<ObrasRealizadasPage />} />
          <Route path="/calculadora" element={<CalculadoraPage />} />
          <Route path="/contato" element={<ContactPage />} />
          <Route path="/privacidade" element={<PrivacyPolicyPage />} />
          <Route path="/ofertas" element={<OfertasPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/app/dashboard" element={privateRoute(<ErpDashboardPage />)} />
          <Route path="/app/clientes" element={privateRoute(<ClientesPage />)} />
          <Route path="/app" element={privateRoute(<FinanceiroPage />)} />
          <Route path="/app/precos" element={privateRoute(<PrecificacaoKitsPage />)} />
          <Route path="/app/equipamentos" element={privateRoute(<EquipamentosPage />)} />
          <Route path="/app/tributos" element={privateRoute(<TributosPage />)} />
          <Route path="/app/marcos" element={privateRoute(<MarcosFinancePage />)} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
