import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  TouchableOpacity,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme, spacing, radius, typography } from '@/theme';

export type TextInputRef = React.ComponentRef<typeof RNTextInput>;

export interface InputProps extends Omit<RNTextInputProps, 'style'> {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  containerOnLayout?: (event: LayoutChangeEvent) => void;
  isPassword?: boolean;
}

export const Input = forwardRef<TextInputRef, InputProps>(function Input(
  {
    label,
    error,
    containerStyle,
    containerOnLayout,
    isPassword = false,
    onFocus,
    onBlur,
    ...rest
  }: InputProps,
  ref
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus: RNTextInputProps['onFocus'] = (e) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur: RNTextInputProps['onBlur'] = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View onLayout={containerOnLayout} style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
          },
          focused && { borderColor: colors.primary, borderWidth: 2 },
          error ? { borderColor: colors.error } : null,
        ]}
      >
        <RNTextInput
          ref={ref}
          style={[styles.input, { color: colors.text }]}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={isPassword && !showPassword}
          {...rest}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            style={styles.eyeButton}
          >
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.md,
  },
  eyeButton: {
    padding: spacing.xs,
  },
  eyeText: {
    fontSize: 18,
  },
  error: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
});
