import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { AuthUser, authApi } from '@/api/auth';
import { usersApi } from '@/api/users';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

interface AuthContextType {
  isAuthenticated: boolean;
  isReady: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<'ok' | 'forbidden' | 'invalid'>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  const [isReady, setIsReady] = useState(!localStorage.getItem(TOKEN_KEY));

  const persistUser = (nextUser: AuthUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const refreshUser = async () => {
    const me = await usersApi.getMe();
    persistUser({
      id: me.id,
      login: me.login,
      name: me.name,
      role: me.role,
      photo: me.photo,
    });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    // SSO handoff owns the session — do not validate/clear tokens here
    // (stale getMe 401 would wipe a freshly exchanged SSO token).
    if (window.location.pathname.includes('/sso')) {
      setIsReady(true);
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsReady(true);
      return;
    }

    usersApi
      .getMe()
      .then(me => {
        if (me.role !== 'admin') {
          logout();
          return;
        }
        const nextUser: AuthUser = {
          id: me.id,
          login: me.login,
          name: me.name,
          role: me.role,
          photo: me.photo,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
        setIsAuthenticated(true);
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
  });

  const login = async (username: string, password: string) => {
    try {
      const data = await loginMutation.mutateAsync({ login: username, password });
      persistUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.token);
      setIsAuthenticated(true);
      return 'ok' as const;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        return 'forbidden' as const;
      }
      return 'invalid' as const;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isReady, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
