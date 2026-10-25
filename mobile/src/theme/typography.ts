/**
 * AquaPure Design System — Typography Tokens
 * Source of truth: DESIGN.md §3 Typography
 *
 * Uses clean system sans-serif (platform default).
 */

import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const typography: Record<string, TextStyle> = {
  display: {
    fontFamily,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 38,
  },
  heading1: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  heading2: {
    fontFamily,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  heading3: {
    fontFamily,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontFamily,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  label: {
    fontFamily,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  labelSmall: {
    fontFamily,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  price: {
    fontFamily,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
} as const;

export type TypographyToken = keyof typeof typography;
