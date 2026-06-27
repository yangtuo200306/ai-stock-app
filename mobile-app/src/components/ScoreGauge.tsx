import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getScoreColor } from '../utils/stockDisplay';

type ScoreGaugeProps = {
  score: number;
  showLabel?: boolean;
};

export function ScoreGauge({ score, showLabel = true }: ScoreGaugeProps) {
  const barColor = getScoreColor(score);
  const pct = Math.min(Math.max(score, 0), 100);

  return (
    <View style={styles.container}>
      {showLabel ? <Text style={styles.label}>评分</Text> : null}
      <View style={styles.barOuter}>
        <View style={[styles.barInner, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.scoreText, { color: barColor }]}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.helper,
    color: colors.textMuted,
    width: 48,
  },
  barOuter: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: 4,
  },
  scoreText: {
    ...typography.bodyStrong,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 30,
    textAlign: 'right',
  },
});
