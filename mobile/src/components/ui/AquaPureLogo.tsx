/**
 * AquaPure — Official Logo Component
 *
 * Renders the official AquaPure emblem + wordmark with strictly maintained
 * 3:2 (1.5) aspect ratio, ensuring zero distortion, zero squishing, and
 * no cropping on any screen size.
 */

import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { radius } from '@/theme/spacing';

const LOGO_SOURCE = require('../../../assets/images/aquapure-logo.png');
export const AQUAPURE_LOGO_ASPECT_RATIO = 1.5; // 1536 / 1024

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'splash';

const PRESET_WIDTHS: Record<LogoSize, number> = {
  xs: 54,
  sm: 72,
  md: 96,
  lg: 120,
  xl: 160,
  splash: 200,
};

export interface AquaPureLogoProps {
  /** Explicit width. If provided, overrides `size` preset. */
  width?: number;
  /** Explicit height. If provided without width, width is derived via 1.5 aspect ratio. */
  height?: number;
  /** Named size preset ('xs' | 'sm' | 'md' | 'lg' | 'xl' | 'splash'). Default: 'md' */
  size?: LogoSize;
  /**
   * Presentation variant:
   * - 'plain': Raw logo image with contain resizeMode and preserved aspect ratio.
   * - 'badge': Encased in a rounded, pure-white pill/card container with subtle shadow.
   *   Ideal for dark backgrounds (like #210440 hero headers) so purple text remains high-contrast.
   * - 'glass': Translucent white pill with subtle border.
   */
  variant?: 'plain' | 'badge' | 'glass';
  /** Custom container style (when variant is 'badge' or 'glass') */
  containerStyle?: StyleProp<ViewStyle>;
  /** Custom style passed to the Image */
  imageStyle?: StyleProp<ImageStyle>;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  testID?: string;
}

export function AquaPureLogo({
  width: customWidth,
  height: customHeight,
  size = 'md',
  variant = 'plain',
  containerStyle,
  imageStyle,
  accessibilityLabel = 'AquaPure — Pure Water. Better Living.',
  testID = 'aquapure-logo',
}: AquaPureLogoProps) {
  let resolvedWidth: number;
  let resolvedHeight: number;

  if (customWidth) {
    resolvedWidth = customWidth;
    resolvedHeight = customHeight ?? Math.round(customWidth / AQUAPURE_LOGO_ASPECT_RATIO);
  } else if (customHeight) {
    resolvedHeight = customHeight;
    resolvedWidth = Math.round(customHeight * AQUAPURE_LOGO_ASPECT_RATIO);
  } else {
    resolvedWidth = PRESET_WIDTHS[size] || PRESET_WIDTHS.md;
    resolvedHeight = Math.round(resolvedWidth / AQUAPURE_LOGO_ASPECT_RATIO);
  }

  const imageElement = (
    <Image
      source={LOGO_SOURCE}
      style={[
        {
          width: resolvedWidth,
          height: resolvedHeight,
          aspectRatio: AQUAPURE_LOGO_ASPECT_RATIO,
        },
        styles.image,
        imageStyle,
      ]}
      resizeMode="contain"
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );

  if (variant === 'badge') {
    return (
      <View style={[styles.badgeContainer, containerStyle]}>
        {imageElement}
      </View>
    );
  }

  if (variant === 'glass') {
    return (
      <View style={[styles.glassContainer, containerStyle]}>
        {imageElement}
      </View>
    );
  }

  return imageElement;
}

const styles = StyleSheet.create({
  image: {
    // Ensures aspect ratio is strictly respected and never distorted or cropped
    resizeMode: 'contain',
  },
  badgeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  glassContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
