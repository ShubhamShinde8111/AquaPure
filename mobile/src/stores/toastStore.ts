/**
 * AquaPure — Global Toast Store (Zustand)
 * Manages toast notifications with cross-platform support:
 * - Native Android ToastAndroid for OS-level feedback
 * - In-app animated toast banner for rich UI and cross-screen persistence
 */

import { create } from 'zustand';
import { Platform, ToastAndroid } from 'react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number; // ms, default 3000
}

interface ToastState {
  visible: boolean;
  title?: string;
  message: string;
  type: ToastType;
  duration: number;
  show: (options: ToastOptions | string, type?: ToastType) => void;
  hide: () => void;
}

let hideTimeout: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  title: undefined,
  message: '',
  type: 'success',
  duration: 3000,

  show: (options, maybeType) => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }

    const opts: ToastOptions =
      typeof options === 'string'
        ? { message: options, type: maybeType || 'success' }
        : options;

    const message = opts.message;
    const title = opts.title;
    const type = opts.type || 'success';
    const duration = opts.duration ?? 3000;

    // Display native Android toast on Android devices
    if (Platform.OS === 'android') {
      try {
        const fullMsg = title ? `${title}: ${message}` : message;
        ToastAndroid.show(fullMsg, duration > 2500 ? ToastAndroid.LONG : ToastAndroid.SHORT);
      } catch {
        // Fallback gracefully
      }
    }

    // Trigger in-app toast banner
    set({
      visible: true,
      title,
      message,
      type,
      duration,
    });

    hideTimeout = setTimeout(() => {
      set({ visible: false });
      hideTimeout = null;
    }, duration);
  },

  hide: () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    set({ visible: false });
  },
}));

/**
 * Convenience helper to show a toast message from anywhere in the app
 */
export const showToast = (options: ToastOptions | string, type?: ToastType) => {
  useToastStore.getState().show(options, type);
};

/**
 * Convenience helper to dismiss the current toast
 */
export const hideToast = () => {
  useToastStore.getState().hide();
};
