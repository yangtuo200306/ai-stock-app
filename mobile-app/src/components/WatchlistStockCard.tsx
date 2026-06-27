import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getRecordTypeColor, getRecordTypeLabel } from '../utils/recordDisplay';
import { getTaskStatusColor, getTaskStatusLabel } from '../utils/taskStatusDisplay';
import { formatChangePct, getChangeColor, getScoreColor } from '../utils/stockDisplay';
import type { Stock } from '../types';

type WatchlistStockCardProps = {
  stock: Stock;
  taskStatus?: string | null;
  onPress: () => void;
  onAskAI: () => void;
  onAnalyze: () => void;
  onDeleteRequest: () => void;
};

function getTypeBarColor(recordType?: string | null): string {
  if (!recordType) return colors.border;
  return getRecordTypeColor(recordType);
}

export function WatchlistStockCard({
  stock,
  taskStatus,
  onPress,
  onAskAI,
  onAnalyze,
  onDeleteRequest,
}: WatchlistStockCardProps) {
  const typeBarColor = getTypeBarColor(stock.latest_record_type);
  const changeColor = stock.change_pct != null ? getChangeColor(stock.change_pct) : undefined;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.typeBar, { backgroundColor: typeBarColor }]} />
      <View style={styles.content}>
        {/* Top row: code + name + price + change */}
        <View style={styles.topRow}>
          <View style={styles.codeNameRow}>
            <Text style={styles.stockCode}>{stock.code}</Text>
            <Text style={styles.stockName}>{stock.name}</Text>
          </View>
          <View style={styles.priceRow}>
            {stock.price != null ? (
              <Text style={styles.priceText}>
                {stock.price.toFixed(2)}
              </Text>
            ) : null}
            {stock.change_pct != null ? (
              <Text style={[styles.changeText, changeColor ? { color: changeColor } : null]}>
                {formatChangePct(stock.change_pct)}
              </Text>
            ) : null}
          </View>
          {taskStatus ? (
            <View style={[styles.statusBadge, { backgroundColor: getTaskStatusColor(taskStatus) }]}>
              <Text style={styles.statusText}>{getTaskStatusLabel(taskStatus)}</Text>
            </View>
          ) : null}
        </View>

        {/* Score + Trend + Action tags */}
        {(stock.score != null || stock.trend || stock.action) ? (
          <View style={styles.tagsRow}>
            {stock.score != null ? (
              <View style={[styles.tag, { backgroundColor: getScoreColor(stock.score) + '20' }]}>
                <Text style={[styles.tagText, { color: getScoreColor(stock.score) }]}>
                  评分 {stock.score}
                </Text>
              </View>
            ) : null}
            {stock.trend ? (
              <View style={[styles.tag, { backgroundColor: colors.surfaceMuted }]}>
                <Text style={styles.tagText}>趋势 {stock.trend}</Text>
              </View>
            ) : null}
            {stock.action ? (
              <View style={[styles.tag, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>建议 {stock.action}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Summary section */}
        <View style={styles.summarySection}>
          {stock.latest_summary ? (
            <>
              <Text style={styles.summaryText} numberOfLines={2}>
                {stock.latest_summary}
              </Text>
              <View style={styles.summaryMeta}>
                {stock.latest_record_type ? (
                  <Text
                    style={[
                      styles.recordTypeLabel,
                      { color: getRecordTypeColor(stock.latest_record_type), backgroundColor: colors.surfaceMuted },
                    ]}
                  >
                    {getRecordTypeLabel(stock.latest_record_type)}
                  </Text>
                ) : null}
                {stock.latest_updated_at ? (
                  <Text style={styles.summaryTime}>{stock.latest_updated_at}</Text>
                ) : null}
              </View>
            </>
          ) : (
            <Text style={styles.noSummaryText}>暂无分析记录</Text>
          )}
        </View>

        {/* Action row: icon buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, styles.askAiButton]}
            onPress={(e) => {
              e.stopPropagation?.();
              onAskAI();
            }}
          >
            <Text style={styles.askAiLabel}>问 AI</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.analyzeButton]}
            onPress={(e) => {
              e.stopPropagation?.();
              onAnalyze();
            }}
          >
            <Text style={styles.analyzeLabel}>分析</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.deleteButton]}
            onPress={(e) => {
              e.stopPropagation?.();
              onDeleteRequest();
            }}
          >
            <Text style={styles.deleteLabel}>删除</Text>
          </Pressable>
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
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  codeNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  stockCode: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  stockName: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  priceRow: {
    alignItems: 'flex-end',
    gap: 2,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    color: colors.textInverse,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    color: colors.textSecondary,
  },
  summarySection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  summaryText: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  summaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  recordTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  summaryTime: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
    color: colors.textSubtle,
  },
  noSummaryText: {
    ...typography.helper,
    color: colors.textSubtle,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
  },
  askAiButton: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  askAiLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    lineHeight: 18,
  },
  analyzeButton: {
    backgroundColor: colors.secondarySoft,
    borderColor: colors.secondarySoft,
  },
  analyzeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    lineHeight: 18,
  },
  deleteButton: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerSoft,
  },
  deleteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
    lineHeight: 18,
  },
});
