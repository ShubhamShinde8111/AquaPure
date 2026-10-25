/**
 * AquaPure — Categories & Catalog Screen
 * Route: /(tabs)/categories
 *
 * Implements:
 * - Category selector with counts and domain icons
 * - Real-time search and filter (by name, specs, product code)
 * - 2-column Product Grid with ProductCard
 * - Loading, error, and empty states
 * - Proper bottom padding to avoid tab bar overlay
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ProductsService } from '@/services/productsService';
import { ProductCard } from '@/components/ProductCard';
import { Product, ProductCategory } from '@/types';
import { CATEGORIES, CategoryInfo } from '@/data/seedProducts';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { LoadingState, EmptyState, ErrorState, AppRefreshControl } from '@/components/ui';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing.md;
const COLUMN_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;

// Bottom tab bar height (56) + extra padding for Android safe area
const TAB_BAR_HEIGHT = 56;
const BOTTOM_CONTENT_PADDING = TAB_BAR_HEIGHT + spacing.lg;

export default function CategoriesScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<any>(null);
  const initialParamApplied = useRef(false);

  // Apply category param from navigation (e.g. from home screen's "View All")
  useEffect(() => {
    if (params.category && !initialParamApplied.current) {
      const target = (params.category || '').toLowerCase();
      const validCategory = CATEGORIES.find(
        (c) =>
          c.id.toLowerCase() === target ||
          c.name.toLowerCase() === target ||
          (target === 'purifiers' && c.id === 'water-purifiers') ||
          (target === 'dispensers' && c.id === 'water-dispensers') ||
          (target === 'pumps' && c.id === 'water-pumps') ||
          (target === 'filters' && c.id === 'filters-cartridges') ||
          (target === 'spare-parts' && c.id === 'spare-parts-accessories')
      );
      if (validCategory) {
        setSelectedCategory(validCategory.id);
      }
      initialParamApplied.current = true;
    }
  }, [params.category]);

  // Shimmer animation for loading skeleton
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [loading, shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const fetchProducts = useCallback(async () => {
    try {
      const data = await ProductsService.getProducts({
        categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
        search: searchQuery,
      });
      setProducts(data);
      setError(null);
    } catch (err) {
      setError('Failed to load products. Please try again.');
    }
  }, [selectedCategory, searchQuery]);

  const { refreshing, onRefresh } = usePullToRefresh(fetchProducts);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const data = await ProductsService.getProducts({
          categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
          search: searchQuery,
        });
        if (isMounted) {
          setProducts(data);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load products. Please try again.');
          setLoading(false);
        }
      }
    }, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedCategory, searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.blur();
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedCategory('all');
    setSearchQuery('');
    searchInputRef.current?.blur();
  }, []);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchProducts().finally(() => setLoading(false));
  }, [fetchProducts]);

  // Count for active category label
  const activeLabel =
    selectedCategory === 'all'
      ? 'All Products'
      : CATEGORIES.find((c) => c.id === selectedCategory)?.name ?? 'Products';

  const resultCount = products.length;

  const renderSkeletonCard = () => (
    <Animated.View style={[styles.skeletonCard, { opacity: shimmerOpacity }]}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonCategory} />
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonTitleShort} />
        <View style={styles.skeletonPrice} />
      </View>
    </Animated.View>
  );

  const renderLoadingSkeleton = () => (
    <View style={[styles.skeletonContainer, { paddingBottom: BOTTOM_CONTENT_PADDING + insets.bottom }]}>
      <View style={styles.skeletonRow}>
        {renderSkeletonCard()}
        {renderSkeletonCard()}
      </View>
      <View style={styles.skeletonRow}>
        {renderSkeletonCard()}
        {renderSkeletonCard()}
      </View>
      <View style={styles.skeletonRow}>
        {renderSkeletonCard()}
        {renderSkeletonCard()}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Product Catalog</Text>
          <Text style={styles.subtitle}>Explore water purifiers, spares & filters</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search by name, spec, or code..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="never"
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Category Pills Bar ── */}
      <View style={styles.categoriesBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryPill,
              selectedCategory === 'all' && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory('all')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategory === 'all' }}
            accessibilityLabel="All Products"
          >
            <Ionicons
              name="apps"
              size={14}
              color={selectedCategory === 'all' ? colors.white : colors.text}
            />
            <Text
              style={[
                styles.categoryPillText,
                selectedCategory === 'all' && styles.categoryPillTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`${cat.name}, ${cat.itemCount} items`}
              >
                <Text style={styles.categoryPillIcon}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.categoryPillText,
                    isActive && styles.categoryPillTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {cat.name.replace('Water ', '').replace(' & Valves', '')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Results Count Bar ── */}
      {!loading && !error && (
        <View style={styles.resultsBar}>
          <Text style={styles.resultsText}>
            {resultCount} {resultCount === 1 ? 'product' : 'products'}
            {searchQuery ? ` for "${searchQuery}"` : ''}
          </Text>
          {(searchQuery || selectedCategory !== 'all') && (
            <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Product List Content ── */}
      {loading && !refreshing ? (
        renderLoadingSkeleton()
      ) : error ? (
        <View style={styles.errorContainer}>
          <ErrorState message={error} onRetry={handleRetry} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: BOTTOM_CONTENT_PADDING + insets.bottom },
            products.length === 0 && styles.emptyListContent,
          ]}
          columnWrapperStyle={products.length > 0 ? styles.rowWrapper : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              title="Pull to refresh catalog"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="🔍"
              title="No Products Found"
              description={
                searchQuery
                  ? `No matches for "${searchQuery}". Try a different keyword or product code.`
                  : 'No products in this category yet.'
              }
              actionLabel="Clear Filter"
              onAction={handleClearAll}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <ProductCard product={item} />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  // ── Header ──
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerContent: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.heading1,
    color: colors.white,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.peach,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0, // Remove default padding on Android
  },

  // ── Category Pills ──
  categoriesBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  categoriesContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  categoryPillIcon: {
    fontSize: 14,
    lineHeight: 18,
  },
  categoryPillText: {
    ...typography.label,
    fontSize: 12,
    color: colors.text,
  },
  categoryPillTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  // ── Results Bar ──
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultsText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  clearAllText: {
    ...typography.label,
    fontSize: 12,
    color: colors.primary,
  },

  // ── Product List ──
  listContent: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  rowWrapper: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  cardWrapper: {
    width: COLUMN_WIDTH,
  },

  // ── Error Container ──
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Loading Skeleton ──
  skeletonContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  skeletonCard: {
    width: COLUMN_WIDTH,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  skeletonImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.surfaceMuted,
  },
  skeletonContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  skeletonCategory: {
    width: 60,
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  skeletonTitle: {
    width: '90%',
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  skeletonTitleShort: {
    width: '60%',
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  skeletonPrice: {
    width: 70,
    height: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    marginTop: spacing.xs,
  },
});
