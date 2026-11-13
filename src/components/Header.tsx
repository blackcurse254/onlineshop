import React, { useState } from 'react';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

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

  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const storeName = settings?.storeName || 'VERA BOUTIQUE';

  const navLinks = [
    { label: 'خانه', path: '/' },
    { label: 'فروشگاه کفش', path: '/shop' },
    { label: 'تخفیف‌های ویژه', path: '/shop?discount=1' },
    { label: 'پیگیری سفارش', path: '/account?tab=track' },
    { label: 'مدیریت', path: '/admin' },
  ];

  const handleLinkClick = (path: string) => {
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(searchValue.trim());
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-black/[0.08]">
      {!bannerDismissed && settings?.announcementText && (
        <div className="bg-[#18181B] text-[#FAF7F2] text-[11px] sm:text-xs py-1.5 px-3 flex items-center justify-between gap-2">
          <span className="truncate mx-auto text-center font-normal">{settings.announcementText}</span>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="بستن نوار اطلاعیه"
            className="text-white/70 hover:text-white shrink-0 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-1.5 -ms-1 text-[#18181B] hover:bg-black/5 rounded-md min-w-[38px] min-h-[38px] flex items-center justify-center shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('/');
            }}
            className="font-display-serif text-base sm:text-2xl font-semibold tracking-wide sm:tracking-wider text-[#18181B] whitespace-nowrap min-w-0 truncate flex items-center gap-1.5 sm:gap-2"
          >
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={storeName}
                referrerPolicy="no-referrer"
                className="h-6 sm:h-7 w-auto object-contain shrink-0"
              />
            ) : null}
            <span className="truncate">{storeName}</span>
          </a>
        </div>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav aria-label="منوی اصلی" className="hidden md:flex items-center gap-6 text-sm font-medium text-[#524E48]">
          {navLinks.map((link) => {
            const isActive =
              link.path === '/'
                ? currentPath === '/'
                : currentPath.startsWith(link.path.split('?')[0]) &&
                  (link.path.includes('discount')
                    ? currentPath.includes('discount')
                    : !currentPath.includes('discount') || link.path !== '/shop');
            return (
              <a
                key={link.path}
                href={link.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(link.path);
                }}
                className={`whitespace-nowrap shrink-0 py-1 border-b transition-colors ${
                  isActive
                    ? 'text-[#18181B] border-[#B5945B]'
                    : 'border-transparent hover:text-[#18181B] hover:border-black/20'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Actions (Search, Wishlist, Account, Bag) */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="جستجوی کفش و کتونی"
            aria-expanded={searchOpen}
            className="p-1.5 sm:p-2 text-[#18181B] hover:bg-black/5 rounded-md transition-colors min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
          >
            <Search className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={() => handleLinkClick('/account?tab=wishlist')}
            aria-label={`لیست علاقه‌مندی‌ها (${wishlistIds.length})`}
            className="relative p-1.5 sm:p-2 text-[#18181B] hover:bg-black/5 rounded-md transition-colors min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
          >
            <Heart className="w-[18px] h-[18px]" strokeWidth={1.75} />
            {wishlistIds.length > 0 && (
              <span className="absolute top-0.5 end-0.5 w-4 h-4 rounded-full bg-[#B5945B] text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(wishlistIds.length)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleLinkClick('/account')}
            aria-label={user ? `حساب کاربری ${user.fullName}` : 'ورود یا ثبت‌نام'}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#18181B] hover:bg-black/5 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <User className="w-4 h-4" strokeWidth={1.75} />
            <span className="max-w-[110px] truncate">{user ? user.fullName : 'حساب کاربری'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label={`سبد خرید (${totalQty} جفت)`}
            data-testid="cart-button"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 text-xs font-medium bg-[#18181B] text-[#FAF7F2] rounded-md hover:bg-[#2A2A2E] transition-colors whitespace-nowrap shrink-0 min-h-[38px] sm:min-h-[40px]"
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
        <div className="border-t border-black/[0.06] bg-white px-4 py-3">
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
              className="flex-1 h-10 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md focus:outline-none focus:border-[#18181B]"
            />
            <button
              type="submit"
              className="px-4 h-10 text-xs font-medium bg-[#18181B] text-white rounded-md hover:bg-[#2A2A2E] transition-colors whitespace-nowrap"
            >
              جستجو
            </button>
          </form>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-black/[0.08] bg-white px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.path}
              href={link.path}
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick(link.path);
              }}
              className="block px-3 py-2.5 text-sm font-medium text-[#18181B] hover:bg-[#FAF7F2] rounded-md"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/account?tab=wishlist"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('/account?tab=wishlist');
            }}
            className="block px-3 py-2.5 text-sm font-medium text-[#18181B] hover:bg-[#FAF7F2] rounded-md"
          >
            علاقه‌مندی‌ها ({new Intl.NumberFormat('fa-IR').format(wishlistIds.length)})
          </a>
          <a
            href="/account"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('/account');
            }}
            className="block px-3 py-2.5 text-sm font-medium text-[#8F6E38] hover:bg-[#FAF7F2] rounded-md border-t border-black/[0.06] mt-2 pt-3"
          >
            {user ? `پروفایل: ${user.fullName}` : 'ورود / ثبت‌نام'}
          </a>
        </div>
      )}
    </header>
  );
};
