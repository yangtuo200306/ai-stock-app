import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type AppButtonSize = 'default' | 'compact';

type AppButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const getButtonStyle = (variant: AppButtonVariant, disabled?: boolean) => {
  if (disabled) {
    return styles.disabledButton;
  }

  switch (variant) {
    case 'secondary':
      return styles.secondaryButton;
    case 'danger':
      return styles.dangerButton;
    case 'ghost':
      return styles.ghostButton;
    case 'primary':
    default:
      return styles.primaryButton;
  }
};

const getTextStyle = (variant: AppButtonVariant, disabled?: boolean) => {
  if (disabled) {
    return styles.disabledText;
  }

  switch (variant) {
    case 'ghost':
      return styles.ghostText;
    case 'secondary':
    case 'danger':
    case 'primary':
    default:
      return styles.solidText;
  }
};

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  style,
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        size === 'compact' ? styles.compact : styles.default,
        getButtonStyle(variant, isDisabled),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.primary : colors.textInverse} />
      ) : (
        <Text
          style={[
            styles.text,
            size === 'compact' ? styles.compactText : styles.defaultText,
            getTextStyle(variant, isDisabled),
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  default: {
    minHeight: 42,
    borderRadius: 12,
    paddingVertical: spacing.buttonVertical,
    paddingHorizontal: spacing.buttonHorizontal,
  },
  compact: {
    minHeight: 36,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  dangerButton: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  ghostButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  disabledButton: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  text: {
    fontWeight: '600',
  },
  defaultText: {
    ...typography.bodyStrong,
  },
  compactText: {
    fontSize: 14,
    lineHeight: 20,
  },
  solidText: {
    color: colors.textInverse,
  },
  ghostText: {
    color: colors.primary,
  },
  disabledText: {
    color: colors.textSubtle,
  },
});
