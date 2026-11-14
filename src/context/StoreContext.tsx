import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { apiFetch } from '../lib/api';
import type {
  Banner,
  Brand,
  CartItem,
  Category,
  Product,
  Review,
  StoreSettings,
  UserProfile,
} from '../types/store';

interface StoreContextValue {
  settings: StoreSettings | null;
  categories: Category[];
  brands: Brand[];
  products: Product[];
  banners: Banner[];
  reviews: Review[];
  user: UserProfile | null;
  cart: CartItem[];
  wishlistIds: number[];
  isCartOpen: boolean;
  loading: boolean;
  error: string | null;
  passwordResetEnabled: boolean;
  setIsCartOpen: (open: boolean) => void;
  refreshStorefront: () => Promise<void>;
  refreshUser: () => Promise<void>;
  addToCart: (item: Omit<CartItem, 'key'>) => void;
  updateCartQty: (key: string, quantity: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: number) => Promise<void>;
  isWishlisted: (productId: number) => boolean;
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

const CART_STORAGE_KEY = 'adonis_shoes_cart_v1';
const WISHLIST_STORAGE_KEY = 'adonis_shoes_wishlist_v1';
const LEGACY_CART_KEY = 'vera_shoes_cart_v2';
const LEGACY_WISHLIST_KEY = 'vera_shoes_wishlist_v2';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordResetEnabled, setPasswordResetEnabled] = useState(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem(LEGACY_CART_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [wishlistIds, setWishlistIds] = useState<number[]>(() => {
    try {
      const raw =
        localStorage.getItem(WISHLIST_STORAGE_KEY) || localStorage.getItem(LEGACY_WISHLIST_KEY);
      return raw ? (JSON.parse(raw) as number[]) : [];
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
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [wishlistIds]);

  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty('--adonis-primary', settings.primaryColor);
      document.documentElement.style.setProperty('--adonis-accent', settings.accentColor);
      document.documentElement.style.setProperty('--adonis-bg', settings.backgroundColor);
      document.title = `${settings.storeName} | ${settings.storeSubtitle}`;
    }
  }, [settings]);

  const refreshStorefront = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch<{
        settings: StoreSettings | null;
        categories: Category[];
        brands: Brand[];
        products: Product[];
        banners: Banner[];
        reviews: Review[];
        authCapabilities?: { passwordResetEnabled?: boolean };
      }>('/api/storefront');
      setSettings(data.settings);
      setCategories(data.categories);
      setBrands(data.brands ?? []);
      setProducts(data.products);
      setBanners(data.banners);
      setReviews(data.reviews ?? []);
      setPasswordResetEnabled(Boolean(data.authCapabilities?.passwordResetEnabled));
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
      if (data.user) {
        const wl = await apiFetch<{ productIds: number[] }>('/api/wishlist').catch(() => null);
        if (wl) {
          let localIds: number[] = [];
          try {
            const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
            localIds = raw ? (JSON.parse(raw) as number[]) : [];
          } catch {
            localIds = [];
          }
          const missingOnServer = localIds.filter((id) => Number.isInteger(id) && id > 0 && !wl.productIds.includes(id));
          if (missingOnServer.length > 0) {
            for (const pid of missingOnServer) {
              await apiFetch('/api/wishlist/toggle', {
                method: 'POST',
                body: JSON.stringify({ productId: pid }),
              }).catch(() => {});
            }
            const synced = await apiFetch<{ productIds: number[] }>('/api/wishlist').catch(() => wl);
            setWishlistIds(synced.productIds);
          } else {
            setWishlistIds(wl.productIds);
          }
        }
      }
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
        return prev.map((p) => (p.key === key ? { ...p, quantity: nextQty, maxStock: item.maxStock } : p));
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

  const toggleWishlist = useCallback(
    async (productId: number) => {
      if (user) {
        try {
          const res = await apiFetch<{ productIds: number[] }>('/api/wishlist/toggle', {
            method: 'POST',
            body: JSON.stringify({ productId }),
          });
          setWishlistIds(res.productIds);
          return;
        } catch {
          // Fall back cleanly to local update if network blips
        }
      }
      setWishlistIds((prev) =>
        prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
      );
    },
    [user]
  );

  const isWishlisted = useCallback((productId: number) => wishlistIds.includes(productId), [wishlistIds]);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<{ user: UserProfile }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(res.user);
      await refreshUser();
      return res.user;
    },
    [refreshUser]
  );

  const registerWithEmail = useCallback(
    async (payload: { fullName: string; email: string; password: string; phone?: string }) => {
      const res = await apiFetch<{ user: UserProfile }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setUser(res.user);
      await refreshUser();
      return res.user;
    },
    [refreshUser]
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
    await refreshUser();
    return res.user;
  }, [refreshUser]);

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
        brands,
        products,
        banners,
        reviews,
        user,
        cart,
        wishlistIds,
        isCartOpen,
        loading,
        error,
        passwordResetEnabled,
        setIsCartOpen,
        refreshStorefront,
        refreshUser,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        toggleWishlist,
        isWishlisted,
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
