import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, SunMedium, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LoginPage() {
  const { isAuthenticated, loading, login, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const logoUrl = `${import.meta.env.BASE_URL}logo-mm.png`;

  if (!loading && isAuthenticated) {
    return <Navigate to="/app/precos" replace />;
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

    const destination = location.state?.from || '/app/precos';
    navigate(destination, { replace: true });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-4 py-6 text-slate-800 sm:py-10">
      <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-blue-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-28 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-5rem)]">
        <section className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,44,82,0.14)] lg:grid-cols-[1.05fr_.95fr]">
          <div className="hidden min-h-[620px] bg-gradient-to-br from-[#06172f] via-[#0f2c52] to-[#1c4f8a] p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white p-2 shadow-xl">
                <img src={logoUrl} alt="MM Energia Solar" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="font-[Manrope] text-xl font-extrabold tracking-tight">MM ERP</p>
                <p className="mt-1 text-sm text-blue-100/80">Gestão inteligente para energia solar</p>
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
                <Zap size={14} /> MM Energia Solar
              </span>
              <h1 className="mt-6 max-w-md font-[Manrope] text-4xl font-extrabold leading-[1.12] tracking-tight text-white">
                Comercial, financeiro e operação em um único sistema.
              </h1>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-blue-100/80">
                Acompanhe clientes, propostas, instalações, agenda, custos e resultados com uma experiência rápida no computador e no celular.
              </p>

              <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <SunMedium size={20} className="text-amber-300" />
                  <strong className="mt-3 block text-sm">Energia solar</strong>
                  <span className="mt-1 block text-xs text-blue-100/65">Fluxo criado para a MM</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <ShieldCheck size={20} className="text-emerald-300" />
                  <strong className="mt-3 block text-sm">Acesso protegido</strong>
                  <span className="mt-1 block text-xs text-blue-100/65">Perfis e permissões</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-blue-100/55">MM Energia Solar • Bauru/SP</p>
          </div>

          <div className="flex min-h-[560px] flex-col justify-center p-6 sm:p-10 lg:p-12">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white p-2 shadow-md ring-1 ring-slate-200">
                <img src={logoUrl} alt="MM Energia Solar" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="font-[Manrope] text-xl font-extrabold text-[#0f2c52]">MM ERP</p>
                <p className="text-xs text-slate-500">MM Energia Solar</p>
              </div>
            </div>

            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#c99b12]">Área restrita</p>
            <h2 className="mt-2 font-[Manrope] text-3xl font-extrabold tracking-tight text-[#0f2c52] sm:text-4xl">Entrar no sistema</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Use seu usuário ou e-mail e sua senha para acessar a ERP.</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Usuário ou e-mail</span>
                <div className="flex min-h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 shadow-sm transition focus-within:border-[#2563a8] focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100/70">
                  <Mail size={18} className="shrink-0 text-slate-400" />
                  <input
                    className="w-full bg-transparent px-3 py-3 text-[15px] text-slate-800 outline-none placeholder:text-slate-400"
                    type="text"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="vendedor ou voce@mmenergiasolar.com.br"
                    autoComplete="username"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Senha</span>
                <div className="flex min-h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 shadow-sm transition focus-within:border-[#2563a8] focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100/70">
                  <LockKeyhole size={18} className="shrink-0 text-slate-400" />
                  <input
                    className="w-full bg-transparent px-3 py-3 text-[15px] text-slate-800 outline-none placeholder:text-slate-400"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-[#1c4f8a] focus:outline-none focus:ring-2 focus:ring-blue-200"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </label>

              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                className="w-full rounded-xl bg-gradient-to-r from-[#0f2c52] to-[#1c4f8a] px-4 py-3.5 font-extrabold text-white shadow-[0_10px_24px_rgba(15,44,82,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,44,82,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={submitting || loading}
              >
                {submitting ? 'Entrando...' : 'Entrar na MM ERP'}
              </button>
            </form>

            <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
              {isDemoMode
                ? 'Acesso temporário protegido por senha. A autenticação Supabase será ativada posteriormente.'
                : 'Acesso protegido por autenticação Supabase.'}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
