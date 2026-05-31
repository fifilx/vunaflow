import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type User } from "../lib/api";
import { useTranslation } from "react-i18next";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  const loadMe = async () => {
    const token = localStorage.getItem("vuna_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<{ user: User }>("/auth/me");
      setUserState(data.user);
      if (data.user.language) i18n.changeLanguage(data.user.language);
    } catch {
      localStorage.removeItem("vuna_token");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (u: User, token: string) => {
    localStorage.setItem("vuna_token", token);
    setUserState(u);
    if (u.language) i18n.changeLanguage(u.language);
  };

  const logout = () => {
    localStorage.removeItem("vuna_token");
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh: loadMe, setUser: setUserState }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
