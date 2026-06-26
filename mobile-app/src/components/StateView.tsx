import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { AppButton } from './AppButton';

type StateViewType = 'loading' | 'empty' | 'error';

type StateViewProps = {
  type: StateViewType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const defaultTitles: Record<StateViewType, string> = {
  loading: '加载中...',
  empty: '暂无数据',
  error: '加载失败',
};

export function StateView({
  type,
  title,
  description,
  actionLabel,
  onActionPress,
  style,
}: StateViewProps) {
  return (
    <View style={[styles.container, style]}>
      {type === 'loading' ? <ActivityIndicator color={colors.primary} /> : null}
      <Text style={styles.title}>{title ?? defaultTitles[type]}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onActionPress ? (
        <AppButton title={actionLabel} onPress={onActionPress} size="compact" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
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
  action: {
    marginTop: spacing.sm,
    minWidth: 120,
  },
});
