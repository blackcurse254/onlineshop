import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './src/db/index.ts';
import {
  banners,
  brands,
  categories,
  discounts,
  orderItems,
  orders,
  products,
  reviews,
  storeSettings,
  users,
  wishlists,
} from './src/db/schema.ts';
import { ensureSeeded } from './src/db/seed.ts';
import { optionalAuth, requireAdmin, requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  consumeRateLimit,
  corsMiddleware,
  hashPassword,
  rateLimit,
  sanitizeString,
  SESSION_COOKIE_NAME,
  signSessionToken,
  validateAndSaveImageBuffer,
  validateStartupSecurityConfig,
  verifyCsrfOrigin,
  verifyPassword,
} from './src/lib/security.ts';
import {
  calculateOrderTotals,
  decrementSizeInventory,
  getEffectivePrice,
  getTotalStockFromSizes,
  normalizeDigits,
  validateIranianPhone,
  validateIranianPostalCode,
} from './src/utils/commerce.ts';

dotenv.config();
validateStartupSecurityConfig();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const UPLOAD_DIR = path.resolve('public/uploads');

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(corsMiddleware);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Upload endpoint has a 4MB JSON limit for base64 of <=2MB binary image; global API limit stays 1MB
app.post(
  '/api/admin/upload',
  cookieParser(),
  verifyCsrfOrigin,
  express.json({ limit: '4mb' }),
  requireAdmin,
  async (req, res) => {
    try {
      const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
      if (!dataUrl) {
        return res.status(400).json({ error: 'فایل تصویر ارسال نشده است.' });
      }
      const saved = validateAndSaveImageBuffer(dataUrl, UPLOAD_DIR);
      res.status(201).json({
        url: saved.publicPath,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || 'خطا در آپلود تصویر.' });
    }
  }
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(verifyCsrfOrigin);

app.use('/src/assets/images', express.static(path.resolve('src/assets/images')));
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=604800');
    },
  })
);

const isSecureCookie = process.env.NODE_ENV === 'production';

function setSessionCookie(res: express.Response, user: { id: number; uid: string; role: string }) {
  const token = signSessionToken({ userId: user.id, uid: user.uid, role: user.role });
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookie,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
  });
}

// ---------- Public Storefront Routes ----------

app.get('/api/storefront', async (_req, res, next) => {
  try {
    await ensureSeeded();
    const [settingsRows, categoryRows, brandRows, productRows, bannerRows, reviewRows] = await Promise.all([
      db.select().from(storeSettings).limit(1),
      db
        .select()
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(asc(categories.sortOrder), asc(categories.id)),
      db
        .select()
        .from(brands)
        .where(eq(brands.isActive, true))
        .orderBy(asc(brands.sortOrder), asc(brands.id)),
      db
        .select()
        .from(products)
        .where(eq(products.isActive, true))
        .orderBy(desc(products.id)),
      db
        .select()
        .from(banners)
        .where(eq(banners.isActive, true))
        .orderBy(asc(banners.sortOrder), asc(banners.id)),
      db
        .select()
        .from(reviews)
        .where(eq(reviews.isApproved, true))
        .orderBy(desc(reviews.createdAt))
        .limit(12),
    ]);

    const productMetaMap = new Map(productRows.map((p) => [p.id, { name: p.name, slug: p.slug }]));
    const enrichedReviews = reviewRows.map((r) => ({
      ...r,
      productName: r.productId ? productMetaMap.get(r.productId)?.name : undefined,
      productSlug: r.productId ? productMetaMap.get(r.productId)?.slug : undefined,
    }));

    res.json({
      settings: settingsRows[0] ?? null,
      categories: categoryRows,
      brands: brandRows,
      products: productRows,
      banners: bannerRows,
      reviews: enrichedReviews,
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/products/:slug', async (req, res, next) => {
  try {
    await ensureSeeded();
    const slug = sanitizeString(req.params.slug);
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.isActive, true)))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'محصول مورد نظر یافت نشد.' });
    }

    const product = rows[0];

    const [similarRows, brandOrCareRows, productReviews] = await Promise.all([
      product.categoryId
        ? db
            .select()
            .from(products)
            .where(and(eq(products.categoryId, product.categoryId), eq(products.isActive, true)))
            .limit(6)
        : Promise.resolve([] as typeof rows),
      db
        .select()
        .from(products)
        .where(eq(products.isActive, true))
        .orderBy(desc(products.isBestseller), desc(products.id))
        .limit(12),
      db
        .select()
        .from(reviews)
        .where(and(eq(reviews.productId, product.id), eq(reviews.isApproved, true)))
        .orderBy(desc(reviews.createdAt)),
    ]);

    const similar = similarRows.filter((r) => r.id !== product.id).slice(0, 4);
    const similarIds = new Set(similar.map((s) => s.id));
    similarIds.add(product.id);

    const related = brandOrCareRows
      .filter((r) => !similarIds.has(r.id) && (r.brand === product.brand || r.sku.startsWith('AC-') || r.isFeatured))
      .slice(0, 4);

    res.json({ product, similar, related, reviews: productReviews });
  } catch (err) {
    next(err);
  }
});

