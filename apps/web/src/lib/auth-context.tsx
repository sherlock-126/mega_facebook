'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, setTokens, clearTokens, getAccessToken } from './api-client';
import { API_BASE_URL } from './constants';
import type { ApiResponse } from '@mega/shared';
import type { Profile } from '@mega/shared';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: Profile | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  const refreshProfile = useCallback(async () => {
    try {
      const res = await apiClient<ApiResponse<Profile>>('/profile/me');
      setState({ isAuthenticated: true, isLoading: false, user: res.data });
    } catch {
      setState({ isAuthenticated: false, isLoading: false, user: null });
    }
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      refreshProfile();
    } else {
      setState({ isAuthenticated: false, isLoading: false, user: null });
    }
  }, [refreshProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(err.message || 'Login failed');
      }
      const data = await res.json();
      setTokens(data.data.accessToken, data.data.refreshToken);
      await refreshProfile();
    },
    [refreshProfile],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // ignore logout errors
    }
    clearTokens();
    setState({ isAuthenticated: false, isLoading: false, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
