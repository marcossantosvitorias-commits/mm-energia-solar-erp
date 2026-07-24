import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, SunMedium } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LoginPage() {
  const { isAuthenticated, loading, login, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await login({ email, password });

    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }

    const destination = location.state?.from || '/app/dashboard';
    navigate(destination, { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl lg:grid-cols-2">
          <div className="hidden bg-gradient-to-br from-blue-950 via-slate-900 to-amber-950 p-12 lg:flex lg:flex-col lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-400 p-3 text-slate-950">
                <SunMedium size={30} />
              </div>
              <div>
                <p className="text-xl font-bold">MM ERP AI</p>
                <p className="text-sm text-slate-300">Gestão para energia solar</p>
              </div>
            </div>

            <div>
              <h1 className="max-w-md text-4xl font-bold leading-tight">
                Controle comercial, financeiro e operacional em um só lugar.
              </h1>
              <p className="mt-4 max-w-md text-slate-300">
                Acesse o ambiente interno da MM Energia Solar para acompanhar clientes, propostas, obras e resultados.
              </p>
            </div>

            <p className="text-sm text-slate-400">MM Energia Solar • Bauru/SP</p>
          </div>

          <div className="p-7 sm:p-12">
            <div className="mb-8 lg:hidden">
              <div className="mb-3 inline-flex rounded-2xl bg-amber-400 p-3 text-slate-950">
                <SunMedium size={28} />
              </div>
              <p className="text-2xl font-bold">MM ERP AI</p>
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">Área restrita</p>
            <h2 className="mt-2 text-3xl font-bold">Entrar no sistema</h2>
            <p className="mt-2 text-slate-400">Use seu e-mail corporativo e sua senha.</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">E-mail</span>
                <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-4 focus-within:border-amber-400">
                  <Mail size={18} className="text-slate-500" />
                  <input
                    className="w-full bg-transparent px-3 py-3.5 outline-none placeholder:text-slate-600"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@mmenergiasolar.com.br"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Senha</span>
                <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 px-4 focus-within:border-amber-400">
                  <LockKeyhole size={18} className="text-slate-500" />
                  <input
                    className="w-full bg-transparent px-3 py-3.5 outline-none placeholder:text-slate-600"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </label>

              {error ? (
                <p className="rounded-xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              ) : null}

              <button
                className="w-full rounded-xl bg-amber-400 px-4 py-3.5 font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={submitting || loading}
              >
                {submitting ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="mt-6 text-xs leading-relaxed text-slate-500">
              {isDemoMode
                ? 'Acesso temporário ativo. O ERP abre automaticamente enquanto o Supabase não estiver configurado.'
                : 'Acesso protegido por autenticação Supabase.'}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
