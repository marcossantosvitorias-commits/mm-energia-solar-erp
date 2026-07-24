import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isPocketBaseConfigured, pb } from '../lib/pocketbase.js';

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

function normalizePocketBaseUser(record) {
  if (!record) return null;

  return {
    id: record.id,
    name: record.name || record.username || record.email?.split('@')[0] || 'Usuário',
    email: record.email,
    role: record.role || 'user',
    avatar: record.avatar || null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (
    isPocketBaseConfigured ? normalizePocketBaseUser(pb.authStore.record) : readLocalSession()
  ));
  const [loading, setLoading] = useState(isPocketBaseConfigured);

  useEffect(() => {
    if (!isPocketBaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    const restoreSession = async () => {
      try {
        if (pb.authStore.isValid) {
          await pb.collection('users').authRefresh();
        }
      } catch {
        pb.authStore.clear();
      } finally {
        if (active) {
          setUser(normalizePocketBaseUser(pb.authStore.record));
          setLoading(false);
        }
      }
    };

    restoreSession();

    const unsubscribe = pb.authStore.onChange((_token, record) => {
      if (active) setUser(normalizePocketBaseUser(record));
    }, true);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = async ({ email, password }) => {
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password?.trim()) {
      return { ok: false, message: 'Informe e-mail e senha.' };
    }

    if (isPocketBaseConfigured) {
      try {
        const authData = await pb.collection('users').authWithPassword(normalizedEmail, password);
        setUser(normalizePocketBaseUser(authData.record));
        return { ok: true };
      } catch (error) {
        const message = error?.status === 400
          ? 'E-mail ou senha inválidos.'
          : 'Não foi possível acessar o servidor. Tente novamente.';
        return { ok: false, message };
      }
    }

    const session = {
      id: 'local-admin',
      name: normalizedEmail.split('@')[0] || 'Administrador',
      email: normalizedEmail,
      role: 'admin',
      authenticatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
    return { ok: true, demoMode: true };
  };

  const logout = () => {
    if (isPocketBaseConfigured) pb.authStore.clear();
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const hasRole = (...roles) => Boolean(user && roles.includes(user.role));

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isDemoMode: !isPocketBaseConfigured,
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
