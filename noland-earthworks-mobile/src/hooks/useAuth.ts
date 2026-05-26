/**
 * useAuth — Mobile app PIN authentication hook
 *
 * Manages the field app JWT token stored in Capacitor Preferences.
 * The token is set after a successful PIN verification and cleared on logout.
 * Components can call useAuth() to get the current auth state and setToken/logout helpers.
 *
 * The token is also exposed via getStoredToken() for use in the tRPC httpBatchLink headers.
 */

import { useState, useEffect, useCallback } from "react";
import { Preferences } from "@capacitor/preferences";

const TOKEN_KEY = "field_app_token";

// Module-level cache so the tRPC client can read the token synchronously
// without waiting for the hook to re-render.
let _cachedToken: string | null = null;

export function getStoredToken(): string | null {
  return _cachedToken;
}

export function useAuth() {
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

  return {
    token,
    loading,
    isAuthenticated: !!token,
    setToken,
    logout,
  };
}
