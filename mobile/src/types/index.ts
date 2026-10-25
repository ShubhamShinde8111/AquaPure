/**
 * AquaPure — Domain Types
 * Source of truth: PRD.md §7 Data Model Baseline
 */

// ──── User & Roles ────

export type UserRole = 'customer' | 'dealer' | 'admin';
export type DealerStatus = 'pending' | 'approved' | 'rejected';

export interface Address {
  id: string;
  label: string;        // e.g. "Home", "Office"
  fullName: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  role: UserRole;
  dealerStatus?: DealerStatus;
  addresses: Address[];
  fcmToken?: string;
  expoPushToken?: string;
  pushTokens?: string[];
  createdAt: string;
  updatedAt: string;
}

// ──── Product Catalog ────

export type ProductCategory =
  | 'water-purifiers'
  | 'water-dispensers'
  | 'water-pumps'
  | 'filters-cartridges'
  | 'spare-parts-accessories'
  | 'bottles-storage'
  | 'purifiers'
  | 'dispensers'
  | 'pumps'
  | 'filters'
  | 'membranes'
  | 'spare-parts'
  | string;

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category?: string;
  categoryId: ProductCategory;
  description: string;
  price?: number;
  customerPrice: number;
  dealerPrice?: number;
  imageUrl: string;
  gallery?: string[];
  stock?: number;
  specifications: ProductSpecification[];
  stockStatus: 'in_stock' | 'out_of_stock' | 'limited';
  active: boolean;
  imageSearchQuery?: string;
  imageNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: ProductCategory;
  name: string;
  icon: string;
  description: string;
}

export interface CartItem {
  productId: string;
  name: string;
  imageUrl: string;
  price: number; // role-resolved price
  unitPrice: number;
  totalPrice: number;
  quantity: number;
  maxQuantity?: number;
  product: Product;
}

// ──── Orders ────

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'test_success'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'demo';

export type OrderType = 'customer' | 'dealer';

export interface OrderItem {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber?: string;
  customerId?: string;
  customerEmail?: string;
  dealerId?: string;
  dealerEmail?: string;
  deliveredAt?: string;
  orderType: OrderType;
  items: OrderItem[];
  subtotal: number;
  total: number;
  shippingAddress: Address;
  paymentProvider: string;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  courierName?: string;
  estimatedDelivery?: string;
  expoPushToken?: string;
  pushNotificationsSent?: Partial<Record<OrderStatus, string>>;
  createdAt: string;
  updatedAt: string;
}

// ──── Service Bookings ────

export type ServiceType =
  | 'installation'
  | 'maintenance'
  | 'repair'
  | 'filter_replacement'
  | 'general_inquiry';

export type ServiceStatus =
  | 'requested'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ServiceBooking {
  id: string;
  userId: string;
  serviceType: ServiceType;
  address: Address;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
}

// ──── Notifications ────

export type NotificationType =
  | 'order_update'
  | 'service_update'
  | 'dealer_approval'
  | 'promotion';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityId?: string;
  readAt?: string;
  createdAt: string;
}
