import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);
const LOCAL_SESSION_KEY = 'mm-erp-emergency-session';
const EMERGENCY_EMAIL = 'marcossantosvitorias@gmail.com';
const EMERGENCY_PASSWORD_SHA256 = '1034567cfa576b6464a58ab42ae019a08d10619f8f471c5f5610af0640807dfd';

function readLocalSession() {
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function normalizeUser(authUser) {
  if (!authUser) return null;
  const { data: profile, error } = await supabase
    .from('profiles').select('name, role, active').eq('id', authUser.id).maybeSingle();
  if (error) throw error;
  return {
    id: authUser.id,
    name: profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
    email: authUser.email,
    role: profile?.role || 'comercial',
    active: profile?.active !== false,
    avatar: authUser.user_metadata?.avatar_url || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (isSupabaseConfigured ? null : readLocalSession()));
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    supabase.auth.getSession()
      .then(async ({ data, error }) => {
        if (error) throw error;
        const current = await normalizeUser(data.session?.user);
        if (active) setUser(current?.active ? current : null);
      })
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const current = await normalizeUser(session?.user);
        if (active) setUser(current?.active ? current : null);
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async ({ email, password }) => {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !password?.trim()) return { ok: false, message: 'Informe e-mail e senha.' };

    if (!isSupabaseConfigured) {
      const passwordHash = await sha256(password);
      if (normalizedEmail !== EMERGENCY_EMAIL || passwordHash !== EMERGENCY_PASSWORD_SHA256) {
        return { ok: false, message: 'E-mail ou senha inválidos.' };
      }

      const emergencyUser = {
        id: 'local-admin-emergency',
        name: 'Marcos Santos',
        email: EMERGENCY_EMAIL,
        role: 'admin',
        active: true,
        emergencyMode: true,
      };
      window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(emergencyUser));
      setUser(emergencyUser);
      return { ok: true, emergencyMode: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) throw error;
      const current = await normalizeUser(data.user);
      if (!current?.active) {
        await supabase.auth.signOut();
        return { ok: false, message: 'Este usuário está desativado.' };
      }
      setUser(current);
      return { ok: true };
    } catch (error) {
      const invalid = error?.message?.toLowerCase().includes('invalid login credentials');
      return { ok: false, message: invalid ? 'E-mail ou senha inválidos.' : 'Não foi possível acessar o Supabase.' };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    setUser(null);
  };

  const hasRole = (...roles) => Boolean(user && roles.includes(user.role));
  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    isDemoMode: !isSupabaseConfigured,
    login,
    logout,
    hasRole,
    databaseConfigured: isSupabaseConfigured,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
