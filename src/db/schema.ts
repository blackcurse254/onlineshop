import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export interface ProductColorOption {
  name: string;
  hex: string;
}

export interface ProductSizeStock {
  size: string;
  stock: number;
}

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull().default(''),
  address: text('address').notNull().default(''),
  postalCode: text('postal_code').notNull().default(''),
  role: text('role').notNull().default('customer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  storeName: text('store_name').notNull().default('ADONIS'),
  storeSubtitle: text('store_subtitle').notNull().default('فروشگاه تخصصی کفش و کتونی'),
  logoText: text('logo_text').notNull().default('ADONIS'),
  logoUrl: text('logo_url').notNull().default(''),
  primaryColor: text('primary_color').notNull().default('#16141A'),
  accentColor: text('accent_color').notNull().default('#C21E3C'),
  backgroundColor: text('background_color').notNull().default('#EFEEEA'),
  phone: text('phone').notNull().default(''),
  email: text('email').notNull().default(''),
  instagram: text('instagram').notNull().default(''),
  telegram: text('telegram').notNull().default(''),
  whatsapp: text('whatsapp').notNull().default(''),
  address: text('address').notNull().default(''),
  shippingBaseCost: integer('shipping_base_cost').notNull().default(85000),
  expressShippingCost: integer('express_shipping_cost').notNull().default(165000),
  freeShippingThreshold: integer('free_shipping_threshold').notNull().default(4500000),
  aboutText: text('about_text')
    .notNull()
    .default(
      'فروشگاه تخصصی کفش و کتونی ADONIS با تمرکز بر ارگونومی پا، متریال چرم طبیعی و زیره‌های استاندارد، مجموعه‌ای منتخب از کتونی‌های روزمره، ورزشی و کفش‌های رسمی را عرضه می‌کند.'
    ),
  shippingPolicy: text('shipping_policy')
    .notNull()
    .default(
      'سفارش‌های تهران طی ۱ تا ۲ روز کاری و سفارش‌های سراسر کشور طی ۲ تا ۴ روز کاری با بسته‌بندی ایمن و جعبه اصلی ارسال می‌شوند.'
    ),
  returnPolicy: text('return_policy')
    .notNull()
    .default('امکان تعویض سایز کفش یا مرجوعی تا ۷ روز پس از تحویل در صورت استفاده نشدن در فضای باز فراهم است.'),
  announcementText: text('announcement_text')
    .notNull()
    .default('ارسال رایگان کفش برای خریدهای بالای ۴,۵۰۰,۰۰۰ تومان · کد تخفیف فصل: ADONIS15'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  country: text('country').notNull().default(''),
  logoUrl: text('logo_url').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  imageUrl: text('image_url').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  sku: text('sku').notNull(),
  brand: text('brand').notNull().default('ADONIS Studio'),
  model: text('model').notNull().default(''),
  upperMaterial: text('upper_material').notNull().default(''),
  soleMaterial: text('sole_material').notNull().default(''),
  features: jsonb('features').$type<string[]>().notNull().default([]),
  description: text('description').notNull(),
  fabricCare: text('fabric_care').notNull().default(''),
  price: integer('price').notNull(),
  discountPrice: integer('discount_price'),
  stock: integer('stock').notNull().default(0),
  sizes: jsonb('sizes').$type<string[]>().notNull(),
  sizeInventory: jsonb('size_inventory').$type<ProductSizeStock[]>().notNull().default([]),
  colors: jsonb('colors').$type<ProductColorOption[]>().notNull(),
  images: jsonb('images').$type<string[]>().notNull(),
  isNew: boolean('is_new').notNull().default(false),
  isBestseller: boolean('is_bestseller').notNull().default(false),
  isFeatured: boolean('is_featured').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const banners = pgTable('banners', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  ctaText: text('cta_text').notNull(),
  ctaLink: text('cta_link').notNull(),
  imageUrl: text('image_url').notNull(),
  position: text('position').notNull().default('hero'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const discounts = pgTable('discounts', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  percent: integer('percent').notNull(),
  minOrderAmount: integer('min_order_amount').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  idempotencyKey: text('idempotency_key'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerAddress: text('customer_address').notNull(),
  postalCode: text('postal_code').notNull(),
  shippingMethod: text('shipping_method').notNull().default('standard'),
  shippingCost: integer('shipping_cost').notNull().default(0),
  subtotal: integer('subtotal').notNull(),
  discountCode: text('discount_code'),
  discountAmount: integer('discount_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull(),
  paymentMode: text('payment_mode').notNull().default('demo'),
  paymentStatus: text('payment_status').notNull().default('demo_pending'),
  orderStatus: text('order_status').notNull().default('pending'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: text('product_name').notNull(),
  productImage: text('product_image').notNull(),
  selectedSize: text('selected_size').notNull(),
  selectedColor: text('selected_color').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  authorName: text('author_name').notNull(),
  rating: integer('rating').notNull().default(5),
  comment: text('comment').notNull(),
  verifiedPurchase: boolean('verified_purchase').notNull().default(true),
  isApproved: boolean('is_approved').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const wishlists = pgTable('wishlists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  hits: integer('hits').notNull().default(1),
  resetAt: timestamp('reset_at').notNull(),
});

export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export interface StoreSettingsSnapshotData {
  storeName: string;
  storeSubtitle: string;
  logoText: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  phone: string;
  email: string;
  instagram: string;
  telegram: string;
  whatsapp: string;
  address: string;
  shippingBaseCost: number;
  expressShippingCost: number;
  freeShippingThreshold: number;
  aboutText: string;
  shippingPolicy: string;
  returnPolicy: string;
  announcementText: string;
}

export const storeSettingsSnapshots = pgTable('store_settings_snapshots', {
  id: serial('id').primaryKey(),
  migrationKey: text('migration_key').notNull().unique(),
  settingsId: integer('settings_id').notNull(),
  previousSnapshot: jsonb('previous_snapshot').$type<StoreSettingsSnapshotData>().notNull(),
  appliedSnapshot: jsonb('applied_snapshot').$type<StoreSettingsSnapshotData>().notNull(),
  status: text('status').notNull().default('applied'),
  notes: text('notes').notNull().default(''),
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
  rolledBackAt: timestamp('rolled_back_at'),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  reviews: many(reviews),
}));

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  wishlists: many(wishlists),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));
