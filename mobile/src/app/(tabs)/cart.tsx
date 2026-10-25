/**
 * AquaPure — Shopping Cart Screen
 * Route: /(tabs)/cart
 *
 * Implements:
 * - Brand styling: purple, white, pale pink, and yellow
 * - Refined product cards with consistent image dimensions, typography, and price alignment
 * - Accessible quantity stepper with min/max stock limits and tactile touch targets
 * - Compact and properly aligned Price Details card with Free Delivery progress indicator
 * - Safe-area aware, prominent Proceed to Checkout bar with zero content or nav overlap
 * - Pre-checkout stock & price validation (navigates to checkout without placing order)
 * - Item removal with sleek Undo toast banner
 * - Estimated delivery and Continue Shopping link
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCartStore } from '@/stores/cartStore';
import { useCheckoutStore } from '@/stores/checkoutStore';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Button } from '@/components/ui/Button';
import { EmptyState, AppRefreshControl } from '@/components/ui';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { ProductsService } from '@/services/productsService';
import { CartItem } from '@/types';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const {
    items,
    updateQuantity,
    removeItem,
    restoreItem,
    replaceItems,
    getSubtotal,
    getShippingFee,
    getTotal,
    syncDealerPrices,
  } = useCartStore();

  const { user, isDealerApproved, setPendingAction } = useAuthStore();
  const [validating, setValidating] = useState(false);

  // Undo removal state
  const [recentlyRemoved, setRecentlyRemoved] = useState<{
    item: CartItem;
    index: number;
  } | null>(null);

  const undoAnim = useRef(new Animated.Value(0)).current;
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRefresh = useCallback(async () => {
    syncDealerPrices(isDealerApproved);
  }, [syncDealerPrices, isDealerApproved]);

  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

  const subtotal = getSubtotal();
  const shipping = getShippingFee();
  const total = getTotal();

  // Free delivery threshold (₹999)
  const FREE_SHIPPING_THRESHOLD = 999;
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(1, subtotal / FREE_SHIPPING_THRESHOLD);

  // Currency Formatter
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  // Trigger Undo Banner
  const triggerUndoBanner = (item: CartItem, index: number) => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    setRecentlyRemoved({ item, index });

    Animated.timing(undoAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    undoTimeoutRef.current = setTimeout(() => {
      dismissUndoBanner();
    }, 4500);
  };

  const dismissUndoBanner = () => {
    Animated.timing(undoAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setRecentlyRemoved(null);
    });
  };

  const handleUndo = () => {
    if (recentlyRemoved) {
      restoreItem(recentlyRemoved.item, recentlyRemoved.index);
      dismissUndoBanner();
    }
  };

  // Remove Item with immediate feedback & undo
  const handleRemoveItem = (productId: string) => {
    const itemIndex = items.findIndex((i) => i.product.id === productId);
    if (itemIndex > -1) {
      const removed = items[itemIndex];
      removeItem(productId);
      triggerUndoBanner(removed, itemIndex);
    }
  };

  // Quantity Change with Min/Max guard
  const handleQuantityChange = (productId: string, currentQty: number, change: number) => {
    const item = items.find((i) => i.product.id === productId);
    if (!item) return;

    const maxLimit = item.maxQuantity || (item.product.stockStatus === 'limited' ? 5 : 10);
    const newQty = currentQty + change;

    if (newQty <= 0) {
      // Confirm item removal or remove with undo
      Alert.alert(
        'Remove Item',
        `Do you want to remove ${item.name} from your cart?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => handleRemoveItem(productId),
          },
        ]
      );
      return;
    }

    if (newQty > maxLimit) {
      Alert.alert(
        'Limit Reached',
        item.product.stockStatus === 'limited'
          ? `Only ${maxLimit} units of ${item.name} are available per customer due to limited stock.`
          : `Maximum order limit of ${maxLimit} units reached for this item.`
      );
      return;
    }

    updateQuantity(productId, newQty);
  };

  // Pre-checkout Stock & Availability Validation
  const handleProceedToCheckout = async () => {
    if (items.length === 0) return;

    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to proceed to checkout and place your order.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => {
              setPendingAction({
                type: 'PROCEED_TO_CHECKOUT',
                returnUrl: '/checkout',
              });
              router.push('/auth/login');
            },
          },
        ]
      );
      return;
    }

    setValidating(true);
    try {
      // Validate each product against live catalog/service
      const outOfStockItems: string[] = [];
      const updatedItems: CartItem[] = [];
      let hasPriceChange = false;

      for (const item of items) {
        const liveProduct = await ProductsService.getProductById(item.product.id);
        if (!liveProduct || liveProduct.stockStatus === 'out_of_stock' || !liveProduct.active) {
          outOfStockItems.push(item.name);
        } else {
          const currentPrice =
            isDealerApproved && liveProduct.dealerPrice
              ? liveProduct.dealerPrice
              : liveProduct.customerPrice;

          if (currentPrice !== item.unitPrice) {
            hasPriceChange = true;
          }

          updatedItems.push({
            ...item,
            product: liveProduct,
            unitPrice: currentPrice,
            totalPrice: currentPrice * item.quantity,
          });
        }
      }

      if (outOfStockItems.length > 0) {
        Alert.alert(
          'Items Unavailable',
          `The following items are currently out of stock:\n\n• ${outOfStockItems.join(
            '\n• '
          )}\n\nPlease remove them from your cart to proceed with checkout.`,
          [{ text: 'OK' }]
        );
        setValidating(false);
        return;
      }

      if (hasPriceChange) {
        replaceItems(updatedItems);
        useCheckoutStore.getState().initCheckout(updatedItems, 'cart');
        Alert.alert(
          'Price Update',
          'Some items in your cart had price updates. Your cart total has been refreshed.',
          [{ text: 'Continue to Checkout', onPress: () => router.push('/checkout') }]
        );
        setValidating(false);
        return;
      }

      // Safe to proceed to actual checkout flow without placing order yet
      useCheckoutStore.getState().initCheckout(items, 'cart');
      router.push('/checkout');
    } catch (err) {
      console.warn('Cart checkout validation error:', err);
      // In case of network check failure, still permit proceeding
      useCheckoutStore.getState().initCheckout(items, 'cart');
      router.push('/checkout');
    } finally {
      setValidating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Shopping Cart</Text>
          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountBadgeText}>
              {items.reduce((s, i) => s + i.quantity, 0)}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {items.length === 0
            ? 'Your basket is empty'
            : `${items.length} ${items.length === 1 ? 'unique product' : 'unique products'} in your basket`}
        </Text>
      </View>

      {items.length === 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, styles.emptyScrollContent]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              title="Pull to refresh cart"
            />
          }
        >
          <EmptyState
            icon="🛒"
            title="Your Cart is Empty"
            description="Explore our water purifiers, replacement filter kits and accessories to ensure pure drinking water."
            actionLabel="Explore Catalog"
            onAction={() => router.push('/(tabs)/categories')}
          />
        </ScrollView>
      ) : (
        <View style={styles.contentWrapper}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              // Generous bottom padding to ensure Price Details & footer never hide under fixed bottom bar
              { paddingBottom: Math.max(insets.bottom, 16) + 120 },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <AppRefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                title="Pull to refresh cart"
              />
            }
          >
            {/* Dealer Wholesale Notice if Active */}
            {isDealerApproved && (
              <View style={styles.dealerBanner}>
                <Ionicons name="sparkles" size={18} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dealerBannerTitle}>Dealer Wholesale Active</Text>
                  <Text style={styles.dealerBannerText}>
                    Wholesale trade discounts applied to eligible items
                  </Text>
                </View>
              </View>
            )}

            {/* Free Shipping Progress Indicator */}
            <View style={styles.shippingThresholdCard}>
              <View style={styles.shippingThresholdHeader}>
                <Ionicons
                  name={shipping === 0 ? 'checkmark-circle' : 'car-outline'}
                  size={18}
                  color={shipping === 0 ? colors.success : colors.primary}
                />
                <Text style={styles.shippingThresholdTitle}>
                  {shipping === 0
                    ? 'You have unlocked FREE Delivery!'
                    : `Add ${formatPrice(amountToFreeShipping)} more for FREE Delivery`}
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.round(freeShippingProgress * 100)}%`,
                      backgroundColor: shipping === 0 ? colors.success : colors.yellow,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Cart Items List */}
            <View style={styles.itemsList}>
              {items.map(({ product, quantity, unitPrice, totalPrice, maxQuantity }) => {
                if (!product) return null;
                const maxStock = maxQuantity || (product.stockStatus === 'limited' ? 5 : 10);
                const isAtMax = quantity >= maxStock;

                return (
                  <View key={product.id} style={styles.cartCard}>
                    {/* Consistent Product Thumbnail */}
                    <TouchableOpacity
                      onPress={() => router.push(`/product/${product.id}`)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: product.imageUrl }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>

                    <View style={styles.cardDetails}>
                      {/* Category Tag & Stock Status */}
                      <View style={styles.metaRow}>
                        <Text style={styles.cardCategory}>
                          {product.categoryId ? product.categoryId.toUpperCase() : 'WATER PURIFIER'}
                        </Text>
                        {product.stockStatus === 'limited' ? (
                          <View style={styles.stockBadgeWarning}>
                            <Text style={styles.stockBadgeWarningText}>Limited Stock</Text>
                          </View>
                        ) : (
                          <View style={styles.stockBadgeSuccess}>
                            <Text style={styles.stockBadgeSuccessText}>In Stock</Text>
                          </View>
                        )}
                      </View>

                      {/* Product Title */}
                      <TouchableOpacity
                        onPress={() => router.push(`/product/${product.id}`)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {product.name}
                        </Text>
                      </TouchableOpacity>

                      {/* Unit Price */}
                      <Text style={styles.unitPriceText}>
                        {formatPrice(unitPrice)} <Text style={styles.unitPriceSub}>each</Text>
                      </Text>

                      {/* Actions: Stepper, Price & Remove */}
                      <View style={styles.actionRow}>
                        {/* Stepper with accessible controls */}
                        <View style={styles.stepper}>
                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => handleQuantityChange(product.id, quantity, -1)}
                            accessibilityLabel={quantity === 1 ? `Remove ${product.name}` : 'Decrease quantity'}
                            accessibilityRole="button"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons
                              name={quantity === 1 ? 'trash-outline' : 'remove'}
                              size={16}
                              color={quantity === 1 ? colors.error : colors.primary}
                            />
                          </TouchableOpacity>

                          <View style={styles.stepperValueContainer}>
                            <Text style={styles.stepperText}>{quantity}</Text>
                          </View>

                          <TouchableOpacity
                            style={[styles.stepperBtn, isAtMax && styles.stepperBtnDisabled]}
                            onPress={() => handleQuantityChange(product.id, quantity, 1)}
                            disabled={isAtMax}
                            accessibilityLabel="Increase quantity"
                            accessibilityRole="button"
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons
                              name="add"
                              size={16}
                              color={isAtMax ? '#A0A0A0' : colors.primary}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* Total Item Price */}
                        <Text style={styles.totalItemPrice}>{formatPrice(totalPrice)}</Text>

                        {/* Explicit Delete Icon Button */}
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleRemoveItem(product.id)}
                          accessibilityLabel={`Remove ${product.name} from cart`}
                          accessibilityRole="button"
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash-outline" size={19} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Price Details Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTitleRow}>
                <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                <Text style={styles.summaryTitle}>
                  Price Details ({items.reduce((s, i) => s + i.quantity, 0)} {items.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'items'})
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items Subtotal</Text>
                <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    shipping === 0 && { color: colors.success, fontWeight: '700' },
                  ]}
                >
                  {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Taxes & GST</Text>
                <Text style={[styles.summaryValue, { color: colors.textSecondary }]}>
                  Included
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>Total Payable</Text>
                  <Text style={styles.totalLabelSub}>Inclusive of all taxes</Text>
                </View>
                <Text style={styles.totalValue}>{formatPrice(total)}</Text>
              </View>
            </View>

            {/* Estimated Delivery & Guarantees */}
            <View style={styles.trustBanner}>
              <View style={styles.trustItem}>
                <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                <Text style={styles.trustText}>100% Genuine AquaPure Products</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={styles.trustText}>Delivered within 2–4 business days</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="refresh-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.trustText}>7-Day Replacement & Verified Warranty</Text>
              </View>
            </View>

            {/* Continue Shopping Link */}
            <TouchableOpacity
              style={styles.continueShoppingBtn}
              onPress={() => router.push('/(tabs)/categories')}
              activeOpacity={0.7}
              accessibilityLabel="Continue shopping for more products"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={16} color={colors.primary} />
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Undo Removal Toast Banner */}
          {recentlyRemoved && (
            <Animated.View
              style={[
                styles.undoToast,
                {
                  opacity: undoAnim,
                  transform: [
                    {
                      translateY: undoAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.undoToastLeft}>
                <Ionicons name="information-circle" size={18} color={colors.white} />
                <Text style={styles.undoToastText} numberOfLines={1}>
                  {recentlyRemoved.item.name} removed
                </Text>
              </View>
              <TouchableOpacity
                style={styles.undoBtn}
                onPress={handleUndo}
                accessibilityLabel="Undo remove item"
                accessibilityRole="button"
              >
                <Text style={styles.undoBtnText}>UNDO</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Bottom Sticky Checkout Bar (Safe-Area Aware & Zero Overlap) */}
          <View
            style={[
              styles.bottomBar,
              { paddingBottom: Math.max(insets.bottom, 10) },
            ]}
          >
            <View style={styles.bottomPriceContainer}>
              <Text style={styles.bottomLabel}>Total Amount</Text>
              <Text style={styles.bottomTotal}>{formatPrice(total)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.checkoutBtn, validating && styles.checkoutBtnDisabled]}
              onPress={handleProceedToCheckout}
              disabled={validating}
              activeOpacity={0.88}
              accessibilityLabel={`Proceed to checkout, total ${formatPrice(total)}`}
              accessibilityRole="button"
            >
              {validating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.heading1,
    color: colors.white,
    fontSize: 24,
  },
  itemCountBadge: {
    backgroundColor: colors.yellow,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  itemCountBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.peach,
    marginTop: 2,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  dealerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#E8F5E9',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  dealerBannerTitle: {
    ...typography.label,
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
  },
  dealerBannerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  shippingThresholdCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shippingThresholdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  shippingThresholdTitle: {
    ...typography.labelSmall,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  itemsList: {
    gap: spacing.md,
  },
  cartCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  thumbnail: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardCategory: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 10,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  stockBadgeSuccess: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  stockBadgeSuccessText: {
    ...typography.labelSmall,
    color: colors.success,
    fontSize: 9,
    fontWeight: '700',
  },
  stockBadgeWarning: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  stockBadgeWarningText: {
    ...typography.labelSmall,
    color: colors.warning,
    fontSize: 9,
    fontWeight: '700',
  },
  cardTitle: {
    ...typography.heading3,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
  },
  unitPriceText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 13,
    marginTop: 2,
  },
  unitPriceSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '400',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 34,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperValueContainer: {
    paddingHorizontal: spacing.sm,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    ...typography.label,
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  totalItemPrice: {
    ...typography.heading3,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  summaryTitle: {
    ...typography.label,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 13,
  },
  summaryValue: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  totalLabel: {
    ...typography.heading3,
    color: colors.text,
    fontSize: 15,
  },
  totalLabelSub: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 10,
  },
  totalValue: {
    ...typography.display,
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  trustBanner: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trustText: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  continueShoppingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  continueShoppingText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  undoToast: {
    position: 'absolute',
    bottom: 84,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99,
  },
  undoToastLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    paddingRight: spacing.sm,
  },
  undoToastText: {
    ...typography.bodySmall,
    color: colors.white,
    fontSize: 12,
  },
  undoBtn: {
    backgroundColor: colors.yellow,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  undoBtnText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '800',
    fontSize: 11,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8,
  },
  bottomPriceContainer: {
    paddingRight: spacing.md,
  },
  bottomLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  bottomTotal: {
    ...typography.heading1,
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  checkoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.yellow,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  checkoutBtnDisabled: {
    opacity: 0.6,
  },
  checkoutBtnText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
});
