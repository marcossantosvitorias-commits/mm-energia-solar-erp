import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

const TEMPORARY_ADMIN = {
  id: 'temporary-admin-access',
  name: 'Marcos Santos',
  email: 'marcossantosvitorias@gmail.com',
  role: 'admin',
  active: true,
  temporaryAccess: true,
};

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
  const [user, setUser] = useState(() => (isSupabaseConfigured ? null : TEMPORARY_ADMIN));
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured) {
      setUser(TEMPORARY_ADMIN);
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
    if (!isSupabaseConfigured) {
      setUser(TEMPORARY_ADMIN);
      return { ok: true, temporaryAccess: true };
    }

    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !password?.trim()) {
      return { ok: false, message: 'Informe e-mail e senha.' };
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

    setUser(TEMPORARY_ADMIN);
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
