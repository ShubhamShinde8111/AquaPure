/**
 * AquaPure Design System — Spacing Tokens
 * Source of truth: DESIGN.md §4.1 Spacing Scale
 *
 * 8-point base grid with 4px for tight icon/text gaps.
 */

export const spacing = {
  xs: 4,    // space.1 — tight icon/text gaps
  sm: 8,    // space.2
  md: 12,   // space.3
  lg: 16,   // space.4
  xl: 20,   // space.5
  '2xl': 24, // space.6
  '3xl': 32, // space.8
  '4xl': 40, // space.10
  '5xl': 48, // space.12
} as const;

export const radius = {
  sm: 8,    // Small inputs/chips
  md: 10,   // Buttons
  lg: 16,   // Product cards and content cards
  xl: 20,   // Hero banners and large promotional panels
  full: 999, // Pills — compact chips/status labels
} as const;

export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
