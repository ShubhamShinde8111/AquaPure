/**
 * AquaPure — Root Layout
 * Sets up the Stack navigator for the app with proper theming,
 * initializes push notifications permissions & channels,
 * and handles deep linking to order details when notifications are tapped.
 */

import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@/theme/colors';
import { NotificationsService } from '@/services/notificationsService';
import { useAuthStore } from '@/stores/authStore';

// Prevent splash screen from auto-hiding before root navigation is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // In case hideAsync fails or was already called
      }
    };
    hideSplash();
  }, []);

  // Setup push notification channels & deep link tap navigation
  useEffect(() => {
    // 1. Configure Android high-importance notification channel
    NotificationsService.configureNotificationChannels();

    // 2. Setup notification response listener: navigates to /orders/[id] when tapped
    const unsubscribeNotifications = NotificationsService.setupNotificationListeners(
      (orderId) => {
        if (orderId) {
          console.log(`[RootLayout] Navigating to order details for: ${orderId}`);
          try {
            router.push(`/orders/${orderId}`);
          } catch (navErr) {
            console.warn('[RootLayout] Deep link navigation notice:', navErr);
          }
        }
      }
    );

    return () => {
      unsubscribeNotifications();
    };
  }, []);

  // Sync push token whenever authenticated user is active
  useEffect(() => {
    if (user?.uid) {
      NotificationsService.registerForPushNotifications().then((token) => {
        if (token) {
          NotificationsService.syncUserPushToken(user.uid, token);
        }
      });
    }
  }, [user?.uid]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      />
    </>
  );
}
