/**
 * AquaPure — Card Component
 * Follows DESIGN.md §4.3 Elevation and Borders with dynamic light/dark theming.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme, spacing, radius } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | (ViewStyle | false | undefined | null)[];
  padded?: boolean;
}

export function Card({ children, style, padded = true }: CardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowOpacity: isDark ? 0.3 : 0.05,
        },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  padded: {
    padding: spacing.lg,
  },
});
