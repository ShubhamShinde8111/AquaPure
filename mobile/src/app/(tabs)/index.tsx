/**
 * AquaPure — Home Screen (redesigned)
 * Follows DESIGN.md §6.2 Home Screen layout
 * Powered by live catalog products
 *
 * What changed vs. the previous version:
 *  - Header, search and hero merged into one cohesive top block
 *  - Real tap-to-search bar instead of a search icon
 *  - Trust strip overlapping the hero (adds credibility, breaks the flat stack)
 *  - Category shortcuts are lighter (icon circles, no heavy boxed cards)
 *  - "Book service" is a clear, highlighted primary shortcut
 *  - Skeleton loading + empty states for carousels
 *  - Sold-out products are dimmed; category labels use sentence case
 *  - Product card is a memoized component (less re-rendering)
 *  - Data loading has error handling and loads in one pass
 */

import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { ProductsService } from '@/services/productsService';
import { Product } from '@/types';
import { CATEGORIES } from '@/data/seedProducts';
import { AppRefreshControl, AquaPureLogo } from '@/components/ui';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL = SCREEN_WIDTH < 360;

// ── Layout constants ──
const CAROUSEL_CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.44, 200);
const CAROUSEL_IMAGE_HEIGHT = CAROUSEL_CARD_WIDTH * 0.8;
const CATEGORY_ITEM_WIDTH = 72;
const CATEGORY_ICON_SIZE = 60;
const TAB_BAR_HEIGHT = 56;
const SKELETON_COUNT = 3;

// ── Helpers ──
const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const formatPrice = (price: number) => priceFormatter.format(price);

/** "spare-parts" → "Spare parts" */
const formatCategory = (id?: string) => {
  if (!id) return '';
  const text = id.replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const shortCategoryName = (name?: string) =>
  (name || '').replace('Water ', '').replace(' & Valves', '');

const TRUST_ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'shield-checkmark-outline', label: 'Genuine\nproducts' },
  { icon: 'construct-outline', label: 'Doorstep\nservice' },
  { icon: 'lock-closed-outline', label: 'Secure\npayments' },
];

// ─────────────────────────────────────────────
// Small presentational components
// ─────────────────────────────────────────────

const SectionHeader = memo(function SectionHeader({
  title,
  onViewAll,
  viewAllLabel,
}: {
  title: string;
  onViewAll: () => void;
  viewAllLabel: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity
        onPress={onViewAll}
        accessibilityRole="button"
        accessibilityLabel={viewAllLabel}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.viewAllWrap}
      >
        <Text style={styles.viewAll}>View all</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
});

