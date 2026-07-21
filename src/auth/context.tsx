import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { API_ENABLED, api, clearToken, getToken, setToken } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the initial token check resolves. */
  loading: boolean;
  /** False when the app runs against the built-in demo data (no login needed). */
  authRequired: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProviderRoot({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(API_ENABLED);

  // Validate an existing token on boot.
  useEffect(() => {
    if (!API_ENABLED || !getToken()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api<AuthUser>("/auth/me")
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && clearToken())
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // A 401 anywhere in the app forces a clean logout.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("akort:unauthorized", onUnauthorized);
    return () => window.removeEventListener("akort:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, authRequired: API_ENABLED, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProviderRoot");
  return ctx;
}
