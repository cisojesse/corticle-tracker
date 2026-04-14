import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { compareSync } from 'bcryptjs';
import type { AuthSession } from '@/types';
import { APP_USERS } from './users.config';

const SESSION_KEY = 'corticle_session';
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

interface AuthContextType {
  session: AuthSession | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed: AuthSession = JSON.parse(stored);
        const elapsed = Date.now() - new Date(parsed.loginTime).getTime();
        if (elapsed < SESSION_TIMEOUT_MS) {
          setSession(parsed);
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const login = useCallback(async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!username.trim() || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    const user = APP_USERS.find(
      u => u.username.toLowerCase() === username.toLowerCase().trim()
    );

    if (!user) {
      try { compareSync(password, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'); } catch { /* constant-time dummy */ }
      return { success: false, error: 'Invalid username or password' };
    }

    let valid = false;
    try {
      valid = compareSync(password, user.passwordHash);
    } catch (err) {
      console.error('bcrypt compare error:', err);
      return { success: false, error: 'Authentication error. Please try again.' };
    }
    if (!valid) {
      return { success: false, error: 'Invalid username or password' };
    }

    const newSession: AuthSession = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      loginTime: new Date().toISOString(),
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      session,
      login,
      logout,
      isAuthenticated: session !== null,
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
