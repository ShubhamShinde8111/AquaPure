/**
 * AquaPure Design System — Color Tokens
 * Source of truth: DESIGN.md §2 Brand Palette
 *
 * Do NOT hardcode colors in screen components.
 * Import from this module instead.
 */

export const colors = {
  // Core brand colors
  primary: '#210440',
  peach: '#FDB095',
  coral: '#E5958E',
  yellow: '#FFBA00',

  // Supporting neutrals
  white: '#FFFFFF',
  background: '#FFF4F0',
  text: '#210440',
  textSecondary: '#646464',
  border: '#F0DAD5',
  surfaceMuted: '#FBE8E1',

  // Semantic colors
  success: '#16803D',
  warning: '#B45309',
  error: '#B42318',
  info: '#4F46A5',
} as const;

export type ColorToken = keyof typeof colors;
