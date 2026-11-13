export interface ProductColorOption {
  name: string;
  hex: string;
}

export interface ProductSizeStock {
  size: string;
  stock: number;
}

export interface StoreSettings {
  id: number;
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

export interface Brand {
  id: number;
  name: string;
  slug: string;
  country: string;
  logoUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Product {
  id: number;
  categoryId: number | null;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  model: string;
  upperMaterial: string;
  soleMaterial: string;
  features: string[];
  description: string;
  fabricCare: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  sizes: string[];
  sizeInventory: ProductSizeStock[];
  colors: ProductColorOption[];
  images: string[];
  isNew: boolean;
  isBestseller: boolean;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
  position: 'hero' | 'promo';
  isActive: boolean;
  sortOrder: number;
}

export interface Discount {
  id: number;
  code: string;
  title: string;
  percent: number;
  minOrderAmount: number;
  isActive: boolean;
}

export interface Review {
  id: number;
  productId: number | null;
  authorName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
  productName?: string;
  productSlug?: string;
}

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  postalCode: string;
  role: 'customer' | 'admin' | string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number | null;
  productName: string;
  productImage: string;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  postalCode: string;
  shippingMethod: 'standard' | 'express' | string;
  shippingCost: number;
  subtotal: number;
  discountCode: string | null;
  discountAmount: number;
  totalAmount: number;
  paymentMode: string;
  paymentStatus: string;
  orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | string;
  notes: string;
  createdAt: string;
  items?: OrderItem[];
}

export interface CartItem {
  key: string;
  productId: number;
  slug: string;
  name: string;
  image: string;
  price: number;
  discountPrice: number | null;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  maxStock: number;
}
