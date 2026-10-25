/**
 * AquaPure — Status Badge Component
 * Follows DESIGN.md §5 Status Badges
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#E8F5E9', text: colors.success },
  warning: { bg: '#FFF8E1', text: colors.warning },
  error: { bg: '#FFEBEE', text: colors.error },
  info: { bg: '#EDE7F6', text: colors.info },
  neutral: { bg: colors.surfaceMuted, text: colors.textSecondary },
};

export function StatusBadge({ label, variant = 'neutral' }: StatusBadgeProps) {
  const c = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
});
