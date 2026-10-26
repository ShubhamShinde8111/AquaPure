/**
 * AquaPure — Account / Profile Screen
 * Route: /(tabs)/profile
 * Full integration with user roles (Customer, Dealer, Admin), profile editing,
 * auth lifecycle, and dynamic Dark/Light/System theme customization.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';
import { useTheme, spacing, radius, typography } from '@/theme';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppRefreshControl, AquaPureLogo } from '@/components/ui';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface ProfileMenuItem {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  badge?: string;
  badgeColor?: string;
  isLast?: boolean;
  onPress: () => void;
}

function MenuItem({
  icon,
  label,
  badge,
  badgeColor,
  isLast = false,
  onPress,
}: ProfileMenuItem) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        { borderBottomColor: colors.border },
        isLast && styles.menuItemLast,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
      {badge ? (
        <View style={[styles.itemBadge, badgeColor ? { backgroundColor: badgeColor } : null]}>
          <Text style={styles.itemBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={styles.trailingChevron} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, themeMode, resolvedTheme, setThemeMode } = useTheme();
  const {
    user,
    profile,
    isAuthenticated,
    isDealer,
    isDealerApproved,
    signOut,
    initialize,
    refreshProfile,
    updateUserProfile,
  } = useAuthStore();

  // Edit Profile Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const handleRefresh = useCallback(async () => {
    if (user) {
      await refreshProfile();
    }
  }, [user, refreshProfile]);

  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const openEditModal = () => {
    setEditName(profile?.displayName || '');
    setEditPhone(profile?.phone || '');
    setEditError('');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    setEditError('');
    if (!editName.trim()) {
      setEditError('Display name cannot be empty.');
      return;
    }

    setEditSaving(true);
    const res = await updateUserProfile({
      displayName: editName.trim(),
      phone: editPhone.trim(),
    });
    setEditSaving(false);

    if (res.success) {
      setEditModalVisible(false);
      Alert.alert('Profile Updated', 'Your profile details have been saved.');
    } else {
      setEditError(res.error || 'Failed to update profile.');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of AquaPure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          showToast({
            title: 'Signed Out',
            message: 'You have been signed out of AquaPure.',
            type: 'info',
          });
        },
      },
    ]);
  };

  const headerBg = isDark ? '#140A20' : colors.primary;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: headerBg }]} edges={['top']}>
      {/* Refined Header */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Account</Text>
          <Text style={[styles.subtitle, { color: colors.peach }]}>Manage your profile & settings</Text>
        </View>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => router.push('/(tabs)/orders')}
          accessibilityLabel="Orders"
        >
          <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            title="Pull to refresh account"
          />
        }
      >
        {!isAuthenticated ? (
          /* ── Guest State ── */
          <View style={[styles.guestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.guestLogoWrap}>
              <AquaPureLogo width={100} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.text }]}>Welcome to AquaPure</Text>
            <Text style={[styles.guestDesc, { color: colors.textSecondary }]}>
              Sign in to track orders, access wholesale pricing & schedule service visits
            </Text>
            <View style={styles.guestActions}>
              <TouchableOpacity
                style={styles.signInBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={styles.signInText}>Sign In / Register</Text>
              </TouchableOpacity>
            </View>

            {/* Service & Repair Quick Link */}
            <TouchableOpacity
              style={[
                styles.serviceLinkCard,
                {
                  backgroundColor: isDark ? '#241438' : '#F3E8FF',
                  borderColor: isDark ? '#3D2260' : '#D8B4FE',
                },
              ]}
              onPress={() => router.push('/service/my-bookings')}
              activeOpacity={0.8}
            >
              <View style={[styles.serviceLinkIconWrap, { backgroundColor: colors.card }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceLinkTitle, { color: colors.text }]}>My Service Bookings</Text>
                <Text style={[styles.serviceLinkSubtitle, { color: colors.textSecondary }]}>
                  Check appointment status & technician tracking
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>

            {/* Dealer Link */}
            <TouchableOpacity
              style={[styles.dealerLinkCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
              onPress={() => router.push('/auth/dealer-register')}
              activeOpacity={0.8}
            >
              <View style={[styles.dealerLinkIconWrap, { backgroundColor: colors.card }]}>
                <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dealerLinkTitle, { color: colors.text }]}>Become an AquaPure Dealer</Text>
                <Text style={[styles.dealerLinkSubtitle, { color: colors.textSecondary }]}>Apply for B2B wholesale catalog</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Authenticated User State ── */
          <>
            {/* Customer Profile Card */}
            <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.avatarLogged, { backgroundColor: isDark ? '#3B1A66' : colors.primary }]}>
                <Text style={styles.avatarText}>
                  {(profile?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </Text>
                <TouchableOpacity
                  style={styles.avatarPencilBadge}
                  onPress={openEditModal}
                  accessibilityLabel="Edit profile photo"
                >
                  <Ionicons name="pencil" size={10} color="#210440" />
                </TouchableOpacity>
              </View>

              <View style={styles.profileInfo}>
                <View style={styles.profileNameRow}>
                  <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
                    {profile?.displayName || 'AquaPure Member'}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.editChip,
                      {
                        backgroundColor: isDark ? '#26153B' : '#F3E8FF',
                        borderColor: isDark ? '#402364' : '#D8B4FE',
                      },
                    ]}
                    onPress={openEditModal}
                  >
                    <Ionicons name="pencil-outline" size={10} color={colors.primary} />
                    <Text style={[styles.editChipText, { color: colors.primary }]}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {user?.email ? (
                  <Text style={[styles.profileEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                ) : null}

                {profile?.phone ? (
                  <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={11} color={colors.textSecondary} />
                    <Text style={[styles.phoneText, { color: colors.textSecondary }]}>{profile.phone}</Text>
                  </View>
                ) : null}

                <View style={styles.roleRow}>
                  {profile?.role === 'dealer' ? (
                    <StatusBadge
                      variant={isDealerApproved ? 'success' : 'warning'}
                      label={isDealerApproved ? 'Verified Dealer' : 'Dealer Pending'}
                    />
                  ) : profile?.role === 'admin' ? (
                    <StatusBadge variant="info" label="Admin Portal" />
                  ) : (
                    <StatusBadge variant="neutral" label="Customer Account" />
                  )}
                </View>
              </View>
            </View>

            {/* Dealer Verification Notice Banners */}
            {isDealer && !isDealerApproved && (
              <View style={[styles.pendingNotice, { borderColor: colors.warning }]}>
                <Ionicons name="time-outline" size={18} color={colors.warning} />
                <Text style={[styles.pendingNoticeText, { color: colors.warning }]}>
                  Your dealer application is under review. Wholesale pricing unlocks upon verification.
                </Text>
              </View>
            )}

            {isDealerApproved && (
              <View style={[styles.approvedNotice, { borderColor: colors.success }]}>
                <Ionicons name="sparkles" size={18} color={colors.success} />
                <Text style={[styles.approvedNoticeText, { color: colors.success }]}>
                  Dealer Wholesale Activated! Trade pricing applied across all products.
                </Text>
              </View>
            )}

            {/* Group 1: Services & Orders */}
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionHeaderTitle, { color: colors.textSecondary }]}>SERVICES & ORDERS</Text>
              <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MenuItem
                  icon="calendar-outline"
                  label="My Service Bookings"
                  badge="Visits"
                  onPress={() => router.push('/service/my-bookings')}
                />
                <MenuItem
                  icon="construct-outline"
                  label="Book Technician / Service Visit"
                  onPress={() => router.push('/service/book')}
                />
                <MenuItem
                  icon="receipt-outline"
                  label="My Orders"
                  onPress={() => router.push('/(tabs)/orders')}
                />
                <MenuItem
                  icon="location-outline"
                  label="Saved Addresses"
                  isLast={!isDealer}
                  onPress={() => {
                    Alert.alert('Delivery Addresses', 'Delivery addresses are securely saved during checkout.');
                  }}
                />
                {isDealer && (
                  <MenuItem
                    icon="pricetags-outline"
                    label="Wholesale Price Catalog"
                    badge="B2B"
                    isLast
                    onPress={() => router.push('/(tabs)/categories')}
                  />
                )}
              </View>
            </View>
          </>
        )}

        {/* ── Group: Appearance & Theme (Available for both Guests & Users) ── */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeaderTitle, { color: colors.textSecondary }]}>APPEARANCE & THEME</Text>
          <View style={[styles.themeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.themeInfoRow}>
              <View style={[styles.themeIconWrap, { backgroundColor: colors.surfaceMuted }]}>
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={18}
                  color={isDark ? colors.yellow : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.themeTitleText, { color: colors.text }]}>Display Theme</Text>
                <Text style={[styles.themeSubtitleText, { color: colors.textSecondary }]}>
                  {themeMode === 'system'
                    ? `System (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`
                    : themeMode === 'dark'
                    ? 'Dark Mode'
                    : 'Light Mode'}
                </Text>
              </View>
            </View>

            {/* 3-Way Segmented Switch */}
            <View style={[styles.themeSegmentContainer, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.themeSegmentBtn,
                  themeMode === 'system' && [
                    styles.themeSegmentBtnActive,
                    { backgroundColor: colors.card },
                  ],
                ]}
                onPress={() => setThemeMode('system')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={15}
                  color={themeMode === 'system' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.themeSegmentText,
                    { color: themeMode === 'system' ? colors.text : colors.textSecondary },
                    themeMode === 'system' && { fontWeight: '700' },
                  ]}
                >
                  System
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeSegmentBtn,
                  themeMode === 'light' && [
                    styles.themeSegmentBtnActive,
                    { backgroundColor: colors.card },
                  ],
                ]}
                onPress={() => setThemeMode('light')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="sunny-outline"
                  size={15}
                  color={themeMode === 'light' ? colors.yellow : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.themeSegmentText,
                    { color: themeMode === 'light' ? colors.text : colors.textSecondary },
                    themeMode === 'light' && { fontWeight: '700' },
                  ]}
                >
                  Light
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeSegmentBtn,
                  themeMode === 'dark' && [
                    styles.themeSegmentBtnActive,
                    { backgroundColor: colors.card },
                  ],
                ]}
                onPress={() => setThemeMode('dark')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="moon-outline"
                  size={15}
                  color={themeMode === 'dark' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.themeSegmentText,
                    { color: themeMode === 'dark' ? colors.text : colors.textSecondary },
                    themeMode === 'dark' && { fontWeight: '700' },
                  ]}
                >
                  Dark
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Group: Support & Legal */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeaderTitle, { color: colors.textSecondary }]}>SUPPORT & ABOUT</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MenuItem
              icon="headset-outline"
              label="Customer Support Helpline"
              onPress={() => {
                Alert.alert(
                  'Customer Support',
                  'Reach AquaPure Care at support@aquapure.com or call 1800-AQUAPURE (Mon-Sat 9AM-8PM).'
                );
              }}
            />
            <MenuItem
              icon="shield-checkmark-outline"
              label="Privacy & Terms"
              onPress={() => {
                Alert.alert(
                  'Privacy & Warranty Terms',
                  'Your personal information is secure with AquaPure. All water purifiers and genuine parts include official manufacturer warranty.'
                );
              }}
            />
            <MenuItem
              icon="information-circle-outline"
              label="About AquaPure"
              badge="v1.0.0"
              badgeColor={colors.surfaceMuted}
              isLast
              onPress={() => {
                Alert.alert('About AquaPure', 'AquaPure v1.0.0\nPure Water for a Healthier Tomorrow.');
              }}
            />
          </View>
        </View>

        {/* Sign Out Button (Authenticated only) */}
        {isAuthenticated && (
          <TouchableOpacity
            style={[
              styles.signOutBtn,
              {
                backgroundColor: isDark ? 'rgba(248, 113, 113, 0.12)' : '#FFEBEE',
                borderColor: isDark ? 'rgba(248, 113, 113, 0.25)' : '#FFCDD2',
              },
            ]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        )}

        {/* Brand App Version Footer */}
        <View style={styles.profileBrandFooter}>
          <AquaPureLogo width={72} />
          <Text style={[styles.profileBrandFooterText, { color: colors.textSecondary }]}>
            AquaPure Commerce • Pure Water. Better Living.
          </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Update your contact information</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {editError ? (
              <View style={styles.modalErrorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.modalErrorText}>{editError}</Text>
              </View>
            ) : null}

            <Input
              label="Full Name *"
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Ramesh Kumar"
              autoCapitalize="words"
            />

            <Input
              label="Phone Number"
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="e.g. +91 98765 43210"
              keyboardType="phone-pad"
            />

            <View style={styles.modalActionRow}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setEditModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save"
                variant="primary"
                loading={editSaving}
                onPress={handleSaveProfile}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    ...typography.heading1,
    color: '#FFFFFF',
    fontSize: 22,
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: 2,
    fontSize: 12,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },

  /* ── Guest Card ── */
  guestCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  guestLogoWrap: {
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTitle: {
    ...typography.heading2,
    fontSize: 18,
  },
  guestDesc: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  guestActions: {
    width: '100%',
  },
  signInBtn: {
    backgroundColor: '#FFBA00',
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  signInText: {
    ...typography.label,
    color: '#210440',
    fontSize: 14,
    fontWeight: '700',
  },
  serviceLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    width: '100%',
    borderWidth: 1,
  },
  serviceLinkIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceLinkTitle: {
    ...typography.heading3,
    fontSize: 13,
  },
  serviceLinkSubtitle: {
    ...typography.bodySmall,
    fontSize: 11,
    marginTop: 1,
  },
  dealerLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    width: '100%',
    borderWidth: 1,
  },
  dealerLinkIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealerLinkTitle: {
    ...typography.heading3,
    fontSize: 13,
  },
  dealerLinkSubtitle: {
    ...typography.bodySmall,
    fontSize: 11,
    marginTop: 1,
  },

  /* ── Authenticated Profile Card ── */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarLogged: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#E9D5FF',
  },
  avatarText: {
    ...typography.heading1,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  avatarPencilBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFBA00',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  profileName: {
    ...typography.heading2,
    fontSize: 16,
    flex: 1,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  editChipText: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: '700',
  },
  profileEmail: {
    ...typography.bodySmall,
    marginTop: 2,
    fontSize: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  phoneText: {
    ...typography.bodySmall,
    fontSize: 11,
  },
  roleRow: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },

  /* ── Notice Banners ── */
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(180, 83, 9, 0.1)',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  pendingNoticeText: {
    ...typography.bodySmall,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  approvedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(22, 128, 61, 0.1)',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  approvedNoticeText: {
    ...typography.bodySmall,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },

  /* ── Grouped Section Cards ── */
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionHeaderTitle: {
    ...typography.labelSmall,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  menuCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    ...typography.body,
    fontSize: 13.5,
    fontWeight: '500',
    flex: 1,
  },
  itemBadge: {
    backgroundColor: '#FFBA00',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: 4,
    flexShrink: 0,
  },
  itemBadgeText: {
    ...typography.labelSmall,
    color: '#210440',
    fontSize: 10,
    fontWeight: '800',
  },
  trailingChevron: {
    flexShrink: 0,
  },

  /* ── Theme Switcher Card ── */
  themeCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  themeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  themeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTitleText: {
    ...typography.heading3,
    fontSize: 14,
    fontWeight: '600',
  },
  themeSubtitleText: {
    ...typography.bodySmall,
    fontSize: 12,
    marginTop: 1,
  },
  themeSegmentContainer: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: 3,
    borderWidth: 1,
    gap: 3,
  },
  themeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  themeSegmentBtnActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  themeSegmentText: {
    ...typography.labelSmall,
    fontSize: 12,
  },

  /* ── Sign Out Button ── */
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    paddingVertical: 14,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  signOutText: {
    ...typography.label,
    fontWeight: '700',
    fontSize: 14,
  },
  profileBrandFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    opacity: 0.8,
  },
  profileBrandFooterText: {
    ...typography.bodySmall,
    fontSize: 11,
    textAlign: 'center',
  },

  /* ── Modal Styles ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.heading2,
    fontSize: 18,
  },
  modalSubtitle: {
    ...typography.bodySmall,
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  modalErrorText: {
    ...typography.bodySmall,
    fontSize: 12,
    flex: 1,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
