/**
 * AquaPure — useTheme Hook & useThemedStyles Utility
 * Provides active theme tokens, current mode, and setter function for theme switching,
 * plus a memoized stylesheet factory for instant dynamic theme re-rendering.
 */

import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useThemeStore } from '@/stores/themeStore';
import { ThemeColors } from '@/theme/colors';

export function useTheme() {
  const themeMode = useThemeStore((s) => s.themeMode);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);

  return {
    themeMode,
    resolvedTheme,
    isDark,
    colors,
    setThemeMode,
  };
}

/**
 * Creates dynamic, theme-reactive styles that recompute when theme toggles.
 */
export function useThemedStyles<T>(
  factory: (colors: ThemeColors, isDark: boolean) => T
): T {
  const { colors, isDark } = useTheme();
  return useMemo(() => factory(colors, isDark), [colors, isDark]);
}

