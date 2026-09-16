import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setAuthToken } from "../lib/apiClient";
import { loginRequest, registerRequest, type AuthResponse, type AuthUser } from "./authApi";

const STORAGE_KEY = "astilo-auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const readStored = (): AuthResponse | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthResponse) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<AuthResponse | null>(() => readStored());

  useEffect(() => {
    setAuthToken(auth?.token ?? null);
  }, [auth?.token]);

  const persist = useCallback((next: AuthResponse | null) => {
    setAuth(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private mode / quota — session still works in-memory */
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      persist(await loginRequest(email, password));
    },
    [persist]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      persist(await registerRequest(name, email, password));
    },
    [persist]
  );

  const logout = useCallback(() => persist(null), [persist]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: auth?.user ?? null,
      isAuthenticated: Boolean(auth?.token),
      isAdmin: auth?.user?.role === "admin",
      login,
      register,
      logout,
    }),
    [auth, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
