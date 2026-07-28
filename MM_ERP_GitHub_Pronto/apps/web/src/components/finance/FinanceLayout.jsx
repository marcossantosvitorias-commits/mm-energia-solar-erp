import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  WalletCards,
  Calculator,
  BadgeDollarSign,
  FileSpreadsheet,
  FileSignature,
  PackageSearch,
  Scale,
  UserRound,
  UsersRound,
  CalendarDays,
  DatabaseBackup,
  PlugZap,
  RadioTower,
  Globe2,
  LogOut,
  Menu,
  Download,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { APP_VERSION } from '../../version.js';
import './finance.css';
import './auth-layout.css';
import '../crm/crm.css';

const dashboardItem = { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard };

const menuSections = [
  {
    title: 'Comercial',
    items: [
      { to: '/app/clientes', label: 'Clientes e leads', icon: UsersRound },
      { to: '/app/agenda', label: 'Agenda', icon: CalendarDays },
      { to: '/app/contratos', label: 'Contratos', icon: FileSignature },
      { to: '/app/cotacoes-belenus', label: 'Cotações Belenus', icon: FileSpreadsheet },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { to: '/app', label: 'Financeiro', icon: WalletCards, end: true },
      { to: '/app/precos', label: 'Preço dos kits', icon: Calculator },
      { to: '/app/belcred', label: 'Simulador BelCred', icon: BadgeDollarSign },
      { to: '/app/tributos', label: 'Tributação', icon: Scale },
    ],
  },
  {
    title: 'Operacional',
    items: [
      { to: '/app/monitoramento', label: 'Monitoramento solar', icon: RadioTower },
      { to: '/app/equipamentos', label: 'Equipamentos', icon: PackageSearch },
      { to: '/app/bling', label: 'Integração Bling', icon: PlugZap },
      { to: '/app/migracao-dados', label: 'Backup e migração', icon: DatabaseBackup },
    ],
  },
  {
    title: 'Pessoal',
    className: 'erp-nav-section-personal',
    items: [
      { to: '/app/marcos', label: 'Marcos', icon: UserRound },
    ],
  },
];

function FinanceLayout({ title, subtitle, children, theme = 'empresa', activeSection, onSectionChange }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
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

  useEffect(() => {
    const prepararInstalacao = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const instalado = () => setInstallPrompt(null);

    window.addEventListener('beforeinstallprompt', prepararInstalacao);
    window.addEventListener('appinstalled', instalado);
    return () => {
      window.removeEventListener('beforeinstallprompt', prepararInstalacao);
      window.removeEventListener('appinstalled', instalado);
    };
  }, []);

  const instalarAplicativo = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

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

  const renderNavItem = ({ to, label, icon: Icon, end }) => (
    <NavLink key={to} to={to} end={end} onClick={() => setMenuAberto(false)}>
      <Icon size={18} /><span>{label}</span>
    </NavLink>
  );

  return (
    <div className={`finance-shell ${pessoal ? 'theme-marcos' : 'theme-empresa'}`}>
      <button className="finance-mobile-toggle" onClick={() => setMenuAberto((v) => !v)} aria-label="Abrir menu">
        {menuAberto ? <X size={22} /> : <Menu size={22} />}
      </button>

      <aside className={`finance-sidebar ${menuAberto ? 'open' : ''}`}>
        <div className="finance-brand">
          <div className="finance-logo-box"><img src="/logo-mm.png" alt="MM Energia Solar" /></div>
          <div><strong>MM ERP <small style={{ color: '#f5c400', fontSize: '0.58em', marginLeft: 6 }}>v{APP_VERSION}</small></strong><span>MM Energia Solar</span></div>
        </div>

        <nav className="erp-main-nav">
          {renderNavItem(dashboardItem)}
          {menuSections.map(({ title: sectionTitle, className = '', items }) => (
            <div key={sectionTitle} className={`erp-nav-section ${className}`.trim()}>
              <span className="nav-section-label">{sectionTitle}</span>
              {items.map(renderNavItem)}
            </div>
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
          {installPrompt && (
            <button type="button" onClick={instalarAplicativo}>
              <Download size={17} /> <span>Instalar MM ERP</span>
            </button>
          )}
          <a href="https://mmenergiasolar.com.br"><Globe2 size={17} /> <span>Voltar ao site comercial</span></a>
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
