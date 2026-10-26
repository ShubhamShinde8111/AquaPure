/**
 * AquaPure — Loading, Empty, and Error State Components
 * Follows DESIGN.md §1.6 Honest States with dynamic light/dark theming.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme, spacing, typography } from '@/theme';
import { Button } from './Button';

// ──── Loading Spinner ────

interface LoadingProps {
  message?: string;
}

export function LoadingState({ message = 'Loading…' }: LoadingProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

// ──── Empty State ────

interface EmptyProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.center}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="secondary"
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </View>
  );
}

// ──── Error State ────

interface ErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: ErrorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.center}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.title, { color: colors.text }]}>Error</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry ? (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="secondary"
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.heading2,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  message: {
    ...typography.body,
    marginTop: spacing.md,
  },
});
