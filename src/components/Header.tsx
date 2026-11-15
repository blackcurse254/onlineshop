import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Menu, Search, Shield, ShoppingBag, User, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onSearchSubmit: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate, onSearchSubmit }) => {
  const { settings, cart, wishlistIds, user, setIsCartOpen } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const storeName = settings?.storeName || 'ADONIS';
  const logoText = settings?.logoText || storeName;

  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);
  const mobileDialogRef = useRef<HTMLDivElement | null>(null);
  const mobileCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const searchToggleRef = useRef<HTMLButtonElement | null>(null);

  const navLinks = useMemo(() => {
    const links = [
      { label: 'خانه', path: '/' },
      { label: 'فروشگاه کفش', path: '/shop' },
      { label: 'تخفیف‌های ویژه', path: '/shop?discount=1' },
      { label: 'پیگیری سفارش', path: '/account?tab=track' },
    ];
    if (user?.role === 'admin') {
      links.push({ label: 'مدیریت', path: '/admin' });
    }
    return links;
  }, [user?.role]);

  useEffect(() => {
    setLogoFailed(false);
  }, [settings?.logoUrl]);

  const { markNavigationClose } = useAccessibleDialog({
    isOpen: mobileMenuOpen,
    onClose: () => setMobileMenuOpen(false),
    containerRef: mobileDialogRef,
    initialFocusRef: mobileCloseBtnRef,
    restoreFocusRef: mobileToggleRef,
    closeOnDesktopBreakpoint: true,
  });

  // Ensure mobile menu and search drawer always close on route changes
  useEffect(() => {
    markNavigationClose();
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [currentPath, markNavigationClose]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        searchToggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen]);

  const isLinkActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/' || currentPath === '';
    }
    if (path === '/shop') {
      return currentPath === '/shop' || (currentPath.startsWith('/shop?') && !currentPath.includes('discount=1'));
    }
    if (path === '/shop?discount=1') {
      return currentPath.startsWith('/shop') && currentPath.includes('discount=1');
    }
    if (path === '/account?tab=track') {
      return currentPath.startsWith('/account') && currentPath.includes('tab=track');
    }
    if (path === '/admin') {
      return currentPath.startsWith('/admin');
    }
    return currentPath === path;
  };

  const handleLinkClick = (path: string) => {
    markNavigationClose();
    setMobileMenuOpen(false);
    setSearchOpen(false);
    onNavigate(path);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(searchValue.trim());
    setSearchOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#EFEEEA]/95 backdrop-blur-md border-b border-[#0F1A1F]/[0.08]">
        {!bannerDismissed && settings?.announcementText && (
          <div className="bg-[#0B1F2E] text-[#EFEEEA] text-[11px] leading-snug sm:text-xs sm:leading-normal py-2 sm:py-1.5 px-3 flex items-center justify-between gap-2">
            <span className="mx-auto text-center font-normal line-clamp-2 sm:line-clamp-none sm:truncate">
              {settings.announcementText}
            </span>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="بستن نوار اطلاعیه"
              className="text-[#8FE3C8]/80 hover:text-white shrink-0 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top Bar Contract: 3 zones separated by gap-8 */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 md:gap-8">
          {/* Zone 1: Brand Wordmark & Mobile Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <button
              ref={mobileToggleRef}
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setMobileMenuOpen((v) => !v);
              }}
              aria-label={mobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              data-testid="mobile-menu-toggle"
              className="md:hidden p-1.5 -ms-1 text-[var(--adonis-primary)] hover:bg-[#0F1A1F]/5 rounded-sm min-w-[38px] min-h-[38px] flex items-center justify-center shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick('/');
              }}
              className="font-display-serif text-base sm:text-2xl tracking-[0.18em] sm:tracking-[0.28em] text-[var(--adonis-primary)] whitespace-nowrap min-w-0 truncate flex items-center gap-2"
            >
              {settings?.logoUrl && !logoFailed ? (
                <img
                  src={settings.logoUrl}
                  alt={storeName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoFailed(true)}
                  className="h-6 sm:h-7 w-auto object-contain shrink-0"
                />
              ) : (
                <span className="w-2 h-2 rotate-45 bg-[#C9A24B] shrink-0" aria-hidden="true" />
              )}
              <span className="truncate">{logoText}</span>
            </a>
          </div>

          {/* Zone 2: Desktop nav links */}
          <nav aria-label="منوی اصلی" className="hidden md:flex items-center gap-6 text-sm font-medium text-[#5F6B70]">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.path);
              return (
                <a
                  key={link.path}
                  href={link.path}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(link.path);
                  }}
                  className={`relative group whitespace-nowrap shrink-0 min-h-[44px] inline-flex items-center transition-colors ${
                    isActive
                      ? 'text-[var(--adonis-primary)] font-semibold'
                      : 'hover:text-[#0A6B54]'
                  }`}
                >
                  <span>{link.label}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-1.5 inset-x-0 h-[2px] bg-[#0B7A5F] origin-right transition-transform duration-200 ${
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                  />
                </a>
              );
            })}
          </nav>

          {/* Zone 3: Actions (Search, Wishlist, Account, Bag) */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            <button
              ref={searchToggleRef}
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen((v) => !v);
              }}
              aria-label="جستجوی کفش و کتونی"
              aria-expanded={searchOpen}
              data-testid="header-search-toggle"
              className="p-1.5 sm:p-2 text-[var(--adonis-primary)] hover:bg-[#0F1A1F]/5 rounded-sm transition-colors min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
            >
              <Search className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>

            <button
              type="button"
              onClick={() => handleLinkClick('/account?tab=wishlist')}
              aria-label={`لیست علاقه‌مندی‌ها (${wishlistIds.length})`}
              data-testid="header-wishlist-button"
              className="relative p-1.5 sm:p-2 text-[var(--adonis-primary)] hover:bg-[#0F1A1F]/5 rounded-sm transition-colors min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
            >
              <Heart className="w-[18px] h-[18px]" strokeWidth={1.75} />
              {wishlistIds.length > 0 && (
                <span className="absolute top-0.5 end-0.5 w-4 h-4 rounded-full bg-[var(--adonis-accent)] text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                  {new Intl.NumberFormat('fa-IR').format(wishlistIds.length)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleLinkClick('/account')}
              aria-label={user ? `حساب کاربری ${user.fullName}` : 'ورود یا ثبت‌نام'}
              data-testid="header-account-button"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--adonis-primary)] hover:bg-[#0F1A1F]/5 rounded-sm transition-colors whitespace-nowrap shrink-0"
            >
              <User className="w-4 h-4" strokeWidth={1.75} />
              <span className="max-w-[110px] truncate">{user ? user.fullName : 'حساب کاربری'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen(false);
                setIsCartOpen(true);
              }}
              aria-label={`سبد خرید (${totalQty} جفت)`}
              data-testid="cart-button"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 text-xs font-medium bg-[var(--adonis-primary)] text-white rounded-sm hover:bg-[#0A6B54] transition-colors whitespace-nowrap shrink-0 min-h-[38px] sm:min-h-[40px]"
            >
              <ShoppingBag className="w-4 h-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">سبد</span>
              <span className="tabular-nums font-semibold" data-testid="cart-count">
                {new Intl.NumberFormat('fa-IR').format(totalQty)}
              </span>
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {searchOpen && (
          <div className="border-t border-[#0F1A1F]/[0.08] bg-white px-4 py-3">
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex items-center gap-2">
              <label htmlFor="header-search-input" className="sr-only">
                جستجو در کفش‌ها و کتونی‌ها
              </label>
              <input
                id="header-search-input"
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="جستجوی نام کفش، کتونی، برند (مثلاً Nike) یا مدل..."
                autoFocus
                className="flex-1 h-10 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:outline-none focus:border-[var(--adonis-accent)]"
              />
              <button
                type="submit"
                className="px-4 h-10 text-xs font-medium bg-[var(--adonis-accent)] text-white rounded-sm hover:bg-[#0A6B54] transition-colors whitespace-nowrap"
              >
                جستجو
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Full-Viewport Mobile Navigation Drawer (rendered outside header backdrop-blur containing block) */}
      {mobileMenuOpen && (
        <div
          ref={mobileDialogRef}
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-menu-title"
          data-testid="mobile-menu-panel"
          className="fixed inset-0 z-50 md:hidden flex"
        >
          <div
            className="fixed inset-0 bg-[#0B1F2E]/60 backdrop-blur-[1px]"
            data-testid="mobile-menu-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <aside className="relative z-10 w-full max-w-[340px] h-[100dvh] max-h-[100dvh] bg-[#EFEEEA] shadow-2xl border-e border-[#0F1A1F]/10 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] overscroll-contain">
            <div className="px-4 h-16 bg-white border-b border-[#0F1A1F]/[0.08] flex items-center justify-between shrink-0">
              <div className="flex flex-col min-w-0">
                <span
                  id="mobile-menu-title"
                  className="font-display-serif text-xl tracking-[0.22em] text-[var(--adonis-primary)] truncate flex items-center gap-2"
                >
                  <span className="w-2 h-2 rotate-45 bg-[#C9A24B] shrink-0" aria-hidden="true" />
                  <span>{logoText}</span>
                </span>
                <span className="text-[11px] text-[#5F6B70] truncate">فروشگاه تخصصی کفش و کتونی</span>
              </div>
              <button
                ref={mobileCloseBtnRef}
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="بستن منوی موبایل"
                data-testid="mobile-menu-close"
                className="p-2 text-[var(--adonis-primary)] hover:bg-[#0F1A1F]/5 rounded-sm min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav
              aria-label="لینک‌های منوی موبایل"
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] p-4 space-y-1.5"
            >
              {navLinks.map((link) => {
                const active = isLinkActive(link.path);
                return (
                  <a
                    key={link.path}
                    href={link.path}
                    aria-current={active ? 'page' : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      handleLinkClick(link.path);
                    }}
                    className={`flex items-center justify-between px-3.5 py-3 text-sm rounded-sm transition-colors ${
                      active
                        ? 'bg-white text-[var(--adonis-primary)] font-semibold border border-[#0F1A1F]/[0.08] shadow-xs'
                        : 'text-[#44525A] font-medium hover:bg-white/80 hover:text-[var(--adonis-primary)]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {link.path === '/admin' && <Shield className="w-4 h-4 text-[var(--adonis-accent)]" />}
                      <span>{link.label}</span>
                    </span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-[var(--adonis-accent)]" aria-hidden="true" />}
                  </a>
                );
              })}

              <a
                href="/account?tab=wishlist"
                aria-current={
                  currentPath.startsWith('/account') && currentPath.includes('tab=wishlist')
                    ? 'page'
                    : undefined
                }
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick('/account?tab=wishlist');
                }}
                className={`flex items-center justify-between px-3.5 py-3 text-sm rounded-sm transition-colors ${
                  currentPath.startsWith('/account') && currentPath.includes('tab=wishlist')
                    ? 'bg-white text-[var(--adonis-primary)] font-semibold border border-[#0F1A1F]/[0.08] shadow-xs'
                    : 'text-[#44525A] font-medium hover:bg-white/80 hover:text-[var(--adonis-primary)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[var(--adonis-accent)]" />
                  <span>علاقه‌مندی‌ها</span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-sm bg-[#E2E0DB] text-[var(--adonis-primary)] tabular-nums font-medium">
                  {new Intl.NumberFormat('fa-IR').format(wishlistIds.length)}
                </span>
              </a>
            </nav>

            <div className="p-4 bg-white border-t border-[#0F1A1F]/[0.08] space-y-2.5 shrink-0">
              <a
                href="/account"
                aria-current={
                  currentPath === '/account' ||
                  (currentPath.startsWith('/account?') &&
                    !currentPath.includes('tab=track') &&
                    !currentPath.includes('tab=wishlist'))
                    ? 'page'
                    : undefined
                }
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick('/account');
                }}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-sm bg-[var(--adonis-primary)] text-white text-sm font-medium hover:bg-[#0A6B54] transition-colors"
              >
                <User className="w-4 h-4" />
                <span>{user ? `حساب کاربری: ${user.fullName}` : 'ورود و ثبت‌نام'}</span>
              </a>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