const createReviewSchema = z.object({
  productId: z.number().int().positive(),
  authorName: z.string().min(2, 'نام خود را وارد کنید').max(60),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(8, 'متن دیدگاه باید حداقل ۸ کاراکتر باشد').max(600),
});

app.post(
  '/api/reviews',
  rateLimit({ windowMs: 60_000 * 10, max: 10, keyPrefix: 'submit-review' }),
  optionalAuth,
  async (req: AuthRequest, res, next) => {
    try {
      await ensureSeeded();
      const parsed = createReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'اطلاعات دیدگاه نامعتبر است.' });
      }

      const prod = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, parsed.data.productId))
        .limit(1);

      if (prod.length === 0) {
        return res.status(404).json({ error: 'محصول یافت نشد.' });
      }

      const isSignedIn = Boolean(req.user);
      const [created] = await db
        .insert(reviews)
        .values({
          productId: parsed.data.productId,
          authorName: sanitizeString(parsed.data.authorName),
          rating: parsed.data.rating,
          comment: sanitizeString(parsed.data.comment),
          verifiedPurchase: isSignedIn,
          isApproved: isSignedIn,
        })
        .returning();

      res.status(201).json({
        review: created,
        pendingModeration: !created.isApproved,
        message: created.isApproved
          ? 'دیدگاه شما با موفقیت ثبت شد.'
          : 'دیدگاه شما ثبت شد و پس از تایید مدیریت نمایش داده می‌شود.',
      });
    } catch (err) {
      next(err);
    }
  }
);

const discountValidateSchema = z.object({
  code: z.string().min(2).max(40),
  subtotal: z.number().int().nonnegative(),
});

app.post(
  '/api/discounts/validate',
  rateLimit({ windowMs: 60_000, max: 25, keyPrefix: 'discount-check' }),
  async (req, res, next) => {
    try {
      await ensureSeeded();
      const parsed = discountValidateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'کد تخفیف نامعتبر است.' });
      }

      const cleanCode = sanitizeString(parsed.data.code).toUpperCase();
      const found = await db
        .select()
        .from(discounts)
        .where(and(eq(discounts.code, cleanCode), eq(discounts.isActive, true)))
        .limit(1);

      if (found.length === 0) {
        return res.status(404).json({ error: 'کد تخفیف معتبر نیست یا منقضی شده است.' });
      }

      const coupon = found[0];
      if (parsed.data.subtotal < coupon.minOrderAmount) {
        return res.status(400).json({
          error: `حداقل مبلغ خرید برای استفاده از این کد ${new Intl.NumberFormat('fa-IR').format(coupon.minOrderAmount)} تومان است.`,
        });
      }

      res.json({
        valid: true,
        code: coupon.code,
        title: coupon.title,
        percent: coupon.percent,
        minOrderAmount: coupon.minOrderAmount,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------- Wishlist Routes (Authenticated Customers) ----------

app.get('/api/wishlist', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rows = await db
      .select({ productId: wishlists.productId })
      .from(wishlists)
      .where(eq(wishlists.userId, req.user!.id));
    res.json({ productIds: rows.map((r) => r.productId) });
  } catch (err) {
    next(err);
  }
});

app.post('/api/wishlist/toggle', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const productId = Number(req.body?.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'شناسه محصول نامعتبر است.' });
    }

    const existing = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, req.user!.id), eq(wishlists.productId, productId)))
      .limit(1);

    let added = false;
    if (existing.length > 0) {
      await db.delete(wishlists).where(eq(wishlists.id, existing[0].id));
    } else {
      await db.insert(wishlists).values({ userId: req.user!.id, productId });
      added = true;
    }

    const rows = await db
      .select({ productId: wishlists.productId })
      .from(wishlists)
      .where(eq(wishlists.userId, req.user!.id));

    res.json({ added, productIds: rows.map((r) => r.productId) });
  } catch (err) {
    next(err);
  }
});

// ---------- Authentication & Account Routes ----------

app.get('/api/auth/me', async (req: AuthRequest, res, next) => {
  try {
    await ensureSeeded();
    await optionalAuth(req, res, () => {
      res.json({ user: req.user ?? null });
    });
  } catch (err) {
    next(err);
  }
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'نام و نام خانوادگی حداقل ۲ کاراکتر باشد').max(80),
  email: z.string().email('ایمیل معتبر نیست').max(120),
  password: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد').max(100),
  phone: z.string().max(20).optional().default(''),
});

