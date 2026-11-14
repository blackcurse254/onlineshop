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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <div className="font-display-serif text-2xl tracking-[0.26em] text-[#16141A]">ADONIS</div>
        <div className="w-40 meander" aria-hidden="true" />
        <p className="text-xs sm:text-sm text-[#6A6670]">در حال آماده‌سازی فروشگاه آدونیس...</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className="max-w-lg mx-auto py-20 px-4 text-center space-y-5">
        <div className="bg-white border border-[#16141A]/10 border-t-2 border-t-[#C21E3C] p-6 rounded-sm space-y-4 shadow-xs">
          <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">خطا در ارتباط</div>
          <p className="text-sm text-[#16141A] leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={refreshStorefront}
            className="min-h-[44px] px-6 py-2.5 text-xs font-semibold bg-[#C21E3C] text-white rounded-sm hover:bg-[#16141A] transition-colors"
          >
            تلاش مجدد
          </button>
        </div>
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
      <div className="max-w-2xl mx-auto py-16 sm:py-24 px-4 text-center space-y-6">
        <div className="arch-frame w-40 h-52 mx-auto bg-[#2B1A2E] text-[#EFEEEA] border border-[#F2B6C0]/30 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
          <span className="font-display-serif text-4xl tracking-[0.15em] text-[#F2B6C0]" aria-hidden="true">
            404
          </span>
          <span className="w-8 h-px bg-[#C21E3C] mt-2" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۴۰۴ — مسیر نامعتبر</div>
          <h1 className="text-3xl sm:text-5xl text-[#16141A]">صفحه مورد نظر یافت نشد</h1>
          <p className="text-xs sm:text-sm text-[#6A6670] max-w-md mx-auto leading-relaxed">
            نشانی واردشده تغییر کرده یا در دسترس نیست. می‌توانید کلکسیون کفش‌های آدونیس را مرور کنید.
          </p>
        </div>
        <div className="max-w-xs mx-auto meander" aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-semibold bg-[#C21E3C] text-white rounded-sm hover:bg-[#16141A] transition-colors"
          >
            بازگشت به فروشگاه
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-medium border border-[#16141A] text-[#16141A] rounded-sm hover:bg-[#16141A] hover:text-[#EFEEEA] transition-colors"
          >
            صفحه اصلی
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--adonis-bg)] text-[var(--adonis-primary)] overflow-x-clip">
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
