/**
 * AquaPure — Service Booking Confirmation Screen
 * Route: /service/success
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, ThemeColors } from '@/theme/colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Button } from '@/components/ui/Button';
import { AppRefreshControl, AquaPureLogo } from '@/components/ui';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { db } from '@/services/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ServiceSuccessScreen() {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(getStyles);
  const { bookingId, serviceTitle, date, time } = useLocalSearchParams<{
    bookingId: string;
    serviceTitle: string;
    date: string;
    time: string;
  }>();
  const [bookingStatus, setBookingStatus] = useState<string>('REQUEST CONFIRMED');

  const checkBookingStatus = useCallback(async () => {
    if (!bookingId) return;
    try {
      const snap = await getDoc(doc(db, 'service_bookings', bookingId));
      if (snap.exists()) {
        const data = snap.data();
        if (data.status) {
          setBookingStatus(data.status.replace(/_/g, ' ').toUpperCase());
        }
      }
    } catch (e) {
      console.warn('Could not refresh service booking status:', e);
    }
  }, [bookingId]);

  const { refreshing, onRefresh } = usePullToRefresh(checkBookingStatus);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            title="Pull to refresh booking status"
          />
        }
      >
        <View style={styles.container}>
          <View style={styles.logoWrap}>
            <AquaPureLogo width={96} />
          </View>
          <View style={styles.iconCircle}>
            <Ionicons name="construct" size={44} color={colors.white} />
          </View>

          <Text style={styles.title}>Service Appointment Booked!</Text>
          <Text style={styles.subtitle}>
            Our certified water technician will arrive at your address on schedule.
          </Text>

          <View style={styles.detailsCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Booking Reference</Text>
              <Text style={styles.refText}>{bookingId || 'SRV-102948'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Service Type</Text>
              <Text style={styles.valueText}>{serviceTitle || 'Installation'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.valueText}>{date || 'Tomorrow'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Slot</Text>
              <Text style={styles.valueText}>{time || 'Morning 9AM - 12PM'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.statusBadge}>{bookingStatus}</Text>
            </View>
          </View>

          <View style={styles.buttonGroup}>
            <Button
              title="View My Bookings"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.replace('/service/my-bookings')}
            />
            <Button
              title="Back to Home"
              variant="secondary"
              size="lg"
              fullWidth
              onPress={() => router.replace('/(tabs)')}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    container: {
      flex: 1,
      padding: spacing['2xl'],
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoWrap: {
      marginBottom: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    title: {
      ...typography.heading1,
      color: colors.text,
      fontSize: 22,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing['2xl'],
    },
    detailsCard: {
      backgroundColor: colors.card,
      borderRadius: radius.xl,
      padding: spacing.xl,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing['2xl'],
      gap: spacing.md,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      ...typography.body,
      color: colors.textSecondary,
    },
    refText: {
      ...typography.label,
      fontFamily: 'monospace',
      color: colors.primary,
    },
    valueText: {
      ...typography.body,
      fontWeight: '600',
      color: colors.text,
    },
    statusBadge: {
      ...typography.labelSmall,
      color: colors.success,
      fontWeight: '800',
      backgroundColor: isDark ? 'rgba(46, 125, 50, 0.25)' : '#E8F5E9',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.full,
    },
    buttonGroup: {
      width: '100%',
    },
  });
