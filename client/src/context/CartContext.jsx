import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'nabta.cart';
const MAX_QTY = 50;

// The cart is managed with useReducer: every change is an action
function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const { product, quantity = 1 } = action;
      const existing = state.find((i) => i._id === product._id);
      const limit = Math.min(MAX_QTY, product.stock);
      if (existing) {
        return state.map((i) => (i._id === product._id ? { ...i, quantity: Math.min(limit, i.quantity + quantity), stock: product.stock } : i));
      }
      return [
        ...state,
        { _id: product._id, name: product.name, price: product.price, imageUrl: product.imageUrl, stock: product.stock, quantity: Math.min(limit, quantity) },
      ];
    }
    case 'setQuantity':
      return state
        .map((i) => (i._id === action.id ? { ...i, quantity: Math.max(0, Math.min(MAX_QTY, i.stock, action.quantity)) } : i))
        .filter((i) => i.quantity > 0);
    case 'remove':
      return state.filter((i) => i._id !== action.id);
    case 'clear':
      return [];
    default:
      return state;
  }
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, loadCart);

  // Persist the cart in the browser so it survives a page refresh
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  const value = useMemo(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
    return {
      items,
      count,
      subtotal,
      add: (product, quantity) => dispatch({ type: 'add', product, quantity }),
      setQuantity: (id, quantity) => dispatch({ type: 'setQuantity', id, quantity }),
      remove: (id) => dispatch({ type: 'remove', id }),
      clear: () => dispatch({ type: 'clear' }),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