app.post(
  '/api/auth/register',
  rateLimit({ windowMs: 60_000 * 5, max: 12, keyPrefix: 'register' }),
  async (req, res, next) => {
    try {
      await ensureSeeded();
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'اطلاعات نامعتبر است.' });
      }

      const email = parsed.data.email.trim().toLowerCase();
      const phone = parsed.data.phone ? normalizeDigits(parsed.data.phone) : '';
      if (phone && !validateIranianPhone(phone)) {
        return res.status(400).json({ error: 'شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.' });
      }

      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'حساب کاربری با این ایمیل قبلاً ثبت شده است.' });
      }

      const [created] = await db
        .insert(users)
        .values({
          uid: `local_${crypto.randomUUID()}`,
          email,
          passwordHash: hashPassword(parsed.data.password),
          fullName: sanitizeString(parsed.data.fullName),
          phone,
          role: 'customer',
        })
        .returning({
          id: users.id,
          uid: users.uid,
          email: users.email,
          fullName: users.fullName,
          phone: users.phone,
          address: users.address,
          postalCode: users.postalCode,
          role: users.role,
        });

      setSessionCookie(res, created);
      res.status(201).json({ user: created });
    } catch (err) {
      next(err);
    }
  }
);

const loginSchema = z.object({
  email: z.string().email('ایمیل معتبر نیست').max(120),
  password: z.string().min(1, 'رمز عبور الزامی است').max(100),
});

app.post(
  '/api/auth/login',
  rateLimit({ windowMs: 60_000 * 5, max: 20, keyPrefix: 'login-ip' }),
  async (req, res, next) => {
    try {
      await ensureSeeded();
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'اطلاعات ورود نامعتبر است.' });
      }

      const email = parsed.data.email.trim().toLowerCase();
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const emailThrottle = await consumeRateLimit(`login-acct:${email}:${ip}`, 15 * 60_000, 8);
      if (!emailThrottle.allowed) {
        return res.status(429).json({
          error: 'تلاش‌های ناموفق بیش از حد مجاز بوده است. لطفاً ۱۵ دقیقه دیگر دوباره امتحان کنید.',
        });
      }

      const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (found.length === 0 || !found[0].passwordHash) {
        return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است.' });
      }

      const userRow = found[0];
      if (!userRow.passwordHash || !verifyPassword(parsed.data.password, userRow.passwordHash)) {
        return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است.' });
      }

      const safeUser = {
        id: userRow.id,
        uid: userRow.uid,
        email: userRow.email,
        fullName: userRow.fullName,
        phone: userRow.phone,
        address: userRow.address,
        postalCode: userRow.postalCode,
        role: userRow.role,
      };

      setSessionCookie(res, safeUser);
      res.json({ user: safeUser });
    } catch (err) {
      next(err);
    }
  }
);

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

const profileSchema = z.object({
  fullName: z.string().min(2).max(80),
  phone: z.string().max(20).optional().default(''),
  address: z.string().max(300).optional().default(''),
  postalCode: z.string().max(15).optional().default(''),
});

app.put('/api/auth/profile', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'اطلاعات پروفایل نامعتبر است.' });
    }

    const phone = parsed.data.phone ? normalizeDigits(parsed.data.phone) : '';
    const postalCode = parsed.data.postalCode ? normalizeDigits(parsed.data.postalCode) : '';

    if (phone && !validateIranianPhone(phone)) {
      return res.status(400).json({ error: 'شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹).' });
    }
    if (postalCode && !validateIranianPostalCode(postalCode)) {
      return res.status(400).json({ error: 'کد پستی باید دقیقاً ۱۰ رقم باشد.' });
    }

    const [updated] = await db
      .update(users)
      .set({
        fullName: sanitizeString(parsed.data.fullName),
        phone,
        address: sanitizeString(parsed.data.address),
        postalCode,
      })
      .where(eq(users.id, req.user!.id))
      .returning({
        id: users.id,
        uid: users.uid,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        address: users.address,
        postalCode: users.postalCode,
        role: users.role,
      });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

// ---------- Checkout & Order Tracking ----------

const createOrderSchema = z.object({
  customerName: z.string().min(2, 'نام خریدار الزامی است').max(80),
  customerPhone: z.string().min(10).max(20),
  customerAddress: z.string().min(8, 'آدرس کامل پستی الزامی است').max(400),
  postalCode: z.string().min(10).max(15),
  shippingMethod: z.enum(['standard', 'express']),
  discountCode: z.string().max(40).optional().nullable(),
  notes: z.string().max(300).optional().default(''),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        selectedSize: z.string().min(1).max(20),
        selectedColor: z.string().min(1).max(40),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1, 'سبد خرید خالی است')
    .max(30),
});

