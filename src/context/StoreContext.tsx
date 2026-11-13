import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { apiFetch } from '../lib/api';
import type {
  Banner,
  CartItem,
  Category,
  Product,
  StoreSettings,
  UserProfile,
} from '../types/store';

interface StoreContextValue {
  settings: StoreSettings | null;
  categories: Category[];
  products: Product[];
  banners: Banner[];
  user: UserProfile | null;
  cart: CartItem[];
  isCartOpen: boolean;
  loading: boolean;
  error: string | null;
  setIsCartOpen: (open: boolean) => void;
  refreshStorefront: () => Promise<void>;
  refreshUser: () => Promise<void>;
  addToCart: (item: Omit<CartItem, 'key'>) => void;
  updateCartQty: (key: string, quantity: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  loginWithEmail: (email: string, password: string) => Promise<UserProfile>;
  registerWithEmail: (payload: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_STORAGE_KEY = 'vera_boutique_cart_v1';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty('--vera-primary', settings.primaryColor);
      document.documentElement.style.setProperty('--vera-accent', settings.accentColor);
      document.documentElement.style.setProperty('--vera-bg', settings.backgroundColor);
      document.title = `${settings.storeName} | ${settings.storeSubtitle}`;
    }
  }, [settings]);

  const refreshStorefront = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch<{
        settings: StoreSettings | null;
        categories: Category[];
        products: Product[];
        banners: Banner[];
      }>('/api/storefront');
      setSettings(data.settings);
      setCategories(data.categories);
      setProducts(data.products);
      setBanners(data.banners);
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری اطلاعات فروشگاه');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: UserProfile | null }>('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshStorefront();
    refreshUser();

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        await refreshUser();
      }
    });
    return () => unsub();
  }, [refreshStorefront, refreshUser]);

  const addToCart = useCallback((item: Omit<CartItem, 'key'>) => {
    const key = `${item.productId}_${item.selectedSize}_${item.selectedColor}`;
    setCart((prev) => {
      const existing = prev.find((p) => p.key === key);
      if (existing) {
        const nextQty = Math.min(item.maxStock, existing.quantity + item.quantity);
        return prev.map((p) => (p.key === key ? { ...p, quantity: nextQty } : p));
      }
      return [...prev, { ...item, key, quantity: Math.min(item.maxStock, Math.max(1, item.quantity)) }];
    });
    setIsCartOpen(true);
  }, []);

  const updateCartQty = useCallback((key: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.key !== key) return item;
          const clamped = Math.min(item.maxStock, quantity);
          return { ...item, quantity: clamped };
        })
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(res.user);
    return res.user;
  }, []);

  const registerWithEmail = useCallback(
    async (payload: { fullName: string; email: string; password: string; phone?: string }) => {
      const res = await apiFetch<{ user: UserProfile }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setUser(res.user);
      return res.user;
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await cred.user.getIdToken();
    const res = await apiFetch<{ user: UserProfile | null }>('/api/auth/me', {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.user) {
      throw new Error('احراز هویت گوگل تکمیل نشد.');
    }
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    if (auth.currentUser) {
      await signOut(auth).catch(() => {});
    }
    setUser(null);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        settings,
        categories,
        products,
        banners,
        user,
        cart,
        isCartOpen,
        loading,
        error,
        setIsCartOpen,
        refreshStorefront,
        refreshUser,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        setUser,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return ctx;
}
