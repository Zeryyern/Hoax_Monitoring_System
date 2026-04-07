import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string, loginType?: 'any' | 'user' | 'admin') => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const IDLE_TIMEOUT_MINUTES = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES || 15);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const idleTimerRef = useRef<number | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearIdleTimer();
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('current_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    window.dispatchEvent(new CustomEvent('auth:logged-out'));
  }, [clearIdleTimer]);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    const storedUser = sessionStorage.getItem('current_user') || localStorage.getItem('current_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      sessionStorage.setItem('auth_token', storedToken);
      sessionStorage.setItem('current_user', storedUser);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => logout();
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [logout]);

  useEffect(() => {
    if (!token) {
      clearIdleTimer();
      return;
    }

    const timeoutMs = Math.max(1, IDLE_TIMEOUT_MINUTES) * 60 * 1000;
    const resetIdleTimer = () => {
      clearIdleTimer();
      idleTimerRef.current = window.setTimeout(() => {
        logout();
        window.dispatchEvent(new CustomEvent('auth:idle-logout'));
      }, timeoutMs);
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
      clearIdleTimer();
    };
  }, [token, logout, clearIdleTimer]);

  const register = async (username: string, email: string, password: string) => {
    try {
      const result = await apiClient.register(username, email, password);
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Registration failed' };
    }
  };

  const login = async (email: string, password: string, loginType: 'any' | 'user' | 'admin' = 'any') => {
    try {
      const result = await apiClient.login(email, password, loginType);
      if (result.success && result.data) {
        setToken(result.data.token);
        setUser(result.data.user);
        return { success: true, user: result.data.user };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Login failed' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