app.post(
  '/api/orders',
  rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'create-order' }),
  optionalAuth,
  async (req: AuthRequest, res, next) => {
    try {
      await ensureSeeded();
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'اطلاعات سفارش ناقص است.' });
      }

      const phone = normalizeDigits(parsed.data.customerPhone);
      const postalCode = normalizeDigits(parsed.data.postalCode);

      if (!validateIranianPhone(phone)) {
        return res.status(400).json({ error: 'شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹).' });
      }
      if (!validateIranianPostalCode(postalCode)) {
        return res.status(400).json({ error: 'کد پستی باید دقیقاً ۱۰ رقم باشد.' });
      }

      const result = await db.transaction(async (tx) => {
        const settingsList = await tx.select().from(storeSettings).limit(1);
        const settings = settingsList[0];

        // Deterministic product ID ordering prevents deadlocks while FOR UPDATE prevents concurrent overselling
        const productIds = [...new Set(parsed.data.items.map((i) => i.productId))].sort((a, b) => a - b);
        const lockedProducts = await tx
          .select()
          .from(products)
          .where(inArray(products.id, productIds))
          .orderBy(asc(products.id))
          .for('update');

        const productMap = new Map(lockedProducts.map((p) => [p.id, { ...p }]));
        const updatedInventories = new Map<
          number,
          { sizeInventory: { size: string; stock: number }[]; totalStock: number }
        >();

        for (const item of parsed.data.items) {
          const prod = productMap.get(item.productId);
          if (!prod || !prod.isActive) {
            throw Object.assign(new Error('یکی از محصولات سبد خرید دیگر موجود نیست.'), { statusCode: 400 });
          }

          const cleanSize = sanitizeString(item.selectedSize);
          const hasColor = prod.colors.some((c) => c.name === sanitizeString(item.selectedColor));
          if (!hasColor && prod.colors.length > 0) {
            throw Object.assign(new Error(`رنگ انتخاب‌شده برای «${prod.name}» معتبر نیست.`), { statusCode: 400 });
          }

          const currentState = updatedInventories.get(prod.id) ?? {
            sizeInventory:
              prod.sizeInventory && prod.sizeInventory.length > 0
                ? prod.sizeInventory
                : prod.sizes.map((s) => ({ size: s, stock: prod.stock })),
            totalStock: prod.stock,
          };

          try {
            const decremented = decrementSizeInventory(currentState.sizeInventory, cleanSize, item.quantity);
            updatedInventories.set(prod.id, {
              sizeInventory: decremented.nextSizeInventory,
              totalStock: decremented.nextTotalStock,
            });
          } catch (stockErr: any) {
            throw Object.assign(new Error(stockErr?.message || `موجودی کفش «${prod.name}» کافی نیست.`), {
              statusCode: 400,
            });
          }
        }

        const lineItems = parsed.data.items.map((item) => {
          const prod = productMap.get(item.productId)!;
          return {
            productId: prod.id,
            productName: prod.name,
            productImage: prod.images[0] || '/src/assets/images/shoe_mens_sneaker_cream_1794597375882.jpg',
            selectedSize: sanitizeString(item.selectedSize),
            selectedColor: sanitizeString(item.selectedColor),
            quantity: item.quantity,
            price: prod.price,
            discountPrice: prod.discountPrice,
            unitPrice: getEffectivePrice(prod.price, prod.discountPrice),
          };
        });

        let appliedDiscountCode: string | null = null;
        let discountPercent = 0;
        let discountMinOrder = 0;

        if (parsed.data.discountCode && parsed.data.discountCode.trim()) {
          const cleanCode = sanitizeString(parsed.data.discountCode).toUpperCase();
          const couponRows = await tx
            .select()
            .from(discounts)
            .where(and(eq(discounts.code, cleanCode), eq(discounts.isActive, true)))
            .limit(1);

          if (couponRows.length === 0) {
            throw Object.assign(new Error('کد تخفیف وارد شده معتبر نیست.'), { statusCode: 400 });
          }

          appliedDiscountCode = couponRows[0].code;
          discountPercent = couponRows[0].percent;
          discountMinOrder = couponRows[0].minOrderAmount;
        }

        const totals = calculateOrderTotals({
          items: lineItems,
          shippingMethod: parsed.data.shippingMethod,
          standardShippingCost: settings?.shippingBaseCost ?? 85000,
          expressShippingCost: settings?.expressShippingCost ?? 165000,
          freeShippingThreshold: settings?.freeShippingThreshold ?? 4500000,
          discountPercent,
          discountMinOrder,
        });

        if (appliedDiscountCode && totals.discountAmount === 0 && totals.subtotal < discountMinOrder) {
          throw Object.assign(new Error('مبلغ سبد خرید به حداقل مجاز کد تخفیف نمی‌رسد.'), { statusCode: 400 });
        }

        // Persist updated per-size inventories and aggregate stock atomically inside transaction
        for (const [pid, inv] of updatedInventories.entries()) {
          await tx
            .update(products)
            .set({
              sizeInventory: inv.sizeInventory,
              sizes: inv.sizeInventory.map((s) => s.size),
              stock: inv.totalStock,
            })
            .where(eq(products.id, pid));
        }

        const orderNumber = `VERA-${crypto.randomInt(100000, 999999)}`;

        const [createdOrder] = await tx
          .insert(orders)
          .values({
            orderNumber,
            userId: req.user?.id ?? null,
            customerName: sanitizeString(parsed.data.customerName),
            customerPhone: phone,
            customerAddress: sanitizeString(parsed.data.customerAddress),
            postalCode,
            shippingMethod: parsed.data.shippingMethod,
            shippingCost: totals.shippingCost,
            subtotal: totals.subtotal,
            discountCode: appliedDiscountCode,
            discountAmount: totals.discountAmount,
            totalAmount: totals.totalAmount,
            paymentMode: 'demo',
            paymentStatus: 'demo_simulated',
            orderStatus: 'pending',
            notes: sanitizeString(parsed.data.notes || ''),
          })
          .returning();

        const insertedItems = await tx
          .insert(orderItems)
          .values(
            lineItems.map((li) => ({
              orderId: createdOrder.id,
              productId: li.productId,
              productName: li.productName,
              productImage: li.productImage,
              selectedSize: li.selectedSize,
              selectedColor: li.selectedColor,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
            }))
          )
          .returning();

        return { order: createdOrder, items: insertedItems };
      });

      res.status(201).json({
        order: result.order,
        items: result.items,
        isDemoPayment: true,
        notice: 'سفارش شما با پرداخت آزمایشی (شبیه‌سازی شده) ثبت شد. هیچ تراکنش بانکی واقعی انجام نشده است.',
      });
    } catch (err: any) {
      if (err?.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      next(err);
    }
  }
);

