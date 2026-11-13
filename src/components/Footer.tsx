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
    <footer className="bg-[#18181B] text-[#FAF7F2] border-t border-black/10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1 space-y-4">
          <div className="font-display-serif text-2xl font-semibold tracking-wider text-white">
            {storeName}
          </div>
          {settings?.aboutText ? (
            <p className="text-xs sm:text-sm text-[#D6D0C6] leading-relaxed">
              {settings.aboutText}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#D6B77E]">دسترسی سریع</h3>
          <ul className="space-y-2 text-xs sm:text-sm text-[#D6D0C6]">
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/shop')}
                className="hover:text-white transition-colors"
              >
                همه کفش‌ها و کتونی‌ها
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/shop?discount=1')}
                className="hover:text-white transition-colors"
              >
                تخفیف‌های ویژه فصل
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/account?tab=wishlist')}
                className="hover:text-white transition-colors"
              >
                لیست علاقه‌مندی‌ها
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/account?tab=track')}
                className="hover:text-white transition-colors"
              >
                پیگیری سفارش
              </button>
            </li>
            {categories.slice(0, 3).map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(`/shop?category=${cat.id}`)}
                  className="hover:text-white transition-colors"
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#D6B77E]">ارسال و ضمانت تعویض سایز</h3>
          {settings?.shippingPolicy ? (
            <p className="text-xs text-[#D6D0C6] leading-relaxed">{settings.shippingPolicy}</p>
          ) : null}
          {settings?.returnPolicy ? (
            <p className="text-xs text-[#D6D0C6] leading-relaxed">{settings.returnPolicy}</p>
          ) : null}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#D6B77E]">ارتباط با فروشگاه</h3>
          {contactItems.length > 0 || hasAddress ? (
            <ul className="space-y-2 text-xs sm:text-sm text-[#D6D0C6]">
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
                <li className="text-xs text-[#A8A196] pt-1 leading-relaxed">{settings?.address}</li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-[#A8A196] leading-relaxed">
              راه‌های ارتباطی و نشانی فروشگاه پس از تنظیم در بخش مدیریت نمایش داده می‌شوند.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#A8A196]">
          <span>© {new Date().getFullYear()} {storeName}. تمامی حقوق محفوظ است.</span>
          <span>فروشگاه تخصصی کفش و کتونی</span>
        </div>
      </div>
    </footer>
  );
};
