import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);
const TEMPORARY_SESSION_KEY = 'mm-erp-temporary-session-v2';
const TEMPORARY_ADMIN_EMAIL = 'marcossantosvitorias@gmail.com';
const TEMPORARY_PASSWORD_HASH = '5d8defe14ebca58ce9fb89114defb2302452b09faead6998e09a26e7e784b5f9';

const TEMPORARY_ADMIN = {
  id: 'temporary-admin-access',
  name: 'Marcos Santos',
  email: TEMPORARY_ADMIN_EMAIL,
  role: 'admin',
  active: true,
  temporaryAccess: true,
};

function readTemporarySession() {
  try {
    const session = JSON.parse(localStorage.getItem(TEMPORARY_SESSION_KEY) || 'null');
    return session?.authenticated === true && session?.email === TEMPORARY_ADMIN_EMAIL
      ? TEMPORARY_ADMIN
      : null;
  } catch {
    return null;
  }
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function normalizeUser(authUser) {
  if (!authUser) return null;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('name, role, active')
    .eq('id', authUser.id)
    .maybeSingle();
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
  const [user, setUser] = useState(() => (
    isSupabaseConfigured ? null : readTemporarySession()
  ));
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
    if (!normalizedEmail || !password) {
      return { ok: false, message: 'Informe e-mail e senha.' };
    }

    if (!isSupabaseConfigured) {
      const passwordHash = await sha256(password);
      if (
        normalizedEmail !== TEMPORARY_ADMIN_EMAIL
        || passwordHash !== TEMPORARY_PASSWORD_HASH
      ) {
        return { ok: false, message: 'E-mail ou senha inválidos.' };
      }

      localStorage.setItem(TEMPORARY_SESSION_KEY, JSON.stringify({
        authenticated: true,
        email: TEMPORARY_ADMIN_EMAIL,
      }));
      setUser(TEMPORARY_ADMIN);
      return { ok: true, temporaryAccess: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
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
      return {
        ok: false,
        message: invalid ? 'E-mail ou senha inválidos.' : 'Não foi possível acessar o Supabase.',
      };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
      setUser(null);
      return;
    }

    localStorage.removeItem(TEMPORARY_SESSION_KEY);
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
    temporaryAccess: !isSupabaseConfigured,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