app.get('/api/orders/my', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const myOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, req.user!.id))
      .orderBy(desc(orders.createdAt));

    const orderIds = myOrders.map((o) => o.id);
    const items = orderIds.length
      ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
      : [];

    const itemsByOrder = new Map<number, typeof items>();
    for (const item of items) {
      const arr = itemsByOrder.get(item.orderId) ?? [];
      arr.push(item);
      itemsByOrder.set(item.orderId, arr);
    }

    res.json({
      orders: myOrders.map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] })),
    });
  } catch (err) {
    next(err);
  }
});

const trackOrderSchema = z.object({
  orderNumber: z.string().min(4).max(30),
  phone: z.string().min(10).max(20),
});

app.post(
  '/api/orders/track',
  rateLimit({ windowMs: 60_000, max: 15, keyPrefix: 'track-order' }),
  async (req, res, next) => {
    try {
      await ensureSeeded();
      const parsed = trackOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'کد پیگیری و شماره موبایل معتبر وارد کنید.' });
      }

      const orderNumber = sanitizeString(parsed.data.orderNumber).toUpperCase();
      const phone = normalizeDigits(parsed.data.phone);

      const found = await db
        .select()
        .from(orders)
        .where(and(eq(orders.orderNumber, orderNumber), eq(orders.customerPhone, phone)))
        .limit(1);

      if (found.length === 0) {
        return res.status(404).json({ error: 'سفارشی با این کد پیگیری و شماره موبایل یافت نشد.' });
      }

      const order = found[0];
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      res.json({ order: { ...order, items } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------- Admin RBAC Routes ----------

app.get('/api/admin/overview', requireAdmin, async (_req, res, next) => {
  try {
    await ensureSeeded();
    const [
      allProducts,
      allCategories,
      allBrands,
      allOrders,
      allOrderItems,
      allDiscounts,
      allBanners,
      allReviews,
      settingsList,
      userCount,
    ] = await Promise.all([
      db.select().from(products).orderBy(desc(products.id)),
      db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
      db.select().from(brands).orderBy(asc(brands.sortOrder), asc(brands.id)),
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      db.select().from(orderItems),
      db.select().from(discounts).orderBy(desc(discounts.id)),
      db.select().from(banners).orderBy(asc(banners.sortOrder), asc(banners.id)),
      db.select().from(reviews).orderBy(desc(reviews.createdAt)),
      db.select().from(storeSettings).limit(1),
      db.select({ total: sql<number>`count(*)::int` }).from(users),
    ]);

    const itemsMap = new Map<number, typeof allOrderItems>();
    for (const item of allOrderItems) {
      const list = itemsMap.get(item.orderId) ?? [];
      list.push(item);
      itemsMap.set(item.orderId, list);
    }

    const totalRevenue = allOrders
      .filter((o) => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const newOrdersCount = allOrders.filter((o) => o.orderStatus === 'pending').length;
    const lowStockCount = allProducts.filter((p) => p.stock <= 5).length;

    const prodNameMap = new Map(allProducts.map((p) => [p.id, p.name]));

    res.json({
      stats: {
        totalOrders: allOrders.length,
        newOrdersCount,
        totalRevenue,
        lowStockCount,
        totalCustomers: userCount[0]?.total ?? 0,
      },
      products: allProducts,
      categories: allCategories,
      brands: allBrands,
      orders: allOrders.map((o) => ({ ...o, items: itemsMap.get(o.id) ?? [] })),
      discounts: allDiscounts,
      banners: allBanners,
      reviews: allReviews.map((r) => ({
        ...r,
        productName: r.productId ? prodNameMap.get(r.productId) : undefined,
      })),
      settings: settingsList[0] ?? null,
    });
  } catch (err) {
    next(err);
  }
});

const productUpsertSchema = z.object({
  categoryId: z.number().int().positive().nullable(),
  name: z.string().min(2).max(140),
  slug: z.string().min(2).max(140),
  sku: z.string().min(2).max(40),
  brand: z.string().min(1).max(80),
  model: z.string().max(100).optional().default(''),
  upperMaterial: z.string().max(160).optional().default(''),
  soleMaterial: z.string().max(160).optional().default(''),
  features: z.array(z.string().min(1).max(120)).optional().default([]),
  description: z.string().min(5).max(2500),
  fabricCare: z.string().max(500).optional().default(''),
  price: z.number().int().positive(),
  discountPrice: z.number().int().positive().nullable(),
  sizeInventory: z
    .array(
      z.object({
        size: z.string().min(1).max(20),
        stock: z.number().int().nonnegative(),
      })
    )
    .min(1, 'حداقل یک سایز کفش وارد کنید'),
  colors: z.array(z.object({ name: z.string().min(1).max(40), hex: z.string().min(4).max(15) })).min(1),
  images: z.array(z.string().min(3).max(500)).min(1),
  isNew: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

app.post('/api/admin/products', requireAdmin, async (req, res, next) => {
  try {
    const parsed = productUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'مشخصات محصول نامعتبر است.' });
    }
    const d = parsed.data;
    const cleanSizeInventory = d.sizeInventory.map((s) => ({
      size: sanitizeString(s.size),
      stock: Math.max(0, Math.floor(s.stock)),
    }));
    const computedTotalStock = getTotalStockFromSizes(cleanSizeInventory);

    const [created] = await db
      .insert(products)
      .values({
        categoryId: d.categoryId,
        name: sanitizeString(d.name),
        slug: sanitizeString(d.slug).toLowerCase().replace(/\s+/g, '-'),
        sku: sanitizeString(d.sku),
        brand: sanitizeString(d.brand),
        model: sanitizeString(d.model),
        upperMaterial: sanitizeString(d.upperMaterial),
        soleMaterial: sanitizeString(d.soleMaterial),
        features: d.features.map(sanitizeString).filter(Boolean),
        description: sanitizeString(d.description),
        fabricCare: sanitizeString(d.fabricCare),
        price: d.price,
        discountPrice: d.discountPrice && d.discountPrice < d.price ? d.discountPrice : null,
        stock: computedTotalStock,
        sizes: cleanSizeInventory.map((s) => s.size),
        sizeInventory: cleanSizeInventory,
        colors: d.colors.map((c) => ({ name: sanitizeString(c.name), hex: sanitizeString(c.hex) })),
        images: d.images.map((img) => img.trim()),
        isNew: d.isNew,
        isBestseller: d.isBestseller,
        isFeatured: d.isFeatured,
        isActive: d.isActive,
      })
      .returning();

    res.status(201).json({ product: created });
  } catch (err) {
    next(err);
  }
});

app.put('/api/admin/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'شناسه محصول نامعتبر است.' });
    }
    const parsed = productUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'مشخصات محصول نامعتبر است.' });
    }
    const d = parsed.data;
    const cleanSizeInventory = d.sizeInventory.map((s) => ({
      size: sanitizeString(s.size),
      stock: Math.max(0, Math.floor(s.stock)),
    }));
    const computedTotalStock = getTotalStockFromSizes(cleanSizeInventory);

    const [updated] = await db
      .update(products)
      .set({
        categoryId: d.categoryId,
        name: sanitizeString(d.name),
        slug: sanitizeString(d.slug).toLowerCase().replace(/\s+/g, '-'),
        sku: sanitizeString(d.sku),
        brand: sanitizeString(d.brand),
        model: sanitizeString(d.model),
        upperMaterial: sanitizeString(d.upperMaterial),
        soleMaterial: sanitizeString(d.soleMaterial),
        features: d.features.map(sanitizeString).filter(Boolean),
        description: sanitizeString(d.description),
        fabricCare: sanitizeString(d.fabricCare),
        price: d.price,
        discountPrice: d.discountPrice && d.discountPrice < d.price ? d.discountPrice : null,
        stock: computedTotalStock,
        sizes: cleanSizeInventory.map((s) => s.size),
        sizeInventory: cleanSizeInventory,
        colors: d.colors.map((c) => ({ name: sanitizeString(c.name), hex: sanitizeString(c.hex) })),
        images: d.images.map((img) => img.trim()),
        isNew: d.isNew,
        isBestseller: d.isBestseller,
        isFeatured: d.isFeatured,
        isActive: d.isActive,
      })
      .where(eq(products.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'محصول یافت نشد.' });
    res.json({ product: updated });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'شناسه محصول نامعتبر است.' });
    }
    await db.delete(products).where(eq(products.id, id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const categorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80),
  description: z.string().max(300).optional().default(''),
  imageUrl: z.string().min(3).max(500),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

app.post('/api/admin/categories', requireAdmin, async (req, res, next) => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'مشخصات دسته‌بندی نامعتبر است.' });
    }
    const d = parsed.data;
    const [created] = await db
      .insert(categories)
      .values({
        name: sanitizeString(d.name),
        slug: sanitizeString(d.slug).toLowerCase().replace(/\s+/g, '-'),
        description: sanitizeString(d.description),
        imageUrl: d.imageUrl.trim(),
        sortOrder: d.sortOrder,
        isActive: d.isActive,
      })
      .returning();
    res.status(201).json({ category: created });
  } catch (err) {
    next(err);
  }
});

