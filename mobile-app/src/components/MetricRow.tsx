import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type MetricRowProps = {
  label: string;
  value?: string | number | null;
  valueColor?: string;
  compact?: boolean;
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function MetricRow({ label, value, valueColor, compact = false, multiline = false, style }: MetricRowProps) {
  return (
    <View style={[styles.row, compact && styles.compactRow, style]}>
      <Text style={[styles.label, compact && styles.compactLabel]}>{label}</Text>
      <Text
        style={[
          styles.value,
          compact && styles.compactValue,
          multiline && styles.multilineValue,
          valueColor ? { color: valueColor } : null,
        ]}
        numberOfLines={multiline ? undefined : 1}
      >
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
    paddingVertical: spacing.sm,
  },
  compactRow: {
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.helper,
    color: colors.textMuted,
    flexShrink: 0,
  },
  compactLabel: {
    fontSize: 12,
  },
  value: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  compactValue: {
    fontSize: 14,
  },
  multilineValue: {
    flexShrink: 1,
  },
});
