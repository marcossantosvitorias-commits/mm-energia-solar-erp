import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  WalletCards,
  Calculator,
  BadgeDollarSign,
  PackageSearch,
  Scale,
  UserRound,
  UsersRound,
  Globe2,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import './finance.css';
import './auth-layout.css';
import '../crm/crm.css';

const mainItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/clientes', label: 'Clientes e leads', icon: UsersRound },
  { to: '/app', label: 'Financeiro', icon: WalletCards, end: true },
  { to: '/app/precos', label: 'Preço dos kits', icon: Calculator },
  { to: '/app/belcred', label: 'Simulador BelCred', icon: BadgeDollarSign },
  { to: '/app/equipamentos', label: 'Equipamentos', icon: PackageSearch },
  { to: '/app/tributos', label: 'Tributação', icon: Scale },
  { to: '/app/marcos', label: 'Marcos', icon: UserRound },
];

function FinanceLayout({ title, subtitle, children, theme = 'empresa', activeSection, onSectionChange }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pessoal = theme === 'marcos';
  const financeSections = [
    ['dashboard', 'Visão geral'],
    ['fluxo', 'Fluxo de caixa'],
    ['pagar', 'Contas a pagar'],
    ['receber', 'Contas a receber'],
    ['relatorios', 'Relatórios'],
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const displayName = pessoal ? 'Marcos Santos' : (user?.name || 'MM Energia Solar');
  const displayRole = pessoal ? 'Conta pessoal' : (user?.role === 'admin' ? 'Administrador' : 'Usuário');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className={`finance-shell ${pessoal ? 'theme-marcos' : 'theme-empresa'}`}>
      <button className="finance-mobile-toggle" onClick={() => setMenuAberto((v) => !v)} aria-label="Abrir menu">
        {menuAberto ? <X size={22} /> : <Menu size={22} />}
      </button>

      <aside className={`finance-sidebar ${menuAberto ? 'open' : ''}`}>
        <div className="finance-brand">
          <div className="finance-logo-box"><img src="/logo-mm.png" alt="MM Energia Solar" /></div>
          <div><strong>MM ERP</strong><span>MM Energia Solar</span></div>
        </div>

        <nav className="erp-main-nav">
          {mainItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuAberto(false)}>
              <Icon size={18} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {!pessoal && activeSection && (
          <nav className="finance-section-nav compact">
            <span className="nav-section-label">Dentro do financeiro</span>
            {financeSections.map(([id, label]) => (
              <button key={id} className={activeSection === id ? 'active' : ''} onClick={() => { onSectionChange(id); setMenuAberto(false); }}>
                {label}
              </button>
            ))}
          </nav>
        )}

        <nav className="finance-account-nav">
          <a href="/"><Globe2 size={17} /> <span>Voltar ao site</span></a>
          <button type="button" onClick={handleLogout}><LogOut size={17} /> <span>Sair do sistema</span></button>
        </nav>

        <div className="finance-user">
          <div className="finance-avatar">{initials || 'MM'}</div>
          <div><strong>{displayName}</strong><span>{displayRole}</span></div>
        </div>
      </aside>

      {menuAberto && <button className="finance-overlay" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} />}

      <main className="finance-main">
        <header className="finance-header"><span className="finance-eyebrow">{pessoal ? 'Controle pessoal' : 'Gestão empresarial'}</span><h1>{title}</h1><p>{subtitle}</p></header>
        {children}
      </main>
    </div>
  );
}

export default FinanceLayout;
