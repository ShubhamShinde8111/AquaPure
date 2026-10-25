/**
 * AquaPure — Mobile Dealer Application Screen
 * Route: /auth/dealer-register
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
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Input, TextInputRef } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppRefreshControl, AquaPureLogo } from '@/components/ui';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useKeyboardAwareScroll } from '@/hooks/useKeyboardAwareScroll';

const BENEFITS = [
  { icon: 'pricetag-outline', label: 'Wholesale pricing' },
  { icon: 'cube-outline', label: 'Bulk dispatch' },
  { icon: 'construct-outline', label: 'Warranty claims' },
] as const;

export default function DealerRegisterScreen() {
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const contactNameInputRef = useRef<TextInputRef>(null);
  const emailInputRef = useRef<TextInputRef>(null);
  const phoneInputRef = useRef<TextInputRef>(null);
  const gstNumberInputRef = useRef<TextInputRef>(null);
  const passwordInputRef = useRef<TextInputRef>(null);

  const {
    scrollViewRef,
    keyboardHeight,
    handleScroll,
    registerCardLayout,
    registerFieldLayout,
    handleFieldFocus,
    handleFieldBlur,
  } = useKeyboardAwareScroll({ keyboardClearance: 40, topMargin: 20 });

  const { applyAsDealer, loading, clearError, user, refreshProfile } = useAuthStore();
  const insets = useSafeAreaInsets();

  const handleRefresh = useCallback(async () => {
    setErrorMessage('');
    clearError();
    if (user) {
      await refreshProfile();
    }
  }, [clearError, user, refreshProfile]);

  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

  const handleApply = async () => {
    setErrorMessage('');
    if (!businessName.trim() || !contactName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setErrorMessage('Please fill in all mandatory fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    const res = await applyAsDealer({
      email: email.trim(),
      pass: password,
      name: contactName.trim(),
      phone: phone.trim(),
      businessName: businessName.trim(),
      gstNumber: gstNumber.trim(),
    });

    if (res.success) {
      setSubmitted(true);
    } else {
      setErrorMessage(res.error || 'Failed to submit dealer application.');
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              title="Pull to check status"
            />
          }
        >
          <View style={styles.successContainer}>
            <View style={styles.successLogoWrap}>
              <AquaPureLogo width={96} />
            </View>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Ionicons name="checkmark-done-circle" size={64} color={colors.success} />
              </View>
            </View>
            <Text style={styles.successTitle}>Application Submitted!</Text>
            <Text style={styles.successDesc}>
              Thank you for applying to the AquaPure Dealer Partner Network.
              Our team will review your business credentials ({businessName}) within 24-48 hours.
            </Text>
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={16} color={colors.warning} />
              <Text style={styles.pendingText}>STATUS: PENDING VERIFICATION</Text>
            </View>
            <Button
              title="Go to My Profile"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.replace('/(tabs)/profile')}
              style={{ marginTop: spacing.xl }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
              title="Pull to reset form"
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

            <View style={styles.heroLogoBadge}>
              <AquaPureLogo width={76} />
            </View>

            <View style={styles.badgeWrap}>
              <Ionicons name="briefcase" size={12} color={colors.primary} />
              <Text style={styles.badgeText}>B2B PARTNER NETWORK</Text>
            </View>
            <Text style={styles.title}>Dealer Registration</Text>
            <Text style={styles.subtitle}>
              Unlock exclusive wholesale pricing, bulk dispatch, and technician warranty claims
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
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Input
              label="Business / Enterprise Name *"
              placeholder="e.g. Apex Water Technologies"
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
              autoComplete="organization"
              textContentType="organizationName"
              returnKeyType="next"
              onSubmitEditing={() => contactNameInputRef.current?.focus()}
              containerOnLayout={registerFieldLayout('businessName')}
              onFocus={() => handleFieldFocus('businessName')}
              onBlur={() => handleFieldBlur('businessName')}
            />

            <Input
              ref={contactNameInputRef}
              label="Authorized Contact Person *"
              placeholder="e.g. Suresh Patel"
              value={contactName}
              onChangeText={setContactName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => emailInputRef.current?.focus()}
              containerOnLayout={registerFieldLayout('contactName')}
              onFocus={() => handleFieldFocus('contactName')}
              onBlur={() => handleFieldBlur('contactName')}
            />

            <Input
              ref={emailInputRef}
              label="Business Email Address *"
              placeholder="dealers@apexwater.com"
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
              label="Contact Phone Number *"
              placeholder="+91 98765 00000"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="next"
              onSubmitEditing={() => gstNumberInputRef.current?.focus()}
              value={phone}
              onChangeText={setPhone}
              containerOnLayout={registerFieldLayout('phone')}
              onFocus={() => handleFieldFocus('phone')}
              onBlur={() => handleFieldBlur('phone')}
            />

            <Input
              ref={gstNumberInputRef}
              label="GSTIN Number (Optional)"
              placeholder="22AAAAA0000A1Z5"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              value={gstNumber}
              onChangeText={setGstNumber}
              containerOnLayout={registerFieldLayout('gstNumber')}
              onFocus={() => handleFieldFocus('gstNumber')}
              onBlur={() => handleFieldBlur('gstNumber')}
            />

            <Input
              ref={passwordInputRef}
              label="Account Password *"
              placeholder="Minimum 6 characters"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleApply}
              value={password}
              onChangeText={setPassword}
              containerOnLayout={registerFieldLayout('password')}
              onFocus={() => handleFieldFocus('password')}
              onBlur={() => handleFieldBlur('password')}
            />

            <Button
              title="Submit Dealer Application"
              variant="accent"
              size="lg"
              loading={loading}
              onPress={handleApply}
              style={{ marginTop: spacing.md }}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already registered?</Text>
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
  heroLogoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 5,
    elevation: 2,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.yellow,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
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

  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  successLogoWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 3,
  },
  successIconOuter: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(76,175,80,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successIconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  successTitle: {
    ...typography.heading1,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successDesc: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  pendingText: {
    ...typography.labelSmall,
    color: colors.warning,
    fontWeight: '700',
    letterSpacing: 1,
  },
});