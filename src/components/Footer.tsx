import React from 'react';
import { useStore } from '../context/StoreContext';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { settings, categories } = useStore();
  const storeName = settings?.storeName || 'VERA BOUTIQUE';

  return (
    <footer className="bg-[#18181B] text-[#FAF7F2] border-t border-black/10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1 space-y-4">
          <div className="font-display-serif text-2xl font-semibold tracking-wider text-white">
            {storeName}
          </div>
          <p className="text-xs sm:text-sm text-[#D6D0C6] leading-relaxed">
            {settings?.aboutText}
          </p>
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
                همه محصولات
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/shop?discount=1')}
                className="hover:text-white transition-colors"
              >
                پیشنهادهای ویژه
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
          <h3 className="text-sm font-semibold text-[#D6B77E]">ارسال و قوانین</h3>
          <p className="text-xs text-[#D6D0C6] leading-relaxed">{settings?.shippingPolicy}</p>
          <p className="text-xs text-[#D6D0C6] leading-relaxed">{settings?.returnPolicy}</p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#D6B77E]">ارتباط با بوتیک</h3>
          <ul className="space-y-2 text-xs sm:text-sm text-[#D6D0C6]">
            <li>تلفن: <span dir="ltr" className="inline-block tabular-nums">{settings?.phone}</span></li>
            <li>ایمیل: <span dir="ltr" className="inline-block">{settings?.email}</span></li>
            <li>اینستاگرام: <span dir="ltr" className="inline-block">{settings?.instagram}</span></li>
            <li>تلگرام: <span dir="ltr" className="inline-block">{settings?.telegram}</span></li>
            <li>واتساپ: <span dir="ltr" className="inline-block tabular-nums">{settings?.whatsapp}</span></li>
            <li className="text-xs text-[#A8A196] pt-1 leading-relaxed">{settings?.address}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#A8A196]">
          <span>© {new Date().getFullYear()} {storeName}. تمامی حقوق محفوظ است.</span>
          <span>قالب تجاری فروشگاهی با قابلیت سفارشی‌سازی برند</span>
        </div>
      </div>
    </footer>
  );
};
