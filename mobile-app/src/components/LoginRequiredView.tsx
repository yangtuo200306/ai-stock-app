import React from 'react';
import { StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { AppButton } from './AppButton';
import { AppCard } from './AppCard';

type LoginRequiredViewProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onLoginPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function LoginRequiredView({
  title = '请先登录',
  description = '登录后即可使用完整功能。',
  actionLabel = '去登录',
  onLoginPress,
  style,
}: LoginRequiredViewProps) {
  return (
    <AppCard style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <AppButton title={actionLabel} onPress={onLoginPress} style={styles.button} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
    minWidth: 120,
  },
});
