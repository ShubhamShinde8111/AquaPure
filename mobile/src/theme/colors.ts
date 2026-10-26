/**
 * AquaPure Design System — Color Tokens & Theme Definitions
 * Source of truth: DESIGN.md §2 Brand Palette
 * Supports Light and Dark modes with dynamic proxy resolution and reactive theme tokens.
 */

export const lightColors = {
  // Core brand colors
  primary: '#210440',
  primaryLight: '#3B1366',
  primaryMuted: '#ECE5F5',
  peach: '#FDB095',
  coral: '#E5958E',
  yellow: '#FFBA00',

  // Supporting neutrals
  white: '#FFFFFF',
  card: '#FFFFFF',
  cardBackground: '#FFFFFF',
  background: '#FFF4F0',
  text: '#210440',
  textSecondary: '#646464',
  textMuted: '#9E94A8',
  border: '#F0DAD5',
  borderLight: '#F7EBE8',
  surfaceMuted: '#FBE8E1',
  inputBackground: '#FFFFFF',
  headerBackground: '#210440',
  headerTitle: '#FFFFFF',

  // Semantic colors
  success: '#16803D',
  warning: '#B45309',
  error: '#B42318',
  info: '#4F46A5',

  // Raw utilities
  rawWhite: '#FFFFFF',
  rawBlack: '#000000',
  cardShadow: 'rgba(33, 4, 64, 0.08)',
  overlay: 'rgba(33, 4, 64, 0.5)',
} as const;

export type ThemeColors = {
  [K in keyof typeof lightColors]: string;
};

export const darkColors: ThemeColors = {
  // Core brand colors tuned for deep obsidian surfaces
  primary: '#A78BFA',
  primaryLight: '#C4B5FD',
  primaryMuted: '#2A1F3B',
  peach: '#FDB095',
  coral: '#E5958E',
  yellow: '#FFBA00',

  // Dark neutrals
  white: '#FFFFFF', // Pure white for text on dark headers, buttons, badges
  card: '#1C1327', // Elevated dark card surface
  cardBackground: '#1C1327',
  background: '#0F0918', // Deep royal obsidian background
  text: '#F8F6FC', // High contrast crisp reading text
  textSecondary: '#AFA6BA', // Muted lavender slate for secondary copy
  textMuted: '#7C7288',
  border: '#322444', // Elegant hairline border
  borderLight: '#261A36',
  surfaceMuted: '#261A35', // Secondary elevated surface / chips
  inputBackground: '#1F152C',
  headerBackground: '#160B22',
  headerTitle: '#FFFFFF',

  // Semantic colors (tuned for dark surfaces)
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#818CF8',

  // Raw utilities
  rawWhite: '#FFFFFF',
  rawBlack: '#000000',
  cardShadow: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.75)',
};

let currentActiveColors: ThemeColors = lightColors;

export function setActiveColors(newColors: ThemeColors) {
  currentActiveColors = newColors;
}

export function getActiveColors(): ThemeColors {
  return currentActiveColors;
}

/**
 * Dynamic colors export.
 * Forwards properties to the currently active theme palette (light or dark).
 */
export const colors: ThemeColors = new Proxy(lightColors as ThemeColors, {
  get(_target, prop: string) {
    if (prop in currentActiveColors) {
      return currentActiveColors[prop as keyof ThemeColors];
    }
    return (lightColors as any)[prop];
  },
});

export type ColorToken = keyof typeof lightColors;
