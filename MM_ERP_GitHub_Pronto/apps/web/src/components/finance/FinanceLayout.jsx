import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, LayoutPanelTop, WalletCards, Calculator, SunMedium, BatteryCharging,
  BadgeDollarSign, FileSpreadsheet, FileSignature, FileText, PackageSearch, Scale,
  UserRound, UsersRound, CalendarDays, DatabaseBackup, PlugZap, RadioTower,
  ClipboardCheck, Globe2, LogOut, Menu, Download, X,
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
      { to: '/app/fluxos', label: 'Fluxos e Kanbans', icon: LayoutPanelTop, roles: ['admin', 'financeiro', 'comercial', 'engenharia'] },
      { to: '/app/clientes', label: 'Clientes e leads', icon: UsersRound, roles: ['admin', 'financeiro', 'comercial'] },
      { to: '/app/calculadora-solar', label: 'Calculadora Solar', icon: SunMedium, roles: ['admin', 'financeiro', 'comercial'] },
      { to: '/app/propostas', label: 'Propostas comerciais', icon: FileText, roles: ['admin', 'financeiro', 'comercial'] },
      { to: '/app/agenda', label: 'Agenda', icon: CalendarDays, roles: ['admin', 'financeiro', 'comercial'] },
      { to: '/app/contratos', label: 'Contratos', icon: FileSignature, roles: ['admin', 'financeiro', 'comercial'] },
      { to: '/app/cotacoes-belenus', label: 'Cotações Belenus', icon: FileSpreadsheet, roles: ['admin', 'financeiro', 'comercial'] },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { to: '/app', label: 'Financeiro', icon: WalletCards, end: true, roles: ['admin', 'financeiro'] },
      { to: '/app/precos', label: 'Kits on-grid', icon: Calculator, roles: ['admin', 'financeiro', 'comercial'] },
      { to: '/app/kits-hibridos', label: 'Kits híbridos + bateria', icon: BatteryCharging, roles: ['admin', 'financeiro', 'comercial'] },
      { to: '/app/belcred', label: 'Simulador BelCred', icon: BadgeDollarSign, roles: ['admin', 'financeiro', 'comercial'] },
      { to: '/app/tributos', label: 'Tributação', icon: Scale, roles: ['admin', 'financeiro'] },
      { to: '/app/marcos', label: 'Pessoa Física', icon: UserRound, roles: ['admin'] },
    ],
  },
  {
    title: 'Operacional',
    items: [
      { to: '/app/ordens-servico', label: 'Ordens de serviço', icon: ClipboardCheck, roles: ['admin', 'financeiro', 'comercial', 'engenharia'] },
      { to: '/app/monitoramento', label: 'Monitoramento solar', icon: RadioTower, roles: ['admin', 'engenharia'] },
      { to: '/app/equipamentos', label: 'Equipamentos', icon: PackageSearch, roles: ['admin', 'engenharia'] },
      { to: '/app/bling', label: 'Integração Bling', icon: PlugZap, roles: ['admin', 'financeiro'] },
      { to: '/app/migracao-dados', label: 'Backup e migração', icon: DatabaseBackup, roles: ['admin'] },
    ],
  },
];

const roleLabels = { admin: 'Administrador', financeiro: 'Financeiro', comercial: 'Comercial', engenharia: 'Engenharia' };

function FinanceLayout({ title, subtitle, children, theme = 'empresa', activeSection, onSectionChange }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const pessoal = theme === 'marcos';
  const logoUrl = `${import.meta.env.BASE_URL}logo-mm.png`;
  const financeSections = [
    ['dashboard', 'Visão geral'], ['fluxo', 'Fluxo de caixa'], ['pagar', 'Contas a pagar'],
    ['receber', 'Contas a receber'], ['relatorios', 'Relatórios'],
  ];

  useEffect(() => {
    const prepararInstalacao = (event) => { event.preventDefault(); setInstallPrompt(event); };
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

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };
  const displayName = pessoal ? 'Marcos Santos' : (user?.name || 'MM Energia Solar');
  const displayRole = pessoal ? 'Pessoa Física' : (roleLabels[user?.role] || 'Usuário');
  const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const canAccess = (roles) => !roles?.length || hasRole(...roles);
  const renderNavItem = ({ to, label, icon: Icon, end }) => (
    <NavLink key={to} to={to} end={end} onClick={() => setMenuAberto(false)}><Icon size={18} /><span>{label}</span></NavLink>
  );
  const visibleSections = menuSections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccess(item.roles)) }))
    .filter((section) => section.items.length > 0);

  return (
    <div className={`finance-shell ${pessoal ? 'theme-marcos' : 'theme-empresa'}`}>
      <button className="finance-mobile-toggle" onClick={() => setMenuAberto((v) => !v)} aria-label="Abrir menu">
        {menuAberto ? <X size={22} /> : <Menu size={22} />}
      </button>
      <aside
        className={`finance-sidebar ${menuAberto ? 'open' : ''}`}
        style={{
          overflowY: 'auto',
          height: '100dvh',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          paddingBottom: 'calc(42px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="finance-brand">
          <div className="finance-logo-box"><img src={logoUrl} alt="MM Energia Solar" /></div>
          <div><strong>MM ERP <small style={{ color: '#f5c400', fontSize: '0.58em', marginLeft: 6 }}>v{APP_VERSION}</small></strong><span>MM Energia Solar</span></div>
        </div>
        <nav className="erp-main-nav">
          {renderNavItem(dashboardItem)}
          {visibleSections.map(({ title: sectionTitle, className = '', items }) => (
            <div key={sectionTitle} className={`erp-nav-section ${className}`.trim()}>
              <span className="nav-section-label">{sectionTitle}</span>
              {items.map(renderNavItem)}
            </div>
          ))}
        </nav>
        {!pessoal && activeSection && hasRole('admin', 'financeiro') && (
          <nav className="finance-section-nav compact">
            <span className="nav-section-label">Dentro do financeiro</span>
            {financeSections.map(([id, label]) => (
              <button key={id} className={activeSection === id ? 'active' : ''} onClick={() => { onSectionChange(id); setMenuAberto(false); }}>{label}</button>
            ))}
          </nav>
        )}
        <nav className="finance-account-nav">
          {installPrompt && <button type="button" onClick={instalarAplicativo}><Download size={17} /> <span>Instalar MM ERP</span></button>}
          <a href="https://mmenergiasolar.com.br"><Globe2 size={17} /> <span>Voltar ao site comercial</span></a>
          <button type="button" onClick={handleLogout}><LogOut size={17} /> <span>Sair do sistema</span></button>
        </nav>
        <div className="finance-user" style={{ flexShrink: 0, marginTop: 18, marginBottom: 24 }}>
          <div className="finance-avatar">{initials || 'MM'}</div>
          <div><strong>{displayName}</strong><span>{displayRole}</span></div>
        </div>
      </aside>
      {menuAberto && <button className="finance-overlay" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} />}
      <main className="finance-main">
        <header className="finance-header"><span className="finance-eyebrow">{pessoal ? 'Controle pessoal' : 'Gestão empresarial'}</span><h1>{title}</h1><p>{subtitle}</p></header>
        <div className="finance-content-scroll">{children}</div>
      </main>
    </div>
  );
}

export default FinanceLayout;
