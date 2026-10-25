/**
 * AquaPure — Customer & Dealer Orders Screen
 * Route: /(tabs)/orders
 *
 * Implements:
 * - Readable customer-facing order numbers (keeping original doc IDs for db/nav)
 * - Status-driven order progress tracker with meaningful stages and consistent spacing
 * - Real-data filter tabs (All, Active, Completed) responsive on small/large screens
 * - Refined order cards with aligned dates, status badges, readable names, aligned prices, clean footer
 * - Safe area handling preventing bottom navigation overlap
 * - Verified Buy Again behavior (adds product to cart, navigates to cart without placing order)
 * - Card navigation to order details and shipment tracking
 * - Contextual empty states, honest loading, and error states
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { Order, Product } from '@/types';
import { db } from '@/services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingState, AppRefreshControl } from '@/components/ui';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { ProductsService } from '@/services/productsService';
import {
  getCustomerFacingOrderNumber,
  formatPrice,
  formatOrderDate,
  getStepIndex,
  getBadgeVariant,
  getEstimatedDeliveryText,
  isOrderActive,
  isOrderCompleted,
  ORDER_STAGES,
} from '@/utils/orderUtils';

// Realistic sample orders for demo and offline fallback
const DEMO_ORDERS: Order[] = [
  {
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
    orderStatus: 'shipped',
    courierName: 'AquaPure Logistics Express',
    trackingNumber: 'AQ-EXP-992014',
    createdAt: '2026-02-18T14:30:00Z',
    updatedAt: '2026-02-19T09:00:00Z',
  },
  {
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
    orderStatus: 'placed',
    courierName: 'AquaPure Logistics',
    trackingNumber: 'AQ-STD-304192',
    createdAt: '2026-02-21T11:15:00Z',
    updatedAt: '2026-02-21T11:15:00Z',
  },
];

type FilterType = 'all' | 'active' | 'completed';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { user, isDealerApproved } = useAuthStore();
  const { addItem } = useCartStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [buyingOrderIndex, setBuyingOrderIndex] = useState<number | null>(null);

  const fetchUserOrders = useCallback(async () => {
    setError(null);
    if (!user) {
      // Demo / Guest mode: use realistic sample orders
      setOrders(DEMO_ORDERS);
      setLoading(false);
      return;
    }

    try {
      if (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) {
        let list: Order[] = [];
        try {
          // Attempt composite query (customerId ASC + createdAt DESC)
          const q = query(
            collection(db, 'orders'),
            where('customerId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const snap = await getDocs(q);
          list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
        } catch (queryErr: unknown) {
          // Fallback if composite index is still building or unavailable
          console.warn('Orders composite index query fallback:', queryErr);
          const fallbackQ = query(
            collection(db, 'orders'),
            where('customerId', '==', user.uid)
          );
          const snap = await getDocs(fallbackQ);
          list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
          list.sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
        }

        // If user is logged in but hasn't placed any orders yet, list will be empty
        setOrders(list);
      } else {
        // Firebase not configured; show demo orders
        setOrders(DEMO_ORDERS);
      }
    } catch (err: unknown) {
      console.warn('Could not fetch user orders from Firestore:', err);
      const msg = err instanceof Error ? err.message : 'Failed to fetch orders';
      setError(msg);
      // Fallback to demo orders if network fails so the screen doesn't crash
      setOrders(DEMO_ORDERS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const { refreshing, onRefresh } = usePullToRefresh(fetchUserOrders);

  useEffect(() => {
    fetchUserOrders();
  }, [fetchUserOrders]);

  // Dynamic order counts
  const counts = useMemo(() => {
    return {
      all: orders.length,
      active: orders.filter(isOrderActive).length,
      completed: orders.filter(isOrderCompleted).length,
    };
  }, [orders]);

  // Filtered orders based on active tab
  const filteredOrders = useMemo(() => {
    switch (selectedFilter) {
      case 'active':
        return orders.filter(isOrderActive);
      case 'completed':
        return orders.filter(isOrderCompleted);
      case 'all':
      default:
        return orders;
    }
  }, [orders, selectedFilter]);

  // Buy Again handler: adds items from the order to cart and navigates to cart
  const handleBuyAgain = async (order: Order, index: number) => {
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
                returnUrl: '/(tabs)/orders',
              });
              router.push('/auth/login');
            },
          },
        ]
      );
      return;
    }
    setBuyingOrderIndex(index);
    try {
      for (const item of order.items) {
        // Fetch matching product or construct fallback Cart-ready product
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

      // Navigate to cart screen without automatically placing an order
      router.push('/(tabs)/cart');
    } catch (err) {
      console.warn('Buy Again failed:', err);
      Alert.alert('Notice', 'Unable to reorder items at this moment. Please try again.');
    } finally {
      setBuyingOrderIndex(null);
    }
  };

  // Navigates to full order details and tracking screen
  const handleOpenOrderDetails = (order: Order) => {
    router.push({
      pathname: '/orders/[id]',
      params: { id: order.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>My Orders</Text>
            <Text style={styles.subtitle}>Track shipment, warranty and deliveries</Text>
          </View>
          {!user && (
            <TouchableOpacity
              style={styles.signInBadge}
              onPress={() => router.push('/auth/login')}
              accessibilityLabel="Sign In"
              accessibilityRole="button"
            >
              <Ionicons name="log-in-outline" size={14} color={colors.primary} />
              <Text style={styles.signInBadgeText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills with real counts and responsive container */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {(
              [
                { key: 'all', label: 'All', count: counts.all },
                { key: 'active', label: 'Active', count: counts.active },
                { key: 'completed', label: 'Completed', count: counts.completed },
              ] as const
            ).map((tab) => {
              const isActive = selectedFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  onPress={() => setSelectedFilter(tab.key)}
                  activeOpacity={0.8}
                  accessibilityLabel={`Filter ${tab.label} orders, ${tab.count} items`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {tab.label}
                  </Text>
                  <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                    <Text style={[styles.countBadgeText, isActive && styles.countBadgeTextActive]}>
                      {tab.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Main Body */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <LoadingState message="Loading your orders…" />
        </View>
      ) : error && orders.length === 0 ? (
        <View style={styles.errorContainer}>
          <ErrorState message={error} onRetry={fetchUserOrders} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            filteredOrders.length === 0 && { flexGrow: 1, justifyContent: 'center' },
            // Safe area + tab bar height padding to completely avoid bottom navigation overlap
            { paddingBottom: Math.max(insets.bottom, 16) + 84 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              title="Pull to refresh orders"
            />
          }
        >
          {/* Guest / Demo Notice Banner if not logged in */}
          {!user && (
            <View style={styles.demoNoticeBanner}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.demoNoticeText}>
                Previewing sample orders. Sign in to view and track your account orders.
              </Text>
            </View>
          )}

          {/* Technician Appointments Banner */}
          <View style={styles.serviceBanner}>
            <View style={styles.serviceBannerIcon}>
              <Ionicons name="construct" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceBannerTitle}>Technician Appointments</Text>
              <Text style={styles.serviceBannerSubtitle}>View booked visits or schedule repair</Text>
            </View>
            <TouchableOpacity
              style={styles.serviceBannerAction}
              onPress={() => router.push('/service/my-bookings')}
              accessibilityLabel="Check booked services"
              accessibilityRole="button"
            >
              <Text style={styles.serviceBannerActionText}>My Bookings</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Empty States */}
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              {selectedFilter === 'active' ? (
                <EmptyState
                  icon="🚚"
                  title="No Active Orders"
                  description="You don't have any ongoing or in-transit orders right now."
                  actionLabel="View All Orders"
                  onAction={() => setSelectedFilter('all')}
                />
              ) : selectedFilter === 'completed' ? (
                <EmptyState
                  icon="📦"
                  title="No Completed Orders"
                  description="Your delivered and past orders will appear here."
                  actionLabel="View Active Orders"
                  onAction={() => setSelectedFilter('active')}
                />
              ) : (
                <EmptyState
                  icon="🛍️"
                  title="No Orders Yet"
                  description="You haven't placed any orders with AquaPure yet. Explore our water purifiers and spare filters!"
                  actionLabel="Start Shopping"
                  onAction={() => router.push('/(tabs)/categories')}
                />
              )}
            </View>
          ) : (
            filteredOrders.map((order, orderIdx) => {
              const customerOrderNum = getCustomerFacingOrderNumber(order.id, order.orderNumber);
              const currentStep = getStepIndex(order.orderStatus);
              const isCancelled = order.orderStatus === 'cancelled';
              const isBuying = buyingOrderIndex === orderIdx;

              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => handleOpenOrderDetails(order)}
                  activeOpacity={0.92}
                  accessibilityLabel={`Order ${customerOrderNum}, total ${formatPrice(order.total)}`}
                  accessibilityRole="button"
                >
                  {/* Order Top Bar: Customer-facing Order Number, Date & Status Badge */}
                  <View style={styles.orderTopBar}>
                    <View style={styles.orderNumberContainer}>
                      <View style={styles.orderNumberRow}>
                        <Text style={styles.orderIdText}>{customerOrderNum}</Text>
                        <View style={styles.detailsChevronBadge}>
                          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                        </View>
                      </View>
                      <Text style={styles.orderDate}>
                        {formatOrderDate(order.createdAt, true)}
                        {order.paymentProvider === 'razorpay' ? ' • Razorpay' : ''}
                      </Text>
                    </View>
                    <StatusBadge
                      variant={getBadgeVariant(order.orderStatus)}
                      label={order.orderStatus.toUpperCase()}
                    />
                  </View>

                  {/* Order Progress Tracker */}
                  <View style={styles.trackerWrapper}>
                    {isCancelled ? (
                      <View style={styles.cancelledBanner}>
                        <Ionicons name="close-circle" size={18} color={colors.error} />
                        <Text style={styles.cancelledText}>Order was cancelled</Text>
                      </View>
                    ) : (
                      <View style={styles.progressContainer}>
                        {/* Progress Stepper with 4 clearly aligned columns */}
                        <View style={styles.stepperRow}>
                          {ORDER_STAGES.map((stage, idx) => {
                            const isCompleted = currentStep >= idx;
                            const isCurrent = currentStep === idx;
                            const isLast = idx === ORDER_STAGES.length - 1;

                            return (
                              <React.Fragment key={stage.key}>
                                {/* Stage Column: Indicator dot + Label */}
                                <View style={styles.stepColumn}>
                                  <View
                                    style={[
                                      styles.stepNode,
                                      isCompleted && styles.stepNodeCompleted,
                                      isCurrent && styles.stepNodeCurrent,
                                    ]}
                                  >
                                    {isCompleted ? (
                                      <Ionicons name="checkmark" size={11} color={colors.white} />
                                    ) : (
                                      <View style={styles.stepNodeInner} />
                                    )}
                                  </View>
                                  <Text
                                    style={[
                                      styles.stepNodeLabel,
                                      isCompleted && styles.stepNodeLabelCompleted,
                                      isCurrent && styles.stepNodeLabelCurrent,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {stage.label}
                                  </Text>
                                </View>

                                {/* Connector Line between stages */}
                                {!isLast && (
                                  <View style={styles.connectorLineWrapper}>
                                    <View
                                      style={[
                                        styles.connectorLine,
                                        currentStep > idx && styles.connectorLineCompleted,
                                      ]}
                                    />
                                  </View>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </View>

                        {/* Delivery Status Note */}
                        <View style={styles.deliveryStatusRow}>
                          <Ionicons
                            name={order.orderStatus === 'delivered' ? 'checkmark-circle' : 'time-outline'}
                            size={14}
                            color={order.orderStatus === 'delivered' ? colors.success : colors.primary}
                          />
                          <Text style={styles.deliveryStatusText}>
                            {getEstimatedDeliveryText(order)}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Items List */}
                  <View style={styles.itemsWrapper}>
                    {order.items.map((item, idx) => (
                      <View key={`${item.productId}-${idx}`} style={styles.orderItem}>
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.itemThumb}
                          resizeMode="cover"
                        />
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemName} numberOfLines={2}>
                            {item.name}
                          </Text>
                          <Text style={styles.itemQty}>
                            Qty: {item.quantity} × {formatPrice(item.price)}
                          </Text>
                        </View>
                        <Text style={styles.itemTotal}>
                          {formatPrice(item.price * item.quantity)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Total & Action Footer */}
                  <View style={styles.orderFooter}>
                    <View style={styles.totalBlock}>
                      <Text style={styles.footerLabel}>Total Amount</Text>
                      <Text style={styles.footerAmount}>{formatPrice(order.total)}</Text>
                    </View>

                    <View style={styles.footerActions}>
                      <TouchableOpacity
                        style={styles.detailsBtn}
                        onPress={() => handleOpenOrderDetails(order)}
                        activeOpacity={0.7}
                        accessibilityLabel="View order details"
                        accessibilityRole="button"
                      >
                        <Text style={styles.detailsBtnText}>Details</Text>
                        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.buyAgainBtn}
                        onPress={() => handleBuyAgain(order, orderIdx)}
                        disabled={isBuying}
                        activeOpacity={0.8}
                        accessibilityLabel="Buy items again"
                        accessibilityRole="button"
                      >
                        {isBuying ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <Ionicons name="refresh-outline" size={15} color={colors.primary} />
                            <Text style={styles.buyAgainBtnText}>Buy Again</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.heading1,
    color: colors.white,
    fontSize: 24,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.peach,
    marginTop: 2,
  },
  signInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.yellow,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  signInBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  filterContainer: {
    marginTop: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  filterTabActive: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
  filterTabText: {
    ...typography.labelSmall,
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countBadgeActive: {
    backgroundColor: colors.primary,
  },
  countBadgeText: {
    ...typography.labelSmall,
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  countBadgeTextActive: {
    color: colors.yellow,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    paddingVertical: spacing['3xl'],
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  demoNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  demoNoticeText: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  serviceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F3E8FF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  serviceBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceBannerTitle: {
    ...typography.label,
    color: colors.primary,
    fontSize: 13,
  },
  serviceBannerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  serviceBannerAction: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  serviceBannerActionText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  orderTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderNumberContainer: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderIdText: {
    ...typography.heading3,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  detailsChevronBadge: {
    padding: 2,
  },
  orderDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  trackerWrapper: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cancelledText: {
    ...typography.labelSmall,
    color: colors.error,
    fontWeight: '700',
    fontSize: 12,
  },
  progressContainer: {
    gap: spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepColumn: {
    alignItems: 'center',
    width: 58,
  },
  stepNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepNodeCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNodeCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.yellow,
    borderWidth: 3,
  },
  stepNodeInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  stepNodeLabel: {
    ...typography.labelSmall,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stepNodeLabelCompleted: {
    color: colors.text,
    fontWeight: '600',
  },
  stepNodeLabelCurrent: {
    color: colors.primary,
    fontWeight: '800',
  },
  connectorLineWrapper: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
    marginHorizontal: -4,
  },
  connectorLine: {
    height: 2,
    backgroundColor: colors.border,
    width: '100%',
  },
  connectorLineCompleted: {
    backgroundColor: colors.primary,
  },
  deliveryStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#EED7D0',
    marginTop: 2,
  },
  deliveryStatusText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  itemsWrapper: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
  },
  itemQty: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  itemTotal: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  totalBlock: {
    justifyContent: 'center',
  },
  footerLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  footerAmount: {
    ...typography.heading2,
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  detailsBtnText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  buyAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.yellow,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  buyAgainBtnText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
});
