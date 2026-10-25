/**
 * AquaPure — Order Formatting and Status Utilities
 */

import { Order, OrderStatus } from '@/types';

export const ORDER_STAGES = [
  { key: 'placed', label: 'Placed', stepNumber: 1, icon: 'receipt-outline' },
  { key: 'confirmed', label: 'Confirmed', stepNumber: 2, icon: 'checkmark-circle-outline' },
  { key: 'shipped', label: 'Shipped', stepNumber: 3, icon: 'paper-plane-outline' },
  { key: 'delivered', label: 'Delivered', stepNumber: 4, icon: 'home-outline' },
] as const;

/**
 * Returns a clean, customer-facing order number (e.g. #ORD-892144 or #ORD-7A3F9B2C)
 * while preserving the raw Firestore document ID for database queries and navigation.
 */
export function getCustomerFacingOrderNumber(orderId: string, orderNumber?: string): string {
  if (orderNumber && orderNumber.trim().length > 0) {
    const clean = orderNumber.trim().replace(/^#/, '');
    return `#${clean}`;
  }

  if (!orderId) {
    return '#ORD-PENDING';
  }

  const trimmed = orderId.trim();

  // If already formatted like ORD-XXXXXX
  if (trimmed.toUpperCase().startsWith('ORD-')) {
    return `#${trimmed.toUpperCase()}`;
  }

  // If raw Firestore ID (typically 20 chars alphanumeric like 'kX29fn38Fjals93K')
  // We take the first 8 characters in uppercase to form a clean customer-facing order number
  const prefix = trimmed.slice(0, 8).toUpperCase();
  return `#ORD-${prefix}`;
}

/**
 * Format currency in Indian Rupees without trailing decimals
 */
export function formatPrice(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats ISO date string into human-friendly format
 */
export function formatOrderDate(dateString: string, includeTime = false): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    if (includeTime) {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }

    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Maps orderStatus to integer step index (0 to 3) for progress bar
 */
export function getStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'placed':
      return 0;
    case 'confirmed':
    case 'processing':
      return 1;
    case 'shipped':
      return 2;
    case 'delivered':
      return 3;
    case 'cancelled':
      return -1;
    default:
      return 0;
  }
}

/**
 * Badge variant based on status
 */
export function getBadgeVariant(status: OrderStatus): 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'error';
    case 'shipped':
      return 'info';
    case 'confirmed':
    case 'processing':
      return 'info';
    case 'placed':
    default:
      return 'warning';
  }
}

/**
 * Estimated delivery string
 */
export function getEstimatedDeliveryText(order: Order): string {
  if (order.estimatedDelivery) {
    return order.estimatedDelivery;
  }

  if (order.orderStatus === 'delivered') {
    return `Delivered on ${formatOrderDate(order.updatedAt || order.createdAt)}`;
  }

  if (order.orderStatus === 'cancelled') {
    return 'Cancelled';
  }

  try {
    const created = new Date(order.createdAt);
    if (!isNaN(created.getTime())) {
      // 3 business days later
      const est = new Date(created.getTime() + 3 * 24 * 60 * 60 * 1000);
      return `Estimated by ${formatOrderDate(est.toISOString())}`;
    }
  } catch {
    // fallback
  }

  return '2 - 4 Business Days';
}

/**
 * Check if order is in active/in-progress state
 */
export function isOrderActive(order: Order): boolean {
  return order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled';
}

/**
 * Check if order is completed (delivered or cancelled)
 */
export function isOrderCompleted(order: Order): boolean {
  return order.orderStatus === 'delivered' || order.orderStatus === 'cancelled';
}
