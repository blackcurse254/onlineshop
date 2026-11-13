import { count } from 'drizzle-orm';
import { db } from './index.ts';
import {
  banners,
  categories,
  discounts,
  orderItems,
  orders,
  products,
  storeSettings,
  users,
} from './schema.ts';
import { hashPassword } from '../lib/security.ts';

let seedPromise: Promise<void> | null = null;

async function runSeed() {
  const existingSettings = await db.select({ total: count() }).from(storeSettings);
  if ((existingSettings[0]?.total ?? 0) === 0) {
    await db.insert(storeSettings).values({
      storeName: 'VERA BOUTIQUE',
      storeSubtitle: 'خانه مد و پوشاک معاصر',
      logoText: 'VERA',
      primaryColor: '#18181B',
      accentColor: '#B5945B',
      backgroundColor: '#FAF7F2',
      phone: '021-88451290',
      email: 'hello@veraboutique.ir',
      instagram: '@vera.boutique.ir',
      telegram: '@veraboutique_support',
      whatsapp: '09120004512',
      address: 'تهران، جردن، بلوار ناهید شرقی، پلاک ۱۸، طبقه اول',
      shippingBaseCost: 85000,
      expressShippingCost: 165000,
      freeShippingThreshold: 4500000,
      aboutText:
        'ورا بوتیک با تمرکز بر دوخت دقیق، الیاف طبیعی و برش‌های مدرن، مجموعه‌ای منتخب از پوشاک روزمره و رسمی را برای استایل ماندگار طراحی و عرضه می‌کند.',
      shippingPolicy:
        'سفارش‌های تهران طی ۱ تا ۲ روز کاری و سفارش‌های سراسر کشور طی ۲ تا ۴ روز کاری با بسته‌بندی اختصاصی ارسال می‌شوند.',
      returnPolicy:
        'امکان تعویض سایز یا مرجوعی کالا تا ۷ روز پس از تحویل در صورت حفظ تگ و سلامت محصول فراهم است.',
      announcementText: 'ارسال رایگان برای خریدهای بالای ۴,۵۰۰,۰۰۰ تومان · کد تخفیف پاییزه: VERA15',
    });
  }

  const existingCategories = await db.select({ total: count() }).from(categories);
  let categoryRows: { id: number; slug: string }[] = [];

  if ((existingCategories[0]?.total ?? 0) === 0) {
    categoryRows = await db
      .insert(categories)
      .values([
        {
          name: 'کت و پالتو',
          slug: 'coats-blazers',
          description: 'پالتوهای پشمی و کت‌های بلیزر با دوخت ساختاری',
          imageUrl: '/src/assets/images/cat_coats_blazers_1794595829730.jpg',
          sortOrder: 1,
          isActive: true,
        },
        {
          name: 'پیراهن و ست زنانه',
          slug: 'dresses-sets',
          description: 'پیراهن‌های ساتن و ست‌های لینن مینیمال',
          imageUrl: '/src/assets/images/cat_dresses_sets_1794595830804.jpg',
          sortOrder: 2,
          isActive: true,
        },
        {
          name: 'پوشاک رسمی مردانه',
          slug: 'mens-tailoring',
          description: 'اورشرت پشمی، پیراهن کتان و شلوارهای کلاسیک',
          imageUrl: '/src/assets/images/cat_mens_tailoring_1794595830447.jpg',
          sortOrder: 3,
          isActive: true,
        },
        {
          name: 'بافت و شلوار',
          slug: 'knitwear-trousers',
          description: 'بافت‌های کشمیر ظریف و شلوارهای فیت مدرن',
          imageUrl: '/src/assets/images/cat_knitwear_trousers_1794595829390.jpg',
          sortOrder: 4,
          isActive: true,
        },
        {
          name: 'کیف و اکسسوری',
          slug: 'accessories',
          description: 'کیف‌های چرم طبیعی، شال ابریشم و عینک آفتابی',
          imageUrl: '/src/assets/images/cat_accessories_bags_1794595830265.jpg',
          sortOrder: 5,
          isActive: true,
        },
      ])
      .returning({ id: categories.id, slug: categories.slug });
  } else {
    categoryRows = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
  }

  const catMap = new Map(categoryRows.map((c) => [c.slug, c.id]));

  const existingProducts = await db.select({ total: count() }).from(products);
  let seededProducts: { id: number; name: string; price: number; discountPrice: number | null; images: string[] }[] = [];

  if ((existingProducts[0]?.total ?? 0) === 0) {
    seededProducts = await db
      .insert(products)
      .values([
        {
          categoryId: catMap.get('coats-blazers') ?? null,
          name: 'ترنچ‌کت کشمیر کرم مدل ورا',
          slug: 'vera-cashmere-trench-cream',
          sku: 'VR-101',
          description:
            'ترنچ‌کت بلند دوخته شده از ترکیب پشم مرینوس و کشمیر لطیف، دارای کمربند هم‌جنس و آستر ابریشمی ضدالکتریسیته.',
          fabricCare: '۸۵٪ پشم مرینوس، ۱۵٪ کشمیر · خشکشویی تخصصی',
          price: 8900000,
          discountPrice: 7450000,
          stock: 12,
          sizes: ['S', 'M', 'L'],
          colors: [
            { name: 'کرم استخوانی', hex: '#EDE4D3' },
            { name: 'مشکی زغالی', hex: '#232327' },
          ],
          images: [
            '/src/assets/images/hero_vera_campaign_1794595830327.jpg',
            '/src/assets/images/cat_coats_blazers_1794595829730.jpg',
          ],
          isNew: true,
          isBestseller: true,
          isFeatured: true,
          isActive: true,
        },
        {
          categoryId: catMap.get('coats-blazers') ?? null,
          name: 'کت بلیزر دابل‌برست شتری',
          slug: 'camel-double-breasted-blazer',
          sku: 'VR-102',
          description:
            'کت بلیزر کلاسیک با برش ساختاریافته، یقه انگلیسی و دکمه‌های شاخ طبیعی مناسب استایل اداری و نیمه‌رسمی.',
          fabricCare: '۱۰۰٪ پشم شانه‌شده ایتالیایی · بخارشویی ملایم',
          price: 6200000,
          discountPrice: null,
          stock: 9,
          sizes: ['S', 'M', 'L', 'XL'],
          colors: [
            { name: 'شتری گرم', hex: '#B98C62' },
            { name: 'عاجی', hex: '#F3EEE5' },
          ],
          images: [
            '/src/assets/images/cat_coats_blazers_1794595829730.jpg',
            '/src/assets/images/promo_evening_capsule_1794595832517.jpg',
          ],
          isNew: true,
          isBestseller: false,
          isFeatured: true,
          isActive: true,
        },
        {
          categoryId: catMap.get('dresses-sets') ?? null,
          name: 'شومیز ابریشم طبیعی عاجی',
          slug: 'ivory-mulberry-silk-blouse',
          sku: 'VR-201',
          description:
            'شومیز ظریف از ابریشم ۱۰۰٪ طبیعی توت با دکمه‌های صدف و سرآستین دوگانه، تن‌خور رها و بسیار خنک.',
          fabricCare: '۱۰۰٪ ابریشم طبیعی · شستشو با دست در آب سرد',
          price: 3850000,
          discountPrice: 3290000,
          stock: 15,
          sizes: ['XS', 'S', 'M', 'L'],
          colors: [
            { name: 'عاجی', hex: '#F7F3EA' },
            { name: 'شامپاینی', hex: '#DECBA8' },
          ],
          images: [
            '/src/assets/images/product_silk_blouse_1794595831614.jpg',
            '/src/assets/images/promo_evening_capsule_1794595832517.jpg',
          ],
          isNew: true,
          isBestseller: true,
          isFeatured: true,
          isActive: true,
        },
        {
          categoryId: catMap.get('dresses-sets') ?? null,
          name: 'پیراهن میدی ساتن ابریشمی',
          slug: 'ivory-satin-midi-dress',
          sku: 'VR-202',
          description:
            'پیراهن میدی مجلسی با برش اریب، یقه هفت ظریف و ریزش لطیف پارچه ساتن براق برای مهمانی‌های عصر.',
          fabricCare: 'ساتن ابریشمی درجه یک · خشکشویی ملایم',
          price: 5400000,
          discountPrice: null,
          stock: 7,
          sizes: ['S', 'M', 'L'],
          colors: [
            { name: 'سفید مرواریدی', hex: '#F4F0E8' },
            { name: 'زغالی', hex: '#26262A' },
          ],
          images: [
            '/src/assets/images/cat_dresses_sets_1794595830804.jpg',
            '/src/assets/images/product_silk_blouse_1794595831614.jpg',
          ],
          isNew: false,
          isBestseller: true,
          isFeatured: true,
          isActive: true,
        },
        {
          categoryId: catMap.get('mens-tailoring') ?? null,
          name: 'اورشرت پشمی مردانه زغالی',
          slug: 'charcoal-wool-overshirt',
          sku: 'VR-301',
          description:
            'اورشرت ضخیم پشمی با دوخت تمیز، جیب‌های مخفی و دکمه‌های مات؛ قابل استفاده روی تیشرت یا پیراهن رسمی.',
          fabricCare: '۸۰٪ پشم، ۲۰٪ پلی‌آمید مقاوم · خشکشویی',
          price: 4650000,
          discountPrice: 3950000,
          stock: 14,
          sizes: ['M', 'L', 'XL'],
          colors: [
            { name: 'زغالی تیره', hex: '#2A2B2E' },
            { name: 'سفید کتان', hex: '#F6F6F4' },
          ],
          images: [
            '/src/assets/images/cat_mens_tailoring_1794595830447.jpg',
            '/src/assets/images/cat_knitwear_trousers_1794595829390.jpg',
          ],
          isNew: true,
          isBestseller: false,
          isFeatured: true,
          isActive: true,
        },
        {
          categoryId: catMap.get('mens-tailoring') ?? null,
          name: 'شلوار فاستونی پیله‌دار کلاسیک',
          slug: 'pleated-wool-trousers',
          sku: 'VR-302',
          description:
            'شلوار رسمی مردانه و یونیسکس با دو پیله در کمر، دوخت اتوکشیده و پارچه فاستونی تنفس‌پذیر.',
          fabricCare: '۱۰۰٪ پشم فاستونی سوپر ۱۲۰ · اتوکشی با بخار',
          price: 3900000,
          discountPrice: null,
          stock: 18,
          sizes: ['40', '42', '44', '46'],
          colors: [
            { name: 'خاکستری زغالی', hex: '#3B3D42' },
            { name: 'مشکی', hex: '#18181B' },
          ],
          images: [
            '/src/assets/images/cat_mens_tailoring_1794595830447.jpg',
            '/src/assets/images/hero_vera_campaign_1794595830327.jpg',
          ],
          isNew: false,
          isBestseller: true,
          isFeatured: false,
          isActive: true,
        },
        {
          categoryId: catMap.get('knitwear-trousers') ?? null,
          name: 'پلیور یقه اسکی بافت بژ',
          slug: 'ribbed-cashmere-turtleneck',
          sku: 'VR-401',
          description:
            'بافت راه‌راه ریز از نخ کشمیر و مرینوس بسیار لطیف بدون پرزدهی، ایده‌آل برای زیر کت و استایل لایه‌ای.',
          fabricCare: '۷۰٪ پشم مرینوس، ۳۰٪ کشمیر · شستشوی ملایم ۳۰ درجه',
          price: 3450000,
          discountPrice: 2890000,
          stock: 20,
          sizes: ['S', 'M', 'L', 'XL'],
          colors: [
            { name: 'بژ شنی', hex: '#D8C3AB' },
            { name: 'مشکی', hex: '#1D1D20' },
          ],
          images: [
            '/src/assets/images/cat_knitwear_trousers_1794595829390.jpg',
            '/src/assets/images/hero_vera_campaign_1794595830327.jpg',
          ],
          isNew: true,
          isBestseller: true,
          isFeatured: true,
          isActive: true,
        },
        {
          categoryId: catMap.get('knitwear-trousers') ?? null,
          name: 'شلوار وایدلگ پشمی زغالی',
          slug: 'wide-leg-charcoal-trousers',
          sku: 'VR-402',
          description:
            'شلوار فاق‌بلند دمپاگشاد با خط اتوی ماندگار و کمرسازی دقیق که استایل را کشیده و متناسب نشان می‌دهد.',
          fabricCare: '۹۶٪ پشم ظریف، ۴٪ الاستین · خشکشویی',
          price: 4100000,
          discountPrice: null,
          stock: 11,
          sizes: ['36', '38', '40', '42'],
          colors: [
            { name: 'زغالی', hex: '#2D2E32' },
          ],
          images: [
            '/src/assets/images/cat_knitwear_trousers_1794595829390.jpg',
            '/src/assets/images/promo_evening_capsule_1794595832517.jpg',
          ],
          isNew: false,
          isBestseller: false,
          isFeatured: false,
          isActive: true,
        },
        {
          categoryId: catMap.get('accessories') ?? null,
          name: 'کیف توت چرم طبیعی اسپرسو',
          slug: 'espresso-leather-tote-bag',
          sku: 'VR-501',
          description:
            'کیف دستی روزمره از چرم گاوی دانه‌درشت ایتالیایی با قفل برنجی مات و محفظه اختصاصی وسایل شخصی.',
          fabricCare: '۱۰۰٪ چرم طبیعی گاوی · نگهداری با واکس بی‌رنگ چرم',
          price: 7600000,
          discountPrice: 6450000,
          stock: 6,
          sizes: ['Free Size'],
          colors: [
            { name: 'قهوه‌ای اسپرسو', hex: '#3D2E27' },
            { name: 'مشکی', hex: '#18181B' },
          ],
          images: [
            '/src/assets/images/cat_accessories_bags_1794595830265.jpg',
            '/src/assets/images/hero_vera_campaign_1794595830327.jpg',
          ],
          isNew: true,
          isBestseller: true,
          isFeatured: true,
          isActive: true,
        },
        {
          categoryId: catMap.get('coats-blazers') ?? null,
          name: 'ست کت و شلوار شب کپسولی',
          slug: 'evening-capsule-tailored-suit',
          sku: 'VR-103',
          description:
            'ست دو تکه کت تک‌دکمه و شلوار راسته با پارچه کرپ پشمی مات و یقه ساتن ظریف برای مجالس رسمی.',
          fabricCare: 'کرپ پشمی اعلا · خشکشویی تخصصی',
          price: 9800000,
          discountPrice: 8400000,
          stock: 5,
          sizes: ['S', 'M', 'L'],
          colors: [
            { name: 'مشکی زغالی', hex: '#1E1F23' },
          ],
          images: [
            '/src/assets/images/cat_coats_blazers_1794595829730.jpg',
            '/src/assets/images/cat_knitwear_trousers_1794595829390.jpg',
          ],
          isNew: true,
          isBestseller: false,
          isFeatured: true,
          isActive: true,
        },
      ])
      .returning({
        id: products.id,
        name: products.name,
        price: products.price,
        discountPrice: products.discountPrice,
        images: products.images,
      });
  } else {
    seededProducts = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        discountPrice: products.discountPrice,
        images: products.images,
      })
      .from(products);
  }

  const existingBanners = await db.select({ total: count() }).from(banners);
  if ((existingBanners[0]?.total ?? 0) === 0) {
    await db.insert(banners).values([
      {
        title: 'کلکسیون پاییز و زمستان ورا',
        subtitle: 'برش‌های معماری، الیاف پشم و کشمیر طبیعی در پالت کرم، زغالی و طلایی ملایم.',
        ctaText: 'مشاهده کلکسیون جدید',
        ctaLink: '/shop?sort=newest',
        imageUrl: '/src/assets/images/hero_vera_campaign_1794595830327.jpg',
        position: 'hero',
        isActive: true,
        sortOrder: 1,
      },
      {
        title: 'کپسول شب و استایل رسمی',
        subtitle: 'ست‌های کت‌وشلوار تک‌دکمه و شومیزهای ابریشمی با ۲۰٪ تخفیف ویژه فصل.',
        ctaText: 'خرید پیشنهادهای ویژه',
        ctaLink: '/shop?discount=1',
        imageUrl: '/src/assets/images/promo_evening_capsule_1794595832517.jpg',
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
        code: 'VERA15',
        title: 'تخفیف ۱۵ درصدی کلکسیون فصل',
        percent: 15,
        minOrderAmount: 1500000,
        isActive: true,
      },
      {
        code: 'WELCOME10',
        title: 'هدیه اولین خرید از ورا بوتیک',
        percent: 10,
        minOrderAmount: 0,
        isActive: true,
      },
    ]);
  }

  const existingUsers = await db.select({ total: count() }).from(users);
  if ((existingUsers[0]?.total ?? 0) === 0) {
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'VeraAdmin#2026';
    const customerPassword = process.env.SEED_DEMO_PASSWORD || 'VeraGuest#2026';

    const insertedUsers = await db
      .insert(users)
      .values([
        {
          uid: 'local_admin_vera',
          email: 'admin@veraboutique.ir',
          passwordHash: hashPassword(adminPassword),
          fullName: 'مدیر کل ورا بوتیک',
          phone: '02188451290',
          address: 'تهران، جردن، بلوار ناهید شرقی، پلاک ۱۸',
          postalCode: '1968734511',
          role: 'admin',
        },
        {
          uid: 'local_demo_customer',
          email: 'sara@example.com',
          passwordHash: hashPassword(customerPassword),
          fullName: 'سارا محمدی',
          phone: '09123456789',
          address: 'تهران، سعادت‌آباد، خیابان سرو غربی، پلاک ۴۲، واحد ۶',
          postalCode: '1998745123',
          role: 'customer',
        },
      ])
      .returning({ id: users.id, role: users.role });

    const demoCustomer = insertedUsers.find((u) => u.role === 'customer');
    const existingOrders = await db.select({ total: count() }).from(orders);

    if ((existingOrders[0]?.total ?? 0) === 0 && demoCustomer && seededProducts.length >= 2) {
      const p1 = seededProducts[0];
      const p2 = seededProducts[2] ?? seededProducts[1];
      const p1Price = p1.discountPrice ?? p1.price;
      const p2Price = p2.discountPrice ?? p2.price;
      const subtotal = p1Price + p2Price;

      const [createdOrder] = await db
        .insert(orders)
        .values({
          orderNumber: 'VERA-1042',
          userId: demoCustomer.id,
          customerName: 'سارا محمدی',
          customerPhone: '09123456789',
          customerAddress: 'تهران، سعادت‌آباد، خیابان سرو غربی، پلاک ۴۲، واحد ۶',
          postalCode: '1998745123',
          shippingMethod: 'standard',
          shippingCost: 0,
          subtotal,
          discountCode: null,
          discountAmount: 0,
          totalAmount: subtotal,
          paymentMode: 'demo',
          paymentStatus: 'demo_simulated',
          orderStatus: 'processing',
          notes: 'سفارش نمونه نمایشی',
        })
        .returning({ id: orders.id });

      await db.insert(orderItems).values([
        {
          orderId: createdOrder.id,
          productId: p1.id,
          productName: p1.name,
          productImage: p1.images[0] || '/src/assets/images/hero_vera_campaign_1794595830327.jpg',
          selectedSize: 'M',
          selectedColor: 'کرم استخوانی',
          quantity: 1,
          unitPrice: p1Price,
        },
        {
          orderId: createdOrder.id,
          productId: p2.id,
          productName: p2.name,
          productImage: p2.images[0] || '/src/assets/images/product_silk_blouse_1794595831614.jpg',
          selectedSize: 'S',
          selectedColor: 'عاجی',
          quantity: 1,
          unitPrice: p2Price,
        },
      ]);
    }
  }
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
