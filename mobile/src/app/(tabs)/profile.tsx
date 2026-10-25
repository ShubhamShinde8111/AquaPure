/**
 * AquaPure — Account / Profile Screen
 * Route: /(tabs)/profile
 * Full integration with user roles (Customer, Dealer, Admin), profile editing, and auth lifecycle.
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
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
  return (
    <TouchableOpacity
      style={[styles.menuItem, isLast && styles.menuItemLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.menuLabel} numberOfLines={1}>
        {label}
      </Text>
      {badge ? (
        <View style={[styles.itemBadge, badgeColor ? { backgroundColor: badgeColor } : null]}>
          <Text style={styles.itemBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color="#A3A3A3" style={styles.trailingChevron} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
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
    const unsub = initialize();
    return () => unsub();
  }, []);

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
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Refined Header */}
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Account</Text>
          <Text style={styles.subtitle}>Manage your profile & orders</Text>
        </View>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => router.push('/(tabs)/orders')}
          accessibilityLabel="Orders"
        >
          <Ionicons name="receipt-outline" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
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
          <View style={styles.guestCard}>
            <View style={styles.guestLogoWrap}>
              <AquaPureLogo width={100} />
            </View>
            <Text style={styles.guestTitle}>Welcome to AquaPure</Text>
            <Text style={styles.guestDesc}>
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
              style={styles.serviceLinkCard}
              onPress={() => router.push('/service/my-bookings')}
              activeOpacity={0.8}
            >
              <View style={styles.serviceLinkIconWrap}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceLinkTitle}>My Service Bookings</Text>
                <Text style={styles.serviceLinkSubtitle}>
                  Check appointment status & technician tracking
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>

            {/* Dealer Link */}
            <TouchableOpacity
              style={styles.dealerLinkCard}
              onPress={() => router.push('/auth/dealer-register')}
              activeOpacity={0.8}
            >
              <View style={styles.dealerLinkIconWrap}>
                <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dealerLinkTitle}>Become an AquaPure Dealer</Text>
                <Text style={styles.dealerLinkSubtitle}>Apply for B2B wholesale catalog</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Authenticated User State ── */
          <>
            {/* Customer Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarLogged}>
                <Text style={styles.avatarText}>
                  {(profile?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                </Text>
                <TouchableOpacity
                  style={styles.avatarPencilBadge}
                  onPress={openEditModal}
                  accessibilityLabel="Edit profile photo"
                >
                  <Ionicons name="pencil" size={10} color={colors.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.profileInfo}>
                <View style={styles.profileNameRow}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {profile?.displayName || 'AquaPure Member'}
                  </Text>
                  <TouchableOpacity
                    style={styles.editChip}
                    onPress={openEditModal}
                    accessibilityLabel="Edit Profile"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={11} color={colors.primary} />
                    <Text style={styles.editChipText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.profileEmail} numberOfLines={1}>
                  {user?.email}
                </Text>

                {profile?.phone ? (
                  <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
                    <Text style={styles.phoneText}>{profile.phone}</Text>
                  </View>
                ) : null}

                <View style={styles.roleRow}>
                  {profile?.role === 'dealer' ? (
                    <StatusBadge
                      variant={isDealerApproved ? 'success' : 'warning'}
                      label={
                        isDealerApproved
                          ? 'Approved Dealer'
                          : 'Dealer Verification Pending'
                      }
                    />
                  ) : (
                    <StatusBadge variant="info" label="Customer Account" />
                  )}
                </View>
              </View>
            </View>

            {/* Dealer Notice Banners */}
            {isDealer && !isDealerApproved && (
              <View style={styles.pendingNotice}>
                <Ionicons name="time-outline" size={18} color={colors.warning} />
                <Text style={styles.pendingNoticeText}>
                  Your dealer application is under review. Wholesale pricing unlocks upon verification.
                </Text>
              </View>
            )}

            {isDealerApproved && (
              <View style={styles.approvedNotice}>
                <Ionicons name="sparkles" size={18} color={colors.success} />
                <Text style={styles.approvedNoticeText}>
                  Dealer Wholesale Activated! Trade pricing applied across all products.
                </Text>
              </View>
            )}

            {/* Group 1: Services & Orders */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeaderTitle}>SERVICES & ORDERS</Text>
              <View style={styles.menuCard}>
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

        {/* Group 2: Support & Legal */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeaderTitle}>SUPPORT & ABOUT</Text>
          <View style={styles.menuCard}>
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
            style={styles.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        {/* Brand App Version Footer */}
        <View style={styles.profileBrandFooter}>
          <AquaPureLogo width={72} />
          <Text style={styles.profileBrandFooterText}>AquaPure Commerce • Pure Water. Better Living.</Text>
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
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <Text style={styles.modalSubtitle}>Update your contact information</Text>
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
              containerStyle={{ marginBottom: spacing.md }}
            />

            <Input
              label="Phone Number"
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              containerStyle={{ marginBottom: spacing.lg }}
            />

            <View style={styles.modalActionRow}>
              <Button
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setEditModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={editSaving ? 'Saving...' : 'Save Changes'}
                variant="primary"
                size="md"
                disabled={editSaving}
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
    backgroundColor: colors.primary,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    ...typography.heading1,
    color: colors.white,
    fontSize: 22,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.peach,
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },

  /* ── Guest Card ── */
  guestCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  guestLogoWrap: {
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  guestTitle: {
    ...typography.heading2,
    color: colors.text,
    fontSize: 18,
  },
  guestDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
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
    backgroundColor: colors.yellow,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  signInText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  serviceLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F3E8FF',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    width: '100%',
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  serviceLinkIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceLinkTitle: {
    ...typography.heading3,
    color: colors.primary,
    fontSize: 13,
  },
  serviceLinkSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  dealerLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dealerLinkIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealerLinkTitle: {
    ...typography.heading3,
    color: colors.text,
    fontSize: 13,
  },
  dealerLinkSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },

  /* ── Authenticated Profile Card ── */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarLogged: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#E9D5FF',
  },
  avatarText: {
    ...typography.heading1,
    color: colors.white,
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
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
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
    color: colors.text,
    fontSize: 16,
    flex: 1,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F3E8FF',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  editChipText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  profileEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  pendingNoticeText: {
    ...typography.bodySmall,
    color: colors.warning,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  approvedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  approvedNoticeText: {
    ...typography.bodySmall,
    color: colors.success,
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
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    ...typography.body,
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '500',
    flex: 1,
  },
  itemBadge: {
    backgroundColor: colors.yellow,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: 4,
    flexShrink: 0,
  },
  itemBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  trailingChevron: {
    flexShrink: 0,
  },

  /* ── Sign Out Button ── */
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFEBEE',
    borderRadius: radius.xl,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginTop: spacing.xs,
  },
  signOutText: {
    ...typography.label,
    color: colors.error,
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
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },

  /* ── Modal Styles ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.15,
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
    color: colors.text,
    fontSize: 18,
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
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
    backgroundColor: '#FFEBEE',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  modalErrorText: {
    ...typography.bodySmall,
    color: colors.error,
    fontSize: 12,
    flex: 1,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
