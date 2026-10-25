/**
 * AquaPure — Comprehensive Push & In-App Notification Service
 * Integrates Expo Notifications with Firebase Cloud Functions for complete order lifecycle tracking:
 * - Order Placed Successfully ('placed')
 * - Order Confirmed ('confirmed')
 * - Order Shipped ('shipped')
 * - Order Delivered ('delivered')
 *
 * Implements:
 * 1. Android Notification Channels (API 26+) & Android 13+ permission flow
 * 2. iOS APNs & Expo Push Token registration
 * 3. Token synchronization to Firestore users/{uid}
 * 4. Foreground banner presentation handler
 * 5. Deep link navigation callback on notification tap (cold start + warm response)
 * 6. Local simulated fallback for development & Expo Go environments
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

const PUSH_TOKEN_STORAGE_KEY = '@aquapure_expo_push_token';
const ORDER_CHANNEL_ID = 'order-updates';

// Safely obtain native modules with fallback for web / testing
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;
let Constants: typeof import('expo-constants') | null = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default || require('expo-constants');

  // Configure foreground notification presentation behavior
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch {
  Notifications = null;
  Device = null;
  Constants = null;
}

export interface NotificationPayloadData {
  orderId?: string;
  orderNumber?: string;
  status?: string;
  url?: string;
  [key: string]: any;
}

export class NotificationsService {
  private static cachedToken: string | null = null;
  private static listenersInitialized = false;

  /**
   * Setup Android Notification Channel with high importance, vibration, and custom sound
   */
  static async configureNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android' || !Notifications?.setNotificationChannelAsync) {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync(ORDER_CHANNEL_ID, {
        name: 'Order Lifecycle Updates',
        description: 'Instant status alerts for order placement, confirmation, shipping, and delivery',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00B4D8',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    } catch (channelErr) {
      console.warn('[NotificationsService] Channel setup notice:', channelErr);
    }
  }

  /**
   * Request push notification permissions and retrieve Expo push token
   */
  static async registerForPushNotifications(): Promise<string | null> {
    if (Platform.OS === 'web' || !Notifications?.getPermissionsAsync) {
      return null;
    }

    // Return cached token if already resolved in memory
    if (this.cachedToken) {
      return this.cachedToken;
    }

    // Try reading cached token from storage
    try {
      const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
      if (storedToken) {
        this.cachedToken = storedToken;
      }
    } catch {
      // ignore
    }

    // Setup channel for Android devices
    await this.configureNotificationChannels();

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted' && Notifications.requestPermissionsAsync) {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[NotificationsService] Notification permission not granted:', finalStatus);
        return null;
      }

      if (Notifications.getExpoPushTokenAsync) {
        const anyConstants = (Constants as any)?.default || (Constants as any);
        const projectId =
          anyConstants?.expoConfig?.extra?.eas?.projectId ||
          anyConstants?.easConfig?.projectId;

        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );

        if (tokenData && tokenData.data) {
          this.cachedToken = tokenData.data;
          await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, tokenData.data).catch(() => {});
          console.log('[NotificationsService] Expo Push Token obtained:', tokenData.data);
          return tokenData.data;
        }
      }
      return this.cachedToken;
    } catch (err: unknown) {
      console.warn('[NotificationsService] Push registration notice:', err);
      return this.cachedToken;
    }
  }

  /**
   * Sync active Expo Push Token to the authenticated user's Firestore profile
   */
  static async syncUserPushToken(userId: string, token?: string): Promise<boolean> {
    if (!userId || userId === 'guest-user') {
      return false;
    }

    const pushToken = token || this.cachedToken || (await this.registerForPushNotifications());
    if (!pushToken) {
      return false;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(
        userRef,
        {
          expoPushToken: pushToken,
          pushTokens: arrayUnion(pushToken),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log(`[NotificationsService] Successfully synced push token to user ${userId}`);
      return true;
    } catch (err) {
      console.warn(`[NotificationsService] Failed syncing push token for ${userId}:`, err);
      return false;
    }
  }

  /**
   * Set up notification tap deep link listeners (cold-start and active tap)
   * Navigates to `/orders/[id]` when user taps on any order notification
   */
  static setupNotificationListeners(
    onNavigateToOrder: (orderId: string, status?: string) => void
  ): () => void {
    if (!Notifications?.addNotificationResponseReceivedListener) {
      return () => {};
    }

    // 1. Warm Response Listener: Fires when user taps a notification while app is running
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        try {
          const data = response.notification.request.content.data as NotificationPayloadData;
          console.log('[NotificationsService] Notification tapped with data:', data);
          const orderId = data?.orderId || (data?.url ? data.url.replace('/orders/', '') : null);
          if (orderId) {
            onNavigateToOrder(orderId, data.status);
          }
        } catch (err) {
          console.warn('[NotificationsService] Error handling notification tap:', err);
        }
      }
    );

    // 2. Cold-Start Check: Fires if app was opened directly by tapping a notification
    if (Notifications.getLastNotificationResponseAsync) {
      Notifications.getLastNotificationResponseAsync()
        .then((lastResponse) => {
          if (lastResponse) {
            const data = lastResponse.notification.request.content.data as NotificationPayloadData;
            console.log('[NotificationsService] Cold-start notification response detected:', data);
            const orderId = data?.orderId || (data?.url ? data.url.replace('/orders/', '') : null);
            if (orderId) {
              // Allow root layout navigation tree to settle
              setTimeout(() => {
                onNavigateToOrder(orderId, data.status);
              }, 600);
            }
          }
        })
        .catch(() => {});
    }

    return () => {
      responseSubscription.remove();
    };
  }

  // ─────────────────────────────────────────────────────────────
  // LIFECYCLE NOTIFICATION DISPATCHERS (Local & In-App Alerts)
  // ─────────────────────────────────────────────────────────────

  /**
   * 1. Order Placed Successfully
   */
  static async notifyOrderPlaced(
    orderId: string,
    orderNumber: string,
    total: string
  ): Promise<void> {
    if (!Notifications?.scheduleNotificationAsync) return;
    const cleanNum = orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Order Placed Successfully! 💧',
          body: `Your AquaPure order ${cleanNum} for ₹${total} has been placed. We're getting it ready!`,
          sound: 'default',
          data: {
            orderId,
            orderNumber,
            status: 'placed',
            url: `/orders/${orderId}`,
          },
        } as any,
        trigger: { channelId: ORDER_CHANNEL_ID } as any,
      });
    } catch {
      // Ignored in unsupported testing environments
    }
  }

  /**
   * 2. Order Confirmed
   */
  static async notifyOrderConfirmed(orderId: string, orderNumber: string): Promise<void> {
    if (!Notifications?.scheduleNotificationAsync) return;
    const cleanNum = orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Order Confirmed! ✅',
          body: `Your AquaPure order ${cleanNum} has been confirmed and is being prepped for dispatch.`,
          sound: 'default',
          data: {
            orderId,
            orderNumber,
            status: 'confirmed',
            url: `/orders/${orderId}`,
          },
        } as any,
        trigger: { channelId: ORDER_CHANNEL_ID } as any,
      });
    } catch {
      // Ignored
    }
  }

  /**
   * 3. Order Shipped
   */
  static async notifyOrderShipped(
    orderId: string,
    orderNumber: string,
    courierName = '',
    trackingNumber = ''
  ): Promise<void> {
    if (!Notifications?.scheduleNotificationAsync) return;
    const cleanNum = orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`;
    const courierInfo = courierName ? ` via ${courierName}` : '';
    const trackingInfo = trackingNumber ? ` (${trackingNumber})` : '';

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Order Shipped! 🚚',
          body: `Great news! Your order ${cleanNum} is on the way${courierInfo}${trackingInfo}. Tap to track delivery.`,
          sound: 'default',
          data: {
            orderId,
            orderNumber,
            status: 'shipped',
            url: `/orders/${orderId}`,
          },
        } as any,
        trigger: { channelId: ORDER_CHANNEL_ID } as any,
      });
    } catch {
      // Ignored
    }
  }

  /**
   * 4. Order Delivered
   */
  static async notifyOrderDelivered(orderId: string, orderNumber: string): Promise<void> {
    if (!Notifications?.scheduleNotificationAsync) return;
    const cleanNum = orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Order Delivered! 🎉',
          body: `Your AquaPure order ${cleanNum} has been delivered. Thank you for choosing AquaPure for pure, healthy water!`,
          sound: 'default',
          data: {
            orderId,
            orderNumber,
            status: 'delivered',
            url: `/orders/${orderId}`,
          },
        } as any,
        trigger: { channelId: ORDER_CHANNEL_ID } as any,
      });
    } catch {
      // Ignored
    }
  }

  /**
   * Technician Visit Scheduled
   */
  static async notifyServiceBooked(bookingId: string, serviceName: string): Promise<void> {
    if (!Notifications?.scheduleNotificationAsync) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Technician Visit Scheduled 🔧',
          body: `Your request #${bookingId} for ${serviceName} has been booked. A technician will contact you prior to arrival.`,
          sound: 'default',
          data: {
            bookingId,
            serviceName,
          },
        } as any,
        trigger: { channelId: ORDER_CHANNEL_ID } as any,
      });
    } catch {
      // Ignored
    }
  }
}
