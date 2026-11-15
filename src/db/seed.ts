import { count, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  banners,
  brands,
  categories,
  discounts,
  products,
  reviews,
  storeSettings,
  users,
} from './schema.ts';
import { hashPassword } from '../lib/security.ts';
import { getTotalStockFromSizes, migrateLegacySizeInventory } from '../utils/commerce.ts';
import {
  applyAdonisOrderNumberMigration,
  applyAdonisPaletteV3Migration,
  applyAdonisPaletteV4Migration,
  applyAdonisProductSlugMigration,
  applyAdonisSettingsMigration,
} from './migrations.ts';

let seedPromise: Promise<void> | null = null;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function bootstrapEnvAdmin() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD?.trim();
  if (!adminEmail || !EMAIL_REGEX.test(adminEmail) || !adminPassword || adminPassword.length < 12) {
    return;
  }

  const existing = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  if (existing.length === 0) {
    await db.insert(users).values({
      uid: `admin_${crypto.randomUUID()}`,
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      fullName: 'مدیر فروشگاه',
      phone: '',
      address: '',
      postalCode: '',
      role: 'admin',
    });
  } else if (existing[0].role !== 'admin') {
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, existing[0].id));
  }
}

export async function migrateLegacyProductsSizeInventory(): Promise<number> {
  let migratedCount = 0;
  await db.transaction(async (tx) => {
    const allProds = await tx.select().from(products);
    for (const prod of allProds) {
      const hasInventory = Array.isArray(prod.sizeInventory) && prod.sizeInventory.length > 0;
      if (!hasInventory) {
        const migrated = migrateLegacySizeInventory(prod.sizes ?? [], prod.stock ?? 0);
        const total = getTotalStockFromSizes(migrated);
        await tx
          .update(products)
          .set({
            sizeInventory: migrated,
            sizes: migrated.map((s) => s.size),
            stock: total,
          })
          .where(eq(products.id, prod.id));
        migratedCount += 1;
      }
    }
  });
  return migratedCount;
}

