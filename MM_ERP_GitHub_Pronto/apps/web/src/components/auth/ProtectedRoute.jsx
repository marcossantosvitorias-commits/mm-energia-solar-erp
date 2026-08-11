import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { accessKeyForPath } from '../../config/accessControl.js';

export default function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, loading, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 shadow-xl">
          <LoaderCircle className="animate-spin text-amber-400" size={22} />
          <span>Validando acesso...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const hasCustomPermissions = Array.isArray(user?.permissions);
  if (!hasCustomPermissions && roles?.length && !hasRole(...roles)) {
    const home = user?.role === 'comercial' ? '/app/precos' : '/app/dashboard';
    return <Navigate to={home} replace />;
  }

  const permissionKey = accessKeyForPath(location.pathname);
  if (hasCustomPermissions && permissionKey && !hasPermission(permissionKey)) {
    const firstAllowed = [
      ['precos', '/app/precos'],
      ['clientes', '/app/clientes'],
      ['calculadora', '/app/calculadora-solar'],
      ['propostas', '/app/propostas'],
      ['agenda', '/app/agenda'],
      ['contratos', '/app/contratos'],
      ['cotacoes_belenus', '/app/cotacoes-belenus'],
      ['dashboard', '/app/dashboard'],
      ['financeiro', '/app'],
    ].find(([key]) => hasPermission(key));
    return <Navigate to={firstAllowed?.[1] || '/login'} replace />;
  }

  return children;
}
