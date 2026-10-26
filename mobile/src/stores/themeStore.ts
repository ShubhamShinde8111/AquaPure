/**
 * AquaPure — Theme Store (Zustand)
 * Manages theme mode (system, light, dark), listens to OS appearance changes,
 * persists user preference in AsyncStorage, and keeps theme colors in sync.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';
import { lightColors, darkColors, setActiveColors, ThemeColors } from '@/theme/colors';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  themeMode: ThemeMode;
  systemScheme: ResolvedTheme;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  colors: ThemeColors;

  setThemeMode: (mode: ThemeMode) => void;
  syncSystemScheme: (scheme: ColorSchemeName | null | undefined) => void;
}

const getInitialSystemScheme = (): ResolvedTheme => {
  const current = Appearance.getColorScheme();
  return current === 'dark' ? 'dark' : 'light';
};

const resolveTheme = (mode: ThemeMode, sys: ResolvedTheme): ResolvedTheme => {
  if (mode === 'system') return sys;
  return mode;
};

const initialSys = getInitialSystemScheme();
const initialResolved = resolveTheme('system', initialSys);
const initialIsDark = initialResolved === 'dark';
const initialColors = initialIsDark ? darkColors : lightColors;
setActiveColors(initialColors);

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeMode: 'system',
      systemScheme: initialSys,
      resolvedTheme: initialResolved,
      isDark: initialIsDark,
      colors: initialColors,

      setThemeMode: (mode: ThemeMode) => {
        const sys = get().systemScheme;
        const resolved = resolveTheme(mode, sys);
        const isDark = resolved === 'dark';
        const activeCols = isDark ? darkColors : lightColors;
        setActiveColors(activeCols);
        set({
          themeMode: mode,
          resolvedTheme: resolved,
          isDark,
          colors: activeCols,
        });
      },

      syncSystemScheme: (scheme: ColorSchemeName | null | undefined) => {
        const sys: ResolvedTheme = scheme === 'dark' ? 'dark' : 'light';
        const mode = get().themeMode;
        const resolved = resolveTheme(mode, sys);
        const isDark = resolved === 'dark';
        const activeCols = isDark ? darkColors : lightColors;
        setActiveColors(activeCols);
        set({
          systemScheme: sys,
          resolvedTheme: resolved,
          isDark,
          colors: activeCols,
        });
      },
    }),
    {
      name: 'aquapure-theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ themeMode: state.themeMode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const sys = getInitialSystemScheme();
          const resolved = resolveTheme(state.themeMode, sys);
          const isDark = resolved === 'dark';
          const activeCols = isDark ? darkColors : lightColors;
          setActiveColors(activeCols);
          state.systemScheme = sys;
          state.resolvedTheme = resolved;
          state.isDark = isDark;
          state.colors = activeCols;
        }
      },
    }
  )
);

// Register global listener for system color changes
Appearance.addChangeListener(({ colorScheme }) => {
  useThemeStore.getState().syncSystemScheme(colorScheme);
});
