import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type MetricRowProps = {
  label: string;
  value?: string | number | null;
  valueColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function MetricRow({ label, value, valueColor, style }: MetricRowProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>
        {value === null || value === undefined || value === '' ? '--' : value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.helper,
    color: colors.textMuted,
  },
  value: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
});
