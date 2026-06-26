import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { apiGet } from '../api/client';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type StockMatch = {
  code: string;
  name: string;
};

type StockAutocompleteProps = {
  query: string;
  onSelect: (code: string, name: string) => void;
  onRemove: () => void;
  selected?: { code: string; name: string } | null;
};

export function StockAutocomplete({ query, onSelect, onRemove, selected }: StockAutocompleteProps) {
  const [matches, setMatches] = useState<StockMatch[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setMatches([]);
      return;
    }
    try {
      const data = await apiGet(`/api/stocks/search?q=${encodeURIComponent(q.trim())}`);
      setMatches(data.items ?? []);
    } catch {
      setMatches([]);
    }
  }, []);

  useEffect(() => {
    if (selected) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      doSearch(query);
    }, 200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, selected, doSearch]);

  // 已选中：显示内联 Tag
  if (selected) {
    return (
      <View style={styles.tagInline}>
        <Text style={styles.tagCode}>{selected.code}</Text>
        <Text style={styles.tagName}>{selected.name}</Text>
        <Pressable
          style={styles.tagRemove}
          onPress={onRemove}
          hitSlop={8}
        >
          <Text style={styles.tagRemoveText}>×</Text>
        </Pressable>
      </View>
    );
  }

  // 未选中且无匹配：不渲染
  if (matches.length === 0) return null;

  // 显示匹配列表
  return (
    <View style={styles.listContainer}>
      {matches.map((m) => (
        <Pressable
          key={m.code}
          style={styles.matchItem}
          onPress={() => onSelect(m.code, m.name)}
        >
          <Text style={styles.matchCode}>{m.code}</Text>
          <Text style={styles.matchName}>{m.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tagInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
    alignSelf: 'flex-start',
    marginRight: spacing.xs,
  },
  tagCode: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  tagName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  tagRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  tagRemoveText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 18,
  },
  listContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    zIndex: 100,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 160,
    overflow: 'hidden',
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  matchCode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  matchName: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
});
