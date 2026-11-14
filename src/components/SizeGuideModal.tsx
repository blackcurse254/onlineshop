import React, { useRef } from 'react';
import { Ruler, X } from 'lucide-react';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { SHOE_SIZE_GUIDE } from '../utils/commerce';

interface SizeGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({ open, onClose }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useAccessibleDialog({
    isOpen: open,
    onClose,
    containerRef,
    initialFocusRef: closeBtnRef,
  });

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
    >
      <div className="fixed inset-0 bg-[#2B1A2E]/60 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl bg-white rounded-sm border border-[#16141A]/15 border-t-2 border-t-[#C21E3C] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-[#EFEEEA] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Ruler className="w-5 h-5 text-[var(--adonis-accent)]" />
            <h2 id="size-guide-title" className="text-xl text-[var(--adonis-primary)]">
              راهنمای استاندارد سایز کفش و کتونی
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="بستن راهنمای سایز"
            className="p-2 text-[#6A6670] hover:text-[var(--adonis-primary)] hover:bg-[#16141A]/5 rounded-sm min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="meander" aria-hidden="true" />

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="bg-[#EFEEEA] border border-[#16141A]/[0.06] rounded-sm p-3.5 text-xs text-[#4B4752] leading-relaxed space-y-1">
            <div className="font-semibold text-[var(--adonis-primary)]">روش دقیق اندازه‌گیری طول پا:</div>
            <p>
              پاشنه پا را به دیوار تکیه دهید، روی یک برگ کاغذ بایستید و خط جلوی بلندترین انگشت را علامت بزنید. فاصله پاشنه تا نوک انگشت را با خط‌کش (بر حسب سانتی‌متر) اندازه گرفته و با جدول زیر تطبیق دهید.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-center border-collapse">
              <thead>
                <tr className="bg-[var(--adonis-primary)] text-white">
                  <th className="py-2.5 px-3 font-medium">سایز اروپا (EU)</th>
                  <th className="py-2.5 px-3 font-medium">طول پا (سانتی‌متر)</th>
                  <th className="py-2.5 px-3 font-medium">UK</th>
                  <th className="py-2.5 px-3 font-medium">US زنانه</th>
                  <th className="py-2.5 px-3 font-medium">US مردانه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#16141A]/[0.06] tabular-nums">
                {SHOE_SIZE_GUIDE.map((row) => (
                  <tr key={row.eu} className="hover:bg-[#EFEEEA]">
                    <td className="py-2 px-3 font-semibold text-[var(--adonis-primary)]">{row.eu}</td>
                    <td className="py-2 px-3 text-[#B01D39] font-medium">{row.cm} cm</td>
                    <td className="py-2 px-3 text-[#6A6670]">{row.uk}</td>
                    <td className="py-2 px-3 text-[#6A6670]">{row.usWomen}</td>
                    <td className="py-2 px-3 text-[#6A6670]">{row.usMen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-[#85818A]">
            توصیه تخصصی: برای کفش‌های ورزشی و پیاده‌روی اگر پنجه پای پهنی دارید، نیم سایز آزادتر (حدود ۰.۵ سانتی‌متر فضای اضافه جلو پنجه) انتخاب کنید.
          </p>
        </div>
      </div>
    </div>
  );
};
