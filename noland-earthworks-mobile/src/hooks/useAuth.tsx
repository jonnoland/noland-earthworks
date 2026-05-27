/**
 * useAuth — Mobile app PIN authentication hook
 *
 * Auth state is managed in a single React context (AuthProvider) so that
 * when setToken() is called in PinLogin, AuthGate re-renders immediately
 * and navigates to the app shell.
 *
 * Usage:
 *   1. Wrap your app root with <AuthProvider>
 *   2. Call useAuth() anywhere to get { token, loading, isAuthenticated, setToken, logout }
 *   3. Call getStoredToken() from non-React code (e.g. tRPC httpBatchLink headers)
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { Preferences } from "@capacitor/preferences";

const TOKEN_KEY = "field_app_token";

// Module-level cache so the tRPC client can read the token synchronously
// without waiting for the hook to re-render.
let _cachedToken: string | null = null;

export function getStoredToken(): string | null {
  return _cachedToken;
}

// ── Context ───────────────────────────────────────────────────────────────────

interface AuthContextValue {
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  setToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(_cachedToken);
  const [loading, setLoading] = useState(true);

  // Load token from persistent storage on mount
  useEffect(() => {
    let cancelled = false;
    Preferences.get({ key: TOKEN_KEY }).then(({ value }) => {
      if (!cancelled) {
        _cachedToken = value ?? null;
        setTokenState(value ?? null);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const setToken = useCallback(async (newToken: string) => {
    await Preferences.set({ key: TOKEN_KEY, value: newToken });
    _cachedToken = newToken;
    setTokenState(newToken);
  }, []);

  const logout = useCallback(async () => {
    await Preferences.remove({ key: TOKEN_KEY });
    _cachedToken = null;
    setTokenState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, loading, isAuthenticated: !!token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
