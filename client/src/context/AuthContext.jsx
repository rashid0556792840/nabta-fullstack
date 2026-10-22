import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  // On first load, restore the session from the saved token
  useEffect(() => {
    if (!tokenStore.get()) return;
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => tokenStore.set(null))
      .finally(() => setLoading(false));
  }, []);

  // Any 401 from the API signs the user out
  useEffect(() => {
    const onUnauthorized = () => {
      tokenStore.set(null);
      setUser(null);
    };
    window.addEventListener('nabta:unauthorized', onUnauthorized);
    return () => window.removeEventListener('nabta:unauthorized', onUnauthorized);
  }, []);

  const signIn = useCallback(async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (values) => {
    const data = await api('/auth/register', { method: 'POST', body: values });
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signOut = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin: user?.role === 'admin', signIn, register, signOut, setUser }),
    [user, loading, signIn, register, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
