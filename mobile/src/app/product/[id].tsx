/**
 * AquaPure — Product Detail Screen
 * Route: /product/[id]
 *
 * Implements:
 * - Swipeable product image gallery with pagination dots
 * - Image loading, failure handling and pinch-to-zoom
 * - Pricing with dealer price display if applicable
 * - Savings callout when dealer pricing is active
 * - Stock status indicator with quantity limits
 * - Technical specifications table (responsive two-column)
 * - Quantity selector with stock enforcement
 * - "Add to Cart" and "Buy Now" actions
 * - Professional installation navigation with product prefill
 * - Warranty & delivery info from product data
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Share,
  FlatList,
  ActivityIndicator,
  Platform,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ProductsService } from '@/services/productsService';
import { useCartStore } from '@/stores/cartStore';
import { useCheckoutStore } from '@/stores/checkoutStore';
import { useAuthStore } from '@/stores/authStore';
import { Product, CartItem } from '@/types';
import { useTheme, useThemedStyles, ThemeColors, spacing, radius, typography } from '@/theme';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingState, ErrorState, AppRefreshControl } from '@/components/ui';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 320;

// ──── Gallery Image Component ────
function GalleryImage({
  uri,
  onPress,
}: {
  uri: string;
  onPress?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[
        galleryStyles.imageSlide,
        { backgroundColor: isDark ? '#150D20' : colors.card },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Product image. Tap to view full screen zoom."
    >
      {loading && !error && (
        <View style={galleryStyles.imagePlaceholder}>
          <ActivityIndicator size="large" color={colors.peach} />
        </View>
      )}
      {error ? (
        <View style={galleryStyles.imagePlaceholder}>
          <Ionicons name="image-outline" size={48} color={colors.border} />
          <Text style={galleryStyles.errorText}>Image unavailable</Text>
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={galleryStyles.image}
          resizeMode="contain"
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
        />
      )}
    </TouchableOpacity>
  );
}

const galleryStyles = StyleSheet.create({
  imageSlide: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    ...(StyleSheet.absoluteFill as object),
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.bodySmall,
    color: '#9E94A8',
    marginTop: spacing.sm,
  },
});

// ──── Main Screen ────
export default function ProductDetailScreen() {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(getStyles);
  const { id, productId } = useLocalSearchParams<{ id?: string; productId?: string }>();
  const targetId = id || productId;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [buyNowModalVisible, setBuyNowModalVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const galleryRef = useRef<FlatList>(null);

  const loadProduct = useCallback(async () => {
    if (!targetId) return;
    const data = await ProductsService.getProductById(targetId);
    setProduct(data);
  }, [targetId]);

  const { refreshing, onRefresh } = usePullToRefresh(loadProduct);

  useEffect(() => {
    let isMounted = true;
    async function initLoad() {
      if (!targetId) return;
      setLoading(true);
      const data = await ProductsService.getProductById(targetId);
      if (isMounted) {
        setProduct(data);
        setLoading(false);
      }
    }
    initLoad();
    return () => {
      isMounted = false;
    };
  }, [targetId]);

  // Toast animation
  useEffect(() => {
    if (addedToast) {
      Animated.sequence([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1800),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => setAddedToast(false));
    }
  }, [addedToast, toastOpacity]);

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `Check out ${product.name} on AquaPure: ₹${product.customerPrice}`,
      });
    } catch {
      // Ignore
    }
  };

  const { addItem, items: cartItems } = useCartStore();
  const { user, isDealerApproved, setPendingAction } = useAuthStore();

  // Compute stock-based max quantity
  const maxQuantity = useMemo(() => {
    if (!product) return 1;
    if (product.stockStatus === 'out_of_stock') return 0;
    return product.stockStatus === 'limited' ? 5 : 10;
  }, [product]);

  const handleAddToCart = () => {
    if (!product) return;
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to add this purifier to your cart.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => {
              setPendingAction({
                type: 'ADD_TO_CART',
                product,
                quantity,
                returnUrl: `/product/${product.id}`,
              });
              router.push('/auth/login');
            },
          },
        ]
      );
      return;
    }
    addItem(product, quantity, isDealerApproved);
    setAddedToast(true);
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to buy this purifier and proceed to checkout.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => {
              setPendingAction({
                type: 'BUY_NOW',
                product,
                quantity,
                returnUrl: `/product/${product.id}`,
              });
              router.push('/auth/login');
            },
          },
        ]
      );
      return;
    }
    setBuyNowModalVisible(true);
  };

  const handleConfirmPurchaseAlone = () => {
    if (!product) return;
    const unitPrice =
      isDealerApproved && product.dealerPrice
        ? product.dealerPrice
        : (product.customerPrice ?? product.price ?? 0);
    const initialQty = Math.max(1, quantity);
    const validQty = Math.min(initialQty, maxQuantity || 10);
    const checkoutItem: CartItem = {
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      price: unitPrice,
      unitPrice,
      totalPrice: unitPrice * validQty,
      quantity: validQty,
      maxQuantity: maxQuantity || 10,
      product,
    };
    useCheckoutStore.getState().initCheckout([checkoutItem], 'buy_now');
    setBuyNowModalVisible(false);
    router.push('/checkout');
  };

  const handleConfirmReviewCart = () => {
    if (!product) return;
    addItem(product, quantity, isDealerApproved);
    setBuyNowModalVisible(false);
    router.push('/(tabs)/cart');
  };

  const handleBookInstallation = () => {
    if (!product) return;
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to schedule an installation or service visit.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => {
              setPendingAction({
                type: 'BOOK_SERVICE',
                bookingData: {
                  selectedType: 'installation',
                  productId: product.id,
                  productName: product.name,
                },
                returnUrl: '/service/book',
              });
              router.push('/auth/login');
            },
          },
        ]
      );
      return;
    }
    router.push({
      pathname: '/service/book',
      params: {
        productName: product.name,
        productId: product.id,
      },
    });
  };

  // Gallery images — combine primary + gallery[]
  const galleryImages = useMemo(() => {
    if (!product) return [];
    const images = [product.imageUrl];
    if (product.gallery && product.gallery.length > 0) {
      images.push(...product.gallery.filter((url) => url && url !== product.imageUrl));
    }
    return images;
  }, [product]);

  const onGalleryScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      setActiveImageIndex(index);
    },
    []
  );

  // ──── Loading / Error States ────
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState message="Loading product details..." />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              title="Pull to retry"
            />
          }
        >
          <ErrorState
            message="We couldn't find the product you're looking for."
            onRetry={() => loadProduct()}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ──── Pricing Calculations ────
  const formattedCustomerPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(product.customerPrice);

  // Format dealer price strictly if user is an approved dealer
  const formattedDealerPrice =
    isDealerApproved && product.dealerPrice
      ? new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(product.dealerPrice)
      : null;

  // Show savings only when dealer is approved and there's a valid price difference
  const showSavings =
    isDealerApproved &&
    product.dealerPrice != null &&
    product.dealerPrice > 0 &&
    product.customerPrice > product.dealerPrice;

  const savingsAmount = showSavings ? product.customerPrice - product.dealerPrice! : 0;
  const savingsPercent = showSavings
    ? Math.round((savingsAmount / product.customerPrice) * 100)
    : 0;

  const formattedSavings = showSavings
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(savingsAmount)
    : null;

  // Effective price for the user
  const effectivePrice =
    isDealerApproved && product.dealerPrice ? product.dealerPrice : product.customerPrice;

  // Warranty info from specs
  const warrantySpec = product.specifications?.find(
    (s) => s.label.toLowerCase().includes('warranty')
  );

  // Category display name
  const categoryDisplay = (product.category || product.categoryId || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const isOutOfStock = product.stockStatus === 'out_of_stock';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1} ellipsizeMode="tail">
          {product.name}
        </Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleShare}
          accessibilityLabel="Share product"
        >
          <Ionicons name="share-social-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            title="Pull to refresh product details"
          />
        }
      >
        {/* ── Product Image Gallery ── */}
        <View style={styles.imageContainer}>
          <FlatList
            ref={galleryRef}
            data={galleryImages}
            renderItem={({ item, index }) => (
              <GalleryImage
                uri={item}
                onPress={() => {
                  setZoomIndex(index);
                  setZoomVisible(true);
                }}
              />
            )}
            keyExtractor={(item, index) => `${index}-${item}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onGalleryScroll}
            scrollEventThrottle={16}
            bounces={false}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
          />

          {/* Zoom Hint Badge */}
          <TouchableOpacity
            style={styles.zoomHintBadge}
            onPress={() => {
              setZoomIndex(activeImageIndex);
              setZoomVisible(true);
            }}
            accessibilityLabel="Tap to zoom image"
          >
            <Ionicons name="expand-outline" size={12} color={colors.white} />
            <Text style={styles.zoomHintText}>Tap to zoom</Text>
          </TouchableOpacity>

          {/* Gallery Pagination Dots */}
          {galleryImages.length > 1 && (
            <View style={styles.paginationRow}>
              {galleryImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === activeImageIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Image Counter Badge */}
          {galleryImages.length > 1 && (
            <View style={styles.imageCounterBadge}>
              <Ionicons name="images-outline" size={12} color={colors.white} />
              <Text style={styles.imageCounterText}>
                {activeImageIndex + 1}/{galleryImages.length}
              </Text>
            </View>
          )}
        </View>

        {/* Thumbnail Navigation Strip (when multiple images) */}
        {galleryImages.length > 1 && (
          <View style={styles.thumbnailContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailList}
            >
              {galleryImages.map((uri, idx) => (
                <TouchableOpacity
                  key={`thumb-${idx}`}
                  onPress={() => {
                    setActiveImageIndex(idx);
                    galleryRef.current?.scrollToIndex({ index: idx, animated: true });
                  }}
                  style={[
                    styles.thumbnailItem,
                    idx === activeImageIndex && styles.thumbnailItemActive,
                  ]}
                  accessibilityLabel={`View image ${idx + 1}`}
                >
                  <Image source={{ uri }} style={styles.thumbnailImage} resizeMode="contain" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Info Container ── */}
        <View style={styles.infoCard}>
          {/* Category & Stock Status Row (Stock badge placed consistently without obscuring image) */}
          <View style={styles.categoryRow}>
            <View style={styles.categoryPill}>
              <Ionicons name="water" size={13} color={colors.primary} />
              <Text style={styles.categoryLabel}>{categoryDisplay}</Text>
            </View>
            <StatusBadge
              variant={
                product.stockStatus === 'in_stock'
                  ? 'success'
                  : product.stockStatus === 'limited'
                  ? 'warning'
                  : 'error'
              }
              label={
                product.stockStatus === 'in_stock'
                  ? 'In Stock'
                  : product.stockStatus === 'limited'
                  ? 'Limited Stock'
                  : 'Out of Stock'
              }
            />
          </View>
          <Text style={styles.productTitle}>{product.name}</Text>

          {/* Availability Status Banner */}
          <View
            style={[
              styles.availabilityBanner,
              product.stockStatus === 'limited' && styles.availabilityBannerWarning,
              isOutOfStock && styles.availabilityBannerError,
            ]}
          >
            <Ionicons
              name={
                product.stockStatus === 'in_stock'
                  ? 'checkmark-circle'
                  : product.stockStatus === 'limited'
                  ? 'alert-circle'
                  : 'close-circle'
              }
              size={16}
              color={
                product.stockStatus === 'in_stock'
                  ? colors.success
                  : product.stockStatus === 'limited'
                  ? colors.warning
                  : colors.coral
              }
            />
            <Text
              style={[
                styles.availabilityBannerText,
                product.stockStatus === 'limited' && styles.availabilityBannerTextWarning,
                isOutOfStock && styles.availabilityBannerTextError,
              ]}
            >
              {product.stockStatus === 'in_stock'
                ? 'Available for Immediate Dispatch • Free Delivery'
                : product.stockStatus === 'limited'
                ? 'Limited Inventory Remaining • Max 5 Units Per Order'
                : 'Currently Out of Stock • Restock In Progress'}
            </Text>
          </View>

          {/* ── Pricing Section ── */}
          <View style={styles.pricingSection}>
            <View style={styles.pricingMain}>
              {isDealerApproved && product.dealerPrice ? (
                <>
                  <View style={styles.dealerPricingTag}>
                    <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                    <Text style={styles.dealerPricingTagText}>Approved Dealer Wholesale Rate</Text>
                  </View>
                  <Text style={styles.priceLabel}>Wholesale Dealer Price</Text>
                  <Text style={styles.priceValue}>{formattedDealerPrice}</Text>
                  <Text style={styles.retailPriceStrikethrough}>
                    Retail MRP {formattedCustomerPrice}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.priceLabel}>Retail Price</Text>
                  <Text style={styles.priceValue}>{formattedCustomerPrice}</Text>
                  <Text style={styles.taxInclusiveText}>
                    Inclusive of all taxes & genuine warranty
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Savings Banner (Only for approved dealers with valid calculated savings) */}
          {showSavings && formattedSavings && (
            <View style={styles.savingsBanner}>
              <Ionicons name="pricetag" size={14} color={colors.success} />
              <Text style={styles.savingsText}>
                You save {formattedSavings} ({savingsPercent}% wholesale margin) as an approved dealer
              </Text>
            </View>
          )}

          {/* ── Quantity Selector ── */}
          <View style={styles.quantitySection}>
            <View>
              <Text style={styles.quantityLabel}>Quantity</Text>
              {product.stockStatus === 'limited' && (
                <Text style={styles.stockLimitHint}>Max 5 units per order</Text>
              )}
              {product.stockStatus === 'in_stock' && (
                <Text style={styles.stockLimitHintNormal}>Max 10 units per order</Text>
              )}
              {isOutOfStock && (
                <Text style={styles.stockLimitHintError}>Item out of stock</Text>
              )}
            </View>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || isOutOfStock}
                accessibilityLabel="Decrease quantity"
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={quantity <= 1 || isOutOfStock ? colors.border : colors.primary}
                />
              </TouchableOpacity>
              <Text style={[styles.qtyText, isOutOfStock && { color: colors.textSecondary }]}>
                {isOutOfStock ? 0 : quantity}
              </Text>
              <TouchableOpacity
                style={[
                  styles.qtyBtn,
                  (quantity >= maxQuantity || isOutOfStock) && styles.qtyBtnDisabled,
                ]}
                onPress={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity || isOutOfStock}
                accessibilityLabel="Increase quantity"
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={
                    quantity >= maxQuantity || isOutOfStock ? colors.border : colors.primary
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Description ── */}
          {product.description ? (
            <>
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionHeading}>Description</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </>
          ) : null}

          {/* ── Specifications Table ── */}
          {product.specifications && product.specifications.length > 0 && (
            <>
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionHeading}>Technical Specifications</Text>
              <View style={styles.specsTable}>
                {product.specifications.map((spec, index) => (
                  <View
                    key={index}
                    style={[
                      styles.specRow,
                      index % 2 === 1 && styles.specRowAlt,
                      index === 0 && styles.specRowFirst,
                      index === product.specifications.length - 1 && styles.specRowLast,
                    ]}
                  >
                    <Text style={styles.specLabel} numberOfLines={3}>
                      {spec.label}
                    </Text>
                    <Text style={styles.specValue} numberOfLines={4}>
                      {spec.value}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── Warranty & Delivery Info ── */}
          {warrantySpec && (
            <>
              <View style={styles.sectionDivider} />
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconCircle}>
                    <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.infoItemText}>
                    <Text style={styles.infoItemTitle}>Warranty</Text>
                    <Text style={styles.infoItemValue}>{warrantySpec.value}</Text>
                  </View>
                </View>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconCircle}>
                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.infoItemText}>
                    <Text style={styles.infoItemTitle}>Delivery</Text>
                    <Text style={styles.infoItemValue}>3–7 Business Days</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* ── Guarantee Badges ── */}
          <View style={styles.guaranteeRow}>
            <View style={styles.guaranteeItem}>
              <View style={styles.guaranteeIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.guaranteeTitle}>Genuine</Text>
              <Text style={styles.guaranteeSubtitle}>100% Original</Text>
            </View>
            <View style={styles.guaranteeSeparator} />
            <View style={styles.guaranteeItem}>
              <View style={styles.guaranteeIconWrap}>
                <Ionicons name="car-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.guaranteeTitle}>Fast Delivery</Text>
              <Text style={styles.guaranteeSubtitle}>Pan India</Text>
            </View>
            <View style={styles.guaranteeSeparator} />
            <TouchableOpacity
              style={styles.guaranteeItem}
              onPress={handleBookInstallation}
              accessibilityLabel="Book expert setup"
            >
              <View style={styles.guaranteeIconWrap}>
                <Ionicons name="construct-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.guaranteeTitle}>Expert Setup</Text>
              <Text style={styles.guaranteeSubtitle}>Book Now</Text>
            </TouchableOpacity>
          </View>

          {/* ── Installation & Technician Service Callout ── */}
          <TouchableOpacity
            style={styles.serviceCalloutCard}
            onPress={handleBookInstallation}
            activeOpacity={0.8}
            accessibilityLabel="Book professional installation"
          >
            <View style={styles.serviceCalloutIcon}>
              <Ionicons name="construct" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceCalloutTitle}>Professional Installation Available</Text>
              <Text style={styles.serviceCalloutSubtitle}>
                Book our certified doorstep technician to set up this purifier
              </Text>
            </View>
            <View style={styles.serviceCalloutArrow}>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Added to Cart Feedback Toast ── */}
      {addedToast && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.toastText}>
            Added {quantity} item{quantity > 1 ? 's' : ''} to Cart!
          </Text>
        </Animated.View>
      )}

      {/* ── Bottom Sticky Action Bar ── */}
      <View style={styles.actionBar}>
        <View style={styles.actionBarInner}>
          {/* Price Summary in action bar */}
          <View style={styles.actionBarPriceCol}>
            <Text style={styles.actionBarPriceLabel}>Total</Text>
            <Text style={styles.actionBarPrice}>
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format(effectivePrice * (isOutOfStock ? 0 : quantity))}
            </Text>
          </View>
          <View style={styles.actionBarButtons}>
            <TouchableOpacity
              style={[styles.cartBtn, isOutOfStock && styles.disabledBtn]}
              onPress={handleAddToCart}
              disabled={isOutOfStock}
              accessibilityLabel="Add to cart"
            >
              <Ionicons
                name="cart-outline"
                size={18}
                color={isOutOfStock ? colors.textSecondary : colors.primary}
              />
              <Text
                style={[styles.cartBtnText, isOutOfStock && { color: colors.textSecondary }]}
              >
                Add to Cart
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.buyBtn, isOutOfStock && styles.disabledBtn]}
              onPress={handleBuyNow}
              disabled={isOutOfStock}
              accessibilityLabel={isOutOfStock ? 'Out of stock' : 'Buy now'}
            >
              <Text style={[styles.buyBtnText, isOutOfStock && { color: colors.textSecondary }]}>
                {isOutOfStock ? 'Out of Stock' : 'Buy Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Fullscreen Pinch-to-Zoom Modal ── */}
      <Modal
        visible={zoomVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomVisible(false)}
      >
        <SafeAreaView style={styles.zoomModalBackdrop} edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View style={styles.zoomModalHeader}>
            <View style={styles.zoomModalCounterPill}>
              <Ionicons name="images" size={14} color={colors.white} />
              <Text style={styles.zoomModalCounter}>
                {zoomIndex + 1} of {galleryImages.length}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.zoomModalCloseBtn}
              onPress={() => setZoomVisible(false)}
              accessibilityLabel="Close full screen zoom"
            >
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Pinch-to-Zoom Image View */}
          <ScrollView
            contentContainerStyle={styles.zoomScrollContainer}
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
          >
            <Image
              source={{ uri: galleryImages[zoomIndex] }}
              style={styles.zoomModalImage}
              resizeMode="contain"
            />
          </ScrollView>

          {/* Zoom Modal Thumbnail Strip */}
          {galleryImages.length > 1 && (
            <View style={styles.zoomModalFooter}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.zoomThumbnailsList}
              >
                {galleryImages.map((uri, idx) => (
                  <TouchableOpacity
                    key={`modal-thumb-${idx}`}
                    onPress={() => setZoomIndex(idx)}
                    style={[
                      styles.zoomModalThumb,
                      idx === zoomIndex && styles.zoomModalThumbActive,
                    ]}
                    accessibilityLabel={`Zoom image ${idx + 1}`}
                  >
                    <Image source={{ uri }} style={styles.zoomModalThumbImg} resizeMode="contain" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Buy Now Choice Modal ── */}
      <Modal
        visible={buyNowModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBuyNowModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setBuyNowModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.buyNowSheet}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetIconWrap}>
                <Ionicons name="bag-check" size={24} color={colors.primary} />
              </View>
              <View style={styles.sheetHeaderTitles}>
                <Text style={styles.sheetTitle}>Purchase Options</Text>
                <Text style={styles.sheetSubtitle}>
                  Choose how you want to complete your purchase
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setBuyNowModalVisible(false)}
                style={styles.sheetCloseBtn}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Product summary card */}
            <View style={styles.modalProductCard}>
              {product.imageUrl ? (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.modalProductThumb}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.modalProductInfo}>
                <Text style={styles.modalProductName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.modalProductQty}>
                  Quantity: {quantity} • {isDealerApproved && product.dealerPrice ? formattedDealerPrice : formattedCustomerPrice}
                </Text>
              </View>
            </View>

            {/* Cart info if cart has items */}
            {cartItems.length > 0 && (
              <View style={styles.existingCartAlert}>
                <Ionicons name="cart-outline" size={18} color={colors.primary} />
                <Text style={styles.existingCartText}>
                  You have{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {cartItems.length} other {cartItems.length === 1 ? 'item' : 'items'}
                  </Text>{' '}
                  currently in your cart.
                </Text>
              </View>
            )}

            {/* Option 1: Purchase Alone */}
            <TouchableOpacity
              style={styles.choiceCardPrimary}
              onPress={handleConfirmPurchaseAlone}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Purchase this product alone"
            >
              <View style={styles.choiceIconCirclePrimary}>
                <Ionicons name="flash" size={20} color={colors.white} />
              </View>
              <View style={styles.choiceContent}>
                <Text style={styles.choiceTitlePrimary}>Purchase This Product Alone</Text>
                <Text style={styles.choiceDescPrimary}>
                  Proceed to checkout with only this product. Your {cartItems.length > 0 ? 'existing cart items will remain safe in your cart.' : 'cart will remain empty.'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>

            {/* Option 2: Review Cart */}
            <TouchableOpacity
              style={styles.choiceCardSecondary}
              onPress={handleConfirmReviewCart}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Review cart with all items"
            >
              <View style={styles.choiceIconCircleSecondary}>
                <Ionicons name="cart" size={20} color={colors.primary} />
              </View>
              <View style={styles.choiceContent}>
                <Text style={styles.choiceTitleSecondary}>Review Cart With All Items</Text>
                <Text style={styles.choiceDescSecondary}>
                  Add this product to your cart and review everything together in your cart.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.choiceCancelBtn}
              onPress={() => setBuyNowModalVisible(false)}
            >
              <Text style={styles.choiceCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ──── Styles ────
const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    navButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navTitle: {
      ...typography.heading3,
      color: colors.text,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: spacing.sm,
    },
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      // Enough padding at bottom so content is never covered by the action bar
      paddingBottom: 120,
    },

    // ── Gallery ──
    imageContainer: {
      width: SCREEN_WIDTH,
      height: IMAGE_HEIGHT,
      backgroundColor: isDark ? '#150D20' : colors.card,
      position: 'relative',
    },
    zoomHintBadge: {
      position: 'absolute',
      bottom: spacing.md,
      right: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(33, 4, 64, 0.72)',
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radius.full,
    },
    zoomHintText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    thumbnailContainer: {
      backgroundColor: colors.card,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    thumbnailList: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      alignItems: 'center',
    },
    thumbnailItem: {
      width: 58,
      height: 58,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: isDark ? '#1A1125' : colors.card,
      padding: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbnailItemActive: {
      borderColor: isDark ? colors.yellow : colors.primary,
      borderWidth: 2,
    },
    thumbnailImage: {
      width: '100%',
      height: '100%',
    },
    paginationRow: {
      position: 'absolute',
      bottom: spacing.md,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.xs,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    paginationDotActive: {
      backgroundColor: isDark ? colors.yellow : colors.primary,
      width: 20,
      borderRadius: 4,
    },
    imageCounterBadge: {
      position: 'absolute',
      bottom: spacing.md,
      left: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(33, 4, 64, 0.65)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    imageCounterText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },

    // ── Info Card ──
    infoCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      marginTop: -radius.lg,
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  availabilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  availabilityBannerWarning: {
    backgroundColor: '#FFFBEB',
  },
  availabilityBannerError: {
    backgroundColor: '#FEF2F2',
  },
  availabilityBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    flex: 1,
  },
  availabilityBannerTextWarning: {
    color: colors.warning,
  },
  availabilityBannerTextError: {
    color: colors.coral,
  },
  productTitle: {
    ...typography.heading1,
    color: colors.text,
    fontSize: 22,
    marginBottom: spacing.md,
    lineHeight: 30,
  },

  // ── Pricing ──
  pricingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pricingMain: {
    flexShrink: 1,
  },
  priceLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  priceValue: {
    ...typography.display,
    color: colors.primary,
    fontSize: 26,
    lineHeight: 34,
  },
  retailPriceStrikethrough: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  dealerPricingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  dealerPricingTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  taxInclusiveText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#E8F5E9',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  savingsText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '600',
    flex: 1,
  },

  // ── Quantity ──
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  quantityLabel: {
    ...typography.heading3,
    color: colors.text,
  },
  stockLimitHint: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '500',
    marginTop: 2,
  },
  stockLimitHintNormal: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  stockLimitHintError: {
    fontSize: 11,
    color: colors.coral,
    fontWeight: '600',
    marginTop: 2,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyText: {
    ...typography.heading3,
    paddingHorizontal: spacing.md,
    minWidth: 36,
    textAlign: 'center',
  },

  // ── Sections ──
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  sectionHeading: {
    ...typography.heading2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },

  // ── Specs Table ──
  specsTable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
  },
  specRowAlt: {
    backgroundColor: colors.surfaceMuted,
  },
  specRowFirst: {
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  specRowLast: {
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  specLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    width: '42%',
    paddingRight: spacing.sm,
    flexShrink: 0,
  },
  specValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    flexWrap: 'wrap',
  },

  // ── Warranty & Delivery Info ──
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoItemText: {
    flex: 1,
  },
  infoItemTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  infoItemValue: {
    ...typography.label,
    color: colors.text,
    fontSize: 12,
    marginTop: 1,
  },

  // ── Guarantee Row ──
  guaranteeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing['2xl'],
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  guaranteeItem: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  guaranteeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  guaranteeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  guaranteeSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  guaranteeSeparator: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },

  // ── Service Callout ──
  serviceCalloutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: isDark ? '#26153B' : '#F3E8FF',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: isDark ? '#402364' : '#D8B4FE',
  },
  serviceCalloutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceCalloutTitle: {
    ...typography.label,
    color: isDark ? '#FFFFFF' : colors.primary,
    fontSize: 13,
  },
  serviceCalloutSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  serviceCalloutArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Toast ──
  toastContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.success,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 99,
  },
  toastText: {
    ...typography.label,
    color: colors.text,
  },

  // ── Bottom Action Bar ──
  actionBar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    // Respect Android navigation bar insets
    paddingBottom: Platform.OS === 'android' ? 16 : 0,
  },
  actionBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  actionBarPriceCol: {
    paddingRight: spacing.sm,
  },
  actionBarPriceLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  actionBarPrice: {
    ...typography.heading2,
    color: isDark ? colors.yellow : colors.primary,
    fontSize: 18,
  },
  actionBarButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: isDark ? colors.yellow : colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 46,
  },
  cartBtnText: {
    ...typography.label,
    color: isDark ? colors.yellow : colors.primary,
  },
  buyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 46,
  },
  buyBtnText: {
    ...typography.label,
    color: '#210440',
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.45,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },

  // ── Fullscreen Zoom Modal ──
  zoomModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  zoomModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  zoomModalCounterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  zoomModalCounter: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  zoomModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomScrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomModalImage: {
    width: SCREEN_WIDTH,
    height: 420,
  },
  zoomModalFooter: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  zoomThumbnailsList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  zoomModalThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    padding: 3,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  zoomModalThumbActive: {
    borderColor: colors.peach,
  },
  zoomModalThumbImg: {
    width: '100%',
    height: '100%',
  },

  // ── Buy Now Choice Sheet ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  buyNowSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  sheetHeaderTitles: {
    flex: 1,
  },
  sheetTitle: {
    ...typography.heading3,
    color: colors.text,
  },
  sheetSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  modalProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  modalProductThumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
  },
  modalProductInfo: {
    flex: 1,
  },
  modalProductName: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  modalProductQty: {
    ...typography.caption,
    color: isDark ? colors.yellow : colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  existingCartAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  existingCartText: {
    ...typography.bodySmall,
    color: isDark ? colors.yellow : colors.primary,
    flex: 1,
    fontSize: 12,
  },
  choiceCardPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: isDark ? colors.yellow : colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  choiceIconCirclePrimary: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceContent: {
    flex: 1,
  },
  choiceTitlePrimary: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: isDark ? colors.yellow : colors.primary,
  },
  choiceDescPrimary: {
    ...typography.caption,
    color: colors.text,
    marginTop: 2,
    lineHeight: 16,
  },
  choiceCardSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  choiceIconCircleSecondary: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitleSecondary: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.text,
  },
  choiceDescSecondary: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  choiceCancelBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceCancelText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
