import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { apiGet } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { RecordItem, RecordStackParamList, RootTabParamList } from '../types';
import { AppCard } from '../components/AppCard';
import { LoginRequiredView } from '../components/LoginRequiredView';
import { StateView } from '../components/StateView';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getRecordTypeColor, getRecordTypeLabel } from '../utils/recordDisplay';
import { formatChangePct, getChangeColor } from '../utils/stockDisplay';

type NavigationType = NativeStackNavigationProp<RecordStackParamList, 'RecordList'>;
type TabNavProp = BottomTabNavigationProp<RootTabParamList>;

export default function RecordListScreen() {
  const navigation = useNavigation<NavigationType>();
  const tabNavigation = useNavigation<TabNavProp>();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecords = useCallback(async () => {
    if (authLoading || !isLoggedIn) return;

    setLoading(true);
    setError('');

    try {
      const data = await apiGet('/api/records');
      setItems(data.items ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载记录失败，请检查后端服务是否启动');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isLoggedIn]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  if (authLoading) {
    return <StateView type="loading" />;
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.centerContainer}>
        <LoginRequiredView
          description="登录后可以使用自选、问股和记录功能。"
          onLoginPress={() => tabNavigation.navigate('我的', { screen: 'Login' })}
        />
      </View>
    );
  }

  if (loading) {
    return <StateView type="loading" title="正在加载记录..." />;
  }

  if (error) {
    return (
      <StateView
        type="error"
        title="记录加载失败"
        description={error}
        actionLabel="重新加载"
        onActionPress={fetchRecords}
      />
    );
  }

  if (items.length === 0) {
    return (
      <StateView
        type="empty"
        title="暂无记录"
        description="问股或自选分析后，这里会显示你的分析记录。"
        actionLabel="刷新"
        onActionPress={fetchRecords}
      />
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <Pressable onPress={() => navigation.navigate('RecordDetail', { recordId: item.id })}>
          <AppCard style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeBadge, { backgroundColor: getRecordTypeColor(item.record_type) }]}>
                <Text style={styles.typeBadgeText}>{getRecordTypeLabel(item.record_type)}</Text>
              </View>
              <Text style={styles.dateText}>{item.updated_at || item.created_at}</Text>
            </View>
            <Text style={styles.stockName}>
              {item.stock_name}（{item.stock_code}）
            </Text>
            <Text style={styles.titleText}>{item.title}</Text>
            <Text style={styles.summaryText} numberOfLines={2}>
              {item.summary}
            </Text>
            <View style={styles.metaRow}>
              {item.metadata.score != null && (
                <Text style={styles.metaLabel}>评分：{item.metadata.score}</Text>
              )}
              {item.metadata.change_pct != null && (
                <Text style={[styles.metaValue, { color: getChangeColor(item.metadata.change_pct) }]}>
                  {formatChangePct(item.metadata.change_pct)}
                </Text>
              )}
            </View>
          </AppCard>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.screenHorizontal,
  },
  card: {
    marginBottom: spacing.itemGap,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    ...typography.label,
    color: colors.textInverse,
  },
  stockName: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  titleText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  summaryText: {
    ...typography.helper,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    ...typography.helper,
    color: colors.textMuted,
  },
  metaValue: {
    ...typography.helper,
    fontWeight: '600',
  },
  dateText: {
    ...typography.helper,
    color: colors.textSubtle,
    flexShrink: 1,
    textAlign: 'right',
  },
});