const ProductCard = memo(function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: (p: Product) => void;
}) {
  const soldOut = product.stockStatus === 'out_of_stock';
  const limited = product.stockStatus === 'limited';

  return (
    <TouchableOpacity
      style={styles.carouselCard}
      activeOpacity={0.85}
      onPress={() => onPress(product)}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, price ${formatPrice(product.customerPrice)}${soldOut ? ', sold out' : ''
        }`}
    >
      <View style={styles.carouselImageWrap}>
        <Image
          source={{ uri: product.imageUrl }}
          style={[styles.carouselImage, soldOut && styles.dimmed]}
          resizeMode="cover"
        />
        {(limited || soldOut) && (
          <View style={[styles.stockBadge, soldOut && styles.stockBadgeOos]}>
            <Text style={styles.stockBadgeText}>{soldOut ? 'Sold out' : 'Few left'}</Text>
          </View>
        )}
      </View>
      <View style={styles.carouselCardContent}>
        <Text style={styles.carouselCategoryLabel} numberOfLines={1}>
          {formatCategory(product.categoryId)}
        </Text>
        <Text style={styles.carouselProductName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.carouselPrice, soldOut && styles.priceMuted]}>
          {formatPrice(product.customerPrice)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

/** Pulsing placeholder shown while the catalog loads */
const SkeletonCard = memo(function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.carouselCard, styles.skeletonCard, { opacity }]}>
      <View style={[styles.carouselImageWrap, styles.skeletonBlock]} />
      <View style={styles.carouselCardContent}>
        <View style={[styles.skeletonLine, { width: '40%' }]} />
        <View style={[styles.skeletonLine, { width: '90%', height: 12 }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 14 }]} />
      </View>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────

export default function HomeScreen() {
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [dealProducts, setDealProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const insets = useSafeAreaInsets();

  // Bottom padding: tab bar + safe area inset + extra spacing
  const bottomPadding = TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + spacing.lg;

  const loadCatalog = useCallback(async () => {
    try {
      const all = await ProductsService.getProducts();
      // Purifiers and dispensers for popular
      setPopularProducts(
        all
          .filter((p) => p.categoryId === 'water-purifiers' || p.categoryId === 'water-dispensers' || p.categoryId === 'purifiers' || p.categoryId === 'dispensers')
          .slice(0, 6)
      );
      // Affordable items (spares, filters) for best deals
      setDealProducts(all.filter((p) => p.customerPrice < 2000).slice(0, 6));
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const { refreshing, onRefresh } = usePullToRefresh(loadCatalog);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleNavigateCategories = useCallback((catId?: string) => {
    if (catId) {
      router.push({ pathname: '/(tabs)/categories', params: { category: catId } });
    } else {
      router.push('/(tabs)/categories');
    }
  }, []);

  const handleProductPress = useCallback((product: Product) => {
    router.push({ pathname: '/product/[id]', params: { id: product.id } });
  }, []);

  /** Carousel body: skeleton → error → empty → products */
  const renderCarousel = (items: Product[], emptyText: string) => {
    if (loading) {
      return (
        <ScrollView
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
        >
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </ScrollView>
      );
    }

    if (loadFailed && items.length === 0) {
      return (
        <View style={styles.stateBox}>
          <Ionicons name="cloud-offline-outline" size={24} color={colors.textSecondary} />
          <Text style={styles.stateText}>Couldn't load products. Check your connection.</Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              loadCatalog();
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading products"
            style={styles.retryBtn}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (items.length === 0) {
      return (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>{emptyText}</Text>
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContainer}
        decelerationRate="fast"
        snapToInterval={CAROUSEL_CARD_WIDTH + spacing.md}
      >
        {items.map((product) => (
          <ProductCard key={product.id} product={product} onPress={handleProductPress} />
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            title="Pull to refresh catalog"
          />
        }
      >
        {/* ── Top block: header + search + hero ── */}
        <View style={styles.topBlock}>
          <View style={styles.header}>
            <View style={styles.brandLogoWrap}>
              <AquaPureLogo width={66} />
            </View>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => router.push('/(tabs)/cart')}
              accessibilityRole="button"
              accessibilityLabel="Open cart"
            >
              <Ionicons name="cart-outline" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Tap-to-search field */}
          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={0.9}
            onPress={() => handleNavigateCategories()}
            accessibilityRole="search"
            accessibilityLabel="Search purifiers, filters and spare parts"
          >
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              Search purifiers, filters, spares
            </Text>
          </TouchableOpacity>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Pure water for a{'\n'}healthier home</Text>
              <Text style={styles.heroSubtitle}>
                Purifiers, filters and accessories, delivered and installed.
              </Text>
              <TouchableOpacity
                style={styles.heroCta}
                activeOpacity={0.8}
                onPress={() => handleNavigateCategories()}
                accessibilityRole="button"
                accessibilityLabel="Shop now"
              >
                <Text style={styles.heroCtaText}>Shop now</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.heroDecor1} />
            <View style={styles.heroDecor2} />
          </View>
        </View>

        {/* ── Trust strip (overlaps hero) ── */}
        <View style={styles.trustStrip}>
          {TRUST_ITEMS.map((item, i) => (
            <View key={item.icon} style={[styles.trustItem, i > 0 && styles.trustItemDivider]}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
              <Text style={styles.trustLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Shortcuts: Book service + categories ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>
            Shop by category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
          >
            <TouchableOpacity
              style={styles.categoryItem}
              activeOpacity={0.7}
              onPress={() => router.push('/service/book')}
              accessibilityRole="button"
              accessibilityLabel="Book technician service"
            >
              <View style={[styles.categoryIconWrap, styles.serviceIconWrap]}>
                <Ionicons name="construct" size={26} color={colors.white} />
              </View>
              <Text style={[styles.categoryLabel, styles.serviceLabel]} numberOfLines={2}>
                Book{'\n'}service
              </Text>
            </TouchableOpacity>

            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryItem}
                activeOpacity={0.7}
                onPress={() => handleNavigateCategories(cat.id)}
                accessibilityRole="button"
                accessibilityLabel={`Browse ${cat.name}`}
              >
                <View style={styles.categoryIconWrap}>
                  <Text style={styles.categoryIconEmoji}>{cat.icon}</Text>
                </View>
                <Text style={styles.categoryLabel} numberOfLines={2}>
                  {shortCategoryName(cat.name)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Popular products ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Popular purifiers & systems"
            onViewAll={() => handleNavigateCategories('water-purifiers')}
            viewAllLabel="View all purifiers and systems"
          />
          {renderCarousel(popularProducts, 'No purifiers available right now.')}
        </View>

        {/* ── Service banner ── */}
        <TouchableOpacity
          style={styles.serviceBanner}
          activeOpacity={0.85}
          onPress={() => router.push('/service/book')}
          accessibilityRole="button"
          accessibilityLabel="Book maintenance or repair service"
        >
          <View style={styles.serviceBannerInner}>
            <View style={styles.serviceIconCircle}>
              <Ionicons name="construct-outline" size={24} color={colors.white} />
            </View>
            <View style={styles.serviceBannerTextWrap}>
              <Text style={styles.serviceBannerTitle}>Need maintenance or repair?</Text>
              <Text style={styles.serviceBannerDesc}>
                Book a certified technician at your doorstep
              </Text>
            </View>
            <View style={styles.serviceBannerArrow}>
              <Ionicons name="chevron-forward" size={20} color={colors.white} />
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Best deals ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Best deals & spare parts"
            onViewAll={() => handleNavigateCategories('spare-parts')}
            viewAllLabel="View all deals and spare parts"
          />
          {renderCarousel(dealProducts, 'No deals available right now.')}
        </View>

        {/* ── Brand Footer ── */}
        <View style={styles.brandFooter}>
          <AquaPureLogo width={110} />
          <Text style={styles.brandFooterText}>Pure water for every home • Official Store</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = (opacity: number, radiusPx: number, elevation: number) =>
  Platform.select({
    ios: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: opacity,
      shadowRadius: radiusPx,
    },
    android: { elevation },
  });

const styles = StyleSheet.create({
  // ── Root ──
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Top block ──
  topBlock: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    paddingBottom: spacing['3xl'],
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  brandLogoWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Search ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    height: 48,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
  },
  searchPlaceholder: {
    ...typography.body,
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
  },

  // ── Hero ──
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    position: 'relative',
  },
  heroContent: {
    zIndex: 1,
  },
  heroTitle: {
    ...typography.display,
    color: colors.white,
    fontSize: IS_SMALL ? 24 : 30,
    lineHeight: IS_SMALL ? 32 : 38,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.peach,
    fontSize: IS_SMALL ? 13 : 15,
    lineHeight: IS_SMALL ? 19 : 22,
    marginBottom: spacing.xl,
    maxWidth: 300,
  },
  heroCta: {
    backgroundColor: colors.yellow,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  heroCtaText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  heroDecor1: {
    position: 'absolute',
    right: -30,
    top: 0,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.coral,
    opacity: 0.15,
  },
  heroDecor2: {
    position: 'absolute',
    right: 50,
    bottom: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.peach,
    opacity: 0.12,
  },

  // ── Trust strip ──
  trustStrip: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: -spacing['2xl'],
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    ...cardShadow(0.1, 10, 4),
  },
  trustItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  trustItemDivider: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  trustLabel: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },

  // ── Sections ──
  section: {
    marginTop: spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.heading2,
    color: colors.text,
    fontSize: 18,
    flexShrink: 1,
  },
  sectionTitleStandalone: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  viewAllWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAll: {
    ...typography.label,
    color: colors.primary,
    fontSize: 13,
  },

  // ── Category shortcuts ──
  categoriesRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  categoryItem: {
    width: CATEGORY_ITEM_WIDTH,
    alignItems: 'center',
  },
  categoryIconWrap: {
    width: CATEGORY_ICON_SIZE,
    height: CATEGORY_ICON_SIZE,
    borderRadius: CATEGORY_ICON_SIZE / 2,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...cardShadow(0.05, 4, 1),
  },
  serviceIconWrap: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIconEmoji: {
    fontSize: 26,
    lineHeight: 32,
  },
  categoryLabel: {
    ...typography.bodySmall,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 15,
  },
  serviceLabel: {
    color: colors.primary,
    fontWeight: '700',
  },

  // ── Product carousel ──
  carouselContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  carouselCard: {
    width: CAROUSEL_CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow(0.06, 8, 2),
  },
  carouselImageWrap: {
    width: '100%',
    height: CAROUSEL_IMAGE_HEIGHT,
    backgroundColor: colors.surfaceMuted,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  dimmed: {
    opacity: 0.45,
  },
  stockBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.warning,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  stockBadgeOos: {
    backgroundColor: colors.error,
  },
  stockBadgeText: {
    ...typography.labelSmall,
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  carouselCardContent: {
    padding: spacing.md,
    gap: 4,
  },
  carouselCategoryLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  carouselProductName: {
    ...typography.heading3,
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    minHeight: 38,
  },
  carouselPrice: {
    ...typography.heading2,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  priceMuted: {
    color: colors.textSecondary,
  },

  // ── Skeleton / states ──
  skeletonCard: {
    borderColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  skeletonBlock: {
    backgroundColor: colors.surfaceMuted,
  },
  skeletonLine: {
    height: 10,
    borderRadius: 4,
    backgroundColor: colors.surfaceMuted,
  },
  stateBox: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stateText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  retryText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Service banner ──
  serviceBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing['2xl'],
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  serviceBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  serviceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceBannerTextWrap: {
    flex: 1,
  },
  serviceBannerTitle: {
    ...typography.heading3,
    color: colors.white,
    fontSize: 15,
  },
  serviceBannerDesc: {
    ...typography.bodySmall,
    color: colors.peach,
    marginTop: 2,
    fontSize: 12,
  },
  serviceBannerArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    opacity: 0.85,
    gap: spacing.xs,
  },
  brandFooterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});