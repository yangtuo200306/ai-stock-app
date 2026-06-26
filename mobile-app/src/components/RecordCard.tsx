import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getRecordTypeColor, getRecordTypeLabel } from '../utils/recordDisplay';
import { formatChangePct, getChangeColor } from '../utils/stockDisplay';
import type { RecordItem } from '../types';

type RecordCardProps = {
  item: RecordItem;
  onPress: () => void;
  onDelete?: () => void;
};

function getTypeBarColor(recordType: string): string {
  return getRecordTypeColor(recordType);
}

export function RecordCard({ item, onPress, onDelete }: RecordCardProps) {
  const typeBarColor = getTypeBarColor(item.record_type);
  const changeColor =
    item.metadata.change_pct != null ? getChangeColor(item.metadata.change_pct) : undefined;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.typeBar, { backgroundColor: typeBarColor }]} />
      <View style={styles.content}>
        {/* Top row: type badge + time */}
        <View style={styles.topRow}>
          <Text
            style={[
              styles.typeBadge,
              { color: typeBarColor, backgroundColor: colors.surfaceMuted },
            ]}
          >
            {getRecordTypeLabel(item.record_type)}
          </Text>
          <Text style={styles.dateText}>{item.updated_at || item.created_at}</Text>
        </View>

        {/* Stock name + code */}
        <View style={styles.stockRow}>
          <Text style={styles.stockName}>{item.stock_name}</Text>
          <Text style={styles.stockCode}>{item.stock_code}</Text>
        </View>

        {/* Title */}
        {item.title ? (
          <Text style={styles.titleText} numberOfLines={1}>
            {item.title}
          </Text>
        ) : null}

        {/* Summary */}
        <Text style={styles.summaryText} numberOfLines={2}>
          {item.summary}
        </Text>

        {/* Bottom meta row */}
        <View style={styles.metaRow}>
          {item.metadata.score != null ? (
            <Text style={[styles.metaScore, { color: item.metadata.score >= 70 ? colors.changeUp : item.metadata.score >= 40 ? '#faad14' : colors.changeDown }]}>
              {item.metadata.score} 分
            </Text>
          ) : null}
          {item.metadata.score != null && item.metadata.change_pct != null ? (
            <Text style={styles.metaDot}>·</Text>
          ) : null}
          {item.metadata.change_pct != null ? (
            <Text style={[styles.metaChange, changeColor ? { color: changeColor } : null]}>
              {formatChangePct(item.metadata.change_pct)}
            </Text>
          ) : null}
          <View style={styles.metaSpacer} />
          {onDelete ? (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation?.();
                onDelete();
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.deleteIcon}>删除</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.itemGap,
    overflow: 'hidden',
  },
  typeBar: {
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  content: {
    flex: 1,
    padding: spacing.cardPadding,
    paddingLeft: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  typeBadge: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
    color: colors.textSubtle,
    flexShrink: 1,
    textAlign: 'right',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  stockName: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  stockCode: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  titleText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryText: {
    ...typography.helper,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaScore: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    color: colors.textMuted,
  },
  metaDot: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
    color: colors.textSubtle,
  },
  metaSpacer: {
    flex: 1,
  },
  metaChange: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  deleteButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.dangerSoft,
  },
  deleteIcon: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
    lineHeight: 17,
  },
});
