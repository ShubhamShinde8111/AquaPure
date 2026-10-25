import React from 'react';
import {
  RefreshControl as NativeRefreshControl,
  RefreshControlProps as NativeRefreshControlProps,
} from 'react-native';
import { colors } from '@/theme/colors';

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
}

/**
 * Standard Pull-To-Refresh component adhering to AquaPure design tokens.
 * Uses native iOS UIRefreshControl and Android SwipeRefreshLayout.
 */
export function AppRefreshControl({
  refreshing,
  onRefresh,
  title = 'Pull down to refresh',
  tintColor = colors.primary,
  colors: indicatorColors = [colors.primary, colors.peach],
  progressBackgroundColor = colors.white,
  titleColor = colors.textSecondary,
  ...rest
}: AppRefreshControlProps) {
  return (
    <NativeRefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tintColor}
      colors={indicatorColors}
      progressBackgroundColor={progressBackgroundColor}
      title={title}
      titleColor={titleColor}
      accessibilityRole="progressbar"
      accessibilityLabel="Refreshing screen content"
      {...rest}
    />
  );
}
