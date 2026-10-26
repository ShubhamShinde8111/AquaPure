/**
 * AquaPure — App Splash Screen Component
 *
 * Full-screen branded splash view maintaining exact 3:2 aspect ratio,
 * ensuring zero cropping, distortion, or squishing across all phone and tablet sizes.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { AquaPureLogo } from './AquaPureLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AppSplashScreenProps {
  message?: string;
  showSpinner?: boolean;
}

export function AppSplashScreen({
  message = 'Loading pure water experience…',
  showSpinner = true,
}: AppSplashScreenProps) {
  // Dynamically size logo cleanly for all screen sizes
  const logoWidth = Math.min(Math.round(SCREEN_WIDTH * 0.48), 180);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.logoCard}>
          <AquaPureLogo width={logoWidth} />
        </View>

        {showSpinner && (
          <View style={styles.spinnerWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>AquaPure Technologies • Certified Water Solutions</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoCard: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  spinnerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  message: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
    opacity: 0.7,
  },
});
