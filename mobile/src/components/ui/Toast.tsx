/**
 * AquaPure — Global Toast Notification Component
 * Renders an animated toast pill at the top of the viewport.
 * Listens to useToastStore so it persists across screen navigations.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore, hideToast, ToastType } from '@/stores/toastStore';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius } from '@/theme/spacing';

export function Toast() {
  const { visible, title, message, type } = useToastStore();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [shouldRender, setShouldRender] = useState(false);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setShouldRender(false);
        }
      });
    }
  }, [visible, translateY, opacity]);

  if (!shouldRender && !visible) {
    return null;
  }

  const getThemeConfig = (t: ToastType) => {
    switch (t) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          iconColor: colors.success,
          borderColor: isDark ? 'rgba(22, 128, 61, 0.4)' : '#86EFAC',
          bg: isDark ? '#102A1E' : '#F0FDF4',
        };
      case 'error':
        return {
          icon: 'alert-circle' as const,
          iconColor: colors.error,
          borderColor: isDark ? 'rgba(180, 35, 24, 0.4)' : '#FECDD3',
          bg: isDark ? '#2E1014' : '#FEF2F2',
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          iconColor: colors.warning,
          borderColor: isDark ? 'rgba(180, 83, 9, 0.4)' : '#FDE68A',
          bg: isDark ? '#2E1E0F' : '#FFFBEB',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle' as const,
          iconColor: colors.info,
          borderColor: isDark ? 'rgba(79, 70, 165, 0.4)' : '#C7D2FE',
          bg: isDark ? '#191538' : '#EEF2FF',
        };
    }
  };

  const config = getThemeConfig(type);
  const topOffset = Math.max(insets.top, Platform.OS === 'android' ? 16 : 44) + spacing.xs;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          top: topOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={hideToast}
        style={[
          styles.toastCard,
          {
            backgroundColor: config.bg,
            borderColor: config.borderColor,
            shadowColor: isDark ? '#000000' : colors.cardShadow,
          },
        ]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <View style={styles.iconWrap}>
          <Ionicons name={config.icon} size={24} color={config.iconColor} />
        </View>

        <View style={styles.textWrap}>
          {title ? (
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : colors.text },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
          <Text
            style={[
              styles.message,
              { color: isDark ? '#E2E8F0' : colors.textSecondary },
              !title && styles.messageSolo,
            ]}
            numberOfLines={2}
          >
            {message}
          </Text>
        </View>

        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={hideToast}
          style={styles.closeBtn}
          accessibilityLabel="Dismiss notification"
        >
          <Ionicons
            name="close"
            size={16}
            color={isDark ? '#94A3B8' : colors.textMuted}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageSolo: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtn: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});
