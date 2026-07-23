import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import ScrollToTop from './components/ScrollToTop';
import MetaPixel from './components/MetaPixel.jsx';

import HomePage from './pages/HomePage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import ObrasRealizadasPage from './pages/ObrasRealizadasPage.jsx';
import CalculadoraPage from './pages/CalculadoraPage.jsx';
import OfertasPage from './pages/OfertasPage.jsx';

import FinanceiroPage from './pages/FinanceiroPage.jsx';
import MarcosFinancePage from './pages/MarcosFinancePage.jsx';
import PrecificacaoKitsPage from './pages/PrecificacaoKitsPage.jsx';
import ErpDashboardPage from './pages/ErpDashboardPage.jsx';
import EquipamentosPage from './pages/EquipamentosPage.jsx';
import TributosPage from './pages/TributosPage.jsx';

function App() {
  return (
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

        <Route path="/app/dashboard" element={<ErpDashboardPage />} />
        <Route path="/app" element={<FinanceiroPage />} />
        <Route path="/app/precos" element={<PrecificacaoKitsPage />} />
        <Route path="/app/equipamentos" element={<EquipamentosPage />} />
        <Route path="/app/tributos" element={<TributosPage />} />
        <Route path="/app/marcos" element={<MarcosFinancePage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
