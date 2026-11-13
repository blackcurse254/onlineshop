import React, { useCallback, useEffect, useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';

function AppRouter() {
  const { loading, error, refreshStorefront } = useStore();
  const [locationPath, setLocationPath] = useState(
    () => `${window.location.pathname}${window.location.search}`
  );

  useEffect(() => {
    const onPopState = () => {
      setLocationPath(`${window.location.pathname}${window.location.search}`);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setLocationPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [pathname, queryString = ''] = locationPath.split('?');

  const handleSearchSubmit = (q: string) => {
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-[#6B665F]">
        در حال آماده‌سازی فروشگاه ADONIS...
      </div>
    );
  } else if (error) {
    content = (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <p className="text-sm text-red-800 bg-red-50 border border-red-200 p-4 rounded-lg">{error}</p>
        <button
          type="button"
          onClick={refreshStorefront}
          className="px-5 py-2.5 text-xs font-medium bg-[#18181B] text-white rounded-md"
        >
          تلاش مجدد
        </button>
      </div>
    );
  } else if (pathname === '/' || pathname === '') {
    content = <HomePage onNavigate={navigate} />;
  } else if (pathname === '/shop') {
    content = <ShopPage queryString={queryString} onNavigate={navigate} />;
  } else if (pathname.startsWith('/product/')) {
    const slug = decodeURIComponent(pathname.slice('/product/'.length));
    content = <ProductDetailPage slug={slug} onNavigate={navigate} />;
  } else if (pathname === '/checkout') {
    content = <CheckoutPage onNavigate={navigate} />;
  } else if (pathname === '/account') {
    content = <AccountPage queryString={queryString} onNavigate={navigate} />;
  } else if (pathname === '/admin') {
    content = <AdminPage />;
  } else {
    content = (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#18181B]">صفحه مورد نظر یافت نشد</h1>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-5 py-2.5 text-xs font-medium bg-[#18181B] text-white rounded-md"
        >
          بازگشت به صفحه اصلی
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--vera-bg)] text-[var(--vera-primary)] overflow-x-clip">
      <Header currentPath={locationPath} onNavigate={navigate} onSearchSubmit={handleSearchSubmit} />
      <main className="flex-1">{content}</main>
      <Footer onNavigate={navigate} />
      <CartDrawer onNavigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppRouter />
    </StoreProvider>
  );
}
