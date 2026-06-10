import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { API_BASE, request } from '../api/core';

interface User {
  id: number;
  email: string;
  name: string;
  is_onboarded: boolean;
  preferences?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API = API_BASE;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: verify session by calling /api/me.
  // The httpOnly cookie is sent automatically by the browser.
  // This replaces the old localStorage token restoration.
  useEffect(() => {
    // Clean up any stale data from the old localStorage-based auth.
    localStorage.removeItem('evolv_token');
    localStorage.removeItem('evolv_user');

    fetch(`${API}/me`, { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
        // 401 = no active session → user stays null, will see landing/login
      })
      .catch(() => {
        // Network error: treat as unauthenticated
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await request<{ user: User }>(`${API}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    // Fire-and-forget: reschedule overdue tasks on login
    fetch(`${API}/tasks/reschedule`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await request<{ user: User }>(`${API}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      // Ask the server to clear the httpOnly cookie.
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // Best-effort — clear local state regardless.
    }
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
