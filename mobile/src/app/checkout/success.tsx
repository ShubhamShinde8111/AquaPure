/**
 * AquaPure — Order Confirmation Screen
 * Route: /checkout/success
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Button } from '@/components/ui/Button';
import { AppRefreshControl, AquaPureLogo } from '@/components/ui';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { db } from '@/services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getCustomerFacingOrderNumber } from '@/utils/orderUtils';

export default function OrderSuccessScreen() {
  const { orderId, total, paymentId } = useLocalSearchParams<{
    orderId: string;
    total: string;
    paymentId?: string;
  }>();
  const [orderStatus, setOrderStatus] = useState<string>('CONFIRMED');

  const checkStatus = useCallback(async () => {
    if (!orderId) return;
    try {
      const snap = await getDoc(doc(db, 'orders', orderId));
      if (snap.exists()) {
        const data = snap.data();
        if (data.orderStatus) {
          setOrderStatus(data.orderStatus.toUpperCase());
        }
      }
    } catch (e) {
      console.warn('Could not refresh order status:', e);
    }
  }, [orderId]);

  const { refreshing, onRefresh } = usePullToRefresh(checkStatus);

  const formattedTotal = total
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(Number(total))
    : '—';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            title="Pull to refresh order status"
          />
        }
      >
        <View style={styles.container}>
          <View style={styles.logoWrap}>
            <AquaPureLogo width={96} />
          </View>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-sharp" size={48} color={colors.white} />
          </View>

          <Text style={styles.title}>Order Placed Successfully!</Text>
          <Text style={styles.subtitle}>
            Thank you for choosing AquaPure. Your water purification order has been confirmed.
          </Text>

          <View style={styles.detailsCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Order Number</Text>
              <Text style={styles.orderId}>{getCustomerFacingOrderNumber(orderId || 'ORD-982314')}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Amount Paid</Text>
              <Text style={styles.amount}>{formattedTotal}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Payment Method</Text>
              <Text style={styles.paymentMethod}>
                {paymentId ? 'Razorpay (Test Mode)' : 'Cash on Delivery'}
              </Text>
            </View>
            {paymentId ? (
              <View style={styles.row}>
                <Text style={styles.label}>Transaction ID</Text>
                <Text style={styles.paymentIdText}>{paymentId}</Text>
              </View>
            ) : null}
            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.status}>{orderStatus}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Estimated Delivery</Text>
              <Text style={styles.deliveryText}>2 - 4 Business Days</Text>
            </View>
          </View>

          <View style={styles.buttonGroup}>
            <Button
              title="View My Orders"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.replace('/(tabs)/orders')}
            />
            <Button
              title="Continue Shopping"
              variant="secondary"
              size="lg"
              fullWidth
              onPress={() => router.replace('/(tabs)')}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    ...typography.heading1,
    color: colors.text,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing['2xl'],
    paddingHorizontal: spacing.md,
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing['2xl'],
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
  orderId: {
    ...typography.label,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.primary,
  },
  amount: {
    ...typography.heading2,
    color: colors.primary,
    fontSize: 18,
  },
  paymentMethod: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  paymentIdText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  status: {
    ...typography.labelSmall,
    color: colors.success,
    fontWeight: '800',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  deliveryText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  buttonGroup: {
    width: '100%',
  },
});
