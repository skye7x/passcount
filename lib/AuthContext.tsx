'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from './api';
import { ApiError } from './api';

interface AuthContextType {
  email: string | null;
  isAuthenticated: boolean;
  initializing: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .getCurrentSession()
      .then(session => {
        if (active) setEmail(session?.email ?? null);
      })
      .finally(() => {
        if (active) setInitializing(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const register = useCallback(async (emailInput: string, password: string) => {
    const result = await api.register(emailInput.trim().toLowerCase(), password);
    setEmail(result.email);
  }, []);

  const login = useCallback(async (emailInput: string, password: string) => {
    const result = await api.login(emailInput.trim().toLowerCase(), password);
    setEmail(result.email);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setEmail(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        email,
        isAuthenticated: !!email,
        initializing,
        register,
        login,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ApiError };
