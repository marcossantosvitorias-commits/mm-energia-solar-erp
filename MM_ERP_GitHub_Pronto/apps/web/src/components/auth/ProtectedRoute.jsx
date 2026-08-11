import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, loading, hasRole } = useAuth();
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

  if (roles?.length && !hasRole(...roles)) {
    const home = user?.role === 'comercial' ? '/app/precos' : '/app/dashboard';
    return <Navigate to={home} replace />;
  }

  return children;
}
