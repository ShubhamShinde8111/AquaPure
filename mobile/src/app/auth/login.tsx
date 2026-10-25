/**
 * AquaPure — Mobile Sign In Screen
 * Route: /auth/login
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppRefreshControl, AquaPureLogo } from '@/components/ui';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { signIn, loading, clearError, executePendingAction, pendingAction } = useAuthStore();
  const insets = useSafeAreaInsets();

  // Android: extra scroll room so the last fields can always be scrolled
  // above the keyboard. iOS is handled by KeyboardAvoidingView.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setErrorMessage('');
    clearError();
  }, [clearError]);

  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

  const handleLogin = async () => {
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    const res = await signIn(email.trim(), password);
    if (res.success) {
      const executed = executePendingAction(router);
      if (!executed) {
        router.replace('/(tabs)/profile');
      }
    } else {
      setErrorMessage(res.error || 'Failed to sign in. Please check credentials.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS === 'android' && keyboardHeight > 0
              ? { paddingBottom: keyboardHeight + spacing.xl }
              : null,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              title="Pull to reset login"
            />
          }
        >
          {/* Hero */}
          <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
            <View style={styles.circleLarge} />
            <View style={styles.circleSmall} />

            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityLabel="Back"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.heroCenter}>
              <View style={styles.brandIconWrap}>
                <AquaPureLogo width={82} />
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to manage your orders, warranties & purifier services
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            {pendingAction ? (
              <View style={styles.pendingActionBox}>
                <Ionicons name="information-circle" size={18} color={colors.primary} />
                <Text style={styles.pendingActionText}>
                  {pendingAction.type === 'ADD_TO_CART'
                    ? 'Sign in to add this item to your cart.'
                    : pendingAction.type === 'BUY_NOW' ||
                      pendingAction.type === 'PLACE_ORDER' ||
                      pendingAction.type === 'PROCEED_TO_CHECKOUT'
                    ? 'Sign in to review your cart and place your order.'
                    : 'Sign in to submit your technician booking.'}
                </Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Input
              label="Email Address"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              value={password}
              onChangeText={setPassword}
            />

            <Button
              title="Sign In"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleLogin}
              style={{ marginTop: spacing.md }}
            />
          </View>

          {/* Footers / Links */}
          <View style={styles.footer}>
            <View style={styles.signupRow}>
              <Text style={styles.footerText}>New to AquaPure?</Text>
              <TouchableOpacity
                onPress={() => router.push('/auth/register')}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Text style={styles.linkText}>Create Account</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Dealer Link */}
            <TouchableOpacity
              style={styles.dealerBanner}
              onPress={() => router.push('/auth/dealer-register')}
              activeOpacity={0.8}
            >
              <View style={styles.dealerIconWrap}>
                <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dealerTitle}>Are you a Water Purifier Dealer?</Text>
                <Text style={styles.dealerSub}>Apply for wholesale pricing and B2B terms</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing['4xl'],
  },

  // Hero
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'] + spacing.md, // room for card overlap
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  circleLarge: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  circleSmall: {
    position: 'absolute',
    bottom: 10,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginBottom: spacing.md,
  },
  heroCenter: {
    alignItems: 'center',
  },
  brandIconWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    ...typography.heading1,
    color: '#FFFFFF',
    fontSize: 28,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },

  // Form
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: -(spacing['3xl'] ?? 40),
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  pendingActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#EBF4FE',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  pendingActionText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFEBEE',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    flex: 1,
  },

  // Footer
  footer: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  linkText: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: colors.border,
  },
  dealerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  dealerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealerTitle: {
    ...typography.heading3,
    color: colors.text,
    fontSize: 14,
  },
  dealerSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
});