app.put('/api/admin/categories/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed = categorySchema.safeParse(req.body);
    if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
      return res.status(400).json({ error: 'مشخصات دسته‌بندی نامعتبر است.' });
    }
    const d = parsed.data;
    const [updated] = await db
      .update(categories)
      .set({
        name: sanitizeString(d.name),
        slug: sanitizeString(d.slug).toLowerCase().replace(/\s+/g, '-'),
        description: sanitizeString(d.description),
        imageUrl: d.imageUrl.trim(),
        sortOrder: d.sortOrder,
        isActive: d.isActive,
      })
      .where(eq(categories.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'دسته‌بندی یافت نشد.' });
    res.json({ category: updated });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'شناسه نامعتبر است.' });
    await db.delete(categories).where(eq(categories.id, id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const brandSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80),
  country: z.string().max(60).optional().default(''),
  logoUrl: z.string().max(500).optional().default(''),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

app.post('/api/admin/brands', requireAdmin, async (req, res, next) => {
  try {
    const parsed = brandSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'مشخصات برند نامعتبر است.' });
    }
    const d = parsed.data;
    const [created] = await db
      .insert(brands)
      .values({
        name: sanitizeString(d.name),
        slug: sanitizeString(d.slug).toLowerCase().replace(/\s+/g, '-'),
        country: sanitizeString(d.country),
        logoUrl: d.logoUrl.trim(),
        sortOrder: d.sortOrder,
        isActive: d.isActive,
      })
      .returning();
    res.status(201).json({ brand: created });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/admin/brands/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'شناسه نامعتبر است.' });
    await db.delete(brands).where(eq(brands.id, id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.patch('/api/admin/reviews/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const isApproved = Boolean(req.body?.isApproved);
    const [updated] = await db
      .update(reviews)
      .set({ isApproved })
      .where(eq(reviews.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'دیدگاه یافت نشد.' });
    res.json({ review: updated });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await db.delete(reviews).where(eq(reviews.id, id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const orderStatusSchema = z.object({
  orderStatus: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
});

app.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed = orderStatusSchema.safeParse(req.body);
    if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
      return res.status(400).json({ error: 'وضعیت سفارش نامعتبر است.' });
    }
    const [updated] = await db
      .update(orders)
      .set({ orderStatus: parsed.data.orderStatus })
      .where(eq(orders.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'سفارش یافت نشد.' });
    res.json({ order: updated });
  } catch (err) {
    next(err);
  }
});

const discountCreateSchema = z.object({
  code: z.string().min(2).max(30),
  title: z.string().min(2).max(120),
  percent: z.number().int().min(1).max(90),
  minOrderAmount: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

app.post('/api/admin/discounts', requireAdmin, async (req, res, next) => {
  try {
    const parsed = discountCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'اطلاعات کد تخفیف نامعتبر است.' });
    }
    const d = parsed.data;
    const [created] = await db
      .insert(discounts)
      .values({
        code: sanitizeString(d.code).toUpperCase(),
        title: sanitizeString(d.title),
        percent: d.percent,
        minOrderAmount: d.minOrderAmount,
        isActive: d.isActive,
      })
      .returning();
    res.status(201).json({ discount: created });
  } catch (err) {
    next(err);
  }
});

