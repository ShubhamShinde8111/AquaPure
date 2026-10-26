/**
 * AquaPure Design System — Barrel Export
 * Import all tokens and theme utilities from '@/theme'.
 */

export { colors, lightColors, darkColors, setActiveColors, getActiveColors } from './colors';
export type { ColorToken, ThemeColors } from './colors';

export { useTheme, useThemedStyles } from '@/hooks/useTheme';
export { useThemeStore } from '@/stores/themeStore';
export type { ThemeMode, ResolvedTheme } from '@/stores/themeStore';

export { spacing, radius } from './spacing';
export type { SpacingToken, RadiusToken } from './spacing';

export { typography } from './typography';
export type { TypographyToken } from './typography';
