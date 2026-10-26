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
import { useTheme } from '@/theme';
import { NotificationsService } from '@/services/notificationsService';
import { useAuthStore } from '@/stores/authStore';
import { Toast, AppSplashScreen } from '@/components/ui';

// Prevent splash screen from auto-hiding before root navigation is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const user = useAuthStore((state) => state.user);
  const initializeAuth = useAuthStore((state) => state.initialize);
  const { isDark, colors } = useTheme();

  // 1. App open: First initialize auth & load user profile
  useEffect(() => {
    const unsub = initializeAuth();
    return () => {
      unsub();
    };
  }, [initializeAuth]);

  // 2. Once user profile is loaded, dismiss splash screen
  useEffect(() => {
    if (isInitialized) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isInitialized]);

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

  // While user profile is loading, render branded AppSplashScreen
  // This guarantees that catalog, orders, and tab screens only load after profile is available
  if (!isInitialized) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AppSplashScreen message="Loading your profile…" />
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      />
      <Toast />
    </>
  );
}
