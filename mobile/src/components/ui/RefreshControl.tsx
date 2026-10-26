import React from 'react';
import {
  RefreshControl as NativeRefreshControl,
  RefreshControlProps as NativeRefreshControlProps,
} from 'react-native';
import { useTheme } from '@/theme';

export interface AppRefreshControlProps extends Partial<NativeRefreshControlProps> {
  /** Whether the refresh indicator is actively spinning */
  refreshing: boolean;
  /** Callback triggered when user performs pull-down gesture */
  onRefresh: () => void | Promise<void>;
  /** Optional iOS title under spinner */
  title?: string;
  /** iOS spinner tint color */
  tintColor?: string;
  /** Android spinner color array */
  colors?: string[];
  /** Android circular background color */
  progressBackgroundColor?: string;
  /** Title text color */
  titleColor?: string;
}

/**
 * Standard Pull-To-Refresh component adhering to AquaPure design tokens.
 * Adapts automatically to Light and Dark modes.
 */
export function AppRefreshControl({
  refreshing,
  onRefresh,
  title = 'Pull down to refresh',
  tintColor,
  colors: indicatorColors,
  progressBackgroundColor,
  titleColor,
  ...rest
}: AppRefreshControlProps) {
  const { colors } = useTheme();

  return (
    <NativeRefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tintColor ?? colors.primary}
      colors={indicatorColors ?? [colors.primary, colors.peach]}
      progressBackgroundColor={progressBackgroundColor ?? colors.card}
      title={title}
      titleColor={titleColor ?? colors.textSecondary}
      accessibilityRole="progressbar"
      accessibilityLabel="Refreshing screen content"
      {...rest}
    />
  );
}
