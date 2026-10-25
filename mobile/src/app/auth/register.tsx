/**
 * AquaPure — Mobile Customer Sign Up Screen
 * Route: /auth/register
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Input, TextInputRef } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppRefreshControl, AquaPureLogo } from '@/components/ui';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';

const BENEFITS = [
  { icon: 'flash-outline', label: 'Fast checkout' },
  { icon: 'location-outline', label: 'Order tracking' },
  { icon: 'notifications-outline', label: 'Reminders' },
] as const;

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const emailInputRef = useRef<TextInputRef>(null);
  const phoneInputRef = useRef<TextInputRef>(null);
  const passwordInputRef = useRef<TextInputRef>(null);
  const confirmPasswordInputRef = useRef<TextInputRef>(null);

  const {
    scrollViewRef,
    keyboardHeight,
    handleScroll,
    registerCardLayout,
    registerFieldLayout,
    handleFieldFocus,
    handleFieldBlur,
  } = useKeyboardAwareScroll({ keyboardClearance: 40, topMargin: 20 });

  const { signUpCustomer, loading, clearError, executePendingAction, pendingAction } = useAuthStore();
  const insets = useSafeAreaInsets();

  const handleRefresh = useCallback(async () => {
    setErrorMessage('');
    clearError();
  }, [clearError]);

  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

  const handleRegister = async () => {
    setErrorMessage('');
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    const res = await signUpCustomer({
      email: email.trim(),
      pass: password,
      name: name.trim(),
      phone: phone.trim(),
    });

    if (res.success) {
      const executed = executePendingAction(router);
      if (!executed) {
        router.replace('/(tabs)/profile');
      }
    } else {
      setErrorMessage(res.error || 'Failed to register account.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                keyboardHeight > 0
                  ? Platform.OS === 'ios'
                    ? spacing['4xl'] + spacing.lg
                    : keyboardHeight + spacing.xl
                  : spacing['4xl'],
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              title="Pull to reset registration"
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

            <View style={styles.logoBadge}>
              <AquaPureLogo width={76} />
            </View>
            <Text style={styles.title}>Create Customer Account</Text>
            <Text style={styles.subtitle}>
              Sign up for faster checkout, order tracking and service reminders
            </Text>

            <View style={styles.benefitsRow}>
              {BENEFITS.map((b) => (
                <View key={b.label} style={styles.benefitChip}>
                  <Ionicons name={b.icon} size={14} color="#FFFFFF" />
                  <Text style={styles.benefitText}>{b.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Form */}
          <View onLayout={registerCardLayout} style={styles.formCard}>
            {pendingAction ? (
              <View style={styles.pendingActionBox}>
                <Ionicons name="information-circle" size={18} color={colors.primary} />
                <Text style={styles.pendingActionText}>
                  {pendingAction.type === 'ADD_TO_CART'
                    ? 'Create an account to add this item to your cart.'
                    : pendingAction.type === 'BUY_NOW' ||
                      pendingAction.type === 'PLACE_ORDER' ||
                      pendingAction.type === 'PROCEED_TO_CHECKOUT'
                    ? 'Create an account to review your cart and place your order.'
                    : 'Create an account to submit your technician booking.'}
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
              label="Full Name"
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => emailInputRef.current?.focus()}
              containerOnLayout={registerFieldLayout('name')}
              onFocus={() => handleFieldFocus('name')}
              onBlur={() => handleFieldBlur('name')}
            />

            <Input
              ref={emailInputRef}
              label="Email Address"
              placeholder="rahul@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => phoneInputRef.current?.focus()}
              value={email}
              onChangeText={setEmail}
              containerOnLayout={registerFieldLayout('email')}
              onFocus={() => handleFieldFocus('email')}
              onBlur={() => handleFieldBlur('email')}
            />

            <Input
              ref={phoneInputRef}
              label="Phone Number"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              value={phone}
              onChangeText={setPhone}
              containerOnLayout={registerFieldLayout('phone')}
              onFocus={() => handleFieldFocus('phone')}
              onBlur={() => handleFieldBlur('phone')}
            />

            <Input
              ref={passwordInputRef}
              label="Password"
              placeholder="Minimum 6 characters"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
              value={password}
              onChangeText={setPassword}
              containerOnLayout={registerFieldLayout('password')}
              onFocus={() => handleFieldFocus('password')}
              onBlur={() => handleFieldBlur('password')}
            />

            <Input
              ref={confirmPasswordInputRef}
              label="Confirm Password"
              placeholder="Re-enter password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              containerOnLayout={registerFieldLayout('confirmPassword')}
              onFocus={() => handleFieldFocus('confirmPassword')}
              onBlur={() => handleFieldBlur('confirmPassword')}
            />

            <Button
              title="Create Account"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleRegister}
              style={{ marginTop: spacing.md }}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity
              onPress={() => router.push('/auth/login')}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <Text style={styles.linkText}>Sign In</Text>
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
    marginBottom: spacing.lg,
  },
  logoBadge: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 5,
    elevation: 2,
  },
  title: {
    ...typography.heading1,
    color: '#FFFFFF',
    fontSize: 26,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 22,
  },
  benefitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  benefitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  benefitText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '600',
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
    flexDirection: 'row',
    justifyContent: 'center',
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
});