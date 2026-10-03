"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { AuthUser, AuthTenant } from "@sim-ormawa/contracts";
import { apiClient } from "@/lib/api-client";

interface AuthState {
  user: AuthUser | null;
  activeTenant: AuthTenant | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    activeTenant: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const data = await apiClient.get<{ user: AuthUser; activeTenant?: AuthTenant }>("/auth/me");
      setState({
        user: data.user,
        activeTenant: data.activeTenant ?? null,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      setState({ user: null, activeTenant: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout", {});
    } finally {
      setState({ user: null, activeTenant: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ user: AuthUser; activeTenant?: AuthTenant }>("/auth/me")
      .then((data) => {
        if (!cancelled) {
          setState({
            user: data.user,
            activeTenant: data.activeTenant ?? null,
            isLoading: false,
            isAuthenticated: true,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ user: null, activeTenant: null, isLoading: false, isAuthenticated: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