app.patch('/api/admin/discounts/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const isActive = Boolean(req.body?.isActive);
    const [updated] = await db
      .update(discounts)
      .set({ isActive })
      .where(eq(discounts.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'کد تخفیف یافت نشد.' });
    res.json({ discount: updated });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/admin/discounts/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await db.delete(discounts).where(eq(discounts.id, id));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const bannerSchema = z.object({
  title: z.string().min(2).max(140),
  subtitle: z.string().min(2).max(300),
  ctaText: z.string().min(2).max(60),
  ctaLink: z.string().min(1).max(200),
  imageUrl: z.string().min(3).max(500),
  position: z.enum(['hero', 'promo']),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

app.post('/api/admin/banners', requireAdmin, async (req, res, next) => {
  try {
    const parsed = bannerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'اطلاعات بنر نامعتبر است.' });
    }
    const d = parsed.data;
    const [created] = await db
      .insert(banners)
      .values({
        title: sanitizeString(d.title),
        subtitle: sanitizeString(d.subtitle),
        ctaText: sanitizeString(d.ctaText),
        ctaLink: d.ctaLink.trim(),
        imageUrl: d.imageUrl.trim(),
        position: d.position,
        isActive: d.isActive,
        sortOrder: d.sortOrder,
      })
      .returning();
    res.status(201).json({ banner: created });
  } catch (err) {
    next(err);
  }
});

