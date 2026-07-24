import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const STORAGE_KEY = 'mm-erp-session';
const AuthContext = createContext(null);

function readLocalSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function normalizeSupabaseUser(authUser) {
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role, active')
    .eq('id', authUser.id)
    .maybeSingle();

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
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    const restoreSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const normalized = await normalizeSupabaseUser(data.session?.user);
        if (active) setUser(normalized?.active ? normalized : null);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    restoreSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const normalized = await normalizeSupabaseUser(session?.user);
      if (active) {
        setUser(normalized?.active ? normalized : null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const login = async ({ email, password }) => {
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password?.trim()) {
      return { ok: false, message: 'Informe e-mail e senha.' };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) throw error;

        const normalized = await normalizeSupabaseUser(data.user);
        if (!normalized?.active) {
          await supabase.auth.signOut();
          return { ok: false, message: 'Este usuário está desativado.' };
        }

        setUser(normalized);
        return { ok: true };
      } catch (error) {
        const invalid = error?.message?.toLowerCase().includes('invalid login credentials');
        return {
          ok: false,
          message: invalid ? 'E-mail ou senha inválidos.' : 'Não foi possível acessar o banco. Tente novamente.',
        };
      }
    }

    const session = {
      id: 'local-admin',
      name: normalizedEmail.split('@')[0] || 'Administrador',
      email: normalizedEmail,
      role: 'admin',
      active: true,
      authenticatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
    return { ok: true, demoMode: true };
  };

  const logout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const hasRole = (...roles) => Boolean(user && roles.includes(user.role));

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isDemoMode: !isSupabaseConfigured,
      login,
      logout,
      hasRole,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}
