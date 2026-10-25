/**
 * AquaPure — Order Details & Live Tracking Screen
 * Route: /orders/[id]
 *
 * Implements:
 * - Readable customer-facing order number and status banner
 * - Full status-driven visual tracking pipeline with delivery details
 * - Itemized product cards with direct "Buy Again" action
 * - Delivery address and payment information breakdown
 * - Order price summary
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/services/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { EmailService } from '@/services/emailService';
import { Order, Product } from '@/types';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState, ErrorState, AppRefreshControl } from '@/components/ui';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { ProductsService } from '@/services/productsService';
import {
  getCustomerFacingOrderNumber,
  formatPrice,
  formatOrderDate,
  getStepIndex,
  getBadgeVariant,
  getEstimatedDeliveryText,
  ORDER_STAGES,
} from '@/utils/orderUtils';

// Fallback demo orders for offline or demo testing
const FALLBACK_ORDERS: Record<string, Order> = {
  'ORD-892144': {
    id: 'ORD-892144',
    orderType: 'customer',
    customerId: 'cust-1',
    items: [
      {
        productId: 'pur-001',
        name: 'AquaPure Grand RO+UV+UF+Alkaline',
        imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
        price: 14999,
        quantity: 1,
      },
    ],
    subtotal: 14999,
    total: 14999,
    shippingAddress: {
      id: 'addr-1',
      label: 'Home',
      fullName: 'Rahul Sharma',
      phone: '+91 98765 43210',
      addressLine1: 'Flat 402, Royal Palms, Link Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400053',
    },
    paymentProvider: 'demo_upi',
    paymentStatus: 'test_success',
    paymentReference: 'UPI-TXN-84910284',
    orderStatus: 'shipped',
    courierName: 'AquaPure Logistics Express',
    trackingNumber: 'AQ-EXP-992014',
    createdAt: '2026-02-18T14:30:00Z',
    updatedAt: '2026-02-19T09:00:00Z',
  },
  'ORD-761203': {
    id: 'ORD-761203',
    orderType: 'customer',
    customerId: 'cust-1',
    items: [
      {
        productId: 'flt-007',
        name: 'Complete RO Annual Maintenance Service Kit (6-in-1)',
        imageUrl: 'https://images.unsplash.com/photo-1585837575652-267c041d77d4?auto=format&fit=crop&w=600&q=80',
        price: 1699,
        quantity: 2,
      },
    ],
    subtotal: 3398,
    total: 3398,
    shippingAddress: {
      id: 'addr-1',
      label: 'Home',
      fullName: 'Rahul Sharma',
      phone: '+91 98765 43210',
      addressLine1: 'Flat 402, Royal Palms, Link Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400053',
    },
    paymentProvider: 'cash_on_delivery',
    paymentStatus: 'pending',
    paymentReference: 'COD-PENDING',
    orderStatus: 'placed',
    courierName: 'AquaPure Logistics',
    trackingNumber: 'AQ-STD-304192',
    createdAt: '2026-02-21T11:15:00Z',
    updatedAt: '2026-02-21T11:15:00Z',
  },
};

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);

  const { addItem } = useCartStore();
  const { isDealerApproved, user } = useAuthStore();

  const fetchOrderDetail = useCallback(async () => {
    if (!id) {
      setError('Order not specified');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      let foundOrder: Order | null = null;

      if (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) {
        try {
          const snap = await getDoc(doc(db, 'orders', id));
          if (snap.exists()) {
            foundOrder = { id: snap.id, ...snap.data() } as Order;
          }
        } catch (dbErr) {
          console.warn('Firestore order fetch error, checking fallbacks:', dbErr);
        }
      }

      if (!foundOrder && process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) {
        try {
          const cleanId = id.trim().replace(/^#/, '');
          const qSnap = await getDocs(
            query(collection(db, 'orders'), where('orderNumber', '==', cleanId), limit(1))
          );
          if (!qSnap.empty) {
            const docSnap = qSnap.docs[0];
            foundOrder = { id: docSnap.id, ...docSnap.data() } as Order;
          }
        } catch (qErr) {
          console.warn('Firestore query by orderNumber notice:', qErr);
        }
      }

      if (!foundOrder) {
        // Check fallback demo orders
        if (FALLBACK_ORDERS[id]) {
          foundOrder = FALLBACK_ORDERS[id];
        } else {
          // If ID matches clean prefix
          const match = Object.values(FALLBACK_ORDERS).find((o) => o.id === id);
          if (match) foundOrder = match;
        }
      }

      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        setError('Order could not be found.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load order';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const { refreshing, onRefresh } = usePullToRefresh(fetchOrderDetail);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  // Real-time listener for order status changes when viewing order details
  useEffect(() => {
    if (!order?.id || !process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) return;

    const unsubscribe = onSnapshot(
      doc(db, 'orders', order.id),
      (docSnap) => {
        if (docSnap.exists()) {
          const updated = { id: docSnap.id, ...docSnap.data() } as Order;
          setOrder((prev) => (prev ? { ...prev, ...updated } : updated));
        }
      },
      (err) => {
        console.warn('Real-time order snapshot notice:', err.message);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [order?.id]);

  // Handle Buy Again for a specific item or all items
  const handleBuyAgain = async (itemToBuy?: Order['items'][0]) => {
    if (!order) return;
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to reorder items.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => {
              useAuthStore.getState().setPendingAction({
                type: 'PROCEED_TO_CHECKOUT',
                returnUrl: `/orders/${id}`,
              });
              router.push('/auth/login');
            },
          },
        ]
      );
      return;
    }
    setAddingToCart(true);

    try {
      const targetItems = itemToBuy ? [itemToBuy] : order.items;

      for (const item of targetItems) {
        // Try to fetch active product from catalog
        const productData = await ProductsService.getProductById(item.productId);
        const resolvedProduct: Product = productData || {
          id: item.productId,
          name: item.name,
          slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          categoryId: 'purifiers',
          description: item.name,
          customerPrice: item.price,
          imageUrl: item.imageUrl,
          stockStatus: 'in_stock',
          active: true,
          specifications: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        addItem(resolvedProduct, item.quantity, isDealerApproved);
      }

      // Navigate to cart WITHOUT automatically placing an order
      router.push('/(tabs)/cart');
    } catch (err) {
      console.warn('Failed to add items to cart:', err);
      Alert.alert('Error', 'Could not add items to cart. Please try again.');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <LoadingState message="Fetching order details & tracking…" />
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <ErrorState
          message={error || 'We could not locate this order.'}
          onRetry={fetchOrderDetail}
        />
      </SafeAreaView>
    );
  }

  const customerOrderNum = getCustomerFacingOrderNumber(order.id, order.orderNumber);
  const currentStep = getStepIndex(order.orderStatus);
  const isCancelled = order.orderStatus === 'cancelled';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* App Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back to orders"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerTextWrapper}>
          <Text style={styles.headerTitle}>Order Details</Text>
          <Text style={styles.headerSubtitle}>{customerOrderNum}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            title="Pull to refresh order"
          />
        }
      >
        {/* Status Highlight Banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusBannerLeft}>
            <View style={styles.statusPillRow}>
              <StatusBadge
                variant={getBadgeVariant(order.orderStatus)}
                label={order.orderStatus.toUpperCase()}
              />
              <Text style={styles.orderDateText}>
                {formatOrderDate(order.createdAt, true)}
              </Text>
            </View>
            <Text style={styles.statusHeadline}>
              {isCancelled
                ? 'This order was cancelled'
                : order.orderStatus === 'delivered'
                ? 'Delivered to your address'
                : 'Order is on the way'}
            </Text>
            <Text style={styles.estimatedText}>
              {getEstimatedDeliveryText(order)}
            </Text>
          </View>
          <View style={styles.statusBannerIcon}>
            <Ionicons
              name={
                isCancelled
                  ? 'close-circle'
                  : order.orderStatus === 'delivered'
                  ? 'checkmark-done-circle'
                  : 'cube'
              }
              size={36}
              color={isCancelled ? colors.error : colors.primary}
            />
          </View>
        </View>

        {/* Live Tracking Timeline */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="navigate-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Shipment Tracking</Text>
          </View>

          {isCancelled ? (
            <View style={styles.cancelledBox}>
              <Ionicons name="alert-circle" size={22} color={colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelledTitle}>Order Cancelled</Text>
                <Text style={styles.cancelledDesc}>
                  This order was cancelled. Any processed payment will be refunded to your original payment method within 3–5 business days.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.timelineContainer}>
              {ORDER_STAGES.map((stage, idx) => {
                const isCompleted = currentStep >= idx;
                const isCurrent = currentStep === idx;
                const isLast = idx === ORDER_STAGES.length - 1;

                return (
                  <View key={stage.key} style={styles.timelineRow}>
                    {/* Left Indicator Column */}
                    <View style={styles.timelineIndicatorCol}>
                      <View
                        style={[
                          styles.timelineDot,
                          isCompleted && styles.timelineDotCompleted,
                          isCurrent && styles.timelineDotCurrent,
                        ]}
                      >
                        {isCompleted ? (
                          <Ionicons name="checkmark" size={12} color={colors.white} />
                        ) : (
                          <View style={styles.timelineDotInner} />
                        )}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.timelineLine,
                            currentStep > idx && styles.timelineLineCompleted,
                          ]}
                        />
                      )}
                    </View>

                    {/* Right Content Column */}
                    <View style={[styles.timelineContent, !isLast && { paddingBottom: spacing.lg }]}>
                      <View style={styles.stageHeader}>
                        <Text
                          style={[
                            styles.stageLabel,
                            isCompleted && styles.stageLabelCompleted,
                            isCurrent && styles.stageLabelCurrent,
                          ]}
                        >
                          {stage.label}
                        </Text>
                        {isCurrent && (
                          <View style={styles.liveTag}>
                            <Text style={styles.liveTagText}>CURRENT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.stageDescription}>
                        {stage.key === 'placed' && 'Order received and payment confirmed.'}
                        {stage.key === 'confirmed' && 'Items inspected and securely packed at AquaPure facility.'}
                        {stage.key === 'shipped' &&
                          (order.courierName
                            ? `Dispatched with ${order.courierName}.`
                            : 'Dispatched with AquaPure Logistics Express.')}
                        {stage.key === 'delivered' && 'Delivered and verified with customer.'}
                      </Text>

                      {stage.key === 'shipped' && order.trackingNumber && isCompleted && (
                        <View style={styles.trackingInfoBox}>
                          <Text style={styles.trackingInfoLabel}>Tracking Number:</Text>
                          <Text style={styles.trackingInfoValue}>{order.trackingNumber}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Ordered Items List */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="basket-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>
              Items in this Order ({order.items.reduce((s, i) => s + i.quantity, 0)})
            </Text>
          </View>

          <View style={styles.itemsList}>
            {order.items.map((item, index) => (
              <View key={`${item.productId}-${index}`} style={styles.itemRow}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
                <View style={styles.itemInfo}>
                  <TouchableOpacity
                    onPress={() => router.push(`/product/${item.productId}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.itemPriceMeta}>
                    Qty: {item.quantity} × {formatPrice(item.price)}
                  </Text>
                  <Text style={styles.itemTotalAmount}>
                    {formatPrice(item.price * item.quantity)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.itemBuyAgainBtn}
                  onPress={() => handleBuyAgain(item)}
                  disabled={addingToCart}
                  accessibilityLabel={`Buy ${item.name} again`}
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                  <Text style={styles.itemBuyAgainText}>Buy Again</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Delivery Address</Text>
          </View>

          <View style={styles.addressBox}>
            <View style={styles.addressBadgeRow}>
              <Text style={styles.addressRecipient}>
                {order.shippingAddress?.fullName || 'Customer'}
              </Text>
              {order.shippingAddress?.label && (
                <View style={styles.addressLabelBadge}>
                  <Text style={styles.addressLabelBadgeText}>
                    {order.shippingAddress.label}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.addressText}>
              {order.shippingAddress?.addressLine1}
              {order.shippingAddress?.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
            </Text>
            <Text style={styles.addressText}>
              {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
            </Text>
            {order.shippingAddress?.phone && (
              <View style={styles.addressPhoneRow}>
                <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.addressPhone}>{order.shippingAddress.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment & Billing Breakdown */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="card-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Payment Details</Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Method</Text>
            <Text style={styles.paymentValue}>
              {order.paymentProvider === 'razorpay'
                ? 'Razorpay (Test Mode)'
                : order.paymentProvider === 'demo_upi'
                ? 'UPI Payment (Verified)'
                : order.paymentProvider === 'cash_on_delivery'
                ? 'Cash on Delivery'
                : (order.paymentProvider || 'PAYMENT').replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Status</Text>
            <StatusBadge
              variant={
                order.paymentStatus === 'test_success' || order.paymentStatus === 'paid'
                  ? 'success'
                  : order.paymentStatus === 'failed'
                  ? 'error'
                  : 'warning'
              }
              label={
                order.paymentStatus === 'test_success' || order.paymentStatus === 'paid'
                  ? 'PAID (TEST)'
                  : order.paymentStatus === 'failed'
                  ? 'FAILED'
                  : 'PENDING'
              }
            />
          </View>

          {order.paymentReference && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Transaction Ref</Text>
              <Text style={styles.paymentRef}>{order.paymentReference}</Text>
            </View>
          )}

          {order.razorpayOrderId && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Gateway Order ID</Text>
              <Text style={styles.paymentRef}>{order.razorpayOrderId}</Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Pricing Breakdown */}
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Items Subtotal</Text>
            <Text style={styles.billValue}>{formatPrice(order.subtotal || order.total)}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={[styles.billValue, { color: colors.success }]}>
              {order.total >= 999 ? 'FREE' : '₹99'}
            </Text>
          </View>

          <View style={[styles.billRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total Amount</Text>
            <Text style={styles.grandTotalValue}>{formatPrice(order.total)}</Text>
          </View>
        </View>

        {/* Need Help Banner */}
        <View style={styles.helpBanner}>
          <Ionicons name="headset-outline" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>Need Help with this Order?</Text>
            <Text style={styles.helpSubtitle}>Contact our support or book technician installation</Text>
          </View>
          <TouchableOpacity
            style={styles.helpAction}
            onPress={() => router.push('/service/my-bookings')}
            accessibilityLabel="Book Service"
          >
            <Text style={styles.helpActionText}>Support</Text>
          </TouchableOpacity>
        </View>

        {/* Delivered Notice Banner when order is delivered */}
        {order.orderStatus === 'delivered' && (
          <View style={styles.deliveredNoticeBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.deliveredNoticeText}>
              Order Delivered & Received.
            </Text>
          </View>
        )}

        {/* Bottom Buy Again CTA */}
        <TouchableOpacity
          style={styles.mainBuyAgainButton}
          onPress={() => handleBuyAgain()}
          disabled={addingToCart}
          activeOpacity={0.85}
          accessibilityLabel="Buy all items again"
          accessibilityRole="button"
        >
          <Ionicons name="cart-outline" size={20} color={colors.primary} />
          <Text style={styles.mainBuyAgainText}>
            {addingToCart ? 'Adding to Cart…' : 'Buy Again'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrapper: {
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.heading3,
    color: colors.white,
    fontSize: 18,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.yellow,
    fontWeight: '700',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statusBannerLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  orderDateText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  statusHeadline: {
    ...typography.heading3,
    color: colors.text,
    fontSize: 16,
    marginTop: 2,
  },
  estimatedText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  statusBannerIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.label,
    color: colors.text,
    fontSize: 15,
  },
  cancelledBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cancelledTitle: {
    ...typography.label,
    color: colors.error,
    fontWeight: '700',
  },
  cancelledDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  timelineContainer: {
    paddingLeft: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineIndicatorCol: {
    alignItems: 'center',
    width: 24,
    marginRight: spacing.md,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timelineDotCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.yellow,
    borderWidth: 3,
  },
  timelineDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  timelineLineCompleted: {
    backgroundColor: colors.primary,
  },
  timelineContent: {
    flex: 1,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stageLabel: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 14,
  },
  stageLabelCompleted: {
    color: colors.text,
    fontWeight: '700',
  },
  stageLabelCurrent: {
    color: colors.primary,
    fontWeight: '800',
  },
  liveTag: {
    backgroundColor: colors.yellow,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  liveTagText: {
    ...typography.labelSmall,
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
  stageDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  trackingInfoBox: {
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  trackingInfoLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  trackingInfoValue: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  itemsList: {
    gap: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F7EDE8',
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 18,
  },
  itemPriceMeta: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  itemTotalAmount: {
    ...typography.label,
    color: colors.primary,
    fontSize: 13,
    marginTop: 2,
  },
  itemBuyAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemBuyAgainText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  addressBox: {
    gap: 4,
  },
  addressBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  addressRecipient: {
    ...typography.label,
    color: colors.text,
    fontSize: 15,
  },
  addressLabelBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  addressLabelBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  addressText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  addressPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  addressPhone: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '500',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  paymentLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  paymentValue: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
  },
  paymentRef: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  billLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  billValue: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  grandTotalLabel: {
    ...typography.heading3,
    color: colors.text,
    fontSize: 16,
  },
  grandTotalValue: {
    ...typography.heading2,
    color: colors.primary,
    fontSize: 18,
  },
  helpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F3E8FF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  helpTitle: {
    ...typography.label,
    color: colors.primary,
    fontSize: 13,
  },
  helpSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  helpAction: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  helpActionText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  mainBuyAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.yellow,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainBuyAgainText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  deliveredNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  deliveredNoticeText: {
    ...typography.bodySmall,
    color: '#065F46',
    flex: 1,
    fontWeight: '600',
  },
});
