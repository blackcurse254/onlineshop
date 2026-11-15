import React, { useMemo, useState } from 'react';
import { ArrowLeft, Award, RefreshCw, ShieldCheck, Star, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SafeImage } from '../components/SafeImage';
import { ProductCard } from '../components/ProductCard';
import { useReveal } from '../hooks/useReveal';
import { getAvailableSizes, getEffectiveTotalStock, getSizeStock } from '../utils/commerce';
import type { Product } from '../types/store';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

type CollectionTab = 'new' | 'bestseller' | 'special';

const RevealSection: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ref, revealed } = useReveal();
  return (
    <div ref={ref} className={`reveal-item ${revealed ? 'is-revealed' : ''}`}>
      {children}
    </div>
  );
};

const RevealCard: React.FC<{ index: number; children: React.ReactNode }> = ({ index, children }) => {
  const { ref, revealed } = useReveal();
  return (
    <div
      ref={ref}
      className={`h-full reveal-item ${revealed ? 'is-revealed' : ''}`}
      style={{ transitionDelay: `${Math.min(index, 7) * 60}ms` }}
    >
      {children}
    </div>
  );
};

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { settings, categories, products, banners, reviews, addToCart } = useStore();
  const [activeTab, setActiveTab] = useState<CollectionTab>('new');

  const heroBanner = banners.find((b) => b.position === 'hero') || banners[0];
  const promoBanner = banners.find((b) => b.position === 'promo');

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const tabProducts = useMemo(() => {
    if (activeTab === 'new') {
      return products.filter((p) => p.isNew).slice(0, 6);
    }
    if (activeTab === 'bestseller') {
      return products.filter((p) => p.isBestseller).slice(0, 6);
    }
    return products
      .filter((p) => p.isFeatured || (p.discountPrice !== null && p.discountPrice < p.price))
      .slice(0, 6);
  }, [products, activeTab]);

  const discountedProducts = useMemo(
    () => products.filter((p) => p.discountPrice !== null && p.discountPrice < p.price).slice(0, 4),
    [products]
  );

  const handleQuickAdd = (product: Product, cardChosenSize?: string) => {
    const totalStock = getEffectiveTotalStock(product);
    if (totalStock <= 0) return;

    const availableSizes = getAvailableSizes(product);
    const chosenSize =
      cardChosenSize && availableSizes.includes(cardChosenSize)
        ? cardChosenSize
        : availableSizes[0];
    if (!chosenSize) return;
    const sizeMax = getSizeStock(product, chosenSize);
    if (sizeMax <= 0) return;

    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] || '',
      price: product.price,
      discountPrice: product.discountPrice,
      selectedSize: chosenSize,
      selectedColor: product.colors[0]?.name || 'استاندارد',
      quantity: 1,
      maxStock: sizeMax,
    });
  };

  return (
    <div className="space-y-14 sm:space-y-20">
      {/* 1. Editorial Adonis Myth Hero Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="relative overflow-hidden bg-[#2B1A2E] text-[#EFEEEA] rounded-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none select-none font-display-serif text-[96px] sm:text-[180px] lg:text-[240px] leading-none tracking-[0.12em] text-transparent opacity-30 absolute bottom-4 sm:bottom-2 inset-x-0 text-center whitespace-nowrap overflow-hidden"
            style={{ WebkitTextStroke: '1px #F2B6C0' }}
          >
            ADONIS
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-10 p-6 sm:p-10 lg:p-14">
            <div className="lg:col-span-7 space-y-5 order-2 lg:order-1">
              <p className="inline-flex items-center gap-3 text-xs sm:text-sm text-[#F2B6C0] font-semibold tracking-wide">
                <span className="w-8 h-px bg-[#F2B6C0] shrink-0" aria-hidden="true" />
                <span>
                  {settings?.storeName || 'ADONIS'} · {settings?.storeSubtitle || 'فروشگاه تخصصی کفش و کتونی'}
                </span>
              </p>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl leading-[1.25] text-balance text-[#EFEEEA]">
                {heroBanner?.title || 'قدمهایت را با اطمینان بردار'}
              </h1>

              <p className="text-xs sm:text-sm text-[#EFEEEA]/80 leading-relaxed max-w-lg">
                {heroBanner?.subtitle ||
                  'ترکیب مهندسی ارگونومی پا، چرم طبیعی و زیره‌های استاندارد برای استفاده روزمره، ورزشی و رسمی.'}
              </p>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate(heroBanner?.ctaLink || '/shop')}
                  className="inline-flex items-center gap-2 px-6 py-3 min-h-[48px] bg-[#C21E3C] text-white text-xs sm:text-sm font-semibold rounded-sm hover:bg-[#EFEEEA] hover:text-[#16141A] transition-colors"
                >
                  <span>{heroBanner?.ctaText || 'مشاهده کلکسیون کفش'}</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/shop?discount=1')}
                  className="inline-flex items-center gap-2 px-5 py-3 min-h-[48px] text-[#EFEEEA] border border-[#EFEEEA]/40 text-xs sm:text-sm font-medium rounded-sm hover:border-[#F2B6C0] hover:text-[#F2B6C0] transition-colors"
                >
                  <span>تخفیف‌های ویژه</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center lg:justify-end order-1 lg:order-2">
              <div className="arch-frame w-full max-w-[340px] aspect-[3/4] bg-[#3B2A3E] border border-[#F2B6C0]/40 shadow-2xl">
                {heroBanner ? (
                  <SafeImage
                    src={heroBanner.imageUrl}
                    alt={heroBanner.title}
                    loading="eager"
                    className="w-full h-full object-cover object-center"
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative z-10 meander meander-light" aria-hidden="true" />
        </div>
      </section>

      {/* 2. Visual Footwear Categories */}
      <RevealSection>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex items-end justify-between gap-4 border-b border-[#16141A]/[0.08] pb-4">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۱ — دسته‌ها</div>
              <h2 className="text-2xl sm:text-3xl text-[var(--adonis-primary)]">دسته‌بندی تخصصی کفش و کتونی</h2>
              <p className="text-xs sm:text-sm text-[#6A6670]">انتخاب دقیق بر اساس کاربری روزمره، ورزشی و رسمی</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/shop')}
              className="text-xs sm:text-sm font-medium text-[var(--adonis-primary)] hover:text-[#B01D39] inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>همه محصولات</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onNavigate(`/shop?category=${cat.id}`)}
                className="group text-start flex flex-col bg-white border border-[#16141A]/[0.08] rounded-sm overflow-hidden hover:shadow-md hover:border-[var(--adonis-accent)]/40 transition-all"
              >
                <div className="arch-frame aspect-[4/5] m-3 mb-0 overflow-hidden bg-[#E2E0DB]">
                  <SafeImage
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-3 sm:p-3.5">
                  <h3 className="text-sm font-semibold text-[var(--adonis-primary)] group-hover:text-[#B01D39] transition-colors truncate">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#85818A] mt-0.5 line-clamp-1">
                    {cat.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* 3. Curated Collection Grid (New, Bestsellers, Special Offers) */}
      <RevealSection>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#16141A]/[0.08] pb-4">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۲ — ویترین</div>
              <h2 className="text-2xl sm:text-3xl text-[var(--adonis-primary)]">ویترین کفش و کتونی آدونیس</h2>
              <p className="text-xs sm:text-sm text-[#6A6670]">
                منتخب جدیدترین مدل‌ها، پرفروش‌ترین کتونی‌ها و پیشنهادهای ویژه فصل
              </p>
            </div>

            <div
              role="tablist"
              aria-label="فیلتر محصولات صفحه اصلی"
              className="flex flex-wrap items-center gap-1 p-1 bg-[#E2E0DB] rounded-sm self-start sm:self-auto max-w-full"
            >
              {[
                { id: 'new' as const, label: 'محصولات جدید' },
                { id: 'bestseller' as const, label: 'پرفروش‌ترین‌ها' },
                { id: 'special' as const, label: 'پیشنهادهای ویژه' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-white text-[var(--adonis-primary)] font-semibold shadow-sm'
                      : 'text-[#6A6670] hover:text-[var(--adonis-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {tabProducts.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-sm border border-[#16141A]/[0.08] text-sm text-[#85818A]">
              در این بخش هنوز محصولی ثبت نشده است.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tabProducts.map((product, idx) => (
                <RevealCard key={product.id} index={idx}>
                  <ProductCard
                    product={product}
                    category={product.categoryId ? categoryMap.get(product.categoryId) : undefined}
                    onNavigate={onNavigate}
                    onQuickAdd={handleQuickAdd}
                  />
                </RevealCard>
              ))}
            </div>
          )}
        </section>
      </RevealSection>

      {/* 4. Promotional Capsule Banner */}
      {promoBanner && (
        <RevealSection>
          <section className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch bg-white border border-[#16141A]/[0.08] rounded-sm overflow-hidden shadow-xs">
              <div className="lg:col-span-7 aspect-[16/9] lg:aspect-auto lg:min-h-[340px] bg-[#E2E0DB]">
                <SafeImage
                  src={promoBanner.imageUrl}
                  alt={promoBanner.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:col-span-5 p-7 sm:p-10 flex flex-col justify-center space-y-4">
                <span className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۳ — پیشنهادها</span>
                <h2 className="text-2xl sm:text-3xl text-[var(--adonis-primary)] text-balance">
                  {promoBanner.title}
                </h2>
                <p className="text-sm text-[#6A6670] leading-relaxed">{promoBanner.subtitle}</p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate(promoBanner.ctaLink)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--adonis-primary)] text-white text-xs sm:text-sm font-medium rounded-sm hover:bg-[var(--adonis-accent)] transition-colors"
                  >
                    <span>{promoBanner.ctaText}</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </RevealSection>
      )}

      {/* 5. Discounted Footwear Section */}
      {discountedProducts.length > 0 && (
        <RevealSection>
          <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
            <div className="flex items-end justify-between gap-4 border-b border-[#16141A]/[0.08] pb-4">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۳ — پیشنهادها</div>
                <h2 className="text-2xl sm:text-3xl text-[var(--adonis-primary)]">محصولات تخفیف‌دار</h2>
                <p className="text-xs sm:text-sm text-[#6A6670]">مدل‌های منتخب کفش و کتونی با قیمت ویژه فصل</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/shop?discount=1')}
                className="text-xs sm:text-sm font-medium text-[var(--adonis-primary)] hover:text-[#B01D39] inline-flex items-center gap-1 whitespace-nowrap"
              >
                <span>مشاهده همه تخفیف‌ها</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {discountedProducts.map((product, idx) => (
                <RevealCard key={product.id} index={idx}>
                  <ProductCard
                    product={product}
                    category={product.categoryId ? categoryMap.get(product.categoryId) : undefined}
                    onNavigate={onNavigate}
                    onQuickAdd={handleQuickAdd}
                  />
                </RevealCard>
              ))}
            </div>
          </section>
        </RevealSection>
      )}

      {/* 6. Store Advantages */}
      <RevealSection>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="border-b border-[#16141A]/[0.08] pb-4 space-y-1">
            <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۴ — خدمات</div>
            <h2 className="text-2xl sm:text-3xl text-[var(--adonis-primary)]">استانداردها و ضمانت آدونیس</h2>
          </div>

          <div className="bg-white border border-[#16141A]/[0.08] rounded-sm p-6 sm:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Award className="w-5 h-5 text-[var(--adonis-accent)]" strokeWidth={1.75} />
              <h3 className="text-sm sm:text-base font-semibold text-[var(--adonis-primary)]">کیفیت تضمین‌شده و ارگونومیک</h3>
              <p className="text-xs text-[#6A6670] leading-relaxed">
                کنترل دقیق رویه، دوخت زیره و کفی طبی پیش از ارسال هر جفت کفش.
              </p>
            </div>
            <div className="space-y-2">
              <RefreshCw className="w-5 h-5 text-[var(--adonis-accent)]" strokeWidth={1.75} />
              <h3 className="text-sm sm:text-base font-semibold text-[var(--adonis-primary)]">تعویض سایز تا ۷ روز</h3>
              <p className="text-xs text-[#6A6670] leading-relaxed">{settings?.returnPolicy}</p>
            </div>
            <div className="space-y-2">
              <Truck className="w-5 h-5 text-[var(--adonis-accent)]" strokeWidth={1.75} />
              <h3 className="text-sm sm:text-base font-semibold text-[var(--adonis-primary)]">ارسال با بسته‌بندی ایمن</h3>
              <p className="text-xs text-[#6A6670] leading-relaxed">{settings?.shippingPolicy}</p>
            </div>
            <div className="space-y-2">
              <ShieldCheck className="w-5 h-5 text-[var(--adonis-accent)]" strokeWidth={1.75} />
              <h3 className="text-sm sm:text-base font-semibold text-[var(--adonis-primary)]">مشاوره تخصصی انتخاب سایز</h3>
              <p className="text-xs text-[#6A6670] leading-relaxed">
                تطبیق دقیق سایز بر اساس سانتی‌متر طول پا و راهنمای استاندارد اروپا.
              </p>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* 7. Customer Reviews */}
      {reviews.length > 0 && (
        <RevealSection>
          <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
            <div className="border-b border-[#16141A]/[0.08] pb-4 space-y-1">
              <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۵ — دیدگاه‌ها</div>
              <h2 className="text-2xl sm:text-3xl text-[var(--adonis-primary)]">تجربه و نظرات خریداران</h2>
              <p className="text-xs sm:text-sm text-[#6A6670]">
                دیدگاه مشتریان درباره کیفیت ساخت، راحتی قالب و سایزبندی کفش‌ها
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {reviews.slice(0, 4).map((review) => (
                <div
                  key={review.id}
                  className="bg-white border border-[#16141A]/[0.08] rounded-sm p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-0.5 text-[var(--adonis-accent)]" aria-label={`امتیاز ${review.rating} از ۵`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-3.5 h-3.5"
                            fill={i < review.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                      {review.verifiedPurchase && (
                        <span className="text-[11px] text-emerald-700 font-medium">خریدار تاییدشده</span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-[#4B4752] leading-relaxed">{review.comment}</p>
                  </div>

                  <div className="pt-3 border-t border-[#16141A]/[0.06] text-xs space-y-1">
                    <div className="font-semibold text-[var(--adonis-primary)]">{review.authorName}</div>
                    {review.productName && review.productSlug && (
                      <button
                        type="button"
                        onClick={() => onNavigate(`/product/${review.productSlug}`)}
                        className="text-[11px] text-[#B01D39] hover:underline truncate block max-w-full text-start"
                      >
                        {review.productName}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </RevealSection>
      )}
    </div>
  );
};
