import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../api/client';

type AuthContextValue = {
  userId: number | null;
  username: string | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  username: null,
  token: null,
  isLoading: true,
  isLoggedIn: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreToken = async () => {
      const savedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      const backendUrl = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
      if (!backendUrl) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${backendUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        const data = await res.json();
        if (data.user_id) {
          setToken(savedToken);
          setUserId(data.user_id);
          setUsername(data.username);
        } else {
          await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        }
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      } finally {
        setIsLoading(false);
      }
    };

    restoreToken();
  }, []);

  const login = useCallback(async (usernameInput: string, password: string) => {
    const backendUrl = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
    if (!backendUrl) return { success: false, error: '请先配置后端地址' };

    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.detail?.message || '登录失败' };
      }

      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
      setToken(data.token);
      setUserId(data.user_id);
      setUsername(data.username);
      return { success: true };
    } catch {
      return { success: false, error: '登录失败，请检查后端服务' };
    }
  }, []);

  const register = useCallback(async (usernameInput: string, password: string) => {
    const backendUrl = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
    if (!backendUrl) return { success: false, error: '请先配置后端地址' };

    try {
      const res = await fetch(`${backendUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.detail?.message || '注册失败' };
      }

      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
      setToken(data.token);
      setUserId(data.user_id);
      setUsername(data.username);
      return { success: true };
    } catch {
      return { success: false, error: '注册失败，请检查后端服务' };
    }
  }, []);

  const logout = useCallback(async () => {
    const backendUrl = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
    if (backendUrl && token) {
      try {
        await fetch(`${backendUrl}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }

    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    setToken(null);
    setUserId(null);
    setUsername(null);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        userId,
        username,
        token,
        isLoading,
        isLoggedIn: !!token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
