/**
 * AquaPure — My Service Bookings Screen
 * Route: /service/my-bookings
 * Displays the list of booked technician visits, appointment status, schedule, and cancellation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { ServiceBooking, ServiceStatus, ServiceType } from '@/types';
import { db } from '@/services/firebase';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, AppRefreshControl } from '@/components/ui';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const SERVICE_TITLES: Record<ServiceType, string> = {
  installation: 'New Purifier Installation',
  filter_replacement: 'Filter & Membrane Replacement',
  repair: 'Breakdown / Leakage Repair',
  maintenance: 'Periodic Maintenance & Cleaning',
  general_inquiry: 'Water Quality & TDS Health Check',
};

const SERVICE_ICONS: Record<ServiceType, React.ComponentProps<typeof Ionicons>['name']> = {
  installation: 'construct-outline',
  filter_replacement: 'refresh-circle-outline',
  repair: 'alert-circle-outline',
  maintenance: 'shield-checkmark-outline',
  general_inquiry: 'water-outline',
};

// Demo bookings for guest / offline mode
const DEMO_BOOKINGS: ServiceBooking[] = [
  {
    id: 'SRV-892104',
    userId: 'demo-user',
    serviceType: 'installation',
    address: {
      id: 'addr-demo-1',
      label: 'Home',
      fullName: 'Rahul Sharma',
      phone: '+91 98765 43210',
      addressLine1: 'Flat 402, Royal Palms, Link Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400053',
    },
    preferredDate: 'Tomorrow',
    preferredTime: 'Morning (09:00 AM - 12:00 PM)',
    notes: 'Please bring an extra inlet adapter valve.',
    status: 'confirmed',
    createdAt: '2026-02-21T10:00:00Z',
    updatedAt: '2026-02-21T10:30:00Z',
  },
  {
    id: 'SRV-761298',
    userId: 'demo-user',
    serviceType: 'maintenance',
    address: {
      id: 'addr-demo-1',
      label: 'Home',
      fullName: 'Rahul Sharma',
      phone: '+91 98765 43210',
      addressLine1: 'Flat 402, Royal Palms, Link Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400053',
    },
    preferredDate: '25 Feb 2026',
    preferredTime: 'Afternoon (12:00 PM - 03:00 PM)',
    status: 'requested',
    createdAt: '2026-02-20T14:15:00Z',
    updatedAt: '2026-02-20T14:15:00Z',
  },
];

export default function MyBookingsScreen() {
  const { user, isAuthenticated } = useAuthStore();
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'completed'>('all');

  const fetchBookings = useCallback(async () => {
    if (!user) {
      setBookings(DEMO_BOOKINGS);
      setLoading(false);
      return;
    }

    try {
      if (process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) {
        let list: ServiceBooking[] = [];
        try {
          // Attempt composite query (userId ASC + createdAt DESC)
          const q = query(
            collection(db, 'service_bookings'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const snap = await getDocs(q);
          list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceBooking));
        } catch (queryErr) {
          console.warn('service_bookings composite index query fallback:', queryErr);
          // Fallback: Query by userId and sort locally in memory
          const fallbackQ = query(
            collection(db, 'service_bookings'),
            where('userId', '==', user.uid)
          );
          const snap = await getDocs(fallbackQ);
          list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceBooking));
          list.sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
        }

        // If user has bookings in Firestore, show them; otherwise fallback to demo if newly created
        setBookings(list.length > 0 ? list : DEMO_BOOKINGS);
      } else {
        setBookings(DEMO_BOOKINGS);
      }
    } catch (err) {
      console.warn('Could not fetch service bookings from Firestore:', err);
      setBookings(DEMO_BOOKINGS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const { refreshing, onRefresh } = usePullToRefresh(fetchBookings);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);



  const filteredBookings = bookings.filter((b) => {
    if (selectedFilter === 'active') {
      return b.status === 'requested' || b.status === 'confirmed' || b.status === 'in_progress';
    }
    if (selectedFilter === 'completed') {
      return b.status === 'completed' || b.status === 'cancelled';
    }
    return true;
  });

  const getBadgeVariant = (status: ServiceStatus): 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'confirmed':
      case 'in_progress':
        return 'info';
      case 'requested':
      default:
        return 'warning';
    }
  };

  const getStatusLabel = (status: ServiceStatus): string => {
    switch (status) {
      case 'requested':
        return 'Requested';
      case 'confirmed':
        return 'Confirmed';
      case 'in_progress':
        return 'Technician Assigned';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Service Bookings</Text>
            <Text style={styles.subtitle}>Track technician visits and service tickets</Text>
          </View>
          <TouchableOpacity
            style={styles.bookNewBtn}
            onPress={() => router.push('/service/book')}
            accessibilityLabel="Book new service"
          >
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={styles.bookNewText}>Book</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['all', 'active', 'completed'] as const).map((tab) => {
            const count =
              tab === 'all'
                ? bookings.length
                : bookings.filter((b) =>
                    tab === 'active'
                      ? b.status === 'requested' || b.status === 'confirmed' || b.status === 'in_progress'
                      : b.status === 'completed' || b.status === 'cancelled'
                  ).length;

            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterTab,
                  selectedFilter === tab && styles.filterTabActive,
                ]}
                onPress={() => setSelectedFilter(tab)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    selectedFilter === tab && styles.filterTabTextActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          filteredBookings.length === 0 && { flexGrow: 1, justifyContent: 'center' },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            title="Pull to refresh bookings"
          />
        }
      >
        {/* Guest Banner if not signed in */}
        {!isAuthenticated && (
          <TouchableOpacity
            style={styles.guestNoticeCard}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.8}
          >
            <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.guestNoticeTitle}>Sign in to view your real appointments</Text>
              <Text style={styles.guestNoticeText}>
                Showing sample bookings. Sign in to link live appointments.
              </Text>
            </View>
            <Text style={styles.guestNoticeAction}>Sign In</Text>
          </TouchableOpacity>
        )}

        {filteredBookings.length === 0 ? (
          <EmptyState
            icon="🔧"
            title="No Bookings Found"
            description="You don't have any technician appointments scheduled in this section."
            actionLabel="Book a Technician"
            onAction={() => router.push('/service/book')}
          />
        ) : (
          filteredBookings.map((booking) => {
            const serviceTitle =
              SERVICE_TITLES[booking.serviceType] || booking.serviceType || 'Water Purifier Service';
            const iconName = SERVICE_ICONS[booking.serviceType] || 'construct-outline';

            return (
              <View key={booking.id} style={styles.bookingCard}>
                {/* Top Bar */}
                <View style={styles.cardHeader}>
                  <View style={styles.serviceIconWrap}>
                    <Ionicons name={iconName} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>{serviceTitle}</Text>
                    <Text style={styles.bookingIdText}>ID: {booking.id}</Text>
                  </View>
                  <StatusBadge
                    variant={getBadgeVariant(booking.status)}
                    label={getStatusLabel(booking.status)}
                  />
                </View>

                {/* Appointment Schedule Box */}
                <View style={styles.scheduleBox}>
                  <View style={styles.scheduleRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={styles.scheduleLabel}>Date:</Text>
                    <Text style={styles.scheduleValue}>{booking.preferredDate}</Text>
                  </View>
                  <View style={styles.scheduleRow}>
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={styles.scheduleLabel}>Time Slot:</Text>
                    <Text style={styles.scheduleValue}>{booking.preferredTime}</Text>
                  </View>
                </View>

                {/* Service Address */}
                <View style={styles.addressSection}>
                  <View style={styles.addressHeader}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.addressTitle}>Service Location</Text>
                  </View>
                  <Text style={styles.addressRecipient}>
                    {booking.address.fullName} • {booking.address.phone}
                  </Text>
                  <Text style={styles.addressLine}>
                    {booking.address.addressLine1}
                    {booking.address.addressLine2 ? `, ${booking.address.addressLine2}` : ''}
                    {`, ${booking.address.city} - ${booking.address.pincode}`}
                  </Text>
                </View>

                {/* Notes if any */}
                {booking.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Notes / Instructions:</Text>
                    <Text style={styles.notesText}>{booking.notes}</Text>
                  </View>
                ) : null}

                {/* Actions Bar */}
                <View style={styles.actionsBar}>
                  <TouchableOpacity
                    style={styles.supportBtn}
                    onPress={() =>
                      Alert.alert(
                        'Technician Helpline',
                        `For booking ${booking.id}, call our support desk at 1800-AQUAPURE or email service@aquapure.com`
                      )
                    }
                  >
                    <Ionicons name="call-outline" size={16} color={colors.primary} />
                    <Text style={styles.supportBtnText}>Help / Support</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.heading1,
    color: colors.white,
    fontSize: 20,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.peach,
    marginTop: 2,
    fontSize: 12,
  },
  bookNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.yellow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  bookNewText: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterTab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  filterTabActive: {
    backgroundColor: colors.yellow,
  },
  filterTabText: {
    ...typography.labelSmall,
    color: colors.white,
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  guestNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F3E8FF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  guestNoticeTitle: {
    ...typography.label,
    color: colors.primary,
    fontSize: 12,
  },
  guestNoticeText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  guestNoticeAction: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '700',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    overflow: 'hidden',
    fontSize: 12,
  },
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  serviceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitle: {
    ...typography.heading3,
    color: colors.text,
    fontSize: 15,
  },
  bookingIdText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  scheduleBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scheduleLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.text,
    fontSize: 12,
  },
  scheduleValue: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 12,
  },
  addressSection: {
    gap: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  addressTitle: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  addressRecipient: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    fontSize: 12,
  },
  addressLine: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  notesBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notesLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  notesText: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 12,
    marginTop: 2,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  supportBtnText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '600',
  },
});
