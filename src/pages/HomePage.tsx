import React, { useMemo, useState } from 'react';
import { ArrowLeft, Award, RefreshCw, ShieldCheck, Star, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SafeImage } from '../components/SafeImage';
import { ProductCard } from '../components/ProductCard';
import { getAvailableSizes, getEffectiveTotalStock, getSizeStock } from '../utils/commerce';
import type { Product } from '../types/store';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

type CollectionTab = 'new' | 'bestseller' | 'special';

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
    <div className="space-y-16 sm:space-y-20">
      {/* 1. Hero Campaign Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="relative rounded-xl overflow-hidden bg-[#E8E1D5] min-h-[380px] sm:min-h-0 sm:aspect-[16/9] max-h-[600px] w-full">
          {heroBanner ? (
            <SafeImage
              src={heroBanner.imageUrl}
              alt={heroBanner.title}
              loading="eager"
              className="w-full h-full object-cover object-center absolute inset-0"
            />
          ) : null}
          <div className="relative z-10 min-h-[380px] sm:min-h-0 sm:h-full bg-gradient-to-t from-black/85 via-black/45 to-black/15 flex items-end">
            <div className="p-5 sm:p-10 lg:p-14 max-w-2xl space-y-2.5 sm:space-y-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
              <p className="text-xs sm:text-sm text-[#E5CFA3] font-medium tracking-wide">
                {settings?.storeName} · {settings?.storeSubtitle}
              </p>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance">
                {heroBanner?.title || 'کلکسیون تخصصی کفش و کتونی آدونیس'}
              </h1>
              <p className="text-xs sm:text-base text-white/90 leading-relaxed max-w-xl">
                {heroBanner?.subtitle ||
                  'ترکیب مهندسی ارگونومی پا، چرم طبیعی و زیره‌های استاندارد برای استفاده روزمره، ورزشی و رسمی.'}
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate(heroBanner?.ctaLink || '/shop')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#FAF7F2] text-[#18181B] text-xs sm:text-sm font-semibold rounded-md hover:bg-[#B5945B] hover:text-white transition-colors"
                >
                  <span>{heroBanner?.ctaText || 'مشاهده کلکسیون کفش'}</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/shop?discount=1')}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-white/15 backdrop-blur-sm text-white border border-white/30 text-xs sm:text-sm font-medium rounded-md hover:bg-white/25 transition-colors"
                >
                  <span>تخفیف‌های ویژه</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Visual Footwear Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-end justify-between gap-4 border-b border-black/[0.08] pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#18181B]">دسته‌بندی تخصصی کفش و کتونی</h2>
            <p className="text-xs sm:text-sm text-[#6B665F] mt-1">انتخاب دقیق بر اساس کاربری روزمره، ورزشی و رسمی</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/shop')}
            className="text-xs sm:text-sm font-medium text-[#18181B] hover:text-[#8F6E38] inline-flex items-center gap-1 whitespace-nowrap"
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
              className="group text-start flex flex-col bg-white border border-black/[0.06] rounded-lg overflow-hidden hover:shadow-md transition-all"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#F4EFE6]">
                <SafeImage
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3 sm:p-3.5">
                <h3 className="text-sm font-semibold text-[#18181B] group-hover:text-[#8F6E38] transition-colors truncate">
                  {cat.name}
                </h3>
                <p className="text-[11px] sm:text-xs text-[#6B665F] mt-0.5 line-clamp-1">
                  {cat.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Curated Collection Grid (New, Bestsellers, Special Offers) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.08] pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#18181B]">ویترین کفش و کتونی آدونیس</h2>
            <p className="text-xs sm:text-sm text-[#6B665F] mt-1">
              منتخب جدیدترین مدل‌ها، پرفروش‌ترین کتونی‌ها و پیشنهادهای ویژه فصل
            </p>
          </div>

          <div
            role="tablist"
            aria-label="فیلتر محصولات صفحه اصلی"
            className="flex flex-wrap items-center gap-1 p-1 bg-[#EFEAE0] rounded-lg self-start sm:self-auto max-w-full"
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
                className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-[#18181B] shadow-sm'
                    : 'text-[#524E48] hover:text-[#18181B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {tabProducts.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-lg border border-black/[0.06] text-sm text-[#6B665F]">
            در این بخش هنوز محصولی ثبت نشده است.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tabProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                category={product.categoryId ? categoryMap.get(product.categoryId) : undefined}
                onNavigate={onNavigate}
                onQuickAdd={handleQuickAdd}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Promotional Capsule Banner */}
      {promoBanner && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch bg-white border border-black/[0.06] rounded-xl overflow-hidden">
            <div className="lg:col-span-7 aspect-[16/9] lg:aspect-auto lg:min-h-[340px] bg-[#F4EFE6]">
              <SafeImage
                src={promoBanner.imageUrl}
                alt={promoBanner.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="lg:col-span-5 p-7 sm:p-10 flex flex-col justify-center space-y-4">
              <span className="text-xs font-medium text-[#8F6E38]">پیشنهاد ویژه حرکت و استایل</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#18181B] text-balance">
                {promoBanner.title}
              </h2>
              <p className="text-sm text-[#524E48] leading-relaxed">{promoBanner.subtitle}</p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate(promoBanner.ctaLink)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#18181B] text-white text-xs sm:text-sm font-medium rounded-md hover:bg-[#2A2A2E] transition-colors"
                >
                  <span>{promoBanner.ctaText}</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. Discounted Footwear Section */}
      {discountedProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex items-end justify-between gap-4 border-b border-black/[0.08] pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#18181B]">محصولات تخفیف‌دار</h2>
              <p className="text-xs sm:text-sm text-[#6B665F] mt-1">مدل‌های منتخب کفش و کتونی با قیمت ویژه فصل</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/shop?discount=1')}
              className="text-xs sm:text-sm font-medium text-[#18181B] hover:text-[#8F6E38] inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>مشاهده همه تخفیف‌ها</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {discountedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                category={product.categoryId ? categoryMap.get(product.categoryId) : undefined}
                onNavigate={onNavigate}
                onQuickAdd={handleQuickAdd}
              />
            ))}
          </div>
        </section>
      )}

      {/* 6. Store Advantages */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-black/[0.06] rounded-xl p-6 sm:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Award className="w-5 h-5 text-[#8F6E38]" strokeWidth={1.75} />
            <h3 className="text-sm sm:text-base font-semibold text-[#18181B]">کیفیت تضمین‌شده و ارگونومیک</h3>
            <p className="text-xs text-[#524E48] leading-relaxed">
              کنترل دقیق رویه، دوخت زیره و کفی طبی پیش از ارسال هر جفت کفش.
            </p>
          </div>
          <div className="space-y-2">
            <RefreshCw className="w-5 h-5 text-[#8F6E38]" strokeWidth={1.75} />
            <h3 className="text-sm sm:text-base font-semibold text-[#18181B]">تعویض سایز تا ۷ روز</h3>
            <p className="text-xs text-[#524E48] leading-relaxed">{settings?.returnPolicy}</p>
          </div>
          <div className="space-y-2">
            <Truck className="w-5 h-5 text-[#8F6E38]" strokeWidth={1.75} />
            <h3 className="text-sm sm:text-base font-semibold text-[#18181B]">ارسال با بسته‌بندی ایمن</h3>
            <p className="text-xs text-[#524E48] leading-relaxed">{settings?.shippingPolicy}</p>
          </div>
          <div className="space-y-2">
            <ShieldCheck className="w-5 h-5 text-[#8F6E38]" strokeWidth={1.75} />
            <h3 className="text-sm sm:text-base font-semibold text-[#18181B]">مشاوره تخصصی انتخاب سایز</h3>
            <p className="text-xs text-[#524E48] leading-relaxed">
              تطبیق دقیق سایز بر اساس سانتی‌متر طول پا و راهنمای استاندارد اروپا.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Customer Reviews */}
      {reviews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="border-b border-black/[0.08] pb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-[#18181B]">تجربه و نظرات خریداران</h2>
            <p className="text-xs sm:text-sm text-[#6B665F] mt-1">
              دیدگاه مشتریان درباره کیفیت ساخت، راحتی قالب و سایزبندی کفش‌ها
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {reviews.slice(0, 4).map((review) => (
              <div
                key={review.id}
                className="bg-white border border-black/[0.06] rounded-xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-0.5 text-[#B5945B]" aria-label={`امتیاز ${review.rating} از ۵`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="w-3.5 h-3.5"
                          fill={i < review.rating ? 'currentColor' : 'none'}
                        />
                      ))}
                    </div>
                    {review.verifiedPurchase && (
                      <span className="text-[11px] text-emerald-800 font-medium">خریدار تاییدشده</span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-[#3F3B36] leading-relaxed">{review.comment}</p>
                </div>

                <div className="pt-3 border-t border-black/[0.05] text-xs space-y-1">
                  <div className="font-semibold text-[#18181B]">{review.authorName}</div>
                  {review.productName && review.productSlug && (
                    <button
                      type="button"
                      onClick={() => onNavigate(`/product/${review.productSlug}`)}
                      className="text-[11px] text-[#8F6E38] hover:underline truncate block max-w-full text-start"
                    >
                      {review.productName}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
