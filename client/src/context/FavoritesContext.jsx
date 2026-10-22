import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(new Set());

  // Load favourites whenever the signed-in user changes
  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    setIds(new Set((user.favorites || []).map(String)));
  }, [user]);

  const toggle = useCallback(
    async (productId) => {
      const isFav = ids.has(productId);
      const data = await api(`/favorites/${productId}`, { method: isFav ? 'DELETE' : 'POST' });
      setIds(new Set(data.ids));
      return !isFav;
    },
    [ids]
  );

  const value = useMemo(() => ({ ids, isFavorite: (id) => ids.has(id), toggle }), [ids, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside <FavoritesProvider>');
  return ctx;
}
