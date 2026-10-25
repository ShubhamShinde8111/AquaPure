/**
 * AquaPure Admin — Order Push Notification Service
 *
 * Dispatches push notifications for order lifecycle status transitions:
 * - Order Placed ('placed')
 * - Order Confirmed ('confirmed')
 * - Order Shipped ('shipped')
 * - Order Delivered ('delivered')
 *
 * Utilizes Firebase Cloud Functions callable endpoint with idempotency checks.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { Order, OrderStatus } from '../types';

export const PUSH_NOTIFICATION_STAGES: OrderStatus[] = [
  'placed',
  'confirmed',
  'shipped',
  'delivered',
];

export class NotificationService {
  /**
   * Dispatch automatic push notification for an order status change
   */
  static async sendOrderStatusPushNotification(
    orderId: string,
    status: OrderStatus,
    orderData?: Partial<Order>
  ): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
    if (!PUSH_NOTIFICATION_STAGES.includes(status)) {
      return { success: true, skipped: true, reason: `Status "${status}" does not trigger push notification` };
    }

    try {
      const callable = httpsCallable<
        { orderId: string; stage: string; orderData?: Partial<Order> },
        { success: boolean; skipped?: boolean; reason?: string }
      >(functions, 'sendOrderPushNotification');

      const result = await callable({
        orderId,
        stage: status,
        orderData,
      });

      console.log(`[Admin Push Notification] Successfully dispatched "${status}" for order ${orderId}:`, result.data);
      return result.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown push dispatch error';
      console.warn(`[Admin Push Notification] Notice sending push for order ${orderId}:`, msg);
      return { success: false, reason: msg };
    }
  }
}
