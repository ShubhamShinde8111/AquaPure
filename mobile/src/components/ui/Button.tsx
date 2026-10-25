/**
 * AquaPure — Reusable Button Component
 * Follows DESIGN.md §5 Button Standards
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { typography } from '@/theme/typography';

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'destructive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, text: colors.white },
  accent: { bg: colors.yellow, text: colors.primary },
  secondary: { bg: colors.white, text: colors.primary, border: colors.border },
  destructive: { bg: colors.error, text: colors.white },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
  fullWidth = false,
}: ButtonProps) {
  const v = variantStyles[variant];

  const sizeStyle =
    size === 'sm'
      ? { minHeight: 36, paddingVertical: spacing.xs, paddingHorizontal: spacing.md }
      : size === 'lg'
      ? { minHeight: 52, paddingVertical: spacing.md, paddingHorizontal: spacing['2xl'] }
      : { minHeight: 48, paddingVertical: spacing.md, paddingHorizontal: spacing.xl };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      style={[
        styles.base,
        sizeStyle,
        {
          backgroundColor: disabled ? colors.surfaceMuted : v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'accent' ? colors.primary : colors.white}
        />
      ) : (
        <Text
          style={[
            styles.text,
            { color: disabled ? colors.textSecondary : v.text },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 48,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    ...typography.label,
    fontSize: 15,
  },
});
