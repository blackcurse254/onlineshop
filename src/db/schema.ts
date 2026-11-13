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
  storeName: text('store_name').notNull().default('VERA BOUTIQUE'),
  storeSubtitle: text('store_subtitle').notNull().default('خانه مد و پوشاک معاصر'),
  logoText: text('logo_text').notNull().default('VERA'),
  logoUrl: text('logo_url').notNull().default(''),
  primaryColor: text('primary_color').notNull().default('#18181B'),
  accentColor: text('accent_color').notNull().default('#B5945B'),
  backgroundColor: text('background_color').notNull().default('#FAF7F2'),
  phone: text('phone').notNull().default('021-88451290'),
  email: text('email').notNull().default('hello@veraboutique.ir'),
  instagram: text('instagram').notNull().default('@vera.boutique.ir'),
  telegram: text('telegram').notNull().default('@veraboutique_support'),
  whatsapp: text('whatsapp').notNull().default('09120004512'),
  address: text('address').notNull().default('تهران، جردن، بلوار ناهید شرقی، پلاک ۱۸، طبقه اول'),
  shippingBaseCost: integer('shipping_base_cost').notNull().default(85000),
  expressShippingCost: integer('express_shipping_cost').notNull().default(165000),
  freeShippingThreshold: integer('free_shipping_threshold').notNull().default(4500000),
  aboutText: text('about_text')
    .notNull()
    .default(
      'ورا بوتیک با تمرکز بر دوخت دقیق، الیاف طبیعی و برش‌های مدرن، مجموعه‌ای منتخب از پوشاک روزمره و رسمی را برای استایل ماندگار طراحی و عرضه می‌کند.'
    ),
  shippingPolicy: text('shipping_policy')
    .notNull()
    .default(
      'سفارش‌های تهران طی ۱ تا ۲ روز کاری و سفارش‌های سراسر کشور طی ۲ تا ۴ روز کاری با بسته‌بندی اختصاصی ارسال می‌شوند.'
    ),
  returnPolicy: text('return_policy')
    .notNull()
    .default('امکان تعویض سایز یا مرجوعی کالا تا ۷ روز پس از تحویل در صورت حفظ تگ و سلامت محصول فراهم است.'),
  announcementText: text('announcement_text')
    .notNull()
    .default('ارسال رایگان برای خریدهای بالای ۴,۵۰۰,۰۰۰ تومان · کد تخفیف پاییزه: VERA15'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
  description: text('description').notNull(),
  fabricCare: text('fabric_care').notNull().default(''),
  price: integer('price').notNull(),
  discountPrice: integer('discount_price'),
  stock: integer('stock').notNull().default(0),
  sizes: jsonb('sizes').$type<string[]>().notNull(),
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

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
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
