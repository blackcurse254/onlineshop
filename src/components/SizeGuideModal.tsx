import React from 'react';
import { Ruler, X } from 'lucide-react';
import { SHOE_SIZE_GUIDE } from '../utils/commerce';

interface SizeGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="راهنمای سایزبندی کفش"
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-white rounded-xl border border-black/10 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-[#FAF7F2] border-b border-black/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-[#8F6E38]" />
            <h2 className="text-base font-bold text-[#18181B]">راهنمای استاندارد سایز کفش و کتونی</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن راهنمای سایز"
            className="p-1.5 text-[#524E48] hover:text-[#18181B] rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="bg-[#FAF7F2] border border-black/[0.06] rounded-lg p-3.5 text-xs text-[#4A4640] leading-relaxed space-y-1">
            <div className="font-semibold text-[#18181B]">روش دقیق اندازه‌گیری طول پا:</div>
            <p>
              پاشنه پا را به دیوار تکیه دهید، روی یک برگ کاغذ بایستید و خط جلوی بلندترین انگشت را علامت بزنید. فاصله پاشنه تا نوک انگشت را با خط‌کش (بر حسب سانتی‌متر) اندازه گرفته و با جدول زیر تطبیق دهید.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-center border-collapse">
              <thead>
                <tr className="bg-[#18181B] text-[#FAF7F2]">
                  <th className="py-2.5 px-3 font-medium">سایز اروپا (EU)</th>
                  <th className="py-2.5 px-3 font-medium">طول پا (سانتی‌متر)</th>
                  <th className="py-2.5 px-3 font-medium">UK</th>
                  <th className="py-2.5 px-3 font-medium">US زنانه</th>
                  <th className="py-2.5 px-3 font-medium">US مردانه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] tabular-nums">
                {SHOE_SIZE_GUIDE.map((row) => (
                  <tr key={row.eu} className="hover:bg-[#FAF7F2]">
                    <td className="py-2 px-3 font-semibold text-[#18181B]">{row.eu}</td>
                    <td className="py-2 px-3 text-[#8F6E38] font-medium">{row.cm} cm</td>
                    <td className="py-2 px-3 text-[#524E48]">{row.uk}</td>
                    <td className="py-2 px-3 text-[#524E48]">{row.usWomen}</td>
                    <td className="py-2 px-3 text-[#524E48]">{row.usMen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-[#6B665F]">
            توصیه تخصصی: برای کفش‌های ورزشی و پیاده‌روی اگر پنجه پای پهنی دارید، نیم سایز آزادتر (حدود ۰.۵ سانتی‌متر فضای اضافه جلو پنجه) انتخاب کنید.
          </p>
        </div>
      </div>
    </div>
  );
};
