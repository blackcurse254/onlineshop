import React from 'react';
import { useStore } from '../context/StoreContext';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { settings, categories } = useStore();
  const storeName = settings?.storeName || 'ADONIS';

  const contactItems = [
    settings?.phone?.trim()
      ? { label: 'تلفن', value: settings.phone.trim(), ltr: true, tabular: true }
      : null,
    settings?.email?.trim()
      ? { label: 'ایمیل', value: settings.email.trim(), ltr: true, tabular: false }
      : null,
    settings?.instagram?.trim()
      ? { label: 'اینستاگرام', value: settings.instagram.trim(), ltr: true, tabular: false }
      : null,
    settings?.telegram?.trim()
      ? { label: 'تلگرام', value: settings.telegram.trim(), ltr: true, tabular: false }
      : null,
    settings?.whatsapp?.trim()
      ? { label: 'واتساپ', value: settings.whatsapp.trim(), ltr: true, tabular: true }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string; ltr: boolean; tabular: boolean }>;

  const hasAddress = Boolean(settings?.address?.trim());

  return (
    <footer className="bg-[#2B1A2E] text-[#EFEEEA] mt-16">
      <div className="meander meander-light" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1 space-y-4">
          <div className="font-display-serif text-2xl tracking-[0.28em] text-white flex items-center gap-2">
            <span className="w-2 h-2 rotate-45 bg-[#C21E3C] shrink-0" aria-hidden="true" />
            <span>{storeName}</span>
          </div>
          {settings?.aboutText ? (
            <p className="text-xs sm:text-sm text-[#D9D7D2] leading-relaxed">
              {settings.aboutText}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#F2B6C0]">دسترسی سریع</h3>
          <ul className="space-y-2 text-xs sm:text-sm text-[#D9D7D2]">
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/shop')}
                className="hover:text-[#F2B6C0] transition-colors"
              >
                همه کفش‌ها و کتونی‌ها
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/shop?discount=1')}
                className="hover:text-[#F2B6C0] transition-colors"
              >
                تخفیف‌های ویژه فصل
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/account?tab=wishlist')}
                className="hover:text-[#F2B6C0] transition-colors"
              >
                لیست علاقه‌مندی‌ها
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/account?tab=track')}
                className="hover:text-[#F2B6C0] transition-colors"
              >
                پیگیری سفارش
              </button>
            </li>
            {categories.slice(0, 3).map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(`/shop?category=${cat.id}`)}
                  className="hover:text-[#F2B6C0] transition-colors"
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#F2B6C0]">ارسال و ضمانت تعویض سایز</h3>
          {settings?.shippingPolicy ? (
            <p className="text-xs text-[#D9D7D2] leading-relaxed">{settings.shippingPolicy}</p>
          ) : null}
          {settings?.returnPolicy ? (
            <p className="text-xs text-[#D9D7D2] leading-relaxed">{settings.returnPolicy}</p>
          ) : null}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#F2B6C0]">ارتباط با فروشگاه</h3>
          {contactItems.length > 0 || hasAddress ? (
            <ul className="space-y-2 text-xs sm:text-sm text-[#D9D7D2]">
              {contactItems.map((item) => (
                <li key={item.label}>
                  {item.label}:{' '}
                  <span
                    dir={item.ltr ? 'ltr' : undefined}
                    className={`inline-block ${item.tabular ? 'tabular-nums' : ''}`}
                  >
                    {item.value}
                  </span>
                </li>
              ))}
              {hasAddress && (
                <li className="text-xs text-[#A4A0A8] pt-1 leading-relaxed">{settings?.address}</li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-[#A4A0A8] leading-relaxed">
              راه‌های ارتباطی و نشانی فروشگاه پس از تنظیم در بخش مدیریت نمایش داده می‌شوند.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-[#F2B6C0]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#A4A0A8]">
          <span>© {new Date().getFullYear()} {storeName}. تمامی حقوق محفوظ است.</span>
          <span>فروشگاه تخصصی کفش و کتونی</span>
        </div>
      </div>
    </footer>
  );
};