app.put('/api/admin/banners/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed = bannerSchema.safeParse(req.body);
    if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
      return res.status(400).json({ error: 'اطلاعات بنر نامعتبر است.' });
    }
    const d = parsed.data;
    const [updated] = await db
      .update(banners)
      .set({
        title: sanitizeString(d.title),
        subtitle: sanitizeString(d.subtitle),
        ctaText: sanitizeString(d.ctaText),
        ctaLink: d.ctaLink.trim(),
        imageUrl: d.imageUrl.trim(),
        position: d.position,
        isActive: d.isActive,
        sortOrder: d.sortOrder,
      })
      .where(eq(banners.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'بنر یافت نشد.' });
    res.json({ banner: updated });
  } catch (err) {
    next(err);
  }
});

const settingsUpdateSchema = z.object({
  storeName: z.string().min(2).max(80),
  storeSubtitle: z.string().min(2).max(120),
  logoText: z.string().min(1).max(30),
  logoUrl: z.string().max(500).optional().default(''),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  phone: z.string().min(3).max(40),
  email: z.string().email().max(120),
  instagram: z.string().max(80),
  telegram: z.string().max(80),
  whatsapp: z.string().max(40),
  address: z.string().min(5).max(300),
  shippingBaseCost: z.number().int().nonnegative(),
  expressShippingCost: z.number().int().nonnegative(),
  freeShippingThreshold: z.number().int().nonnegative(),
  aboutText: z.string().min(10).max(1200),
  shippingPolicy: z.string().min(5).max(800),
  returnPolicy: z.string().min(5).max(800),
  announcementText: z.string().max(240),
});

app.put('/api/admin/settings', requireAdmin, async (req, res, next) => {
  try {
    const parsed = settingsUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'تنظیمات فروشگاه نامعتبر است.' });
    }
    const d = parsed.data;
    const existing = await db.select({ id: storeSettings.id }).from(storeSettings).limit(1);
    const values = {
      storeName: sanitizeString(d.storeName),
      storeSubtitle: sanitizeString(d.storeSubtitle),
      logoText: sanitizeString(d.logoText),
      logoUrl: d.logoUrl.trim(),
      primaryColor: d.primaryColor,
      accentColor: d.accentColor,
      backgroundColor: d.backgroundColor,
      phone: sanitizeString(d.phone),
      email: d.email.trim(),
      instagram: sanitizeString(d.instagram),
      telegram: sanitizeString(d.telegram),
      whatsapp: sanitizeString(d.whatsapp),
      address: sanitizeString(d.address),
      shippingBaseCost: d.shippingBaseCost,
      expressShippingCost: d.expressShippingCost,
      freeShippingThreshold: d.freeShippingThreshold,
      aboutText: sanitizeString(d.aboutText),
      shippingPolicy: sanitizeString(d.shippingPolicy),
      returnPolicy: sanitizeString(d.returnPolicy),
      announcementText: sanitizeString(d.announcementText),
      updatedAt: new Date(),
    };

    let updated;
    if (existing.length > 0) {
      [updated] = await db
        .update(storeSettings)
        .set(values)
        .where(eq(storeSettings.id, existing[0].id))
        .returning();
    } else {
      [updated] = await db.insert(storeSettings).values(values).returning();
    }
    res.json({ settings: updated });
  } catch (err) {
    next(err);
  }
});

// Sanitized error handler (never leaks SQL/stack details to client)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled API error:', err);
  if (err?.code === '23505') {
    return res.status(409).json({ error: 'مقدار وارد شده تکراری است (مانند شناسه محصول، اسلاگ یا ایمیل).' });
  }
  res.status(500).json({ error: 'خطای داخلی سرور رخ داد. لطفاً دوباره تلاش کنید.' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VERA BOUTIQUE server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
