/**
 * AquaPure — Service & Technician Booking Screen
 * Route: /service/book
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { colors, ThemeColors } from '@/theme/colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppRefreshControl } from '@/components/ui';
import { ServiceType, ServiceBooking, Address } from '@/types';
import { db } from '@/services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { NotificationsService } from '@/services/notificationsService';
import { EmailService } from '@/services/emailService';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface ServiceOption {
  type: ServiceType;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  fee: string;
}

const SERVICE_OPTIONS: ServiceOption[] = [
  {
    type: 'installation',
    title: 'New Purifier Installation',
    description: 'Wall mounting, inlet plumbing adapter, drain pipe setup & TDS calibration',
    icon: 'construct-outline',
    fee: 'FREE with new unit / ₹399',
  },
  {
    type: 'filter_replacement',
    title: 'Filter & Membrane Replacement',
    description: 'Comprehensive filter cartridge change, housing sanitization & flushing',
    icon: 'refresh-circle-outline',
    fee: '₹249 + Parts',
  },
  {
    type: 'repair',
    title: 'Breakdown / Leakage Repair',
    description: 'Pump troubleshooting, solenoid valve check, SMPS adapter repair & leak seal',
    icon: 'alert-circle-outline',
    fee: '₹299 Inspection Fee',
  },
  {
    type: 'maintenance',
    title: 'Periodic Maintenance & Cleaning',
    description: 'Deep tank chemical descaling, UV lamp test, pressure check & water purity test',
    icon: 'shield-checkmark-outline',
    fee: '₹349 Comprehensive',
  },
  {
    type: 'general_inquiry',
    title: 'Water Quality & TDS Health Check',
    description: 'On-site digital TDS testing, hardness inspection & system recommendation',
    icon: 'water-outline',
    fee: 'FREE Consultation',
  },
];

const TIME_SLOTS = [
  'Morning (09:00 AM - 12:00 PM)',
  'Afternoon (12:00 PM - 03:00 PM)',
  'Evening (03:00 PM - 07:00 PM)',
];

export default function BookServiceScreen() {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(getStyles);
  const { user, profile, refreshProfile, setPendingAction, pendingAction, clearPendingAction } =
    useAuthStore();

  const params = useLocalSearchParams<{
    productName?: string;
    productId?: string;
    selectedType?: string;
    preferredDate?: string;
    preferredTime?: string;
    notes?: string;
    fullName?: string;
    phone?: string;
    addressLine?: string;
    city?: string;
    pincode?: string;
  }>();

  const [selectedType, setSelectedType] = useState<ServiceType>(
    (params.selectedType as ServiceType) || 'installation'
  );
  const [preferredDate, setPreferredDate] = useState(params.preferredDate || 'Tomorrow');
  const [preferredTime, setPreferredTime] = useState(params.preferredTime || TIME_SLOTS[0]);
  const [notes, setNotes] = useState(
    params.notes || (params.productName ? `Installation for ${params.productName}` : '')
  );

  // Address
  const [fullName, setFullName] = useState(params.fullName || profile?.displayName || '');
  const [phone, setPhone] = useState(params.phone || profile?.phone || '');
  const [addressLine, setAddressLine] = useState(params.addressLine || '');
  const [city, setCity] = useState(params.city || '');
  const [pincode, setPincode] = useState(params.pincode || '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-sync profile info if authenticated
  useEffect(() => {
    if (profile?.displayName && !fullName) {
      setFullName(profile.displayName);
    }
    if (profile?.phone && !phone) {
      setPhone(profile.phone);
    }
  }, [profile]);

  // Restore preserved form entries after successful login
  useEffect(() => {
    if (pendingAction?.type === 'BOOK_SERVICE' && pendingAction.bookingData) {
      const b = pendingAction.bookingData;
      if (b.selectedType) setSelectedType(b.selectedType);
      if (b.preferredDate) setPreferredDate(b.preferredDate);
      if (b.preferredTime) setPreferredTime(b.preferredTime);
      if (b.notes) setNotes(b.notes);
      if (b.fullName) setFullName(b.fullName);
      if (b.phone) setPhone(b.phone);
      if (b.addressLine) setAddressLine(b.addressLine);
      if (b.city) setCity(b.city);
      if (b.pincode) setPincode(b.pincode);
      clearPendingAction();
    }
  }, [pendingAction, clearPendingAction]);

  const handleRefresh = useCallback(async () => {
    setError('');
    if (user) {
      await refreshProfile();
    }
  }, [user, refreshProfile]);

  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

  const handleBook = async () => {
    setError('');
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to schedule a technician appointment. Your service details will be preserved.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => {
              setPendingAction({
                type: 'BOOK_SERVICE',
                bookingData: {
                  selectedType,
                  preferredDate,
                  preferredTime,
                  notes,
                  fullName,
                  phone,
                  addressLine,
                  city,
                  pincode,
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

    if (!fullName.trim() || !phone.trim() || !addressLine.trim() || !city.trim() || !pincode.trim()) {
      setError('Please provide your complete service address and phone number.');
      return;
    }

    setSubmitting(true);
    const address: Address = {
      id: `addr-${Date.now()}`,
      label: 'Service Location',
      fullName: fullName.trim(),
      phone: phone.trim(),
      addressLine1: addressLine.trim(),
      city: city.trim(),
      state: 'State',
      pincode: pincode.trim(),
    };

    const newBooking: Omit<ServiceBooking, 'id'> = {
      userId: user.uid,
      serviceType: selectedType,
      address,
      preferredDate,
      preferredTime,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      status: 'requested',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let bookingId = `SRV-${Date.now().toString().slice(-6)}`;
    try {
      if (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) {
        // Strip any undefined values to comply with Firestore document restrictions
        const sanitizedBooking = JSON.parse(JSON.stringify(newBooking));
        const docRef = await addDoc(collection(db, 'service_bookings'), sanitizedBooking);
        bookingId = docRef.id;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database error';
      console.error('Firestore booking write error:', err);
      setError(`Unable to schedule service: ${msg}. Please check your connection or contact support.`);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    NotificationsService.notifyServiceBooked(
      bookingId,
      SERVICE_OPTIONS.find((s) => s.type === selectedType)?.title || 'Water Service'
    );
    EmailService.sendServiceBookingConfirmation({
      toEmail: user?.email || 'customer@example.com',
      toName: fullName.trim(),
      bookingId,
      serviceType: SERVICE_OPTIONS.find((s) => s.type === selectedType)?.title || 'Water Service',
      preferredDate,
      preferredTime,
      address: `${addressLine}, ${city} - ${pincode}`,
    });
    router.replace({
      pathname: '/service/success',
      params: {
        bookingId,
        serviceTitle: SERVICE_OPTIONS.find((s) => s.type === selectedType)?.title || 'Service',
        date: preferredDate,
        time: preferredTime,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Book Technician</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              title="Pull to refresh booking"
            />
          }
        >
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!user && (
            <TouchableOpacity
              style={styles.guestBanner}
              onPress={() => {
                setPendingAction({
                  type: 'BOOK_SERVICE',
                  bookingData: {
                    selectedType,
                    preferredDate,
                    preferredTime,
                    notes,
                    fullName,
                    phone,
                    addressLine,
                    city,
                    pincode,
                  },
                  returnUrl: '/service/book',
                });
                router.push('/auth/login');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.guestBannerTitle}>Sign in to book a technician</Text>
                <Text style={styles.guestBannerSubtitle}>You must be logged in to schedule technician visits</Text>
              </View>
              <Text style={styles.guestBannerAction}>Sign In</Text>
            </TouchableOpacity>
          )}

          {/* Step 1: Select Service Type */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>1. Select Service Required</Text>
            <View style={styles.optionsList}>
              {SERVICE_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={[
                      styles.serviceOption,
                      isSelected && styles.serviceOptionSelected,
                    ]}
                    onPress={() => setSelectedType(opt.type)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        isSelected && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={22}
                        color={isSelected ? colors.white : colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionTitle}>{opt.title}</Text>
                      <Text style={styles.optionDesc}>{opt.description}</Text>
                      <Text style={styles.optionFee}>{opt.fee}</Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={isSelected ? colors.primary : colors.border}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Step 2: Preferred Schedule */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>2. Preferred Date & Time Slot</Text>
            <Text style={styles.fieldLabel}>Select Date</Text>
            <View style={styles.pillsRow}>
              {['Today', 'Tomorrow', 'In 2 Days', 'Weekend'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.pill, preferredDate === d && styles.pillActive]}
                  onPress={() => setPreferredDate(d)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      preferredDate === d && styles.pillTextActive,
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Select Time Slot</Text>
            <View style={styles.slotsList}>
              {TIME_SLOTS.map((slot) => {
                const isSelected = preferredTime === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotItem, isSelected && styles.slotItemSelected]}
                    onPress={() => setPreferredTime(slot)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.slotText}>{slot}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Step 3: Location & Details */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>3. Service Address</Text>
            <Input
              label="Contact Person Name *"
              placeholder="e.g. Ramesh"
              value={fullName}
              onChangeText={setFullName}
            />
            <Input
              label="Contact Phone Number *"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <Input
              label="House No, Apartment, Street *"
              placeholder="Flat 101, Green Heights, SV Road"
              value={addressLine}
              onChangeText={setAddressLine}
            />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="City *"
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Pincode *"
                  placeholder="400001"
                  keyboardType="number-pad"
                  value={pincode}
                  onChangeText={setPincode}
                />
              </View>
            </View>
            <Input
              label="Notes / Purifier Model & Issue"
              placeholder="e.g. Ro pump making noise, low water output"
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <Button
            title="Confirm Technician Booking"
            variant="accent"
            size="lg"
            fullWidth
            loading={submitting}
            onPress={handleBook}
            style={{ marginTop: spacing.sm }}
          />

          <View style={{ height: spacing['4xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navTitle: {
      ...typography.heading2,
      color: colors.text,
    },
    scrollView: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: isDark ? 'rgba(198, 40, 40, 0.25)' : '#FFEBEE',
      padding: spacing.md,
      borderRadius: radius.md,
    },
    errorText: {
      ...typography.bodySmall,
      color: colors.error,
      flex: 1,
    },
    guestBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : '#F3E8FF',
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(167, 139, 250, 0.3)' : '#D8B4FE',
    },
    guestBannerTitle: {
      ...typography.label,
      color: colors.primary,
      fontSize: 13,
    },
    guestBannerSubtitle: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    guestBannerAction: {
      ...typography.label,
      color: colors.primary,
      fontWeight: '700',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardSectionTitle: {
      ...typography.heading2,
      color: colors.text,
      fontSize: 16,
      marginBottom: spacing.md,
    },
    optionsList: {
      gap: spacing.sm,
    },
    serviceOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    serviceOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: isDark ? 'rgba(167, 139, 250, 0.12)' : colors.card,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionTitle: {
      ...typography.heading3,
      color: colors.text,
      fontSize: 14,
    },
    optionDesc: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
      lineHeight: 16,
    },
    optionFee: {
      ...typography.labelSmall,
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 4,
    },
    fieldLabel: {
      ...typography.label,
      color: colors.text,
      fontSize: 13,
      marginBottom: spacing.xs,
    },
    pillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    pill: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    pillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pillText: {
      ...typography.bodySmall,
      color: colors.text,
    },
    pillTextActive: {
      color: isDark ? '#210440' : colors.white,
      fontWeight: '700',
    },
    slotsList: {
      gap: spacing.xs,
    },
    slotItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    slotItemSelected: {
      borderColor: colors.primary,
      backgroundColor: isDark ? 'rgba(167, 139, 250, 0.12)' : colors.card,
    },
    slotText: {
      ...typography.bodySmall,
      color: colors.text,
      fontWeight: '600',
    },
  });