async function runSeed() {
  const existingSettings = await db.select({ total: count() }).from(storeSettings);
  if ((existingSettings[0]?.total ?? 0) === 0) {
    await db.insert(storeSettings).values({
      storeName: 'ADONIS',
      storeSubtitle: 'فروشگاه تخصصی کفش و کتونی',
      logoText: 'ADONIS',
      primaryColor: '#0F1A1F',
      accentColor: '#0B7A5F',
      backgroundColor: '#EFEEEA',
      phone: '',
      email: '',
      instagram: '',
      telegram: '',
      whatsapp: '',
      address: '',
      shippingBaseCost: 85000,
      expressShippingCost: 165000,
      freeShippingThreshold: 4500000,
      aboutText:
        'فروشگاه تخصصی کفش و کتونی ADONIS با تمرکز بر ارگونومی پا، متریال چرم طبیعی و زیره‌های استاندارد، مجموعه‌ای منتخب از کتونی‌های روزمره، ورزشی و کفش‌های رسمی را عرضه می‌کند.',
      shippingPolicy:
        'سفارش‌های تهران طی ۱ تا ۲ روز کاری و سفارش‌های سراسر کشور طی ۲ تا ۴ روز کاری با بسته‌بندی ایمن و جعبه اصلی ارسال می‌شوند.',
      returnPolicy:
        'امکان تعویض سایز کفش یا مرجوعی تا ۷ روز پس از تحویل در صورت استفاده نشدن در فضای باز فراهم است.',
      announcementText: 'ارسال رایگان کفش برای خریدهای بالای ۴,۵۰۰,۰۰۰ تومان · کد تخفیف فصل: ADONIS15',
    });
  }

  const existingBrands = await db.select({ total: count() }).from(brands);
  if ((existingBrands[0]?.total ?? 0) === 0) {
    await db.insert(brands).values([
      { name: 'ADONIS Studio', slug: 'adonis-studio', country: 'ایران / ایتالیا', sortOrder: 1, isActive: true },
      { name: 'Nike', slug: 'nike', country: 'آمریکا', sortOrder: 2, isActive: true },
      { name: 'New Balance', slug: 'new-balance', country: 'آمریکا', sortOrder: 3, isActive: true },
      { name: 'Adidas', slug: 'adidas', country: 'آلمان', sortOrder: 4, isActive: true },
      { name: 'Clarks', slug: 'clarks', country: 'انگلستان', sortOrder: 5, isActive: true },
      { name: 'Salomon', slug: 'salomon', country: 'فرانسه', sortOrder: 6, isActive: true },
    ]);
  }

  const existingCategories = await db.select({ total: count() }).from(categories);
  let categoryRows: { id: number; slug: string }[] = [];

  if ((existingCategories[0]?.total ?? 0) === 0) {
    categoryRows = await db
      .insert(categories)
      .values([
        {
          name: 'کتونی مردانه',
          slug: 'mens-sneakers',
          description: 'کتونی‌های چرم، جیر و روزمره مردانه با زیره ضدلغزش',
          imageUrl: '/src/assets/images/shoe_mens_sneaker_cream_1794597375882.jpg',
          sortOrder: 1,
          isActive: true,
        },
        {
          name: 'کتونی زنانه',
          slug: 'womens-sneakers',
          description: 'طراحی مینیمال و کفی طبی نرم مناسب استفاده طولانی‌مدت',
          imageUrl: '/src/assets/images/shoe_womens_sneaker_ivory_1794597376257.jpg',
          sortOrder: 2,
          isActive: true,
        },
        {
          name: 'کفش اسپرت',
          slug: 'sport-shoes',
          description: 'مدل‌های سبک با رویه مش تنفس‌پذیر و ضربه‌گیر پاشنه',
          imageUrl: '/src/assets/images/shoe_sport_running_charcoal_1794597377088.jpg',
          sortOrder: 3,
          isActive: true,
        },
        {
          name: 'کفش روزمره',
          slug: 'casual-shoes',
          description: 'لوفر و کژوال چرم و جیر برای استایل شهری و محل کار',
          imageUrl: '/src/assets/images/shoe_casual_loafer_camel_1794597377849.jpg',
          sortOrder: 4,
          isActive: true,
        },
        {
          name: 'کفش پیاده‌روی',
          slug: 'walking-shoes',
          description: 'کفش‌های ارگونومیک با قوس استاندارد و کفی مموری‌فوم',
          imageUrl: '/src/assets/images/promo_running_capsule_1794597375673.jpg',
          sortOrder: 5,
          isActive: true,
        },
        {
          name: 'کفش ورزشی',
          slug: 'athletic-shoes',
          description: 'مناسب دویدن، تمرینات باشگاهی و مسیرهای فضای باز',
          imageUrl: '/src/assets/images/hero_footwear_campaign_1794597375199.jpg',
          sortOrder: 6,
          isActive: true,
        },
        {
          name: 'کفش رسمی',
          slug: 'formal-shoes',
          description: 'کفش آکسفورد و دربی دست‌دوز چرم طبیعی گاوی',
          imageUrl: '/src/assets/images/shoe_formal_oxford_black_1794597377071.jpg',
          sortOrder: 7,
          isActive: true,
        },
        {
          name: 'صندل و دمپایی',
          slug: 'sandals-slides',
          description: 'صندل‌های چرم تابستانی و اسلایدهای راحتی با زیره چوب‌پنبه و EVA',
          imageUrl: '/src/assets/images/shoe_sandal_slides_tan_1794597377643.jpg',
          sortOrder: 8,
          isActive: true,
        },
        {
          name: 'کفش بچگانه',
          slug: 'kids-shoes',
          description: 'کتونی‌های سبک و انعطاف‌پذیر چسبی و بندی کودک و نوجوان',
          imageUrl: '/src/assets/images/shoe_kids_sneaker_pastel_1794597377865.jpg',
          sortOrder: 9,
          isActive: true,
        },
        {
          name: 'لوازم جانبی کفش',
          slug: 'shoe-accessories',
          description: 'واکس و اسپری نانو ضدآب، قالب چوب سدر، کفی طبی و بند یدک',
          imageUrl: '/src/assets/images/shoe_care_accessories_1794597378977.jpg',
          sortOrder: 10,
          isActive: true,
        },
      ])
      .returning({ id: categories.id, slug: categories.slug });
  } else {
    categoryRows = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
  }

  const catMap = new Map(categoryRows.map((c) => [c.slug, c.id]));

  const existingProducts = await db.select({ total: count() }).from(products);
  let seededProducts: { id: number; name: string }[] = [];

  if ((existingProducts[0]?.total ?? 0) === 0) {
    const productPayloads = [
      {
        categoryId: catMap.get('mens-sneakers') ?? null,
        name: 'کتونی چرم مردانه مدل کورت آدونیس',
        slug: 'adonis-court-leather-mens-sneaker',
        sku: 'AD-101',
        brand: 'ADONIS Studio',
        model: 'Court Classic 01',
        upperMaterial: 'چرم طبیعی گاوی فول‌گرین با پنل جیر',
        soleMaterial: 'لاستیک طبیعی دوخته‌شده (Cup Sole) ضدسایش',
        features: ['کفی طبی قابل تعویض', 'آستر داخلی تنفس‌پذیر چرمی', 'دوخت تقویتی دور زیره'],
        description:
          'کتونی لوکس مردانه با طراحی مینیمال کورت، ترکیب چرم طبیعی نرم و جزئیات جیر کرم؛ ایده‌آل برای استایل اسمارت‌کژوال و استفاده روزانه بدون خستگی پا.',
        fabricCare: 'تمیزکاری با دستمال مرطوب و اسپری محافظ جیر و چرم',
        price: 6850000,
        discountPrice: 5790000,
        sizeInventory: [
          { size: '40', stock: 3 },
          { size: '41', stock: 4 },
          { size: '42', stock: 2 },
          { size: '43', stock: 0 },
          { size: '44', stock: 3 },
        ],
        colors: [
          { name: 'کرم استخوانی', hex: '#DCEBE5' },
          { name: 'مشکی زغالی', hex: '#0F1A1F' },
        ],
        images: [
          '/src/assets/images/shoe_mens_sneaker_cream_1794597375882.jpg',
          '/src/assets/images/hero_footwear_campaign_1794597375199.jpg',
        ],
        isNew: true,
        isBestseller: true,
        isFeatured: true,
        isActive: true,
      },
      {
        categoryId: catMap.get('womens-sneakers') ?? null,
        name: 'کتونی زنانه عاجی مدل میلانو ایر',
        slug: 'adonis-milano-ivory-womens-sneaker',
        sku: 'AD-201',
        brand: 'ADONIS Studio',
        model: 'Milano Air W',
        upperMaterial: 'چرم نبوک و نپا تنفس‌پذیر',
        soleMaterial: 'فوم فشرده EVA با روکش لاستیکی ضدلغزش',
        features: ['وزن فوق سبک ۳۱۰ گرم', 'پد نرم محافظ پاشنه', 'پنجه‌پهن راحت'],
        description:
          'کتونی زنانه عاجی با یراق‌آلات طلایی مات و زیره استاندارد ۵ سانتی‌متری که بدون فشار به کمر و زانو، استایل روزمره شما را تکمیل می‌کند.',
        fabricCare: 'استفاده از فوم تمیزکننده مخصوص چرم روشن',
        price: 5950000,
        discountPrice: 4990000,
        sizeInventory: [
          { size: '37', stock: 4 },
          { size: '38', stock: 5 },
          { size: '39', stock: 3 },
          { size: '40', stock: 2 },
          { size: '41', stock: 0 },
        ],
        colors: [
          { name: 'عاجی طلایی', hex: '#E9E8E3' },
          { name: 'بژ شنی', hex: '#CFE0D9' },
        ],
        images: [
          '/src/assets/images/shoe_womens_sneaker_ivory_1794597376257.jpg',
          '/src/assets/images/shoe_mens_sneaker_cream_1794597375882.jpg',
        ],
        isNew: true,
        isBestseller: true,
        isFeatured: true,
        isActive: true,
      },
      {
        categoryId: catMap.get('sport-shoes') ?? null,
        name: 'کتونی اسپرت رانینگ زغالی پگاسوس پرو',
        slug: 'nike-pegasus-pro-charcoal-sport',
        sku: 'NK-301',
        brand: 'Nike',
        model: 'Pegasus Pro 41',
        upperMaterial: 'مش مهندسی‌شده دو لایه (Engineered Mesh)',
        soleMaterial: 'فوم واکنش‌گرا + زیره وافل لاستیکی مقاوم',
        features: ['بازگشت انرژی بالا', 'تهویه هوا ۳۶۰ درجه', 'شبرنگ ایمنی شبانه'],
        description:
          'کفش اسپرت و دویدن حرفه‌ای مناسب مسافت‌های شهری، باشگاه و دویدن روی تردمیل با بالشتک‌گذاری دوگانه زیر پنجه و پاشنه.',
        fabricCare: 'شستشو با برس نرم و آب ولرم بدون ماشین لباسشویی',
        price: 8900000,
        discountPrice: 7650000,
        sizeInventory: [
          { size: '40', stock: 2 },
          { size: '41', stock: 4 },
          { size: '42', stock: 5 },
          { size: '43', stock: 3 },
          { size: '44', stock: 1 },
        ],
        colors: [
          { name: 'زغالی گرافیتی', hex: '#0B1F2E' },
          { name: 'نقره‌ای دودی', hex: '#5F6B70' },
        ],
        images: [
          '/src/assets/images/shoe_sport_running_charcoal_1794597377088.jpg',
          '/src/assets/images/promo_running_capsule_1794597375673.jpg',
        ],
        isNew: true,
        isBestseller: true,
        isFeatured: true,
        isActive: true,
      },
      {
        categoryId: catMap.get('walking-shoes') ?? null,
        name: 'کفش پیاده‌روی نیوبالانس مدل ۵۷۴۰ اولترا',
        slug: 'new-balance-5740-ultra-walking',
        sku: 'NB-401',
        brand: 'New Balance',
        model: '5740 Heritage',
        upperMaterial: 'جیر طبیعی و مش ضدتعریق',
        soleMaterial: 'زیره دولایه ENCAP جاذب ضربه',
        features: ['پشتیبانی قوس کف پا', 'ثبات پاشنه در پیاده‌روی طولانی', 'کفی ارتولایت'],
        description:
          'انتخابی ایده‌آل برای پیاده‌روی‌های طولانی و ایستادن‌های روزانه؛ فناوری ENCAP در پاشنه فشار را به طور یکنواخت پخش می‌کند.',
        fabricCare: 'برس کشیدن جیر با فرچه خشک و نگهداری در جعبه',
        price: 7800000,
        discountPrice: null,
        sizeInventory: [
          { size: '38', stock: 2 },
          { size: '39', stock: 3 },
          { size: '40', stock: 4 },
          { size: '41', stock: 2 },
          { size: '42', stock: 3 },
          { size: '43', stock: 2 },
        ],
        colors: [
          { name: 'خاکستری گرم', hex: '#9BA6AB' },
          { name: 'کرم صدفی', hex: '#DCEBE5' },
        ],
        images: [
          '/src/assets/images/promo_running_capsule_1794597375673.jpg',
          '/src/assets/images/shoe_mens_sneaker_cream_1794597375882.jpg',
        ],
        isNew: true,
        isBestseller: false,
        isFeatured: true,
        isActive: true,
      },
      {
        categoryId: catMap.get('casual-shoes') ?? null,
        name: 'لوفر جیر روزمره شتری مدل توسکانا',
        slug: 'clarks-toscana-camel-suede-loafer',
        sku: 'CL-501',
        brand: 'Clarks',
        model: 'Toscana Suede',
        upperMaterial: 'جیر طبیعی نرم ایتالیایی',
        soleMaterial: 'لاستیک کرپ طبیعی انعطاف‌پذیر',
        features: ['بدون نیاز به بند', 'رویه ضدچروک', 'آستر تمام‌چرم ضدبو'],
        description:
          'کفش لوفر روزمره شتری مناسب استایل‌های نیمه‌رسمی و کژوال که به سادگی با شلوار کتان، جین و پارچه‌ای ست می‌شود.',
        fabricCare: 'اسپری نانو ضدآب پیش از اولین استفاده و برس جیر',
        price: 6400000,
        discountPrice: 5490000,
        sizeInventory: [
          { size: '40', stock: 2 },
          { size: '41', stock: 3 },
          { size: '42', stock: 4 },
          { size: '43', stock: 2 },
          { size: '44', stock: 1 },
        ],
        colors: [
          { name: 'شتری عسلی', hex: '#0B7A5F' },
          { name: 'قهوه‌ای اسپرسو', hex: '#33424A' },
        ],
        images: [
          '/src/assets/images/shoe_casual_loafer_camel_1794597377849.jpg',
          '/src/assets/images/shoe_formal_oxford_black_1794597377071.jpg',
        ],
        isNew: false,
        isBestseller: true,
        isFeatured: true,
        isActive: true,
      },
      {
        categoryId: catMap.get('athletic-shoes') ?? null,
        name: 'کفش ورزشی آدیداس اولترابوست آل‌تریین',
        slug: 'adidas-ultraboost-all-terrain',
        sku: 'AD-601',
        brand: 'Adidas',
        model: 'Ultraboost Light',
        upperMaterial: 'بافت پرایم‌نیت کشسان ضدتعریق',
        soleMaterial: 'کپسول Boost + لاستیک Continental',
        features: ['چسبندگی فوق‌العاده در سطح خیس', 'تطبیق با فرم پا', 'مناسب تمرین و دویدن'],
        description:
          'جدیدترین نسل کفش ورزشی اولترابوست با ۳۰٪ فوم سبک‌تر و زیره کانتیننتال برای تمرینات پرفشار، دویدن جاده‌ای و کراس‌فیت.',
        fabricCare: 'شستشو با آب سرد و خشک‌کردن در سایه',
        price: 9400000,
        discountPrice: 7990000,
        sizeInventory: [
          { size: '41', stock: 3 },
          { size: '42', stock: 3 },
          { size: '43', stock: 2 },
          { size: '44', stock: 2 },
        ],
        colors: [
          { name: 'مشکی متالیک', hex: '#0F1A1F' },
          { name: 'رز شقایقی', hex: '#6DBFA3' },
        ],
        images: [
          '/src/assets/images/hero_footwear_campaign_1794597375199.jpg',
          '/src/assets/images/shoe_sport_running_charcoal_1794597377088.jpg',
        ],
        isNew: true,
        isBestseller: true,
        isFeatured: true,
        isActive: true,
      },
      {
        categoryId: catMap.get('formal-shoes') ?? null,
        name: 'کفش رسمی آکسفورد چرم مشکی دست‌دوز',
        slug: 'adonis-oxford-black-leather-formal',
        sku: 'AD-701',
        brand: 'ADONIS Studio',
        model: 'Savile Oxford',
        upperMaterial: 'چرم طبیعی گاوی برش یک‌تکه (Wholecut)',
        soleMaterial: 'چرم فشرده با محافظ لاستیکی جلوپنجه',
        features: ['دوخت گودیر (Goodyear Welt)', 'کفی چرم طبیعی ضدتعریق', 'همراه با کیسه پارچه‌ای'],
        description:
          'کفش مجلسی و رسمی آکسفورد مشکی با درخشش طبیعی چرم و قالب استاندارد اروپایی، مناسب کت‌وشلوار رسمی و مجالس ویژه.',
        fabricCare: 'واکس چرم مشکی و استفاده از قالب چوبی کفش پس از هر بار پوشیدن',
        price: 8200000,
        discountPrice: null,
        sizeInventory: [
          { size: '40', stock: 2 },
          { size: '41', stock: 3 },
          { size: '42', stock: 3 },
          { size: '43', stock: 2 },
          { size: '44', stock: 2 },
        ],
        colors: [{ name: 'مشکی براق', hex: '#0F1A1F' }],
        images: [
          '/src/assets/images/shoe_formal_oxford_black_1794597377071.jpg',
          '/src/assets/images/shoe_care_accessories_1794597378977.jpg',
        ],
        isNew: false,
        isBestseller: true,
        isFeatured: true,
        isActive: true,
      },
      {
        categoryId: catMap.get('sandals-slides') ?? null,
        name: 'صندل و اسلاید چرم برنزه مدل ریویرا',
        slug: 'adonis-riviera-tan-leather-slides',
        sku: 'AD-801',
        brand: 'ADONIS Studio',
        model: 'Riviera Cork',
        upperMaterial: 'چرم طبیعی دباغی گیاهی',
        soleMaterial: 'کفی چوب‌پنبه ارگونومیک + زیره EVA',
        features: ['قالب آناتومیک گودی پا', 'ضدتعریق در گرما', 'بند قابل تنظیم'],
        description:
          'صندل و اسلاید چرم برنزه با کفی چوب‌پنبه فرم‌پذیر که پس از چند روز پوشیدن دقیقاً با فرم کف پای شما تطبیق پیدا می‌کند.',
        fabricCare: 'خشک نگه داشتن زیره چوب‌پنبه و مرطوب‌کننده چرم طبیعی',
        price: 3450000,
        discountPrice: 2890000,
        sizeInventory: [
          { size: '37', stock: 3 },
          { size: '38', stock: 4 },
          { size: '39', stock: 4 },
          { size: '40', stock: 3 },
          { size: '41', stock: 2 },
          { size: '42', stock: 2 },
        ],
        colors: [
          { name: 'قهوه‌ای برنزه', hex: '#085544' },
          { name: 'کرم ماسه‌ای', hex: '#D9D7D2' },
        ],
        images: [
          '/src/assets/images/shoe_sandal_slides_tan_1794597377643.jpg',
          '/src/assets/images/shoe_casual_loafer_camel_1794597377849.jpg',
        ],
        isNew: true,
        isBestseller: false,
        isFeatured: false,
        isActive: true,
      },
      {
        categoryId: catMap.get('kids-shoes') ?? null,
        name: 'کتونی بچگانه چسبی مدل پاستل جونیور',
        slug: 'adidas-pastel-junior-kids-sneaker',
        sku: 'KD-901',
        brand: 'Adidas',
        model: 'Junior Cloudstep',
        upperMaterial: 'چرم مصنوعی نرم ضدخش + مش تنفس‌پذیر',
        soleMaterial: 'فوم بسیار نرم و انعطاف‌پذیر ضدلغزش',
        features: ['بست چسبی سریع برای کودک', 'وزن فوق‌العاده سبک', 'حمایت از مچ پا'],
        description:
          'کتونی استاندارد کودک و نوجوان با بند کشی و چسب دوتایی برای پوشیدن آسان و محافظت کامل از قوس و مچ پای در حال رشد.',
        fabricCare: 'قابل تمیزکاری آسان با دستمال نمدار و صابون ملایم',
        price: 2950000,
        discountPrice: 2490000,
        sizeInventory: [
          { size: '28', stock: 3 },
          { size: '30', stock: 4 },
          { size: '32', stock: 4 },
          { size: '34', stock: 3 },
          { size: '36', stock: 2 },
        ],
        colors: [
          { name: 'سفید مریم‌گلی', hex: '#E2E0DB' },
          { name: 'سفید خاکی', hex: '#E9E8E3' },
        ],
        images: [
          '/src/assets/images/shoe_kids_sneaker_pastel_1794597377865.jpg',
        ],
        isNew: true,
        isBestseller: false,
        isFeatured: false,
        isActive: true,
      },
      {
        categoryId: catMap.get('athletic-shoes') ?? null,
        name: 'کفش ورزشی طبیعت‌گردی سالومون XT-6',
        slug: 'salomon-xt6-trail-runner',
        sku: 'SL-602',
        brand: 'Salomon',
        model: 'XT-6 Gore',
        upperMaterial: 'مش مقاوم ضدسایش با محافظ TPU',
        soleMaterial: 'لاستیک آج‌درشت Contagrip + شاسی ACS',
        features: ['بند کششی سریع Quicklace', 'ضدآب و مقاوم در مسیر سنگی', 'ثبات پیچشی بالا'],
        description:
          'کتونی تریل و شهری محبوب سالومون مناسب پیاده‌روی‌های سنگین، کوهپایه و استایل گورپ‌کور روزمره با چسبندگی کم‌نظیر.',
        fabricCare: 'شستشوی گل‌ولای با آب سرد و خشک‌کردن در هوای آزاد',
        price: 10500000,
        discountPrice: 9200000,
        sizeInventory: [
          { size: '41', stock: 2 },
          { size: '42', stock: 2 },
          { size: '43', stock: 2 },
          { size: '44', stock: 1 },
        ],
        colors: [{ name: 'زغالی شنی', hex: '#33424A' }],
        images: [
          '/src/assets/images/shoe_sport_running_charcoal_1794597377088.jpg',
          '/src/assets/images/hero_footwear_campaign_1794597375199.jpg',
        ],
        isNew: false,
        isBestseller: true,
        isFeatured: true,
        isActive: true,
      },
      {
        categoryId: catMap.get('shoe-accessories') ?? null,
        name: 'پک تخصصی مراقبت از کفش و قالب چوب سدر',
        slug: 'adonis-cedar-shoe-care-kit',
        sku: 'AC-010',
        brand: 'ADONIS Studio',
        model: 'Care Kit Pro',
        upperMaterial: 'چوب طبیعی سدر معطر + موی طبیعی اسب',
        soleMaterial: 'فرمول نانو بدون الکل',
        features: ['قالب چوب سدر جذب‌کننده رطوبت', 'واکس و اسپری ضدآب نانو', 'برس موی اسب و پاشنه‌کش برنجی'],
        description:
          'مجموعه کامل نگهداری از کفش‌های چرم و کتونی شامل جفت قالب چوب سدر طبیعی برای جلوگیری از چروک رویه، اسپری ضدآب، فوم تمیزکننده و برس.',
        fabricCare: 'قالب را پس از درآوردن کفش در داخل آن قرار دهید تا فرم کفش حفظ شود.',
        price: 1850000,
        discountPrice: 1490000,
        sizeInventory: [
          { size: '39-40', stock: 6 },
          { size: '41-42', stock: 8 },
          { size: '43-44', stock: 5 },
        ],
        colors: [{ name: 'چوب طبیعی سدر', hex: '#085544' }],
        images: [
          '/src/assets/images/shoe_care_accessories_1794597378977.jpg',
        ],
        isNew: true,
        isBestseller: false,
        isFeatured: true,
        isActive: true,
      },
    ];

    const valuesToInsert = productPayloads.map((item) => ({
      ...item,
      sizes: item.sizeInventory.map((s) => s.size),
      stock: getTotalStockFromSizes(item.sizeInventory),
    }));

    seededProducts = await db
      .insert(products)
      .values(valuesToInsert)
      .returning({ id: products.id, name: products.name });
  } else {
    seededProducts = await db.select({ id: products.id, name: products.name }).from(products);
  }

  const existingBanners = await db.select({ total: count() }).from(banners);
  if ((existingBanners[0]?.total ?? 0) === 0) {
    await db.insert(banners).values([
      {
        title: 'کلکسیون تخصصی کفش و کتونی آدونیس',
        subtitle: 'ترکیب مهندسی ارگونومی پا، چرم طبیعی دست‌دوز و طراحی مدرن برای قدم‌های مطمئن روزمره و ورزشی.',
        ctaText: 'مشاهده کلکسیون کفش',
        ctaLink: '/shop?sort=newest',
        imageUrl: '/src/assets/images/hero_footwear_campaign_1794597375199.jpg',
        position: 'hero',
        isActive: true,
        sortOrder: 1,
      },
      {
        title: 'فصل حرکت: کتونی‌های رانینگ و پیاده‌روی',
        subtitle: 'بالشتک‌گذاری استاندارد، وزن فوق‌سبک و تا ۲۰٪ تخفیف ویژه روی مدل‌های منتخب ورزشی و روزمره.',
        ctaText: 'خرید پیشنهادهای ویژه',
        ctaLink: '/shop?discount=1',
        imageUrl: '/src/assets/images/promo_running_capsule_1794597375673.jpg',
        position: 'promo',
        isActive: true,
        sortOrder: 2,
      },
    ]);
  }

  const existingDiscounts = await db.select({ total: count() }).from(discounts);
  if ((existingDiscounts[0]?.total ?? 0) === 0) {
    await db.insert(discounts).values([
      {
        code: 'ADONIS15',
        title: 'تخفیف ۱۵ درصدی کلکسیون کفش فصل',
        percent: 15,
        minOrderAmount: 1500000,
        isActive: true,
      },
      {
        code: 'WELCOME10',
        title: 'هدیه اولین خرید از آدونیس',
        percent: 10,
        minOrderAmount: 0,
        isActive: true,
      },
    ]);
  }

  const existingReviews = await db.select({ total: count() }).from(reviews);
  if ((existingReviews[0]?.total ?? 0) === 0) {
    const p1 = seededProducts[0]?.id ?? null;
    const p2 = seededProducts[1]?.id ?? null;
    const p3 = seededProducts[2]?.id ?? null;
    const p4 = seededProducts[4]?.id ?? null;

    await db.insert(reviews).values([
      {
        productId: p1,
        authorName: 'امیرحسین رضایی',
        rating: 5,
        comment: 'کیفیت چرم و دوخت زیره کتونی کورت فوق‌العاده تمیز است. سایز ۴۲ دقیقاً اندازه پای من بود و بعد از یک هفته پیاده‌روی کاملاً راحت است.',
        verifiedPurchase: true,
        isApproved: true,
      },
      {
        productId: p2,
        authorName: 'نگار کریمی',
        rating: 5,
        comment: 'رنگ عاجی و جزئیات طلایی مدل میلانو ایر دقیقاً مثل عکس‌هاست. بسیار سبک و مناسب استفاده طولانی در محل کار.',
        verifiedPurchase: true,
        isApproved: true,
      },
      {
        productId: p3,
        authorName: 'محمدمهدی توکلی',
        rating: 5,
        comment: 'برای دویدن روی تردمیل و آسفالت تهیه کردم. ضربه‌گیر پاشنه و تهویه مش واقعاً حس سبکی خوبی می‌دهد. ارسال هم بسیار سریع انجام شد.',
        verifiedPurchase: true,
        isApproved: true,
      },
      {
        productId: p4,
        authorName: 'سهراب فرهادی',
        rating: 4,
        comment: 'لوفر جیر شتری ظاهر خیلی شیکی دارد و با شلوار کتان عالی می‌شود. راهنمای سایز سانتی‌متری کمک زیادی در انتخاب دقیق کرد.',
        verifiedPurchase: true,
        isApproved: true,
      },
    ]);
  }

  await migrateLegacyProductsSizeInventory();
  await applyAdonisSettingsMigration();
  await applyAdonisPaletteV3Migration();
  await applyAdonisPaletteV4Migration();
  await applyAdonisProductSlugMigration();
  await applyAdonisOrderNumberMigration();
  await bootstrapEnvAdmin();
}

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
