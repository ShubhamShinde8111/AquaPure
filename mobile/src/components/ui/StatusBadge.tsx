/**
 * AquaPure — Status Badge Component
 * Follows DESIGN.md §5 Status Badges with dynamic light/dark theming.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, radius, typography } from '@/theme';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function StatusBadge({ label, variant = 'neutral' }: StatusBadgeProps) {
  const { colors, isDark } = useTheme();

  const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
    success: {
      bg: isDark ? 'rgba(52, 211, 153, 0.18)' : '#E8F5E9',
      text: colors.success,
    },
    warning: {
      bg: isDark ? 'rgba(251, 191, 36, 0.18)' : '#FFF8E1',
      text: colors.warning,
    },
    error: {
      bg: isDark ? 'rgba(248, 113, 113, 0.18)' : '#FFEBEE',
      text: colors.error,
    },
    info: {
      bg: isDark ? 'rgba(129, 140, 248, 0.18)' : '#EDE7F6',
      text: colors.info,
    },
    neutral: {
      bg: colors.surfaceMuted,
      text: colors.textSecondary,
    },
  };

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
